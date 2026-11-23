// Procedural low-poly jungle trees, replacing props/tree_a.glb and tree_b.glb (originals kept in assets-src/).
// Each tree is a tapered trunk with a few branch stubs plus clustered faceted foliage blobs, merged into two
// geometries (trunk, foliage) with vertex colours, sharing two flat-shaded materials. Colours and proportions were
// sampled from the old models: bark ~ rgb(139,88,67), leaves ~ rgb(88,123,0); tree_a is a broad crown on a thick trunk
// (about 4.4 wide, 4.7 tall, 7 total), tree_b a narrower crown on a slimmer trunk (about 3.7 wide, 4.4 tall, 6.8 total).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** small seeded RNG so a given variant always grows the same tree */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Archetype {
  trunkH: number;
  trunkR: number;
  crownY: number;
  crownRX: number;
  crownRY: number;
  blobs: number;
  blobR: [number, number];
  branches: number;
  total: number;
}
const ARCH: Record<"a" | "b", Archetype> = {
  a: { trunkH: 5.6, trunkR: 0.55, crownY: 4.7, crownRX: 2.1, crownRY: 2.3, blobs: 9, blobR: [1.0, 1.5], branches: 4, total: 7.0 },
  b: { trunkH: 5.0, trunkR: 0.38, crownY: 4.55, crownRX: 1.75, crownRY: 2.1, blobs: 7, blobR: [0.9, 1.3], branches: 3, total: 6.8 },
};

const BARK = new THREE.Color(0x8b5843);
const LEAF = new THREE.Color(0x587b12);
let trunkMat: THREE.MeshStandardMaterial | null = null;
let leafMat: THREE.MeshStandardMaterial | null = null;
const materials = () => {
  trunkMat ??= new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
  leafMat ??= new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 });
  return { trunkMat, leafMat };
};

/** a geometry reduced to position + normal + colour, non-indexed, so everything merges */
function paint(g: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const out = g.index ? g.toNonIndexed() : g;
  out.deleteAttribute("uv");
  const n = out.getAttribute("position").count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) color.toArray(c, i * 3);
  out.setAttribute("color", new THREE.BufferAttribute(c, 3));
  return out;
}

function buildTree(kind: "a" | "b", seed: number): THREE.Group {
  const A = ARCH[kind];
  const r = rng(seed * 7919 + (kind === "a" ? 11 : 97));
  const jitter = (c: THREE.Color, amt: number) => c.clone().offsetHSL((r() - 0.5) * 0.03, 0, (r() - 0.5) * amt);

  // trunk: a tapered, slightly flared cylinder with a lean, plus branch stubs reaching up into the crown
  const lean = (r() - 0.5) * 0.25;
  const trunkParts: THREE.BufferGeometry[] = [];
  const trunk = new THREE.CylinderGeometry(A.trunkR * 0.55, A.trunkR * 1.2, A.trunkH, 6, 1);
  trunk.translate(0, A.trunkH / 2, 0);
  trunk.applyMatrix4(new THREE.Matrix4().makeShear(lean, 0, 0, 0, 0, 0)); // x += lean * y
  trunkParts.push(paint(trunk, jitter(BARK, 0.08)));
  for (let i = 0; i < A.branches; i++) {
    const ang = (i / A.branches) * Math.PI * 2 + r() * 1.2;
    const len = 1.2 + r() * 1.0;
    const y0 = A.trunkH * (0.45 + r() * 0.3);
    const b = new THREE.CylinderGeometry(A.trunkR * 0.18, A.trunkR * 0.32, len, 5, 1);
    b.translate(0, len / 2, 0);
    const tilt = 0.7 + r() * 0.4;
    b.applyMatrix4(
      new THREE.Matrix4()
        .makeTranslation(lean * y0, y0, 0)
        .multiply(new THREE.Matrix4().makeRotationY(ang))
        .multiply(new THREE.Matrix4().makeRotationZ(-tilt)),
    );
    trunkParts.push(paint(b, jitter(BARK, 0.08)));
  }

  // foliage: faceted blobs scattered through an ellipsoid; the first sits on top so the crown has a peak
  const leafParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < A.blobs; i++) {
    const top = i === 0;
    const rad = A.blobR[0] + r() * (A.blobR[1] - A.blobR[0]);
    const u = r() * Math.PI * 2;
    const rr = top ? 0 : Math.sqrt(r()) * 0.85;
    const y = top ? A.crownRY * 0.55 : (r() * 2 - 1) * A.crownRY * 0.7;
    const g = new THREE.IcosahedronGeometry(rad, 1);
    g.scale(1, 0.8 + r() * 0.2, 1);
    g.rotateY(r() * 6.28);
    g.translate(Math.cos(u) * rr * A.crownRX + lean * A.crownY, A.crownY + y, Math.sin(u) * rr * A.crownRX);
    // darker underneath, lighter on top
    const shade = jitter(LEAF, 0.16).multiplyScalar(0.8 + 0.3 * (y / A.crownRY + 1) * 0.5);
    leafParts.push(paint(g, shade));
  }

  const { trunkMat, leafMat } = materials();
  const tm = new THREE.Mesh(mergeGeometries(trunkParts)!, trunkMat);
  const lm = new THREE.Mesh(mergeGeometries(leafParts)!, leafMat);
  tm.castShadow = tm.receiveShadow = lm.castShadow = lm.receiveShadow = true;
  const g = new THREE.Group();
  g.add(tm, lm);
  return g;
}

