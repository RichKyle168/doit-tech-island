/**
 * The 3D chart: renderer, camera, lights, the islands and the sea, and everything the
 * interface asks of it — fly to a view, highlight a thing, place the labels, report taps.
 *
 * Views (what the camera frames):
 *   { level: 'sea' }                      the whole archipelago
 *   { level: 'island',   id: islandId }
 *   { level: 'district', id: districtId }
 *   { level: 'street',   id: streetId }   (a street of technology pavilions)
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { get } from '../data/world.js';
import { PALETTE as P } from './kit.js';
import { buildIslands } from './islands.js';
import { buildCompass, buildSea } from './sea.js';
import { buildRoutes } from './routes.js';
import { buildBalloon } from './balloon.js';

const POLAR = { sea: 0.86, island: 0.92, district: 0.98, street: 1.02 };
const SPIN = { sea: 0.32, island: 0.42, district: 0.5, street: 0.5 };
const SEA_RADIUS = 104;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** The chain island → district → street → tech (or → topic) for anything on the chart. */
export function pathOf(id) {
  const x = get(id);
  if (!x) return [];
  if (x.kind === 'island') return [x.id];
  if (x.kind === 'district') return [x.domain, x.id];
  if (x.kind === 'street' || x.kind === 'topic') return [...pathOf(x.district), x.id];
  if (x.kind === 'tech') return [...pathOf(x.street), x.id];
  return [];
}
const viewPath = (view) => (view.level === 'sea' ? [] : pathOf(view.id));

export default class World {
  constructor(container, { onPick, onHover, onReady } = {}) {
    this.container = container;
    this.onPick = onPick;
    this.onHover = onHover;
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.coarse = window.matchMedia('(pointer: coarse)').matches;
    this.view = { level: 'sea' };
    this.inset = { right: 0, bottom: 0, top: 0 };
    this.insetNow = { right: 0, bottom: 0, top: 0 };
    this.labelEls = new Map();
    this.labelSize = new Map();
    this.hoverId = null;
    this.selectedId = null;
    this.clock = new THREE.Clock();
    this.time = 0;

    // ── renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'chart-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    // ── scene, camera, light
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(P.paper);
    scene.fog = new THREE.Fog(P.paper, 200, 420);
    this.scene = scene;
    const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 2000);
    this.camera = camera;
    scene.add(new THREE.HemisphereLight('#F7FBFA', '#9DB4AE', 1.25));
    const sun = new THREE.DirectionalLight('#FFF5E4', 1.9);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(this.coarse ? 1024 : 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    scene.add(sun, sun.target);
    this.sun = sun;

    // ── content
    const islands = buildIslands();
    this.islands = islands;
    scene.add(islands.root);
    const { sea, uniforms } = buildSea(islands.landTiles);
    this.seaUniforms = uniforms;
    scene.add(sea);
    const { compass, redraw } = buildCompass();
    scene.add(compass);
    if (document.fonts?.ready) document.fonts.ready.then(redraw);
    const routes = buildRoutes();
    this.routes = routes;
    scene.add(routes.root);
    this.balloon = buildBalloon();
    scene.add(this.balloon.obj);
    this.pickables = [...islands.pick, ...this.balloon.obj.children[0].children];

    // highlight rings: the selected thing (buoy yellow) and the thing under the pointer (ink)
    const ring = (color, opacity) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2;
      m.renderOrder = 2;
      m.visible = false;
      scene.add(m);
      return m;
    };
    this.selRing = ring(P.buoy, 1);
    this.hoverRing = ring(P.ink, 0.55);

    // ── controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.8;
    controls.minPolarAngle = 0.28;
    controls.maxPolarAngle = 1.3;
    controls.autoRotate = !this.reduceMotion;
    controls.autoRotateSpeed = SPIN.sea;
    let resume = null;
    controls.addEventListener('start', () => {
      clearTimeout(resume);
      controls.autoRotate = false;
      this.userMoved = true;
    });
    controls.addEventListener('end', () => {
      clearTimeout(resume);
      if (!this.reduceMotion) resume = setTimeout(() => { controls.autoRotate = true; }, 5000);
    });
    this.controls = controls;

