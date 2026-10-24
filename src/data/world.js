/**
 * The island world, indexed for the interface.
 *
 *   islands   (kind 'island')    one per industry domain
 *   districts (kind 'district')  one per chapter; ids match the systems in technologies.js
 *   topics    (kind 'topic')     the research stories of a district
 *   streets   (kind 'street')    groups of technologies inside a district (機器人: 感知、決策…)
 *   techs     (kind 'tech')      key technologies
 */
import {
  CHAPTERS as RAW_CHAPTERS, DOCUMENT, DOMAINS as RAW_DOMAINS, EDGES, NODES, RELATION_LABEL, SOURCES,
} from '../../content/index.js';

export { DOCUMENT, SOURCES, RELATION_LABEL };

const SYSTEMS = Object.fromEntries(NODES.filter((n) => n.level === 'L3').map((n) => [n.id, n]));
const INHERIT = ['nameZh', 'nameEn', 'summary', 'description', 'whyItMatters', 'industryValue', 'taiwan'];

export const TECHS = NODES.filter((n) => n.level === 'L4').map((n) => ({
  ...n, kind: 'tech', district: n.system, street: n.capability,
}));

// one roof colour per street of technologies (distinguishable on the chart and in the lists)
export const STREET_COLOURS = ['#0E4F5C', '#B5703A', '#5A4E8C', '#3F7F5C', '#A04F5C', '#2F6C8F'];
export const STREETS = NODES.filter((n) => n.category === 'constellation').map((c, i, all) => ({
  ...c,
  kind: 'street',
  district: c.system,
  colour: STREET_COLOURS[all.filter((x) => x.system === c.system).indexOf(c) % STREET_COLOURS.length],
}));

export const DISTRICTS = RAW_CHAPTERS.map((c) => {
  const sys = SYSTEMS[c.id];
  const base = sys ? Object.fromEntries(INHERIT.filter((k) => sys[k] != null).map((k) => [k, sys[k]])) : {};
  const d = { kind: 'district', ...base, ...c };
  d.topics = (c.topics || []).map((t, i) => ({ ...t, id: `${c.id}~${i + 1}`, kind: 'topic', district: c.id, n: i + 1 }));
  return d;
});

export const ISLANDS = RAW_DOMAINS.map((d) => ({ ...d, kind: 'island', islandZh: `${d.nameZh}島` }));
export const DOMAINS = RAW_DOMAINS;

const BY_ID = new Map();
for (const list of [ISLANDS, DISTRICTS, STREETS, TECHS]) list.forEach((x) => BY_ID.set(x.id, x));
DISTRICTS.forEach((d) => d.topics.forEach((t) => BY_ID.set(t.id, t)));

export const get = (id) => BY_ID.get(id) || null;
export const islandOf = (x) => {
  if (!x) return null;
  if (x.kind === 'island') return x;
  if (x.kind === 'district') return get(x.domain);
  return islandOf(get(x.district));
};
export const districtOf = (x) => (x?.kind === 'district' ? x : x?.district ? get(x.district) : null);
export const districtsOf = (islandId) => DISTRICTS.filter((d) => d.domain === islandId);
export const techsOf = (districtId) => TECHS.filter((t) => t.district === districtId);
export const streetsOf = (districtId) => STREETS.filter((s) => s.district === districtId);
export const techsOnStreet = (streetId) => TECHS.filter((t) => t.street === streetId);

/** How a page's name is said (and shown as its title): 機械島, 機器人區, 感知街… */
export function spokenName(x) {
  if (!x) return '';
  if (x.kind === 'island') return x.islandZh;
  if (x.kind === 'district') return `${x.nameZh}區`;
  if (x.kind === 'street') return `${x.nameZh}街`;
  if (x.kind === 'topic') return x.t.replace(/　/g, ' ');
  return x.nameZh;
}

// ─────────────────────────────────────────────── links between technologies and districts
const DISTRICT_IDS = new Set(DISTRICTS.map((d) => d.id));
const TECH_IDS = new Set(TECHS.map((t) => t.id));

/** Links of a technology: other technologies, and districts elsewhere that it reaches. */
export function techLinks(id) {
  const out = [];
  for (const e of EDGES) {
    if (e.from !== id && e.to !== id) continue;
    const other = e.from === id ? e.to : e.from;
    if (TECH_IDS.has(other) || DISTRICT_IDS.has(other)) out.push({ other, relation: e.relation, label: e.label, refs: e.refs });
  }
  return out;
}

