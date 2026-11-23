// Procedural low-poly horse replacing props/horse.glb (original kept in assets-src/). Same frame as the old model:
// faces +z, feet on y = 0, about 2.4 long nose to tail, back ~1.4 high (the rider is placed by HORSE.saddleY).
// Body, head/neck, tail and four two-segment legs are separate meshes so a simple gait can swing them:
// legs by speed (walk is diagonal pairs, gallop bounds), body bob and pitch, head nod, plus an idle breath and tail sway.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export interface HorseRig {
  object: THREE.Group;
  /** advance the gait; `walkSpeed` and `gallopSpeed` are the horse's own speed limits (m/s) */
  update(dt: number, speed: number, walkSpeed: number, gallopSpeed: number): void;
}

const COAT = new THREE.Color(0x6b4423);
const DARK = new THREE.Color(0x2b1d12);
const CLOTH = new THREE.Color(0x8c1c13);
let mat: THREE.MeshStandardMaterial | null = null;

function part(g: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const out = g.index ? g.toNonIndexed() : g;
  out.deleteAttribute("uv");
  const n = out.getAttribute("position").count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) color.toArray(c, i * 3);
  out.setAttribute("color", new THREE.BufferAttribute(c, 3));
  return out;
}
const blob = (sx: number, sy: number, sz: number, x: number, y: number, z: number, color = COAT, rx = 0) => {
  const g = new THREE.IcosahedronGeometry(1, 1);
  g.scale(sx, sy, sz);
  g.rotateX(rx);
  g.translate(x, y, z);
  return part(g, color);
};
/** a tapered limb hanging down from the origin */
const limb = (rTop: number, rBot: number, len: number, color: THREE.Color) => {
  const g = new THREE.CylinderGeometry(rTop, rBot, len, 6, 1);
  g.translate(0, -len / 2, 0);
  return part(g, color);
};

export function buildHorse(): HorseRig {
  mat ??= new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
  const mesh = (g: THREE.BufferGeometry) => {
    const m = new THREE.Mesh(g, mat!);
    m.castShadow = true;
    return m;
  };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // barrel, chest, rump and a saddle cloth
  body.add(
    mesh(
      mergeGeometries([
        blob(0.3, 0.32, 0.62, 0, 1.12, 0),
        blob(0.28, 0.3, 0.3, 0, 1.1, 0.5),
        blob(0.3, 0.3, 0.32, 0, 1.13, -0.5),
        part(new THREE.BoxGeometry(0.6, 0.06, 0.55).translate(0, 1.43, 0.05), CLOTH),
      ])!,
    ),
  );

  // neck and head pivot at the withers
  const neck = new THREE.Group();
  neck.position.set(0, 1.28, 0.6);
  body.add(neck);
  neck.add(
    mesh(
      mergeGeometries([
        blob(0.15, 0.4, 0.17, 0, 0.3, 0.12, COAT, -0.55),
        blob(0.13, 0.15, 0.3, 0, 0.66, 0.4, COAT, -0.2),
        blob(0.11, 0.12, 0.17, 0, 0.58, 0.64, DARK),
        blob(0.035, 0.07, 0.03, 0.08, 0.84, 0.28, COAT),
        blob(0.035, 0.07, 0.03, -0.08, 0.84, 0.28, COAT),
        part(new THREE.BoxGeometry(0.05, 0.5, 0.12).translate(0, 0.38, -0.02).rotateX(-0.55), DARK), // mane
      ])!,
    ),
  );

  const tail = new THREE.Group();
  tail.position.set(0, 1.3, -0.78);
  body.add(tail);
  tail.add(mesh(limb(0.05, 0.02, 0.7, DARK)));
  tail.rotation.x = 0.45;

  // legs: pivot at the hip, a knee/hock pivot halfway down
  type Leg = { hip: THREE.Group; knee: THREE.Group; phase: number; front: boolean };
  const legs: Leg[] = [];
  for (const [x, z, front] of [[-0.17, 0.5, true], [0.17, 0.5, true], [-0.17, -0.5, false], [0.17, -0.5, false]] as const) {
    const hip = new THREE.Group();
    hip.position.set(x, 1.0, z);
    hip.add(mesh(limb(0.09, 0.055, 0.5, COAT)));
    const knee = new THREE.Group();
    knee.position.y = -0.5;
    knee.add(mesh(mergeGeometries([limb(0.055, 0.04, 0.46, COAT), part(new THREE.BoxGeometry(0.1, 0.06, 0.13).translate(0, -0.47, 0.02), DARK)])!));
    hip.add(knee);
    body.add(hip);
    // walk: diagonal pairs; gallop: fronts together, backs together, a beat behind
    legs.push({ hip, knee, phase: (x < 0) === front ? 0 : Math.PI, front });
  }

  let t = 0;
  let idleT = 0;
  return {
    object: root,
    update(dt, speed, walkSpeed, gallopSpeed) {
      const s = Math.abs(speed);
      idleT += dt;
      const move = Math.min(1, s / walkSpeed);
      const gal = THREE.MathUtils.clamp((s - walkSpeed) / Math.max(gallopSpeed - walkSpeed, 1e-3), 0, 1);
      t += dt * Math.PI * 2 * (0.9 * move + 1.4 * gal) * (s > 0.3 ? 1 : 0);
      const amp = s > 0.3 ? 0.4 * move + 0.45 * gal : 0;
      for (const l of legs) {
        const ph = t + (l.front ? 0 : 0.35 * gal) + l.phase * (1 - gal);
        l.hip.rotation.x = Math.sin(ph) * amp;
        // fold the lower leg as it swings forward
        l.knee.rotation.x = Math.max(0, Math.cos(ph)) * amp * 1.3;
      }
      const breath = Math.sin(idleT * 1.6);
      body.position.y = Math.abs(Math.sin(t)) * 0.04 * (move + gal) + breath * 0.004;
      body.rotation.x = Math.sin(t) * 0.04 * gal;
      neck.rotation.x = 0.1 + Math.sin(t * 2) * 0.07 * (move + gal * 0.6) + breath * 0.02;
      tail.rotation.x = 0.45 + gal * 0.3;
      tail.rotation.z = Math.sin(idleT * 1.1) * 0.12 + Math.sin(t) * 0.12 * move;
    },
  };
}
