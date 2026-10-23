/**
 * One landmark per district, standing on the district's centre hex.
 * Each builder returns { obj, update(t) } — obj sits on y = 0, fits within a radius of ~2.6,
 * update (optional) animates it a little (a turning arm, spinning rotors, a sweeping beam).
 */
import * as THREE from 'three';
import { PALETTE as P, at, ball, box, cone, cyl, glow, group, mat, shade } from './kit.js';

const rot = (m, x = 0, y = 0, z = 0) => { m.rotation.set(x, y, z); return m; };

function chipStack(a) {
  const dies = [];
  const g = group(
    box(4.4, 0.32, 4.4, '#3F6B5B'),
    at(box(3.4, 0.24, 3.4, '#C8B07A'), 0, 0.32),
    at(box(1.9, 0.5, 1.9, '#2B3644'), 0, 0.56),
    at(box(1.7, 0.45, 1.7, shade(a, -0.18)), 0, 1.06),
    at(box(1.5, 0.4, 1.5, '#2B3644'), 0, 1.51),
    at(box(1.2, 0.18, 1.2, a), 0, 1.91),
  );
  for (const [x, z] of [[-1.25, -1.25], [1.25, -1.25], [-1.25, 1.25], [1.25, 1.25]]) {
    const hbm = at(box(0.62, 1.5, 0.62, '#3B4B5D'), x, 0.56, z);
    dies.push(hbm);
    g.add(hbm);
    g.add(at(box(0.66, 0.08, 0.66, a), x, 2.06, z));
  }
  // solder balls along the edge of the substrate
  for (let i = -3; i <= 3; i += 1) {
    g.add(at(ball(0.11, 0, '#D9D2C3'), i * 0.6, -0.08, 2.15));
    g.add(at(ball(0.11, 0, '#D9D2C3'), 2.15, -0.08, i * 0.6));
  }
  return { obj: g };
}

function crystals(a) {
  const g = group(at(rot(ball(1.4, 0, '#8E8A86'), 0, 0.4), 0, -0.9));
  const glass = mat(shade(a, 0.16), { roughness: 0.35 });
  const spec = [[0, 0, 4.4, 0.55, 0], [0.9, 0.5, 3.2, 0.45, 0.28], [-0.95, 0.35, 2.8, 0.42, -0.3], [0.3, -1.0, 2.4, 0.38, 0.22], [-0.4, 1.1, 2.1, 0.34, -0.18]];
  for (const [x, z, h, r, tilt] of spec) {
    const c = group(cyl(r, r, h, 6, glass), at(cone(r, r * 1.6, 6, glass), 0, h));
    c.position.set(x, 0, z);
    c.rotation.set(tilt * 0.6, 0, tilt);
    g.add(c);
  }
  return { obj: g };
}

function fab(a) {
  const roof = shade(a, -0.15);
  const g = group(
    box(4.8, 1.7, 3.0, P.white),
    at(box(4.82, 0.28, 0.08, P.glass), 0, 0.9, 1.5),
    at(box(1.7, 2.8, 1.7, '#E7EAE6'), -1.4, 0, -0.4),
    at(box(1.72, 0.2, 1.72, roof), -1.4, 2.8, -0.4),
    at(cyl(0.22, 0.26, 3.6, 8, P.steel), 1.6, 0, -1.0),
    at(cyl(0.22, 0.26, 3.2, 8, P.steel), 2.15, 0, -1.0),
  );
  for (let i = 0; i < 4; i += 1) {
    const tooth = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 3.0, 3), mat(roof));
    tooth.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    tooth.position.set(-0.2 + i * 0.75, 1.9, 0);
    tooth.castShadow = true;
    g.add(tooth);
  }
  return { obj: g };
}

