/**
 * Small things on the land: trees, topic houses, technology pavilions.
 */
import { PALETTE as P, at, ball, box, cone, cyl, group, mat, shade } from './kit.js';
import * as THREE from 'three';

export function tree(rand) {
  const h = 0.9 + rand() * 0.8;
  const tone = rand() < 0.3 ? shade(P.tree, 0.08) : P.tree;
  return group(
    cyl(0.08, 0.1, 0.4, 5, P.trunk),
    at(cone(0.42 + rand() * 0.15, h, 6, tone), 0, 0.3),
  );
}

const WALLS = ['#F7F5EE', '#EFEADF', '#F2F4F0', '#E9E6DC'];

/** A house for one research topic. variant picks the silhouette. */
export function house(variant, roofColor, rand) {
  const wall = WALLS[Math.floor(rand() * WALLS.length)];
  if (variant === 0) {
    // gabled house
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.5, 3), mat(roofColor));
    roof.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    roof.position.y = 1.1;
    roof.scale.set(1, 1, 0.85);
    roof.castShadow = true;
    return group(box(1.3, 0.85, 1.0, wall), roof, at(box(0.22, 0.38, 0.04, P.dark), 0.25, 0, 0.51));
  }
  if (variant === 1) {
    // two storeys with a flat roof
    return group(
      box(1.1, 1.5, 1.1, wall),
      at(box(1.16, 0.12, 1.16, roofColor), 0, 1.5),
      at(box(0.4, 0.3, 0.4, roofColor), 0.2, 1.62, -0.2),
      at(box(1.12, 0.12, 0.04, P.glass), 0, 0.95, 0.56),
    );
  }
  // round tower
  return group(
    cyl(0.5, 0.55, 1.6, 8, wall),
    at(cone(0.66, 0.7, 8, roofColor), 0, 1.6),
    at(box(0.2, 0.34, 0.04, P.dark), 0, 0, 0.52),
  );
}

/** A pavilion for one technology. */
export function pavilion(roofColor) {
  return group(
    cyl(0.78, 0.82, 0.18, 6, P.concrete),
    at(cyl(0.5, 0.52, 0.9, 6, P.white), 0, 0.18),
    at(cyl(0.52, 0.52, 0.12, 6, P.glass), 0, 0.6),
    at(cone(0.84, 0.62, 6, roofColor), 0, 1.08),
    at(ball(0.12, 0, P.buoy), 0, 1.66),
  );
}