    // ── pointer: tap to pick, hover to highlight
    const el = renderer.domElement;
    let down = null;
    el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    el.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const quick = performance.now() - down.t < 600;
      down = null;
      if (moved > 8 || !quick) return;
      const id = this.pickAt(e.clientX, e.clientY);
      if (id) this.onPick?.(id);
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || e.buttons) return;
      this.hoverPoint = { x: e.clientX, y: e.clientY };
      this.hoverDirty = true;
    });
    el.addEventListener('pointerleave', () => { this.hoverPoint = null; this.setHover(null); });

    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);

    // opening shot: high above the chart, then settle in
    const fit = this.fitDistance(SEA_RADIUS);
    controls.target.set(0, 0, 8);
    camera.position.setFromSpherical(new THREE.Spherical(fit * 1.5, 0.35, -0.5)).add(controls.target);
    this.flyTo({ level: 'sea' }, { duration: this.reduceMotion ? 0 : 2.6 });

    this.raf = 0;
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      this.frame();
    };
    loop();
    onReady?.();
  }

  // ───────────────────────────────────────────── layout
  resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.size = { w, h };
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.applyInset();
    this.labelSize.clear();
  }

  /** Space taken by the panel: the scene's centre shifts into the space that is left. */
  setInset(inset) {
    this.inset = { right: 0, bottom: 0, top: 0, ...inset };
  }

  applyInset() {
    const { w, h } = this.size;
    const { right, bottom, top } = this.insetNow;
    // centre the view in the space between the top bar, the panel and the screen edges
    const ox = right / 2;
    const oy = (bottom - top * 0.6) / 2;
    if (ox || oy) this.camera.setViewOffset(w, h, ox, oy, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  /** Camera distance at which a sphere of radius r fills the free part of the screen. */
  fitDistance(r) {
    const { w, h } = this.size;
    const fw = Math.max(200, w - this.inset.right);
    const fh = Math.max(200, h - this.inset.bottom - (this.inset.top || 0) * 0.6);
    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * (fw / h));
    const vfree = 2 * Math.atan(Math.tan(vfov / 2) * (fh / h));
    return (r / Math.sin(Math.min(vfree, hfov) / 2)) * 0.98;
  }

  focusOf(view) {
    if (view.level === 'sea') {
      const portrait = this.size.h > this.size.w;
      return { target: new THREE.Vector3(0, 0, 10), radius: SEA_RADIUS * (portrait ? 0.93 : 1) };
    }
    return this.islands.focus.get(view.id);
  }

  // ───────────────────────────────────────────── camera
  setView(view, opts = {}) {
    const same = view.level === this.view.level && view.id === this.view.id;
    if (same && !opts.force) return;
    if (same && this.flight) {
      // already flying there: just aim for the new framing
      const f = this.focusOf(view);
      this.flight.to.radius = this.fitDistance(f.radius);
      return;
    }
    this.flyTo(view, opts);
  }

  flyTo(view, { duration = 1.35 } = {}) {
    this.view = view;
    const f = this.focusOf(view);
    if (!f) return;
    const c = this.controls;
    const dist = this.fitDistance(f.radius);
    const from = {
      target: c.target.clone(),
      sph: new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(c.target)),
    };
    const to = { target: f.target.clone(), radius: dist, phi: POLAR[view.level] };
    c.minDistance = dist * 0.42;
    c.maxDistance = dist * (view.level === 'sea' ? 1.25 : 1.7);
    c.autoRotateSpeed = SPIN[view.level];
    this.flight = { from, to, start: performance.now(), duration: this.reduceMotion ? 0 : duration };
    c.enabled = false;
    this.fitRadius = f.radius;
    this.updateFog(dist);
    this.updateShadow(f);
    this.updateRoutes();
  }

  stepFlight() {
    const fl = this.flight;
    if (!fl) return;
    // wall-clock time, so a slow device still arrives on time (just with fewer frames)
    fl.t = fl.duration ? Math.min(1, (performance.now() - fl.start) / 1000 / fl.duration) : 1;
    const k = easeInOut(fl.t);
    const c = this.controls;
    c.target.lerpVectors(fl.from.target, fl.to.target, k);
    const r = Math.exp(THREE.MathUtils.lerp(Math.log(fl.from.sph.radius), Math.log(fl.to.radius), k));
    const phi = THREE.MathUtils.lerp(fl.from.sph.phi, fl.to.phi, k);
    this.camera.position.setFromSpherical(new THREE.Spherical(r, phi, fl.from.sph.theta + (this.reduceMotion ? 0 : k * 0.35))).add(c.target);
    this.camera.lookAt(c.target);
    if (fl.t >= 1) {
      this.flight = null;
      c.enabled = true;
      c.update();
    }
  }

  updateFog(dist) {
    this.scene.fog.near = dist * 1.15;
    this.scene.fog.far = dist * 2.8;
    this.seaUniforms.uFogNear.value = dist * 1.15;
    this.seaUniforms.uFogFar.value = dist * 2.8;
  }

  updateShadow(f) {
    const s = THREE.MathUtils.clamp(f.radius * 1.5, 18, 170);
    const cam = this.sun.shadow.camera;
    cam.left = -s; cam.right = s; cam.top = s; cam.bottom = -s;
    cam.near = 1; cam.far = s * 4 + 200;
    cam.updateProjectionMatrix();
    this.sun.target.position.copy(f.target);
    this.sun.position.copy(f.target).add(new THREE.Vector3(-0.55, 1, 0.45).normalize().multiplyScalar(s * 2 + 60));
  }

  /** Routes touching the district in view stand out; the rest stay quiet. */
  updateRoutes() {
    const here = this.view.level === 'sea' ? null : pathOf(this.view.id);
    this.routes.lanes.forEach(({ mesh, route }) => {
      const on = here && (here.includes(route.from) || here.includes(route.to) || here.includes(get(route.from).domain) || here.includes(get(route.to).domain));
      mesh.material.uniforms.uOpacity.value = !here ? 0.62 : on ? 0.9 : 0.25;
    });
  }

  // ───────────────────────────────────────────── highlight
  placeRing(mesh, id, width) {
    const m = id && this.islands.marks.get(id);
    if (!m) { mesh.visible = false; return; }
    const r = m.radius;
    const inner = Math.max(0.2, 1 - width / r);
    mesh.geometry.dispose();
    mesh.geometry = new THREE.RingGeometry(inner * r, r, 72);
    mesh.position.copy(m.position);
    mesh.visible = true;
  }

  setSelected(id) {
    if (id === this.selectedId) return;
    this.selectedId = id;
    this.placeRing(this.selRing, id, id && get(id)?.kind === 'island' ? 1.2 : 0.32);
  }

  setHover(id) {
    if (id === this.hoverId) return;
    this.hoverId = id;
    this.renderer.domElement.style.cursor = id ? 'pointer' : '';
    this.placeRing(this.hoverRing, id && id !== this.selectedId ? id : null, id && get(id)?.kind === 'island' ? 0.8 : 0.22);
    this.onHover?.(id);
  }

  // ───────────────────────────────────────────── picking
  ray(x, y) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, this.camera);
    return rc.intersectObjects(this.pickables, false);
  }

  /** What a tap at (x, y) means in the current view: the next step down, or a hop sideways. */
  pickAt(x, y) {
    const hits = this.ray(x, y);
    if (!hits.length) return null;
    // a building in front wins; invisible volumes catch taps on open ground
    const solid = hits.find((h) => h.object.userData.solid || h.object.userData.pick === 'drt');
    const volume = hits.find((h) => h.object.userData.volume);
    const id = (solid || volume)?.object.userData.pick;
    if (!id) return null;
    if (id === 'drt') return 'drt';
    return this.resolve(id);
  }

  resolve(id) {
    const hit = pathOf(id);
    const here = viewPath(this.view);
    let k = 0;
    while (k < hit.length && k < here.length && hit[k] === here[k]) k += 1;
    return k >= hit.length ? hit[hit.length - 1] : hit[k];
  }

  // ───────────────────────────────────────────── labels
  registerLabel(id, el) {
    if (el) this.labelEls.set(id, el);
    else { this.labelEls.delete(id); this.labelSize.delete(id); }
  }

  anchorOf(id) {
    return this.islands.anchors.get(id) || this.routes.lanes.get(id)?.mid || null;
  }

  placeLabels() {
    const { w, h } = this.size;
    const { right, bottom } = this.insetNow;
    const topSafe = this.inset.top || 0;
    const v = new THREE.Vector3();
    const items = [];
    this.labelEls.forEach((el, id) => {
      const a = this.anchorOf(id);
      if (!a) return;
      v.copy(a).project(this.camera);
      if (v.z > 1 || v.z < -1) { items.push({ el, hide: true }); return; }
      let size = this.labelSize.get(id);
      if (!size) { size = { w: el.offsetWidth, h: el.offsetHeight }; this.labelSize.set(id, size); }
      const x = (v.x * 0.5 + 0.5) * w;
      const y = (-v.y * 0.5 + 0.5) * h;
      items.push({ el, x, y, size, depth: v.z, prio: Number(el.dataset.priority || 0) });
    });
    items.sort((a, b) => (b.prio || 0) - (a.prio || 0) || (a.depth || 0) - (b.depth || 0));
    const placed = [];
    const pad = 4;
    const TICK = 9;
    for (const it of items) {
      if (it.hide) { it.el.style.opacity = '0'; it.el.style.pointerEvents = 'none'; continue; }
      const left = it.x - it.size.w / 2;
      // important labels step upwards (on a longer tick) instead of disappearing
      const lifts = it.prio >= 8 ? [0, 1, 2, 3] : [0];
      let shown = false;
      let top = it.y - it.size.h - TICK;
      for (const k of lifts) {
        top = it.y - it.size.h - TICK - k * (it.size.h + 6);
        const box = { l: left - pad, t: top - pad, r: left + it.size.w + pad, b: top + it.size.h + pad };
        const off = box.r < 0 || box.l > w - right || box.t < topSafe || box.b > h - bottom;
        if (off) break;
        if (placed.some((p) => box.l < p.r && box.r > p.l && box.t < p.b && box.b > p.t)) continue;
        placed.push(box);
        shown = true;
        break;
      }
      it.el.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
      it.el.style.setProperty('--tick', `${Math.round(it.y - top - it.size.h)}px`);
      it.el.style.opacity = shown ? '' : '0';
      it.el.style.pointerEvents = shown ? '' : 'none';
      it.el.toggleAttribute('data-hidden', !shown);
      const tab = shown ? 0 : -1;
      if (it.el.tabIndex !== tab) it.el.tabIndex = tab;
    }
  }

  // ───────────────────────────────────────────── loop
  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.time += this.reduceMotion ? 0 : dt;
    const t = this.time;

    // ease the panel inset
    const moved = ['right', 'bottom', 'top'].filter((k) => Math.abs(this.inset[k] - this.insetNow[k]) > 0.5);
    if (moved.length) {
      const k = 1 - Math.exp(-dt * 9);
      moved.forEach((key) => { this.insetNow[key] += (this.inset[key] - this.insetNow[key]) * k; });
      this.applyInset();
    }

    if (this.flight) this.stepFlight();
    else this.controls.update(dt);

    this.seaUniforms.uTime.value = t;
    this.seaUniforms.uCam.value.copy(this.camera.position);
    this.routes.uniforms.uTime.value = t;
    for (const u of this.islands.updaters) u(t);
    const f = this.focusOf(this.view);
    if (f) this.balloon.follow(f.target, f.radius, this.camera, this.inset.right > 0 ? -1 : 1);
    this.balloon.update(t, dt);
    if (this.selRing.visible) this.selRing.material.opacity = 0.75 + Math.sin(t * 3) * 0.25;

    if (this.hoverPoint && this.hoverDirty && !this.flight) {
      this.hoverDirty = false;
      const id = this.pickAt(this.hoverPoint.x, this.hoverPoint.y);
      this.setHover(id === 'drt' ? null : id);
      if (id === 'drt') this.renderer.domElement.style.cursor = 'pointer';
    }

    this.renderer.render(this.scene, this.camera);
    this.placeLabels();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