function lighthouse(a) {
  const stripe = shade(a, -0.1);
  const tower = group(
    cyl(1.0, 1.25, 0.5, 10, P.concrete),
    at(cyl(0.6, 0.85, 4.6, 10, P.white), 0, 0.5),
    at(cyl(0.72, 0.78, 0.6, 10, stripe), 0, 1.7),
    at(cyl(0.62, 0.68, 0.6, 10, stripe), 0, 3.3),
    at(cyl(0.95, 0.95, 0.16, 12, P.dark), 0, 5.1),
    at(cyl(0.48, 0.48, 0.75, 10, glow(P.buoy)), 0, 5.26),
    at(cone(0.62, 0.7, 10, P.dark), 0, 6.0),
  );
  // the sweeping beam: two long translucent wedges
  const beamGeo = new THREE.BufferGeometry();
  beamGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 14, -0.9, -1.6, 14, 0.9, 1.6, 0, 0, 0, -14, -0.9, -1.6, -14, 0.9, 1.6], 3));
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({
    color: P.buoy, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false,
  }));
  beam.position.y = 5.6;
  tower.add(beam);
  return { obj: tower, update: (t) => { beam.rotation.y = t * 0.6; } };
}

function panels(a) {
  const g = group(box(4.2, 0.24, 2.2, P.concrete));
  const frame = shade(a, -0.35);
  [-1.35, 0, 1.35].forEach((x, i) => {
    const p = group(
      at(box(0.12, 1.2, 0.12, P.steel), 0, 0, 0),
      at(box(1.3, 1.9, 0.14, frame), 0, 1.1, 0),
      at(box(1.16, 1.74, 0.04, mat(i === 1 ? '#BFE6EA' : '#A9D3DA', { emissive: '#7FC2C0', emissiveIntensity: 0.35 })), 0, 1.18, 0.08),
    );
    p.position.set(x, 0.24, 0.1);
    p.rotation.y = (i - 1) * -0.35;
    g.add(p);
  });
  // a rolled-up flexible screen
  const roll = cyl(0.32, 0.32, 3.4, 12, shade(a, 0.05));
  roll.rotation.z = Math.PI / 2;
  roll.position.set(0, 0.56, -0.8);
  g.add(roll);
  return { obj: g };
}

function antenna(a) {
  const g = group(cyl(1.2, 1.3, 0.3, 8, P.concrete));
  const lattice = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.95, 6.2, 4, 6, true),
    new THREE.MeshBasicMaterial({ color: P.ink, wireframe: true }),
  );
  lattice.position.y = 3.4;
  lattice.rotation.y = Math.PI / 4;
  g.add(lattice, at(cyl(0.1, 0.16, 6.4, 6, P.steel), 0, 0.3));
  for (let i = 0; i < 3; i += 1) {
    const ang = (i / 3) * Math.PI * 2;
    const panel = box(0.34, 1.0, 0.12, P.white);
    panel.position.set(Math.cos(ang) * 0.36, 5.4, Math.sin(ang) * 0.36);
    panel.rotation.y = -ang + Math.PI / 2;
    g.add(panel);
  }
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2.6), mat(P.white, { side: THREE.DoubleSide }));
  dish.rotation.x = -Math.PI / 2.4;
  dish.position.set(0.1, 3.6, 0.75);
  dish.castShadow = true;
  g.add(dish, at(ball(0.16, 0, glow(shade(a, -0.1))), 0, 6.55));
  const blink = g.children[g.children.length - 1];
  return { obj: g, update: (t) => { blink.visible = Math.sin(t * 3) > -0.3; } };
}

