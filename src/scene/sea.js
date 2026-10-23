/**
 * The sea, drawn like a nautical survey chart: deep water stays pale, shallows near the
 * coast turn blue, and depth contours ring every island. A distance-to-land map is
 * computed once (rasterised hexes + a chamfer distance transform) and read by the shader.
 */
import * as THREE from 'three';
import { PALETTE as P } from './kit.js';
import { R } from './layout.js';

export const WORLD = 300;     // the depth map covers -150..150 on x and z
const N = 512;
const MAX = 40;               // world units of distance stored in the map

function distanceMap(landTiles) {
  const canvas = document.createElement('canvas');
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, N, N);
  ctx.fillStyle = '#fff';
  const s = N / WORLD;
  for (const [x, z] of landTiles) {
    ctx.beginPath();
    for (let k = 0; k < 6; k += 1) {
      const a = (k / 6) * Math.PI * 2;
      const px = (x + Math.sin(a) * R + WORLD / 2) * s;
      const pz = (z + Math.cos(a) * R + WORLD / 2) * s;
      if (k === 0) ctx.moveTo(px, pz); else ctx.lineTo(px, pz);
    }
    ctx.closePath();
    ctx.fill();
  }
  const img = ctx.getImageData(0, 0, N, N).data;
  const INF = 1e6;
  const d = new Float32Array(N * N);
  for (let i = 0; i < N * N; i += 1) d[i] = img[i * 4] > 127 ? 0 : INF;
  // chamfer 3-4 distance transform, two passes
  const a = 1; const b = Math.SQRT2;
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const i = y * N + x;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + a);
      if (y > 0) {
        v = Math.min(v, d[i - N] + a);
        if (x > 0) v = Math.min(v, d[i - N - 1] + b);
        if (x < N - 1) v = Math.min(v, d[i - N + 1] + b);
      }
      d[i] = v;
    }
  }
  for (let y = N - 1; y >= 0; y -= 1) {
    for (let x = N - 1; x >= 0; x -= 1) {
      const i = y * N + x;
      let v = d[i];
      if (x < N - 1) v = Math.min(v, d[i + 1] + a);
      if (y < N - 1) {
        v = Math.min(v, d[i + N] + a);
        if (x < N - 1) v = Math.min(v, d[i + N + 1] + b);
        if (x > 0) v = Math.min(v, d[i + N - 1] + b);
      }
      d[i] = v;
    }
  }
  const data = new Uint8Array(N * N);
  const unit = WORLD / N;
  for (let i = 0; i < N * N; i += 1) data[i] = Math.min(255, Math.round(((d[i] * unit) / MAX) * 255));
  const tex = new THREE.DataTexture(data, N, N, THREE.RedFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

const vertex = /* glsl */`
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const fragment = /* glsl */`
  uniform sampler2D uDist;
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShoal;
  uniform vec3 uLine;
  uniform vec3 uPaper;
  uniform vec3 uFoam;
  uniform vec3 uCam;
  uniform float uFogNear;
  uniform float uFogFar;
  varying vec3 vWorld;

  float lineAA(float v, float width) {
    float g = abs(fract(v - 0.5) - 0.5) / max(fwidth(v), 1e-4);
    return 1.0 - smoothstep(width - 0.5, width + 0.5, g);
  }

  void main() {
    vec2 uv = (vWorld.xz + ${WORLD / 2}.0) / ${WORLD}.0;
    float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
    float d = mix(${MAX}.0, texture2D(uDist, uv).r * ${MAX}.0, inside);

    // depth tint: shoal blue near land, fading to pale deep water
    float shallow = 1.0 - smoothstep(0.0, 16.0, d);
    vec3 col = mix(uDeep, uShoal, pow(shallow, 1.35) * 0.85);

    // gentle moving light on the water
    float shimmer = sin(vWorld.x * 0.35 + uTime * 0.6) * sin(vWorld.z * 0.42 - uTime * 0.45);
    col += shimmer * 0.012;

    // depth contours every 3.5 units out to ~24, fainter further out
    float contour = lineAA(d / 3.5, 0.6) * step(1.2, d) * (1.0 - smoothstep(10.0, 26.0, d));
    col = mix(col, uLine, contour * 0.38);

    // surf: a pale band right at the coast
    float surf = 1.0 - smoothstep(0.15, 0.9 + 0.25 * sin(uTime * 1.2 + vWorld.x * 0.3), d);
    col = mix(col, uFoam, surf * 0.85);

    // chart graticule every 30 units
    float grid = max(lineAA(vWorld.x / 30.0, 0.5), lineAA(vWorld.z / 30.0, 0.5));
    col = mix(col, uLine, grid * 0.12 * smoothstep(6.0, 14.0, d));

    // fade into the paper with distance
    float fog = smoothstep(uFogNear, uFogFar, distance(uCam, vWorld));
    gl_FragColor = vec4(mix(col, uPaper, fog), 1.0);
  }
`;

export function buildSea(landTiles) {
  const uniforms = {
    uDist: { value: distanceMap(landTiles) },
    uTime: { value: 0 },
    uDeep: { value: new THREE.Color(P.deep) },
    uShoal: { value: new THREE.Color(P.shoal) },
    uLine: { value: new THREE.Color(P.sea) },
    uPaper: { value: new THREE.Color(P.paper) },
    uFoam: { value: new THREE.Color('#F6FAF9') },
    uCam: { value: new THREE.Vector3() },
    uFogNear: { value: 200 },
    uFogFar: { value: 420 },
  };
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(1600, 1600, 1, 1),
    new THREE.ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: fragment }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = 0;
  return { sea, uniforms };
}

/** A compass rose printed on the water, like on a chart. */
export function buildCompass() {
  const S = 512;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const c = canvas.getContext('2d');
  const ink = P.sea;
  const paper = P.paper;
  const point = (a, long, wide, dark) => {
    c.save();
    c.rotate(a);
    for (const side of [1, -1]) {
      c.beginPath();
      c.moveTo(0, -long);
      c.lineTo(side * wide, 0);
      c.lineTo(0, 0);
      c.closePath();
      c.fillStyle = (side === 1) === dark ? ink : paper;
      c.fill();
      c.stroke();
    }
    c.restore();
  };
  const draw = () => {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, S, S);
    c.translate(S / 2, S / 2 + 14);
    c.strokeStyle = ink;
    c.lineWidth = 3;
    c.beginPath(); c.arc(0, 0, 196, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 1.5;
    c.beginPath(); c.arc(0, 0, 178, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 72; i += 1) {
      const a = (i / 72) * Math.PI * 2;
      const len = i % 9 === 0 ? 20 : i % 3 === 0 ? 12 : 7;
      c.beginPath();
      c.moveTo(Math.sin(a) * 178, -Math.cos(a) * 178);
      c.lineTo(Math.sin(a) * (178 - len), -Math.cos(a) * (178 - len));
      c.stroke();
    }
    for (let i = 0; i < 4; i += 1) point((i * Math.PI) / 2 + Math.PI / 4, 100, 18, false);
    for (let i = 0; i < 4; i += 1) point((i * Math.PI) / 2, 160, 26, true);
    c.font = '700 46px "LXGW WenKai TC", "Noto Sans TC", serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = ink;
    c.fillText('北', 0, -228);
  };
  draw();
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(112, 0.03, -6);
  return { compass: m, redraw: () => { draw(); tex.needsUpdate = true; } };
}
