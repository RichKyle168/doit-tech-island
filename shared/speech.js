/**
 * Read-aloud rules: which parts of a page can be read, what text each part reads,
 * and how that text is tidied for a voice (symbols spelled out, units in words,
 * sentences split for pacing).
 */

/** A technology page, in reading order. label = section heading (null for the opening summary). */
export const TECH_PARTS = [
  ['summary', null],
  ['description', '這是什麼'],
  ['howItWorks', '它如何運作'],
  ['whyItMatters', '為什麼重要'],
  ['applications', '應用在哪裡'],
  ['industryValue', '產業價值'],
  ['taiwan', '臺灣布局'],
];

/** A district page (one chapter), in reading order. */
export const DISTRICT_PARTS = [
  ['summary', null],
  ['description', '這是什麼'],
  ['whyItMatters', '為什麼重要'],
  ['focus', '研發重點'],
  ['industryValue', '產業價值'],
  ['taiwan', '臺灣布局'],
  ['topics', '研發主題'],
  ['projects', '科技專案'],
];

/** An island page. */
export const ISLAND_PARTS = [['tagline', null]];

const LABELS = Object.fromEntries([...TECH_PARTS, ...DISTRICT_PARTS].filter(([, l]) => l));

/** Raw text of one part of a page, or null when the part is empty. */
export function partText(item, part) {
  if (!item) return null;
  if (part === 'name') return item.nameZh || null;
  if (part.startsWith('label-')) return LABELS[part.slice(6)] || null;
  const v = item[part];
  if (!v) return null;
  if (Array.isArray(v)) {
    if (!v.length) return null;
    return v.map((a) => {
      const t = a.t.replace(/[。．.！!]$/, '').replace(/　/g, '，');
      return a.by ? `${t}，由${a.by}執行` : t;
    }).join('。');
  }
  return v.t || null;
}

/** Spells out what a voice would otherwise stumble over. */
export function speakable(text) {
  return String(text)
    .replace(/[「」『』"《》]/g, '')
    .replace(/(\d)\s*[~～]\s*(\d)/g, '$1到$2')
    .replace(/\s*≥\s*/g, '大於等於')
    .replace(/\s*≤\s*/g, '小於等於')
    .replace(/\s*>\s*/g, '大於')
    .replace(/\s*<\s*/g, '小於')
    .replace(/(\d)\s*ms\b/g, '$1毫秒')
    .replace(/(\d)\s*mm\b/g, '$1公釐')
    .replace(/(\d)\s*kg\b/gi, '$1公斤')
    .replace(/(\d)\s*fps\b/gi, '$1 FPS')
    .replace(/\bTier1\b/g, 'Tier 1')
    .replace(/[／/]/g, '、')
    .replace(/[＋+]/g, '加')
    .replace(/\s*×\s*/g, '與')
    .replace(/\s*→\s*/g, '，再到')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Sentence-sized pieces (so a browser voice keeps a natural pace and never cuts off). */
export function sentences(text, max = 90) {
  const out = [];
  for (const s of text.split(/(?<=[。！？；])/)) {
    let rest = s.trim();
    while (rest.length > max) {
      const cut = Math.max(rest.lastIndexOf('，', max), rest.lastIndexOf('、', max));
      const at = cut > 20 ? cut + 1 : max;
      out.push(rest.slice(0, at));
      rest = rest.slice(at).trim();
    }
    if (rest) out.push(rest);
  }
  return out;
}