function datacenter(a) {
  const g = group(box(4.4, 0.2, 3.4, P.concrete));
  const lights = [];
  for (let row = 0; row < 3; row += 1) {
    const rack = at(box(0.95, 1.9, 2.8, '#2E3D4C'), -1.4 + row * 1.4, 0.2, 0);
    g.add(rack);
    for (let k = 0; k < 4; k += 1) {
      const led = at(box(0.04, 0.08, 2.2, mat(shade(a, 0.1), { emissive: shade(a, 0.1), emissiveIntensity: 1 })), -1.4 + row * 1.4 + 0.49, 0.55 + k * 0.38, 0);
      lights.push(led);
      g.add(led);
    }
    g.add(at(cyl(0.3, 0.3, 0.22, 10, P.steel), -1.4 + row * 1.4, 2.1, 0.7));
    g.add(at(cyl(0.3, 0.3, 0.22, 10, P.steel), -1.4 + row * 1.4, 2.1, -0.7));
  }
  return {
    obj: g,
    update: (t) => lights.forEach((l, i) => { l.material = i % 3 === Math.floor(t * 2) % 3 ? glow(shade(a, 0.25)) : glow(shade(a, -0.05)); }),
  };
}

function dome(a) {
  const g = group(cyl(2.5, 2.6, 0.3, 14, P.concrete));
  const shell = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat(P.white));
  shell.position.y = 0.3;
  shell.castShadow = true;
  const net = new THREE.Mesh(new THREE.SphereGeometry(2.23, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: shade(a, -0.3), wireframe: true }));
  net.position.y = 0.3;
  g.add(shell, net, at(box(1.1, 1.0, 0.8, shade(a, -0.1)), 0, 0.3, 2.0));
  return { obj: g, update: (t) => { net.rotation.y = t * 0.15; } };
}

function cnc(a) {
  const body = shade(a, -0.05);
  const head = group(at(box(0.9, 0.7, 0.9, body)), at(cyl(0.16, 0.12, 0.7, 8, P.steel), 0, -0.6));
  head.position.set(0, 2.2, 0.15);
  const g = group(
    box(3.8, 0.9, 2.4, P.concrete),
    at(box(2.4, 0.18, 1.6, P.steel), 0, 0.9),
    at(box(0.9, 3.2, 0.9, body), 0, 0.9, -0.85),
    at(box(3.82, 0.4, 0.06, P.glass), 0, 0.3, 1.2),
    at(box(0.7, 1.4, 0.5, P.dark), 2.3, 0, 0.6),
    at(box(0.5, 0.36, 0.06, glow('#7FC2C0')), 2.3, 1.0, 0.86),
    at(box(0.8, 0.3, 0.6, '#B5BCC0'), 0, 1.08, 0.1),
    head,
  );
  return { obj: g, update: (t) => { head.position.y = 2.15 + Math.sin(t * 1.2) * 0.25; head.position.x = Math.sin(t * 0.5) * 0.6; } };
}

function robotArm(a) {
  const dark = shade(a, -0.3);
  const base = group(cyl(1.1, 1.3, 0.5, 10, dark));
  const turret = group(at(cyl(0.75, 0.8, 0.6, 10, a)));
  turret.position.y = 0.5;
  const lower = group(at(box(0.5, 2.6, 0.5, a), 0, 0, 0), at(ball(0.4, 1, dark), 0, 2.4));
  lower.position.y = 0.55;
  const upper = group(at(box(0.42, 2.2, 0.42, shade(a, 0.08))), at(ball(0.3, 1, dark), 0, 2.1));
  upper.position.y = 2.4;
  const grip = group(
    at(box(0.6, 0.18, 0.3, dark)),
    at(box(0.1, 0.55, 0.22, P.steel), -0.24, -0.5),
    at(box(0.1, 0.55, 0.22, P.steel), 0.24, -0.5),
  );
  grip.position.y = 2.25;
  grip.rotation.x = Math.PI;
  upper.add(grip);
  lower.add(upper);
  turret.add(lower);
  base.add(turret);
  // a parcel on the bench it is working at
  const bench = group(box(1.3, 0.7, 1.0, P.concrete), at(box(0.5, 0.4, 0.5, P.buoy), 0, 0.7));
  bench.position.set(1.8, 0, 0.6);
  const g = group(base, bench);
  return {
    obj: g,
    update: (t) => {
      turret.rotation.y = Math.sin(t * 0.45) * 0.9 - 0.2;
      lower.rotation.z = Math.sin(t * 0.6) * 0.25 + 0.35;
      upper.rotation.z = Math.sin(t * 0.6 + 0.8) * 0.35 + 1.15;
    },
  };
}

