/**
 * Dr. T's hot-air balloon: drifts to wherever the visitor is looking, bobbing gently.
 */
import * as THREE from 'three';
import { PALETTE as P, at, box, cyl, mat } from './kit.js';

export function buildBalloon() {
  const geo = new THREE.SphereGeometry(1.6, 12, 9).toNonIndexed();
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const a = new THREE.Color(P.buoy);
  const b = new THREE.Color(P.white);
  for (let i = 0; i < pos.count; i += 3) {
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const seg = Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * 12);
    const c = seg % 2 ? a : b;
    for (let k = 0; k < 3; k += 1) colors.set([c.r, c.g, c.b], (i + k) * 3);
  }
  // taper the bottom into a teardrop
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    if (y < 0) {
      const t = 1 + (y / 1.6) * 0.45;
      pos.setX(i, pos.getX(i) * t);
      pos.setZ(i, pos.getZ(i) * t);
      pos.setY(i, y * 1.25);
    }
  }
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const envelope = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8 }));
  envelope.castShadow = true;
  envelope.position.y = 3.2;
  const basket = at(box(0.7, 0.5, 0.7, '#8A6A4F'), 0, 0);
  const ropes = [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]].map(([x, z]) => at(cyl(0.025, 0.025, 1.3, 4, P.dark), x, 0.5, z));
  const burner = at(cyl(0.14, 0.18, 0.2, 8, mat('#F59E3A', { emissive: '#F59E3A', emissiveIntensity: 0.6 })), 0, 1.55);
  const craft = new THREE.Group();
  craft.add(envelope, basket, burner, ...ropes);
  craft.traverse((o) => { if (o.isMesh) o.userData.pick = 'drt'; });

  const g = new THREE.Group();
  g.add(craft);
  const goal = new THREE.Vector3();
  let goalScale = 1;
  let ready = false;
  return {
    obj: g,
    /** Float near a target point, offset up and to one side of the view. */
    follow(target, radius, camera, side = -1) {
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
      goal.copy(target).addScaledVector(right, side * radius * (radius > 60 ? 0.95 : 0.62)).setY(target.y + THREE.MathUtils.clamp(radius * 0.32, 4, 34));
      goalScale = THREE.MathUtils.clamp(radius / 11, 0.55, 3.2);
      if (!ready) { g.position.copy(goal); g.scale.setScalar(goalScale); ready = true; }
    },
    update(t, dt) {
      const k = 1 - Math.exp(-dt * 1.2);
      g.position.lerp(goal, k);
      g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, goalScale, k));
      craft.position.y = Math.sin(t * 0.8) * 0.25;
      craft.rotation.y = t * 0.1;
    },
  };
}
