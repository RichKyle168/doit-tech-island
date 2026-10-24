/**
 * What the voice reads for one part of one page: the same text the page shows,
 * so the voice can only ever read the site's own content.
 */
import { get, spokenName } from '../src/data/world.js';
import { lineFor } from '../src/data/guide.js';
import { DISTRICT_PARTS, SAMPLE, TECH_PARTS, partText, speakable } from '../shared/speech.js';

const FIELDS = new Set(['tagline', ...TECH_PARTS.map(([k]) => k), ...DISTRICT_PARTS.map(([k]) => k)]);
const LABELS = new Set([...TECH_PARTS, ...DISTRICT_PARTS].filter(([, l]) => l).map(([k]) => `label-${k}`));

export function textFor(id, part) {
  if (part === 'sample') return speakable(SAMPLE);
  if (part === 'drt') {
    const x = get(id);
    if (id !== 'sea' && !x) return null;
    return speakable(lineFor(id === 'sea' ? { kind: 'sea' } : { kind: x.kind, id }));
  }
  const x = get(id);
  if (!x) return null;
  if (part === 'name') return speakable(spokenName(x));
  if (!FIELDS.has(part) && !LABELS.has(part)) return null;
  const raw = partText(x, part);
  return raw ? speakable(raw) : null;
}
