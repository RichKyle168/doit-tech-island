/**
 * Builds the islands: hex land (one merged mesh per island), district borders, trees,
 * landmarks, topic houses and technology pavilions — plus the anchors the interface needs
 * (where labels go, where the camera looks, what can be tapped).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DISTRICTS, ISLANDS, get, streetsOf, techsOnStreet } from '../data/world.js';
import { PALETTE as P, mat, mix, shade } from './kit.js';
import { R, chart, rng } from './layout.js';
import { buildLandmark } from './landmarks.js';
import { house, pavilion, tree } from './props.js';

const BASE = -1.6; // hexes reach below the water line
const HEIGHT = { centre: 1.9, petal: 1.6, meadow: 1.2, beach: 0.5 };
const DISTRICT_TINT = [0.07, -0.03, 0.12, -0.08, 0.02];

const SIDE = (top) => shade(top, -0.2);

function hexPrism(x, z, h, top, side, inset = 0.965) {
  const g = new THREE.CylinderGeometry(R * inset, R * (inset + 0.02), h - BASE, 6, 1).toNonIndexed();
  g.translate(x, BASE + (h - BASE) / 2, z);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const ct = new THREE.Color(top);
  const cs = new THREE.Color(side);
  for (let i = 0; i < pos.count; i += 1) {
    const c = nor.getY(i) > 0.5 ? ct : cs;
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.deleteAttribute('uv');
  return g;
}

// the 6 corners of a pointy-top hex (matches CylinderGeometry's vertex order)
const corner = (x, z, k, s = R) => {
  const a = (k / 6) * Math.PI * 2;
  return [x + Math.sin(a) * s, z + Math.cos(a) * s];
};

export function buildIslands() {
  const { islands } = chart();
  const root = new THREE.Group();
  const anchors = new Map();   // id -> THREE.Vector3   label positions
  const focus = new Map();     // id -> { target: Vector3, radius }
  const pick = [];             // meshes the pointer can hit; userData.pick = id
  const marks = new Map();     // id -> { position: Vector3, radius } for highlight rings
  const updaters = [];
  const landTiles = [];        // for the sea's depth map
  const landMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 });
  const borderMat = new THREE.LineBasicMaterial({ color: P.ink, transparent: true, opacity: 0.32 });

  const pickVolume = (id, x, y, z, radius, height) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 6), new THREE.MeshBasicMaterial());
    m.position.set(x, y + height / 2, z);
    m.visible = false;
    m.userData.pick = id;
    m.userData.volume = true;
    root.add(m);
    pick.push(m);
  };

  for (const isl of islands) {
    const domain = get(isl.id);
    const rand = rng(`${isl.id}-props`);
    const geos = [];
    const border = [];
    const tileAt = new Map(isl.tiles.map((t) => [`${t.q},${t.r}`, t]));
    const tint = Object.fromEntries(isl.districts.map((d, i) => [d.id, shade(domain.land, DISTRICT_TINT[i % DISTRICT_TINT.length])]));
    const meadow = mix(P.meadow, domain.land, 0.22);

    for (const t of isl.tiles) {
      t.h = HEIGHT[t.kind] + (t.kind === 'centre' ? 0 : (rand() - 0.5) * 0.18);
      const top = t.district ? tint[t.district] : t.kind === 'beach' ? P.sand : meadow;
      const side = t.kind === 'beach' ? shade(P.sand, -0.12) : SIDE(top);
      geos.push(hexPrism(t.x, t.z, t.h, top, side));
      landTiles.push([t.x, t.z]);
      if (t.tree) {
        const n = 1 + Math.floor(rand() * 3);
        for (let k = 0; k < n; k += 1) {
          const tr = tree(rand);
          const a = rand() * Math.PI * 2;
          const d = rand() * R * 0.55;
          tr.position.set(t.x + Math.cos(a) * d, t.h, t.z + Math.sin(a) * d);
          tr.rotation.y = rand() * Math.PI;
          root.add(tr);
        }
      }
      // district borders: hex edges whose neighbour is not in the same district
      if (t.district) {
        const nb = [[0, 1], [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1]];
        for (let k = 0; k < 6; k += 1) {
          // the edge between corner k and k+1 faces neighbour nb[k] (pointy-top, z-first)
          const [dq, dr] = nb[k];
          const n = tileAt.get(`${t.q + dq},${t.r + dr}`);
          if (n && n.district === t.district) continue;
          const [x1, z1] = corner(t.x, t.z, k, R * 0.965);
          const [x2, z2] = corner(t.x, t.z, k + 1, R * 0.965);
          border.push(x1, t.h + 0.02, z1, x2, t.h + 0.02, z2);
        }
      }
    }
    const land = new THREE.Mesh(mergeGeometries(geos), landMat);
    land.receiveShadow = true;
    land.castShadow = true;
    root.add(land);
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(border, 3));
    root.add(new THREE.LineSegments(bg, borderMat));

    const [cx, cz] = isl.centre;
    anchors.set(isl.id, new THREE.Vector3(cx, 11, cz));
    focus.set(isl.id, { target: new THREE.Vector3(cx, 1.5, cz), radius: isl.radius * 0.86 });
    marks.set(isl.id, { position: new THREE.Vector3(cx, 0.08, cz), radius: isl.radius + 1.5, water: true });
    pickVolume(isl.id, cx, -1, cz, isl.radius * 0.9, 8);

    // ── districts
    for (const d of isl.districts) {
      const district = get(d.id);
      const [centre, ...petals] = d.cells;
      const lm = buildLandmark(district.landmark, domain.land);
      lm.obj.position.set(centre.x, centre.h, centre.z);
      lm.obj.rotation.y = (rand() - 0.5) * 0.7;
      lm.obj.traverse((o) => { if (o.isMesh) o.userData.pick = d.id; });
      root.add(lm.obj);
      if (lm.update) {
        updaters.push(lm.update);
        lm.obj.traverse((o) => { o.userData.animated = true; });
      }
      const top = new THREE.Box3().setFromObject(lm.obj).max.y;
      anchors.set(d.id, new THREE.Vector3(centre.x, top + 1.1, centre.z));
      focus.set(d.id, { target: new THREE.Vector3(centre.x, 1.6, centre.z), radius: R * 3.7 });
      marks.set(d.id, { position: new THREE.Vector3(centre.x, centre.h + 0.04, centre.z), radius: R * 0.92 });
      pickVolume(d.id, centre.x, 0, centre.z, R * 2.6, 3.5);

      const streets = streetsOf(d.id);
      if (streets.length) {
        // each petal is a street of technology pavilions
        streets.forEach((s, i) => {
          const petal = petals[i % petals.length];
          const colour = s.colour;
          const techs = techsOnStreet(s.id);
          const ringR = techs.length > 1 ? 1.25 : 0;
          techs.forEach((tech, k) => {
            const a = (k / techs.length) * Math.PI * 2 + i;
            const pv = pavilion(colour);
            pv.position.set(petal.x + Math.cos(a) * ringR, petal.h, petal.z + Math.sin(a) * ringR);
            pv.traverse((o) => { if (o.isMesh) o.userData.pick = tech.id; });
            root.add(pv);
            anchors.set(tech.id, new THREE.Vector3(pv.position.x, petal.h + 2.2, pv.position.z));
            marks.set(tech.id, { position: new THREE.Vector3(pv.position.x, petal.h + 0.04, pv.position.z), radius: 0.95 });
          });
          anchors.set(s.id, new THREE.Vector3(petal.x, petal.h + 3.2, petal.z));
          focus.set(s.id, { target: new THREE.Vector3(petal.x, petal.h + 0.6, petal.z), radius: R * 2.1 });
          marks.set(s.id, { position: new THREE.Vector3(petal.x, petal.h + 0.04, petal.z), radius: R * 0.9 });
          pickVolume(s.id, petal.x, 0, petal.z, R * 0.92, 3.2);
        });
      } else {
        // topic houses on the petals (a second round goes beside the first)
        const roof = shade(domain.land, -0.28);
        district.topics.forEach((topic, i) => {
          const petal = petals[i % 6];
          const round = Math.floor(i / 6);
          const crowded = district.topics.length > 6 && (i % 6) < district.topics.length - 6;
          const outward = Math.atan2(petal.z - centre.z, petal.x - centre.x);
          const side = crowded ? (round === 0 ? -1 : 1) * 0.95 : 0;
          const px = petal.x + Math.cos(outward + Math.PI / 2) * side + Math.cos(outward) * 0.3;
          const pz = petal.z + Math.sin(outward + Math.PI / 2) * side + Math.sin(outward) * 0.3;
          const h = house(Math.floor(rand() * 3), roof, rand);
          h.position.set(px, petal.h, pz);
          h.rotation.y = -outward + Math.PI / 2 + (rand() - 0.5) * 0.4;
          h.traverse((o) => { if (o.isMesh) o.userData.pick = topic.id; });
          root.add(h);
          anchors.set(topic.id, new THREE.Vector3(px, petal.h + 2.6, pz));
          marks.set(topic.id, { position: new THREE.Vector3(px, petal.h + 0.04, pz), radius: 1.05 });
        });
      }
    }
  }

  // every mesh that carries a pick id can be tapped
  root.traverse((o) => {
    if (!o.isMesh || !o.userData.pick || o.userData.volume) return;
    o.userData.solid = true;
    pick.push(o);
  });
  bakeStatic(root);
  return { root, anchors, focus, pick, marks, updaters, landTiles };
}

/**
 * Draw calls: hundreds of small static meshes (trees, houses, pavilions, still landmarks) are
 * merged into one mesh per material. The originals stay in the scene, hidden, so taps still
 * find the exact house or pavilion; animated landmarks are left as they are.
 */
function bakeStatic(root) {
  root.updateMatrixWorld(true);
  const byMaterial = new Map();
  root.traverse((o) => {
    if (!o.isMesh || !o.visible || o.userData.animated || o.userData.volume) return;
    if (Array.isArray(o.material) || o.material.isShaderMaterial) return;
    const list = byMaterial.get(o.material) || [];
    list.push(o);
    byMaterial.set(o.material, list);
  });
  byMaterial.forEach((meshes, material) => {
    if (meshes.length < 2) return;
    const geos = meshes.map((m) => {
      let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      g.applyMatrix4(m.matrixWorld);
      const keep = material.vertexColors ? ['position', 'normal', 'color'] : ['position', 'normal'];
      Object.keys(g.attributes).forEach((k) => { if (!keep.includes(k)) g.deleteAttribute(k); });
      return g;
    });
    const merged = mergeGeometries(geos);
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = meshes.some((m) => m.castShadow);
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
    meshes.forEach((m) => { m.visible = false; });
  });
}

export { ISLANDS, DISTRICTS };
