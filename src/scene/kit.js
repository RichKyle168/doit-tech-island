/**
 * Low-poly building kit: flat-shaded primitives with shared materials, and the chart palette.
 */
import * as THREE from 'three';

export const PALETTE = {
  paper: '#EEF3F1',     // survey white: deep water and the sky
  deep: '#E6EFEE',
  shoal: '#7FC2C0',
  sea: '#0E4F5C',       // deep sea ink
  ink: '#14263A',       // chart ink
  buoy: '#F2C230',      // highlight
  sand: '#E9DDBE',
  meadow: '#B7C9A0',
  tree: '#5E8C5A',
  trunk: '#7A5C44',
  white: '#F7F7F2',
  concrete: '#D9DCD6',
  steel: '#9AA7AE',
  glass: '#A9D3DA',
  dark: '#334657',
};

const MATS = new Map();
/** One shared flat-shaded material per colour (and per variant). */
export function mat(color, opts = {}) {
  const k = `${color}|${JSON.stringify(opts)}`;
  if (!MATS.has(k)) {
    MATS.set(k, new THREE.MeshStandardMaterial({
      color, flatShading: true, roughness: 0.92, metalness: 0, ...opts,
    }));
  }
  return MATS.get(k);
}

export const glow = (color) => mat(color, { emissive: color, emissiveIntensity: 0.9 });

function mesh(geo, color, cast = true) {
  const m = new THREE.Mesh(geo, typeof color === 'string' ? mat(color) : color);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

/** Each primitive sits on y = 0 unless moved. */
export const box = (w, h, d, color) => { const m = mesh(new THREE.BoxGeometry(w, h, d), color); m.position.y = h / 2; return m; };
export const cyl = (rt, rb, h, seg, color) => { const m = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), color); m.position.y = h / 2; return m; };
export const cone = (r, h, seg, color) => { const m = mesh(new THREE.ConeGeometry(r, h, seg), color); m.position.y = h / 2; return m; };
export const ball = (r, detail, color) => { const m = mesh(new THREE.IcosahedronGeometry(r, detail), color); m.position.y = r; return m; };

/** Place a mesh: at(m, x, y, z) adds to the current y offset of a primitive. */
export function at(m, x = 0, y = 0, z = 0) {
  m.position.x += x;
  m.position.y += y;
  m.position.z += z;
  return m;
}

export function group(...children) {
  const g = new THREE.Group();
  children.flat().filter(Boolean).forEach((c) => g.add(c));
  return g;
}

/** Lighten (amount > 0) or darken (amount < 0) a hex colour. */
export function shade(hex, amount) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s * (amount < 0 ? 1 : 1 - amount * 0.35), Math.min(1, Math.max(0, hsl.l + amount)));
  return `#${c.getHexString()}`;
}

export const mix = (a, b, t) => `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;