/**
 * Sea routes: a technology of one district that the content links to another district.
 * Aggregated per district pair; `sea` = the two districts are on different islands.
 */
export const ROUTES = (() => {
  const pairs = new Map();
  for (const e of EDGES) {
    const [tech, target] = TECH_IDS.has(e.from) && DISTRICT_IDS.has(e.to) ? [e.from, e.to]
      : TECH_IDS.has(e.to) && DISTRICT_IDS.has(e.from) ? [e.to, e.from] : [];
    if (!tech) continue;
    const from = get(tech).district;
    if (from === target) continue;
    const k = `${from}>${target}`;
    if (!pairs.has(k)) pairs.set(k, { id: k, from, to: target, links: [] });
    pairs.get(k).links.push({ tech, label: e.label, relation: e.relation });
  }
  return [...pairs.values()].map((r) => ({ ...r, sea: get(r.from).domain !== get(r.to).domain }));
})();

/** Districts a district is linked to (either direction), with the technologies that link them. */
export function districtLinks(id) {
  return ROUTES.filter((r) => r.from === id || r.to === id).map((r) => ({
    other: r.from === id ? r.to : r.from,
    links: r.links,
  }));
}

// ─────────────────────────────────────────────── sources behind a page
const TEXT_KEYS = ['placement', 'tagline', 'summary', 'description', 'howItWorks', 'whyItMatters', 'focus',
  'applications', 'industryValue', 'taiwan', 'topics', 'projects'];

export function refsOf(x) {
  if (!x) return [];
  const out = new Set();
  const add = (v) => {
    if (!v) return;
    if (Array.isArray(v)) v.forEach(add);
    else (v.refs || []).forEach((r) => out.add(r));
  };
  if (x.kind === 'topic') add(x);
  else TEXT_KEYS.forEach((k) => add(x[k]));
  return [...out].filter((r) => SOURCES[r]);
}

export const sourcesFor = (refs) => refs.map((r) => SOURCES[r]).filter(Boolean);

// ─────────────────────────────────────────────── search
const textOf = (v) => (!v ? '' : Array.isArray(v) ? v.map((a) => a.t).join(' ') : v.t || '');
const INDEX = [
  ...ISLANDS.map((x) => ({ id: x.id, kind: 'island', name: x.islandZh, sub: x.nameEn, hay: [x.islandZh, x.nameEn, textOf(x.tagline)].join(' ') })),
  ...DISTRICTS.map((x) => ({ id: x.id, kind: 'district', name: x.nameZh, sub: get(x.domain).islandZh,
    hay: [x.nameZh, x.nameEn, ...TEXT_KEYS.map((k) => textOf(x[k])), (x.projects || []).map((p) => p.by).join(' ')].join(' ') })),
  ...DISTRICTS.flatMap((d) => d.topics.map((t) => ({ id: t.id, kind: 'topic', name: t.t.replace(/　/g, ' '), sub: d.nameZh, hay: t.t }))),
  ...TECHS.map((x) => ({ id: x.id, kind: 'tech', name: x.nameZh, sub: get(x.district).nameZh,
    hay: [x.nameZh, x.nameEn, ...(x.tags || []), ...TEXT_KEYS.map((k) => textOf(x[k]))].join(' ') })),
];
const KIND_ORDER = { island: 0, district: 1, tech: 2, topic: 3 };

export function search(q) {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return INDEX
    .map((e) => {
      const name = e.name.toLowerCase();
      const hay = e.hay.toLowerCase();
      if (!words.every((w) => hay.includes(w) || name.includes(w))) return null;
      const score = words.reduce((s, w) => s + (name.includes(w) ? (name.startsWith(w) ? 6 : 4) : 1), 0);
      return { ...e, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
    .slice(0, 30);
}

export const COUNTS = {
  islands: ISLANDS.length,
  districts: DISTRICTS.length,
  topics: DISTRICTS.reduce((n, d) => n + d.topics.length, 0),
  techs: TECHS.length,
  projects: DISTRICTS.reduce((n, d) => n + (d.projects?.length || 0), 0),
};
