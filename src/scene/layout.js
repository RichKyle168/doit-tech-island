/**
 * Where everything sits on the chart.
 *
 * Land is a grid of pointy-top hexagons (axial coordinates q, r; circumradius R).
 * A district is a "flower" of 7 hexes: the centre holds the district's landmark,
 * the 6 petals hold its topics (or, for 機器人, its 6 neighbourhoods of technologies).
 * Flowers tile the plane on the lattice spanned by (2,1) and (-1,3), so the districts
 * of an island fit together without gaps; a ragged coast of filler hexes goes around them.
 */
import { DOMAINS } from '../data/world.js';

export const R = 3;                    // hex circumradius (world units)
const SQ3 = Math.sqrt(3);

export const axialToXZ = (q, r) => [R * SQ3 * (q + r / 2), R * 1.5 * r];
const key = (q, r) => `${q},${r}`;
const NEIGHBOURS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
// the 6 flower centres around a flower, in angular order
const RING = [[2, 1], [3, -2], [1, -3], [-2, -1], [-3, 2], [-1, 3]];
// which flower slots an island with n districts uses (compact shapes)
const SLOTS = {
  1: [[0, 0]],
  2: [[0, 0], [2, 1]],
  3: [[0, 0], [2, 1], [3, -2]],
  4: [[0, 0], [2, 1], [3, -2], [-1, 3]],
  5: [[0, 0], [2, 1], [-1, 3], [-2, -1], [1, -3]],
};

/** Deterministic random numbers, so every visitor sees the same coastline. */
export function rng(seed) {
  let s = 0;
  for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  s = s || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function islandLayout(domain) {
  const rand = rng(domain.id);
  const chapters = domain.chapters;
  const slots = SLOTS[chapters.length];
  // centre the island on its flower centroid
  const cx = slots.reduce((a, s) => a + s[0], 0) / slots.length;
  const cr = slots.reduce((a, s) => a + s[1], 0) / slots.length;
  const tiles = new Map(); // key -> tile
  const districts = chapters.map((id, i) => {
    const [fq, fr] = slots[i];
    const cells = [[0, 0], ...NEIGHBOURS].map(([dq, dr], k) => {
      const q = fq + dq; const r = fr + dr;
      const tile = { q, r, kind: k === 0 ? 'centre' : 'petal', district: id, petal: k - 1 };
      tiles.set(key(q, r), tile);
      return tile;
    });
    return { id, flower: [fq, fr], cells };
  });

  // coast: neighbours of district land, thinned at random, then a few stray outer hexes
  const coast = [];
  const consider = (q, r, keepChance, kind) => {
    const k = key(q, r);
    if (tiles.has(k) || rand() > keepChance) return;
    const tile = { q, r, kind };
    tiles.set(k, tile);
    coast.push(tile);
  };
  for (const t of [...tiles.values()]) for (const [dq, dr] of NEIGHBOURS) consider(t.q + dq, t.r + dr, 0.82, 'shore');
  for (const t of [...coast]) for (const [dq, dr] of NEIGHBOURS) consider(t.q + dq, t.r + dr, 0.16, 'beach');
  // inner shore tiles next to two or more district tiles read as land, outer ones as beach
  for (const t of coast) {
    if (t.kind !== 'shore') continue;
    const landNear = NEIGHBOURS.filter(([dq, dr]) => tiles.get(key(t.q + dq, t.r + dr))?.district).length;
    t.kind = landNear >= 2 ? 'meadow' : rand() < 0.55 ? 'beach' : 'meadow';
    t.tree = t.kind === 'meadow' && rand() < 0.55;
  }

  const [ox, oz] = domain.at;
  const [ccx, ccz] = axialToXZ(cx, cr);
  const place = (t) => {
    const [x, z] = axialToXZ(t.q, t.r);
    t.x = x - ccx + ox;
    t.z = z - ccz + oz;
  };
  tiles.forEach(place);
  let radius = 0;
  tiles.forEach((t) => { radius = Math.max(radius, Math.hypot(t.x - ox, t.z - oz) + R); });

  return {
    id: domain.id,
    centre: [ox, oz],
    radius,
    tiles: [...tiles.values()],
    districts: districts.map((d) => ({ ...d, centre: [d.cells[0].x, d.cells[0].z] })),
  };
}

let cache = null;
/** The whole chart: islands, districts and their tiles. */
export function chart() {
  if (cache) return cache;
  const islands = DOMAINS.map(islandLayout);
  const districts = {};
  islands.forEach((isl) => isl.districts.forEach((d) => { districts[d.id] = { ...d, island: isl.id }; }));
  cache = { islands, islandById: Object.fromEntries(islands.map((i) => [i.id, i])), districts };
  return cache;
}