/** Normalise like loadProp(..., "height"): `height` tall, centred on x/z, feet at y = 0. */
function fit(tree: THREE.Group, height: number): THREE.Object3D {
  const box = new THREE.Box3().setFromObject(tree);
  const size = box.getSize(new THREE.Vector3());
  const c = box.getCenter(new THREE.Vector3());
  tree.position.set(-c.x, -box.min.y, -c.z);
  const wrap = new THREE.Group();
  wrap.add(tree);
  wrap.scale.setScalar(height / Math.max(size.y, 1e-6));
  return wrap;
}

/** Tree models (alternating tree_a-like and tree_b-like, `variants` seeds each), `height` metres tall. */
export function buildJungleTrees(height: number, variants = 3): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  for (let v = 0; v < variants; v++) for (const kind of ["a", "b"] as const) out.push(fit(buildTree(kind, v + 1), height));
  return out;
}

let fernMat: THREE.MeshStandardMaterial | null = null;

/**
 * Procedural fern replacing props/fern.glb: a rosette of arching, double-sided fronds with notched (leaflet) edges.
 * The old model was about 9 wide and 2.7 tall (ratio ~3.4) with leaves ~ rgb(114,131,45); it is fitted by height like
 * loadProp(..., "height"), so placement and scale behave the same. One merged geometry, one shared material.
 */
export function buildFern(height: number, seed = 1): THREE.Object3D {
  const r = rng(seed * 104729);
  const base = new THREE.Color(0x3d5a1a);
  const tip = new THREE.Color(0x73832d);
  const parts: THREE.BufferGeometry[] = [];
  const fronds = 9;
  const segs = 10;
  for (let f = 0; f < fronds; f++) {
    const ang = (f / fronds) * Math.PI * 2 + (r() - 0.5) * 0.5;
    const len = 3.6 + r() * 1.0;
    const rise = 1.6 + r() * 0.8;
    const wMax = 0.55 + r() * 0.2;
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const px = -dz;
    const pz = dx;
    const pos: number[] = [];
    const col: number[] = [];
    const ring: { l: THREE.Vector3; rt: THREE.Vector3; m: THREE.Vector3; c: THREE.Color }[] = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const d = 0.15 + len * t;
      const y = 0.05 + rise * Math.sin(t * Math.PI * 0.72);
      // tapered strip; odd rings are pulled in so the edge reads as leaflets
      const w = wMax * Math.sin(Math.PI * Math.min(1, 0.18 + t * 0.9)) * (i % 2 ? 0.45 : 1) * (1 - t * 0.55);
      const lift = w * 0.25;
      ring.push({
        l: new THREE.Vector3(dx * d + px * w, y + lift, dz * d + pz * w),
        rt: new THREE.Vector3(dx * d - px * w, y + lift, dz * d - pz * w),
        m: new THREE.Vector3(dx * d, y, dz * d),
        c: base.clone().lerp(tip, t),
      });
    }
    const push = (v: THREE.Vector3, c: THREE.Color) => {
      pos.push(v.x, v.y, v.z);
      col.push(c.r, c.g, c.b);
    };
    for (let i = 0; i < segs; i++) {
      const a = ring[i];
      const b = ring[i + 1];
      const ca = a.m;
      const cb = b.m;
      // two quads (left and right of the midrib), each as two triangles
      push(a.l, a.c);
      push(ca, a.c);
      push(b.l, b.c);
      push(ca, a.c);
      push(cb, b.c);
      push(b.l, b.c);
      push(ca, a.c);
      push(a.rt, a.c);
      push(cb, b.c);
      push(a.rt, a.c);
      push(b.rt, b.c);
      push(cb, b.c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    parts.push(g);
  }
  fernMat ??= new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 });
  const mesh = new THREE.Mesh(mergeGeometries(parts)!, fernMat);
  mesh.castShadow = mesh.receiveShadow = true;
  const g = new THREE.Group();
  g.add(mesh);
  return fit(g, height);
}
