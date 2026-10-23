/**
 * Sea routes: dashed lanes on the water between districts on different islands that share
 * technologies (from the links in edges.js). The lane runs from district to district and is
 * hidden by the land at both ends, so on screen it reads as a crossing between two harbours.
 */
import * as THREE from 'three';
import { ROUTES } from '../data/world.js';
import { PALETTE as P } from './kit.js';
import { chart } from './layout.js';

const vertex = /* glsl */`
  attribute float along;
  varying float vAlong;
  varying float vAcross;
  attribute float across;
  void main() {
    vAlong = along;
    vAcross = across;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const fragment = /* glsl */`
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlong;
  varying float vAcross;
  void main() {
    float dash = step(0.42, fract(vAlong / 3.2 - uTime * 0.3));
    float edge = 1.0 - smoothstep(0.7, 1.0, abs(vAcross));
    gl_FragColor = vec4(uColor, dash * edge * uOpacity);
  }
`;

function ribbon(points, width) {
  const pos = [];
  const along = [];
  const across = [];
  const idx = [];
  let dist = 0;
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const q = points[Math.min(i + 1, points.length - 1)];
    const o = points[Math.max(i - 1, 0)];
    const dir = new THREE.Vector3().subVectors(q, o).setY(0).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(width / 2);
    if (i > 0) dist += p.distanceTo(points[i - 1]);
    pos.push(p.x + side.x, p.y, p.z + side.z, p.x - side.x, p.y, p.z - side.z);
    along.push(dist, dist);
    across.push(1, -1);
    if (i < points.length - 1) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('along', new THREE.Float32BufferAttribute(along, 1));
  g.setAttribute('across', new THREE.Float32BufferAttribute(across, 1));
  g.setIndex(idx);
  return g;
}

export function buildRoutes() {
  const { districts } = chart();
  const time = { value: 0 };
  const uniforms = { uTime: time };
  const material = () => new THREE.ShaderMaterial({
    uniforms: { uTime: time, uColor: { value: new THREE.Color(P.sea) }, uOpacity: { value: 0.7 } },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const root = new THREE.Group();
  const lanes = new Map(); // route id -> { mesh, mid: Vector3 }
  for (const r of ROUTES.filter((x) => x.sea)) {
    const a = districts[r.from].centre;
    const b = districts[r.to].centre;
    const A = new THREE.Vector3(a[0], 0.12, a[1]);
    const B = new THREE.Vector3(b[0], 0.12, b[1]);
    const mid = A.clone().lerp(B, 0.5);
    const len = A.distanceTo(B);
    const n = new THREE.Vector3(-(B.z - A.z), 0, B.x - A.x).normalize().multiplyScalar(len * 0.12);
    const curve = new THREE.QuadraticBezierCurve3(A, mid.clone().add(n), B);
    const mesh = new THREE.Mesh(ribbon(curve.getPoints(90), 1.5), material());
    mesh.renderOrder = 1;
    root.add(mesh);
    lanes.set(r.id, { mesh, mid: curve.getPoint(0.5).setY(1.5), route: r });
  }
  return { root, uniforms, lanes };
}
