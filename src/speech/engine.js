/**
 * Read-aloud engine (the device's own voices, through the Web Speech API).
 *
 * Which voice: the most natural-sounding Mandarin voice the device has. Neural and
 * "enhanced/premium" voices first (Edge's "… Online (Natural)", Apple's enhanced voices,
 * Google's network voices), Taiwanese Mandarin before other Mandarin, and the old desktop
 * voices (Hanhan, Yating, Zhiwei…) last, because those are the ones that sound mechanical.
 * The visitor can pick another voice and a speed; the choice is remembered on that device.
 * Pitch stays at the voice's own setting; speed defaults to a brisk 1.2×.
 * One thing speaks at a time.
 */
import { sentences } from '../../shared/speech.js';

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
const STORE = 'tech-island.voice';

// 「正常」 is a little brisker than a voice's default (1.0 reads slowly for most Mandarin voices)
export const RATES = [
  { id: 'slow', label: '慢一點', value: 1 },
  { id: 'normal', label: '正常', value: 1.2 },
  { id: 'fast', label: '快一點', value: 1.4 },
  { id: 'faster', label: '更快', value: 1.6 },
];
export const SAMPLE = '您好，我是 Dr. T。這是朗讀的聲音和速度，聽起來舒服嗎？';

const NATURAL = /natural|neural|premium|enhanced|增強|優化|高音質|siri/i;
const NETWORK = /google/i;
const LEGACY = /hanhan|yating|zhiwei|huihui|kangkang|yaoyao|espeak|desktop/i;
const WARM = /yunjhe|yunxi|yunyang|yunjian|男|male/i;

const isMandarin = (v) => {
  const lang = v.lang.replace('_', '-').toLowerCase();
  return (lang.startsWith('zh') || lang.startsWith('cmn')) && !/hk|yue|mo/.test(lang); // Cantonese reads the wrong language
};
const isTaiwan = (v) => /tw|hant/i.test(v.lang) || /臺灣|台灣|taiwan/i.test(v.name);

function score(v) {
  let s = isTaiwan(v) ? 40 : 15;
  if (NATURAL.test(v.name)) s += 45;
  else if (NETWORK.test(v.name)) s += 30;
  if (LEGACY.test(v.name)) s -= 40;
  if (NATURAL.test(v.name) && WARM.test(v.name)) s += 4;
  if (!v.localService) s += 2;
  return s;
}

/** A short name a visitor recognises: "HsiaoChen", "Google 國語（臺灣）", "美佳". */
function label(v) {
  return v.name
    .replace(/^Microsoft\s+/i, '')
    .replace(/\s+-\s+.*$/, '')
    .replace(/\s*Online\s*\(Natural\)/i, '')
    .replace(/\s*\((Enhanced|Premium)\)/i, '')
    .trim();
}

function quality(v) {
  if (NATURAL.test(v.name)) return '自然語音';
  if (NETWORK.test(v.name)) return '線上語音';
  if (LEGACY.test(v.name)) return '舊式語音，較生硬';
  return '裝置內建';
}

/** The Mandarin voices on this device, best first. */
export function voices() {
  if (!synth) return [];
  return synth.getVoices()
    .filter(isMandarin)
    .map((v) => ({
      id: v.voiceURI || v.name,
      label: label(v),
      note: `${isTaiwan(v) ? '臺灣國語' : '普通話'}，${quality(v)}`,
      score: score(v),
      voice: v,
    }))
    .sort((a, b) => b.score - a.score);
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) || '{}');
    return { voice: typeof s.voice === 'string' ? s.voice : null, rate: RATES.some((r) => r.id === s.rate) ? s.rate : 'normal' };
  } catch {
    return { voice: null, rate: 'normal' };
  }
}

let settings = load();
let mode = null;
let voice = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn(mode));

export function onModeChange(fn) {
  listeners.add(fn);
  fn(mode);
  return () => listeners.delete(fn);
}

function pickMode() {
  const list = voices();
  voice = list.find((x) => x.id === settings.voice)?.voice || list[0]?.voice || null;
  mode = voice ? 'browser' : null;
  notify();
}

export const getSettings = () => ({ ...settings, voice: voice ? voice.voiceURI || voice.name : settings.voice });

export function setSettings(patch) {
  settings = { ...settings, ...patch };
  try { localStorage.setItem(STORE, JSON.stringify(settings)); } catch { /* private mode: keep it for this visit */ }
  pickMode();
}

let ready = false;
export function initSpeech() {
  if (ready) return;
  ready = true;
  if (synth) {
    if (synth.addEventListener) synth.addEventListener('voiceschanged', pickMode);
    else synth.onvoiceschanged = pickMode;
  }
  pickMode();
  window.addEventListener('pagehide', stopSpeech);
}

let session = 0;

export function stopSpeech() {
  session += 1;
  if (synth && (synth.speaking || synth.pending)) synth.cancel();
}

/**
 * Reads segments in order: [{ part, text }].
 * cb: { onSegment(index), onPlaying(), onEnd() }. Call from a tap so phones allow sound.
 */
export function speak(segments, cb = {}) {
  stopSpeech();
  if (!synth) return;
  const mine = session;
  const live = () => mine === session;
  const rate = RATES.find((r) => r.id === settings.rate)?.value || 1.2;
  let i = 0;

  const next = () => {
    if (!live()) return;
    if (i >= segments.length) { cb.onEnd?.(); return; }
    const seg = segments[i];
    cb.onSegment?.(i);
    i += 1;
    const parts = sentences(seg.text);
    let k = 0;
    const say = () => {
      if (!live()) return;
      if (k >= parts.length) { next(); return; }
      const u = new SpeechSynthesisUtterance(parts[k]);
      k += 1;
      if (voice) u.voice = voice;
      u.lang = voice?.lang || 'zh-TW';
      u.rate = rate;
      u.pitch = 1; // shifting pitch is what makes many voices sound synthetic
      u.onstart = () => live() && cb.onPlaying?.();
      u.onend = say;
      u.onerror = (e) => {
        if (!live() || e.error === 'interrupted' || e.error === 'canceled') return;
        say();
      };
      synth.speak(u);
    };
    say();
  };
  next();
}
