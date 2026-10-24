/**
 * Read-aloud engine.
 *
 *   server  — the site has a natural neural voice (/api/tts, a warm Taiwanese male voice):
 *             play its mp3 for each part
 *   browser — the device's own Mandarin voices (Web Speech API)
 *   null    — nothing that can speak Mandarin: read-aloud buttons are hidden
 *
 * Which voice: the most natural-sounding Mandarin voice the device has. Neural and
 * "enhanced/premium" voices first (Edge's "… Online (Natural)", Apple's enhanced voices,
 * Google's network voices), Taiwanese Mandarin before other Mandarin, and the old desktop
 * voices (Hanhan, Yating, Zhiwei…) last, because those are the ones that sound mechanical.
 * The visitor can pick another voice and a speed; the choice is remembered on that device.
 * Pitch stays at the voice's own setting; speed defaults to a brisk 1.1×.
 * One thing speaks at a time.
 */
import { SAMPLE, sentences } from '../../shared/speech.js';

export { SAMPLE };

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
const STORE = 'tech-island.voice';
const audio = typeof Audio !== 'undefined' ? new Audio() : null;
if (audio) audio.preload = 'auto';
export const SERVER_VOICE = 'server';
// the one-file preview has no server behind it
const HAS_API = import.meta.env.MODE !== 'artifact';

// 「正常」 is a little brisker than a voice's default (1.0 reads slowly for most Mandarin voices)
export const RATES = [
  { id: 'slow', label: '慢一點', value: 0.9 },
  { id: 'normal', label: '正常', value: 1.1 },
  { id: 'fast', label: '快一點', value: 1.3 },
  { id: 'faster', label: '更快', value: 1.5 },
];

const NATURAL = /natural|neural|premium|enhanced|增強|優化|高音質|siri/i;
const NETWORK = /google/i;
const LEGACY = /hanhan|yating|zhiwei|huihui|kangkang|yaoyao|espeak|desktop/i;
// voice names that tell the gender (the Web Speech API itself does not say)
const MALE = /yunjhe|yunxi|yunyang|yunjian|yunhao|yunfeng|yunze|yunxia|zhiwei|kangkang|li-?mu|李牧|男|\bmale\b/i;
const FEMALE = /hsiaochen|hsiaoyu|xiaoxiao|xiaoyi|xiaohan|xiaomeng|xiaomo|xiaoqiu|xiaorui|xiaoshuang|xiaoxuan|xiaoyan|xiaoyou|xiaozhen|hanhan|yating|huihui|yaoyao|mei-?jia|美佳|ting-?ting|婷婷|sinji|yu-?shu|shanshan|女|female|google/i;
const genderOf = (v) => (MALE.test(v.name) ? 'male' : FEMALE.test(v.name) ? 'female' : null);

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
  if (genderOf(v) === 'male') s += 35; // a male voice is preferred
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

let serverVoice = false;

/** Voices to choose from, best first: the site's natural male voice (when set up), then the device's. */
export function voices() {
  const list = serverVoice ? [{ id: SERVER_VOICE, label: '網站的自然人聲', note: '臺灣國語，男聲，自然語音', score: 1000, gender: 'male' }] : [];
  if (!synth) return list;
  return list.concat(synth.getVoices()
    .filter(isMandarin)
    .map((v) => ({
      id: v.voiceURI || v.name,
      label: label(v),
      note: [isTaiwan(v) ? '臺灣國語' : '普通話', { male: '男聲', female: '女聲' }[genderOf(v)], quality(v)].filter(Boolean).join('，'),
      score: score(v),
      gender: genderOf(v),
      voice: v,
    }))
    .sort((a, b) => b.score - a.score));
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
  const chosen = list.find((x) => x.id === settings.voice) || list[0] || null;
  mode = !chosen ? null : chosen.id === SERVER_VOICE ? 'server' : 'browser';
  voice = chosen?.voice || list.find((x) => x.voice)?.voice || null; // also the fallback when the server voice fails
  notify();
}

export const getSettings = () => {
  const list = voices();
  const chosen = list.find((x) => x.id === settings.voice) || list[0];
  return { ...settings, voice: chosen?.id || null };
};

export function setSettings(patch) {
  settings = { ...settings, ...patch };
  try { localStorage.setItem(STORE, JSON.stringify(settings)); } catch { /* private mode: keep it for this visit */ }
  pickMode();
}

let ready = null;
export function initSpeech() {
  if (ready) return ready;
  ready = (async () => {
    if (HAS_API && audio) {
      try {
        const r = await fetch('/api/tts', { headers: { Accept: 'application/json' } });
        serverVoice = r.ok && Boolean((await r.json()).available);
      } catch { serverVoice = false; }
    }
    if (synth) {
      if (synth.addEventListener) synth.addEventListener('voiceschanged', pickMode);
      else synth.onvoiceschanged = pickMode;
    }
    pickMode();
  })();
  window.addEventListener('pagehide', stopSpeech);
  return ready;
}

let session = 0;

export function stopSpeech() {
  session += 1;
  if (audio && audio.src) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }
  if (synth && (synth.speaking || synth.pending)) synth.cancel();
}

/** A short fingerprint of the text, so a cached recording is replaced when the text changes. */
function fingerprint(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

/**
 * Reads segments in order: [{ id, part, text }].
 * cb: { onSegment(index), onPlaying(), onEnd(), onError() }. Call from a tap so phones allow sound.
 */
export function speak(segments, cb = {}) {
  stopSpeech();
  const mine = session;
  const live = () => mine === session;
  const rate = RATES.find((r) => r.id === settings.rate)?.value || 1.1;
  let i = 0;

  const browser = (seg, done) => {
    if (!synth) { done(); return; }
    const parts = sentences(seg.text);
    let k = 0;
    const say = () => {
      if (!live()) return;
      if (k >= parts.length) { done(); return; }
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

  const server = (seg, done) => {
    if (!seg.id) { browser(seg, done); return; }
    audio.onended = () => live() && done();
    audio.onerror = () => live() && browser(seg, done); // voice service unavailable: fall back to the device voice
    audio.onplaying = () => live() && cb.onPlaying?.();
    audio.src = `/api/tts/${encodeURIComponent(seg.id)}/${encodeURIComponent(seg.part)}?h=${fingerprint(seg.text)}`;
    audio.playbackRate = rate;
    const p = audio.play();
    if (p?.catch) {
      p.catch((err) => {
        if (!live()) return;
        if (err?.name === 'NotAllowedError') { cb.onError?.(err); return; }
        if (err?.name !== 'AbortError') browser(seg, done);
      });
    }
  };

  const next = () => {
    if (!live()) return;
    if (i >= segments.length) { cb.onEnd?.(); return; }
    const seg = segments[i];
    cb.onSegment?.(i);
    i += 1;
    if (mode === 'server') server(seg, next);
    else browser(seg, next);
  };
  next();
}