function factory(a) {
  const roof = shade(a, -0.18);
  const g = group(
    box(4.6, 1.5, 3.0, '#EFE9DF'),
    at(box(4.62, 0.3, 0.06, P.glass), 0, 0.8, 1.5),
    at(cyl(0.28, 0.34, 3.8, 8, '#B9A891'), -1.9, 0, -1.0),
    at(box(1.6, 0.25, 0.7, P.dark), 1.2, 0, 2.0),
  );
  for (let i = 0; i < 3; i += 1) {
    const tooth = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 3.0, 3), mat(roof));
    tooth.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    tooth.position.set(-1.1 + i * 1.2, 1.78, 0);
    tooth.castShadow = true;
    g.add(tooth);
  }
  const parcels = [0, 1, 2].map((i) => { const p = at(box(0.3, 0.3, 0.3, P.buoy), 0.6 + i * 0.5, 0.25, 2.0); g.add(p); return p; });
  return { obj: g, update: (t) => parcels.forEach((p, i) => { p.position.x = 0.45 + ((t * 0.4 + i * 0.5) % 1.5); }) };
}

function ev(a) {
  const car = group(
    at(box(2.7, 0.55, 1.3, a), 0, 0.3),
    at(box(1.5, 0.5, 1.16, mat(P.glass, { roughness: 0.4 })), -0.15, 0.85),
  );
  for (const [x, z] of [[-0.85, 0.66], [0.85, 0.66], [-0.85, -0.66], [0.85, -0.66]]) {
    const w = cyl(0.3, 0.3, 0.2, 10, P.dark);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.3, z);
    car.add(w);
  }
  car.position.set(-0.4, 0, 0.5);
  const g = group(
    box(4.6, 0.12, 3.2, '#C9CDC8'),
    car,
    at(box(0.5, 1.6, 0.4, P.white), 1.75, 0.12, -0.6),
    at(box(0.08, 0.9, 0.3, glow('#62D39B')), 1.75 - 0.27, 0.5, -0.6),
    at(box(0.6, 0.08, 0.5, P.dark), 1.75, 1.72, -0.6),
  );
  return { obj: g };
}

function drone(a) {
  const pad = group(cyl(1.6, 1.7, 0.18, 12, P.dark), at(cyl(1.2, 1.2, 0.02, 12, P.white), 0, 0.18), at(cyl(1.0, 1.0, 0.03, 12, P.dark), 0, 0.18));
  const rotors = [];
  const craft = group(at(box(0.9, 0.3, 0.9, a)), at(box(0.5, 0.18, 0.5, glow(P.glass)), 0, 0.3));
  for (let i = 0; i < 4; i += 1) {
    const ang = Math.PI / 4 + (i * Math.PI) / 2;
    const arm = at(box(1.3, 0.08, 0.14, shade(a, -0.3)), Math.cos(ang) * 0.65, 0.15, Math.sin(ang) * 0.65);
    arm.rotation.y = -ang;
    const rotor = at(cyl(0.48, 0.48, 0.03, 10, mat('#DDE6E6', { transparent: true, opacity: 0.75 })), Math.cos(ang) * 1.25, 0.28, Math.sin(ang) * 1.25);
    rotors.push(rotor);
    craft.add(arm, rotor);
  }
  craft.add(at(box(0.06, 0.4, 0.06, P.dark), 0.3, -0.35, 0.3), at(box(0.06, 0.4, 0.06, P.dark), -0.3, -0.35, -0.3));
  const g = group(pad, craft);
  return {
    obj: g,
    update: (t) => {
      craft.position.y = 2.2 + Math.sin(t * 1.4) * 0.35;
      craft.rotation.y = t * 0.25;
      rotors.forEach((r) => { r.rotation.y = t * 30; });
    },
  };
}

