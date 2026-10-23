/**
 * Read-aloud engine (the device's own Mandarin voice, through the Web Speech API).
 * The warmest voice available is chosen: Taiwanese Mandarin first, natural/neural voices
 * first, a deeper voice first; it reads a little slower and lower than the default,
 * one sentence at a time. One thing speaks at a time.
 * mode: 'browser' when a Mandarin voice exists, null otherwise (buttons are then hidden).
 */
import { sentences } from '../../shared/speech.js';

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

const NATURAL = /natural|neural|online|premium|enhanced|增強|優化|高音質/i;
const DEEP = /yunjhe|zhiwei|yunxi|yunyang|yunjian|li-?mu|\bhan\b|male|男/i;

let mode = null;
let voice = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn(mode));

export function onModeChange(fn) {
  listeners.add(fn);
  fn(mode);
  return () => listeners.delete(fn);
}

function bestVoice() {
  if (!synth) return null;
  const scored = synth.getVoices()
    .map((v) => {
      const lang = v.lang.replace('_', '-').toLowerCase();
      if (!(lang.startsWith('zh') || lang.startsWith('cmn')) || /hk|yue|mo/.test(lang)) return null; // Cantonese voices read the wrong language
      let score = lang.includes('tw') || lang.includes('hant') ? 50 : 20;
      if (NATURAL.test(v.name)) score += 25;
      if (DEEP.test(v.name)) score += 15;
      if (!v.localService) score += 3;
      return { v, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.v || null;
}

function pickMode() {
  voice = bestVoice();
  mode = voice ? 'browser' : null;
  notify();
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
  let i = 0;
  const deep = DEEP.test(voice?.name || '');

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
      u.rate = 0.88;             // unhurried
      u.pitch = deep ? 1 : 0.9;  // a touch lower when the voice itself is light
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
