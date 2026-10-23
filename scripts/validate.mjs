// Integrity check for the island content: every reference resolves, every district is placed,
// and the topic and project lists match the passages they were copied from.
// Usage: node scripts/validate.mjs
import { DOMAINS, CHAPTERS, SOURCES, NODES } from '../content/index.js';
import { DISTRICTS, ISLANDS, TECHS, refsOf } from '../src/data/world.js';
import { LANDMARKS } from '../src/scene/landmarks.js';

const problems = [];
const say = (msg) => problems.push(msg);
const norm = (s) => s.replace(/\s+/g, '').replace(/　/g, '').replace(/＋/g, '+');
// spelling fixed for display only (the source excerpt keeps the original)
const FIXES = [['茶香Al', '茶香AI'], ['無人戴具', '無人載具']];
const fix = (s) => FIXES.reduce((a, [from, to]) => a.replaceAll(from, to), s);

const chapterIds = new Set(CHAPTERS.map((c) => c.id));
for (const d of DOMAINS) {
  for (const id of d.chapters) {
    const c = CHAPTERS.find((x) => x.id === id);
    if (!c) say(`island ${d.id}: unknown district ${id}`);
    else if (c.domain !== d.id) say(`district ${id} says domain ${c.domain}, listed on ${d.id}`);
  }
}
for (const c of CHAPTERS) {
  if (!DOMAINS.some((d) => d.chapters.includes(c.id))) say(`district ${c.id} is on no island`);
  if (!LANDMARKS[c.landmark]) say(`district ${c.id}: no landmark "${c.landmark}"`);
}
for (const d of DISTRICTS) {
  if (!d.nameZh) say(`district ${d.id}: no name`);
  if (!d.summary) say(`district ${d.id}: no summary`);
}

// every ref points at a source
const allRefs = (x) => {
  const out = [];
  const walk = (v) => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (Array.isArray(v.refs)) out.push(...v.refs);
    Object.values(v).forEach((y) => { if (y && typeof y === 'object' && y !== v.refs) walk(y); });
  };
  walk(x);
  return out;
};
for (const x of [...ISLANDS, ...DISTRICTS, ...TECHS]) {
  for (const r of allRefs(x)) if (!SOURCES[r]) say(`${x.id}: unknown source ${r}`);
  if (!refsOf(x).length) say(`${x.id}: nothing to show under 資料來源`);
}

// topics and projects are copied in full, in order, from their passages
for (const d of DISTRICTS) {
  const tRef = d.topics[0]?.refs[0];
  if (!tRef) { say(`district ${d.id}: no topics`); continue; }
  const tocParts = SOURCES[tRef].excerpt.split('｜').slice(1).map((p) => norm(fix(p)));
  const mine = d.topics.map((t) => norm(t.t));
  if (tocParts.join('|') !== mine.join('|')) say(`district ${d.id}: topics differ from ${tRef}\n  source: ${tocParts.join(' | ')}\n  island: ${mine.join(' | ')}`);
  const pRef = d.projects?.[0]?.refs[0];
  if (!pRef) { say(`district ${d.id}: no projects`); continue; }
  const srcRows = SOURCES[pRef].excerpt.split('｜').map((p) => norm(fix(p)));
  const rows = d.projects.map((p) => norm(`${p.t}／${p.by}`));
  if (srcRows.join('|') !== rows.join('|')) say(`district ${d.id}: projects differ from ${pRef}`);
}

// the technologies all belong to a district on the chart
for (const t of TECHS) if (!chapterIds.has(t.district)) say(`tech ${t.id}: district ${t.district} is not on the chart`);
if (!NODES.length) say('no technologies loaded');

if (problems.length) {
  console.log(problems.join('\n'));
  console.log(`${problems.length} problems`);
  process.exit(1);
}
console.log(`ok: ${ISLANDS.length} islands, ${DISTRICTS.length} districts, ${DISTRICTS.reduce((n, d) => n + d.topics.length, 0)} topics, ${DISTRICTS.reduce((n, d) => n + (d.projects?.length || 0), 0)} projects, ${TECHS.length} technologies`);