function pharma(a) {
  const capsule = group(
    at(cyl(0.6, 0.6, 1.0, 10, a), 0, 0),
    at(ball(0.6, 1, a), 0, -0.6),
    at(cyl(0.6, 0.6, 1.0, 10, P.white), 0, 1.0),
    at(ball(0.6, 1, P.white), 0, 1.4),
  );
  capsule.position.set(1.3, 0.75, 0.7);
  capsule.rotation.z = -0.7;
  const g = group(
    box(2.8, 2.2, 2.4, P.white),
    at(box(2.82, 0.2, 2.42, shade(a, -0.15)), 0, 2.2),
    at(box(0.06, 1.2, 1.6, P.glass), 1.41, 0.5),
    at(cyl(0.18, 0.5, 0.9, 8, mat(P.glass, { roughness: 0.3 })), -0.6, 2.4, -0.4),
    at(cyl(0.12, 0.12, 0.4, 8, mat(P.glass, { roughness: 0.3 })), -0.6, 3.3, -0.4),
    capsule,
  );
  g.position.x = -0.5;
  return { obj: group(g) };
}

function clinic(a) {
  const mark = shade(a, -0.22);
  const g = group(
    box(3.6, 1.9, 2.6, P.white),
    at(box(3.62, 0.36, 2.62, a), 0, 1.0),
    at(box(1.6, 0.9, 1.6, P.white), -0.6, 1.9, -0.3),
    at(box(1.3, 0.12, 1.0, P.dark), 0.9, 1.0, 1.7),
    at(box(0.08, 0.9, 0.08, P.steel), 1.45, 0, 2.1),
    at(box(0.08, 0.9, 0.08, P.steel), 0.35, 0, 2.1),
    at(box(0.9, 0.28, 0.28, mark), -0.6, 3.0, -0.3),
    at(box(0.28, 0.9, 0.28, mark), -0.6, 2.7, -0.3),
  );
  return { obj: g };
}

function greenhouse(a) {
  const glass = mat('#CFE7E1', { transparent: true, opacity: 0.62, roughness: 0.3, side: THREE.DoubleSide });
  // half a cylinder lying along x: an arched glass hall
  const hall = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 3.6, 10, 1, true, 0, Math.PI), glass);
  hall.rotation.z = Math.PI / 2;
  hall.position.set(-0.5, 0.16, -0.2);
  const g = group(box(4.4, 0.16, 3.4, '#9C8466'), hall);
  for (let i = 0; i < 3; i += 1) {
    g.add(at(box(0.45, 0.45, 2.9, '#4E8A4F'), -1.5 + i * 0.9, 0.16, -0.2));
  }
  for (let i = 0; i < 4; i += 1) g.add(at(ball(0.32, 0, shade(a, -0.25)), 1.4 + (i % 2) * 0.55, 0.12, -1.0 + i * 0.6));
  return { obj: g };
}

function silos(a) {
  const g = group(box(4.4, 0.16, 3.2, P.concrete));
  [[-1.3, -0.4, 3.2, 0.72], [0, -0.6, 2.7, 0.66], [1.3, -0.4, 2.3, 0.6]].forEach(([x, z, h, r]) => {
    g.add(at(cyl(r, r, h, 10, '#E6E1D8'), x, 0.16, z));
    g.add(at(cone(r * 1.05, 0.5, 10, shade(a, -0.15)), x, 0.16 + h, z));
  });
  const belt = box(3.0, 0.14, 0.4, P.dark);
  belt.position.set(0.3, 1.2, 1.0);
  belt.rotation.z = 0.32;
  g.add(belt);
  for (let i = 0; i < 5; i += 1) g.add(at(rot(ball(0.32, 0, i % 2 ? shade(a, -0.1) : '#9AA39C'), i, i, 0), -1.6 + i * 0.22, 0.1, 1.2 + (i % 2) * 0.25));
  return { obj: g };
}

function spools(a) {
  const g = group(box(4.2, 0.16, 3.0, '#C9B9A2'));
  const threads = [a, P.buoy, '#0E4F5C'];
  [[-1.2, 0.2], [0.1, -0.5], [1.3, 0.3]].forEach(([x, z], i) => {
    const s = group(
      cyl(0.62, 0.62, 0.16, 12, '#8A6A4F'),
      at(cyl(0.48, 0.48, 1.7, 12, threads[i]), 0, 0.16),
      at(cyl(0.62, 0.62, 0.16, 12, '#8A6A4F'), 0, 1.86),
      at(cyl(0.12, 0.12, 2.4, 8, '#8A6A4F'), 0, 0),
    );
    s.position.set(x, 0.16, z);
    g.add(s);
  });
  const bolt = cyl(0.42, 0.42, 2.6, 12, shade(a, 0.12));
  bolt.rotation.z = Math.PI / 2;
  bolt.position.set(0, 0.6, 1.1);
  g.add(bolt);
  return { obj: g };
}

function hydrogen(a) {
  const g = group(box(4.4, 0.16, 3.0, P.concrete));
  [[-1.1, -0.2, 1.05], [1.15, 0.1, 0.85]].forEach(([x, z, r]) => {
    const tank = group(at(ball(r, 2, P.white), 0, 0.9));
    for (let k = 0; k < 4; k += 1) {
      const ang = (k * Math.PI) / 2 + Math.PI / 4;
      tank.add(at(cyl(0.06, 0.06, 1.2, 6, P.steel), Math.cos(ang) * r * 0.62, 0, Math.sin(ang) * r * 0.62));
    }
    tank.add(at(cyl(r * 1.01, r * 1.01, 0.14, 14, shade(a, -0.1)), 0, 0.9 + r * 0.95));
    tank.position.set(x, 0.16, z);
    g.add(tank);
  });
  const pipe = cyl(0.1, 0.1, 2.4, 8, shade(a, -0.15));
  pipe.rotation.z = Math.PI / 2;
  pipe.position.set(0, 0.7, 1.0);
  g.add(pipe, at(box(0.8, 0.9, 0.6, shade(a, -0.05)), 0.2, 0.16, 1.2));
  return { obj: g };
}

function turbines(a) {
  const g = group();
  const rotors = [];
  [[-1.2, -0.6, 6.0], [1.3, -0.2, 5.0], [0.1, 1.2, 4.2]].forEach(([x, z, h]) => {
    const t = group(cyl(0.1, 0.22, h, 8, P.white), at(box(0.36, 0.36, 0.7, P.white), 0, h, 0));
    const hub = group(at(ball(0.16, 0, shade(a, -0.1)), 0, -0.16));
    for (let k = 0; k < 3; k += 1) {
      const blade = at(box(0.14, 2.1, 0.05, P.white), 0, 1.05);
      const holder = group(blade);
      holder.rotation.z = (k * Math.PI * 2) / 3;
      hub.add(holder);
    }
    hub.position.set(0, h + 0.18, 0.42);
    t.add(hub);
    rotors.push(hub);
    t.position.set(x, 0, z);
    t.rotation.y = -0.4;
    g.add(t);
  });
  return { obj: g, update: (t) => rotors.forEach((r, i) => { r.rotation.z = t * (0.9 + i * 0.15); }) };
}

export const LANDMARKS = {
  chipStack, crystals, fab, lighthouse, panels, antenna, datacenter, dome, cnc, robotArm, factory, ev, drone, pharma, clinic, greenhouse, silos, spools, hydrogen, turbines,
};

export function buildLandmark(kind, accent) {
  const make = LANDMARKS[kind] || chipStack;
  return make(accent);
}
