import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Box, Vec2 } from "./logic";
import { HARBOUR, type GuardDef, type LevelDef, type Placed } from "./levels";
import { spreadIndices } from "./touch";
import { addTideScene, type TideScene } from "./tideScene";

// Fully procedural kit for a Malacca-1511 kampung: timber stilt houses with atap roofs,
// pasar stalls, tiered istana, watch towers, a harbour with a jetty and prahu boats.
// What goes where comes from a LevelDef (levels.ts).

export type { GuardDef };

export interface HideSpot {
  x: number;
  z: number;
  r: number;
}
/** Axis-aligned area on the ground plane. */
export interface Area {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}
const areaOf = (r: { x: number; z: number; w: number; d: number }): Area => ({ minX: r.x - r.w / 2, maxX: r.x + r.w / 2, minZ: r.z - r.d / 2, maxZ: r.z + r.d / 2 });

export interface Level {
  root: THREE.Group;
  colliders: Box[]; // everything solid
  occluders: Box[]; // blocks line of sight (tall things only)
  hides: HideSpot[];
  guards: GuardDef[];
  start: Vec2;
  exit: Vec2;
  exitBeam: THREE.Mesh;
  bounds: LevelDef["bounds"] & { water: Area[]; decks: Area[] };
  text: LevelDef["text"];
  /** every lantern on the map */
  lamps: Vec2[];
  /** the few real point lights, moved to the lanterns nearest the camera (a big map has more lanterns than lights) */
  lampLights: THREE.PointLight[];
  /** sampans: their meshes (in root) and where they were moored */
  boats: { group: THREE.Group; x: number; z: number; yaw: number }[];
  /** jungle plants and mountain boulders: where they stand, and the groups holding their (instanced) meshes, so models can replace them */
  foliage: { trees: Placed[]; treeGroup: THREE.Group; ferns: Placed[]; fernGroup: THREE.Group; rocks: (Placed & { kind: number })[]; rockGroup: THREE.Group };
  /** the waterfall's texture, scrolled each frame (null when the map has no falls) */
  flow: THREE.Texture | null;
  /** the tide's water sheets and mudflats (tideScene.ts) */
  tide: TideScene;
}

/** One InstancedMesh per geometry, placed at each spot (turned by r, scaled by s). */
const CHUNK = 24;
/**
 * The spots as InstancedMeshes, one per CHUNK-metre square of the map, so squares off screen (or beyond the fog,
 * see cullFoliage) are not drawn. One mesh for the whole map would draw every instance every frame.
 */
export function instanced(geo: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], list: Placed[], shadow = true): THREE.Group {
  const g = new THREE.Group();
  const cells = new Map<string, Placed[]>();
  for (const t of list) {
    const k = `${Math.floor(t.x / CHUNK)},${Math.floor(t.z / CHUNK)}`;
    const c = cells.get(k);
    if (c) c.push(t);
    else cells.set(k, [t]);
  }
  const o = new THREE.Object3D();
  for (const part of cells.values()) {
    const im = new THREE.InstancedMesh(geo, m, part.length);
    part.forEach((t, i) => {
      o.position.set(t.x, t.y ?? 0, t.z);
      o.rotation.set(0, t.r, 0);
      o.scale.setScalar(t.s);
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
    });
    im.castShadow = shadow;
    im.receiveShadow = true;
    im.computeBoundingSphere();
    g.add(im);
  }
  return g;
}

/** Hide foliage squares whose nearest edge is further than `far` from the camera. */
export function cullFoliage(group: THREE.Object3D, cam: THREE.Vector3, far: number) {
  group.traverse((o) => {
    const im = o as THREE.InstancedMesh;
    if (!im.isInstancedMesh || !im.boundingSphere) return;
    im.visible = im.boundingSphere.center.distanceTo(cam) - im.boundingSphere.radius < far;
  });
}

/** Height of the open space under a stilt house's floor. */
const STILT_H = 1.75;

const matCache = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  const key = color + JSON.stringify(opts);
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true, ...opts });
    matCache.set(key, m);
  }
  return m;
}
/** Unlit glow materials (lantern and shrine flames), shared like mat()'s. */
const basicCache = new Map<number, THREE.MeshBasicMaterial>();
function glow(color: number) {
  let m = basicCache.get(color);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color });
    basicCache.set(color, m);
  }
  return m;
}

/** Materials one level made for itself (ground, water, falls, exit beam), freed with it; the caches above outlive levels. */
const owned = new WeakSet<THREE.Material>();
function own<T extends THREE.Material>(m: T): T {
  owned.add(m);
  return m;
}

/** Free a level's GPU memory once it is out of the scene: every geometry under its root, and its own materials and their textures. */
export function disposeLevel(level: Level) {
  const mats = new Set<THREE.Material>();
  level.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    const m = mesh.material;
    if (!m) return;
    for (const x of Array.isArray(m) ? m : [m]) if (owned.has(x)) mats.add(x);
  });
  for (const m of mats) {
    (m as THREE.MeshStandardMaterial).map?.dispose();
    m.dispose();
  }
}

const mergeBox = new THREE.Box3();
/**
 * Static meshes placed straight in `root` with a shared material (houses, stilts, stalls, piers, lantern posts...)
 * baked into one mesh per material per CHUNK-metre square: a few dozen draw calls (and shadow passes) instead of
 * hundreds. Meshes inside groups (boats, palms, ships), instanced, multi-material or one-off materials are left alone.
 * Flat ground pieces are kept apart from the rest, so the wayang look still tells floor from walls (wayangLook.ts).
 */
function mergeStatic(root: THREE.Group) {
  const shared = new Set<THREE.Material>([...matCache.values(), ...basicCache.values()]);
  const sets = new Map<string, { m: THREE.Material; cast: boolean; flat: boolean; list: THREE.Mesh[] }>();
  const ids = new Map<THREE.Material, number>();
  for (const o of root.children) {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh || mesh.children.length || Array.isArray(mesh.material)) continue;
    if (!shared.has(mesh.material) || !mesh.receiveShadow || !mesh.visible) continue;
    const geo = mesh.geometry;
    mesh.updateMatrix();
    if (!geo.boundingBox) geo.computeBoundingBox();
    mergeBox.copy(geo.boundingBox!).applyMatrix4(mesh.matrix);
    const flat = mergeBox.max.y - mergeBox.min.y < 0.2 && mergeBox.max.y < 0.35;
    let id = ids.get(mesh.material);
    if (id === undefined) ids.set(mesh.material, (id = ids.size));
    const attrs = Object.keys(geo.attributes).sort().join(",");
    const cell = `${Math.floor(mesh.position.x / CHUNK)},${Math.floor(mesh.position.z / CHUNK)}`;
    const key = `${id}|${mesh.castShadow}|${flat}|${geo.index ? 1 : 0}|${attrs}|${cell}`;
    const s = sets.get(key);
    if (s) s.list.push(mesh);
    else sets.set(key, { m: mesh.material, cast: mesh.castShadow, flat, list: [mesh] });
  }
  for (const { m, cast, flat, list } of sets.values()) {
    if (list.length < 2) continue;
    const merged = mergeGeometries(list.map((x) => x.geometry.clone().applyMatrix4(x.matrix)));
    if (!merged) continue;
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    // a flat set that is no longer flat as a whole would change how the wayang look paints it: keep it as it was
    const b = merged.boundingBox!;
    if (flat && !(b.max.y - b.min.y < 0.2 && b.max.y < 0.35)) {
      merged.dispose();
      continue;
    }
    for (const x of list) {
      root.remove(x);
      x.geometry.dispose();
    }
    const one = new THREE.Mesh(merged, m);
    one.castShadow = cast;
    one.receiveShadow = true;
    one.matrixAutoUpdate = false;
    root.add(one);
  }
}

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const boxOf = (cx: number, cz: number, w: number, d: number, h: number, minY = 0): Box => ({
  minX: cx - w / 2,
  maxX: cx + w / 2,
  minY,
  maxY: h,
  minZ: cz - d / 2,
  maxZ: cz + d / 2,
});

function mesh(geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, shadow = true) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = shadow;
  o.receiveShadow = true;
  return o;
}

/** Sloped atap roof: a square frustum scaled to (w, d), top face at y = topY. */
function atapRoof(w: number, d: number, topY: number, rise: number, color: number) {
  const geo = new THREE.CylinderGeometry(0.5657, 0.7071, rise, 4, 1);
  geo.rotateY(Math.PI / 4);
  const m = mesh(geo, mat(color), 0, topY - rise / 2, 0);
  m.scale.set(w, 1, d);
  return m;
}

export function buildLevel(def: LevelDef = HARBOUR, opts: { lampLights?: number } = {}): Level {
  const root = new THREE.Group();
  const colliders: Box[] = [];
  const occluders: Box[] = [];
  const hides: HideSpot[] = [];
  const rnd = seeded(def.seed);
  const winLit: THREE.Matrix4[] = [];
  const winDark: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();

  const addCollider = (b: Box) => {
    colliders.push(b);
    if (b.maxY >= 2) occluders.push(b);
  };

  const addWindow = (x: number, y: number, z: number, faceX: boolean) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, faceX ? Math.PI / 2 : 0, 0);
    dummy.updateMatrix();
    (rnd() < 0.45 ? winLit : winDark).push(dummy.matrix.clone());
  };

  /** A timber stilt house (or tier of the palace). */
  function house(cx: number, cz: number, w: number, d: number, h: number, wall: number, roof: number, opts: { windows?: boolean; stilts?: boolean } = {}) {
    const { windows = true, stilts = true } = opts;
    const roofH = 0.6;
    const baseH = stilts ? STILT_H : 0;
    if (stilts) {
      // raised floor + walls + roof are one solid block; the space under it is open ground
      addCollider(boxOf(cx, cz, w, d, h, baseH));
      // stilts are thin solid posts; everything between them can be walked through
      const nx = Math.max(2, Math.round(w / 4) + 1);
      const nz = Math.max(2, Math.round(d / 4) + 1);
      for (let i = 0; i < nx; i++)
        for (let j = 0; j < nz; j++) {
          if (i > 0 && i < nx - 1 && j > 0 && j < nz - 1) continue;
          const px = cx - w / 2 + 0.25 + (i / (nx - 1)) * (w - 0.5);
          const pz = cz - d / 2 + 0.25 + (j / (nz - 1)) * (d - 0.5);
          addCollider(boxOf(px, pz, 0.36, 0.36, baseH));
          root.add(mesh(new THREE.CylinderGeometry(0.16, 0.2, baseH + 0.1, 6), mat(0x4a3220), px, baseH / 2, pz));
        }
      root.add(mesh(new THREE.BoxGeometry(w, 0.12, d), mat(0x2a1a10), cx, baseH - 0.06, cz));
    } else {
      addCollider(boxOf(cx, cz, w, d, h));
    }
    const wallH = h - roofH - baseH;
    root.add(mesh(new THREE.BoxGeometry(w, wallH, d), mat(wall), cx, baseH + wallH / 2, cz));
    // horizontal plank bands
    for (let y = baseH + 0.7; y < h - roofH - 0.2; y += 0.9)
      root.add(mesh(new THREE.BoxGeometry(w + 0.06, 0.06, d + 0.06), mat(0x3d2a1a), cx, y, cz, false));
    const r = atapRoof(w + 1.0, d + 1.0, h, roofH, roof);
    r.position.x = cx;
    r.position.z = cz;
    root.add(r);
    if (windows) {
      const rows = h > 5 ? [baseH + 0.9, h - roofH - 1.1] : [baseH + 0.9];
      for (const y of rows) {
        for (let i = 0; i < Math.floor(w / 3.2); i++) {
          const x = cx - w / 2 + (i + 0.5) * (w / Math.floor(w / 3.2));
          addWindow(x, y, cz - d / 2 - 0.06, false);
          addWindow(x, y, cz + d / 2 + 0.06, false);
        }
        for (let i = 0; i < Math.floor(d / 3.2); i++) {
          const z = cz - d / 2 + (i + 0.5) * (d / Math.floor(d / 3.2));
          addWindow(cx - w / 2 - 0.06, y, z, true);
          addWindow(cx + w / 2 + 0.06, y, z, true);
        }
      }
    }
  }

  // ---------------------------------------------------------------- ground + sea
  const groundTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#8c6c48";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      const v = 90 + Math.floor(rnd() * 70);
      g.fillStyle = `rgba(${v + 40},${v + 12},${v - 20},0.35)`;
      g.fillRect(rnd() * 256, rnd() * 256, 2 + rnd() * 3, 2 + rnd() * 3);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(40, 40);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  groundTex.repeat.set(40, 56);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 280), own(new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 })));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, def.shoreZ + 140);
  ground.receiveShadow = true;
  root.add(ground);

  // the sea and every river sheet share one water material
  const waterMat = own(new THREE.MeshStandardMaterial({ color: 0x1c5560, roughness: 0.25, metalness: 0.35 }));
  const water = new THREE.Mesh(new THREE.PlaneGeometry(500, 300), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.3, def.shoreZ - 150 + 1);
  root.add(water);
  // wet shore line
  root.add(mesh(new THREE.BoxGeometry(70, 0.12, 1.2), mat(0x5b4a35), 0, 0.02, def.shoreZ - 0.2, false));
  // rivers: a water sheet just above the ground, with muddy banks
  const sheets: THREE.Mesh[] = [];
  for (const r of def.water) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), waterMat);
    w.rotation.x = -Math.PI / 2;
    w.position.set(r.x, 0.06, r.z);
    w.receiveShadow = true;
    root.add(w);
    sheets.push(w);
    for (const s of [-1, 1]) root.add(mesh(new THREE.BoxGeometry(r.w, 0.1, 1.0), mat(0x5b4a35), r.x, 0.03, r.z + s * (r.d / 2 + 0.3), false));
  }
  // pasang surut: mudflats under the shore and the river beds, and the water sheets the tide moves
  const tide = addTideScene(root, def.shoreZ, water, def.water, sheets);

  // ---------------------------------------------------------------- jungle: forest floor, trails, clearings
  for (const r of def.forestFloor ?? []) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), mat(def.floorColor ?? 0x3e4a2a));
    f.rotation.x = -Math.PI / 2;
    f.position.set(r.x, 0.006, r.z);
    f.receiveShadow = true;
    root.add(f);
  }
  for (const c of def.clearings ?? []) {
    const f = new THREE.Mesh(new THREE.CircleGeometry(c.r, 20), mat(0x6a5236));
    f.rotation.x = -Math.PI / 2;
    f.position.set(c.x, 0.012, c.z);
    f.receiveShadow = true;
    root.add(f);
  }
  for (const t of def.trails ?? [])
    for (let i = 1; i < t.length; i++) {
      const a = t[i - 1];
      const b = t[i];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(2.6, len + 2.6), mat(0x5e4a33));
      f.rotation.set(-Math.PI / 2, 0, Math.atan2(b.x - a.x, b.z - a.z));
      f.position.set((a.x + b.x) / 2, 0.015 + i * 0.001, (a.z + b.z) / 2);
      f.receiveShadow = true;
      root.add(f);
    }

  // ---------------------------------------------------------------- jungle trees (solid trunks) and ferns
  const trees = def.trees ?? [];
  const ferns = def.ferns ?? [];
  const treeGroup = new THREE.Group();
  const fernGroup = new THREE.Group();
  root.add(treeGroup, fernGroup);
  for (const t of trees) addCollider(boxOf(t.x, t.z, 0.9 * t.s, 0.9 * t.s, (t.y ?? 0) + 7, t.y ?? 0));
  if (trees.length) {
    // built-in look until the tree models load: a trunk and two lumps of canopy
    const trunk = new THREE.CylinderGeometry(0.3, 0.5, 8, 7);
    trunk.translate(0, 4, 0);
    const crown = new THREE.IcosahedronGeometry(3, 0);
    crown.translate(0, 9, 0);
    const crown2 = new THREE.IcosahedronGeometry(2.2, 0);
    crown2.translate(1.2, 7.4, 0.6);
    treeGroup.add(instanced(trunk, mat(0x4a3523), trees), instanced(crown, mat(0x2f5a2a), trees), instanced(crown2, mat(0x386630), trees));
  }
  if (ferns.length) {
    const fern = new THREE.ConeGeometry(0.7, 0.8, 6);
    fern.translate(0, 0.4, 0);
    fernGroup.add(instanced(fern, mat(0x3f7a34), ferns, false));
  }

  // ---------------------------------------------------------------- Gunung Ledang: rock tiers, boulders, the falls, the summit shrine
  const rockMat = mat(0x7b786d);
  const mossMat = mat(0x56653a);
  const jit = (x: number, y: number, z: number, k: number) => {
    const v = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + k * 4.1) * 43758.5453;
    return v - Math.floor(v) - 0.5;
  };
  for (const c of def.cliffs ?? []) {
    addCollider(boxOf(c.x, c.z, c.w, c.d, c.h));
    // rough faces: every vertex below the lip is nudged (by its position, so shared corners stay closed); the top stays flat
    const geo = new THREE.BoxGeometry(c.w, c.h, c.d, Math.max(1, Math.round(c.w / 2.5)), 3, Math.max(1, Math.round(c.d / 2.5)));
    geo.translate(c.x, c.h / 2, c.z);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (y > c.h - 0.01) continue;
      pos.setX(i, x + jit(x, y, z, 1) * 0.55);
      pos.setZ(i, z + jit(x, y, z, 2) * 0.55);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, [rockMat, rockMat, mossMat, rockMat, rockMat, rockMat]);
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
  }
  const rocks = def.rocks ?? [];
  const rockGroup = new THREE.Group();
  root.add(rockGroup);
  if (rocks.length) {
    // built-in boulders until the rock models load
    const boulder = new THREE.DodecahedronGeometry(0.7, 0);
    boulder.scale(1.2, 0.8, 1);
    boulder.translate(0, 0.45, 0);
    rockGroup.add(instanced(boulder, rockMat, rocks));
  }
  let flow: THREE.Texture | null = null;
  if (def.falls) {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "#8fc3d6";
    g.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.5})`;
      g.fillRect(rnd() * 64, rnd() * 128, 1 + rnd() * 3, 8 + rnd() * 30);
    }
    flow = new THREE.CanvasTexture(c);
    flow.wrapS = flow.wrapT = THREE.RepeatWrapping;
    flow.colorSpace = THREE.SRGBColorSpace;
    const fm = own(new THREE.MeshBasicMaterial({ map: flow, transparent: true, opacity: 0.82, depthWrite: false, side: THREE.DoubleSide }));
    const splash = own(new THREE.MeshBasicMaterial({ color: 0xdcecf0, transparent: true, opacity: 0.55, depthWrite: false }));
    /** a plane whose texture repeats once every 2 m, so every piece of the falls flows at the same speed */
    const sheet = (w: number, h: number) => {
      const geo = new THREE.PlaneGeometry(w, h);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / 2, (uv.getY(i) * h) / 2);
      return geo;
    };
    for (const s of def.falls.sheets) {
      // hung just off the face (clear of its rough rock), flowing down
      const m = new THREE.Mesh(sheet(s.w, s.y1 - s.y0 + 0.2), fm);
      m.position.set(s.x, (s.y0 + s.y1) / 2, s.z - 0.45);
      root.add(m);
      root.add(mesh(new THREE.CircleGeometry(s.w * 0.7, 10).rotateX(-Math.PI / 2), splash, s.x, s.y0 + 0.08, s.z - 0.9, false));
    }
    for (const s of def.falls.streams) {
      // flat on the ledge, flowing south to the next drop
      const m = new THREE.Mesh(sheet(s.w, s.d), fm);
      m.rotation.set(-Math.PI / 2, 0, Math.PI);
      m.position.set(s.x, s.y + 0.04, s.z);
      root.add(m);
    }
  }
  if (def.shrine) {
    // Puteri Gunung Ledang's shrine: a stone floor, an open pavilion on four posts, an altar for the offerings
    const { x, z, y } = def.shrine;
    root.add(mesh(new THREE.BoxGeometry(5.4, 0.12, 5.4), mat(0x9a917e), x, y + 0.06, z));
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        addCollider(boxOf(x + sx * 1.8, z + sz * 1.8, 0.3, 0.3, y + 2.5, y));
        root.add(mesh(new THREE.CylinderGeometry(0.13, 0.16, 2.5, 6), mat(0x5a3a24), x + sx * 1.8, y + 1.25, z + sz * 1.8));
        root.add(mesh(new THREE.SphereGeometry(0.16, 8, 6), glow(0xffc069), x + sx * 1.8, y + 2.3, z + sz * 1.8 - sz * 0.2, false));
      }
    // the roof is solid (and climbable) above head height
    addCollider(boxOf(x, z, 4.6, 4.6, y + 3.6, y + 2.5));
    const r = atapRoof(4.8, 4.8, y + 3.6, 1.1, 0x8d6e3f);
    r.position.x = x;
    r.position.z = z;
    root.add(r);
    addCollider(boxOf(x, z, 1.2, 0.8, y + 0.85, y));
    root.add(mesh(new THREE.BoxGeometry(1.2, 0.85, 0.8), mat(0x8a8577), x, y + 0.425, z));
    root.add(mesh(new THREE.BoxGeometry(1.4, 0.08, 1.0), mat(0x6e6a5e), x, y + 0.87, z));
  }

  // ---------------------------------------------------------------- houses (kampung lanes between) + palace tiers
  const wallCols = [0x7a5535, 0x6d4a30, 0x84613c, 0x5f4029];
  const roofCols = [0xb89a5a, 0xa98a4e, 0xc2a566];
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  for (const h of def.houses) house(h.x, h.z, h.w, h.d, h.h, h.wall ?? pick(wallCols), h.roof ?? pick(roofCols), { windows: h.windows, stilts: h.stilts });
  for (const f of def.finials) root.add(mesh(new THREE.ConeGeometry(0.35, 1.6, 8), mat(0xd9a93a, { emissive: 0x4a3200 }), f.x, f.y, f.z));
  // low steps, climbable
  for (const st of def.steps) {
    addCollider(boxOf(st.x, st.z, st.w, st.d, st.h));
    root.add(mesh(new THREE.BoxGeometry(st.w, st.h, st.d), mat(0x6b5a48), st.x, st.h / 2, st.z));
  }

  // Watch towers (kubu)
  for (const { x: tx, z: tz } of def.towers) {
    addCollider(boxOf(tx, tz, 3.6, 3.6, 15, 11.5));
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) addCollider(boxOf(tx + sx * 1, tz + sz * 1, 0.5, 0.5, 11.5));
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        root.add(mesh(new THREE.CylinderGeometry(0.17, 0.22, 11.5, 6), mat(0x4a3220), tx + sx * 1, 5.75, tz + sz * 1));
    for (let y = 1.5; y < 11; y += 2.4)
      root.add(mesh(new THREE.BoxGeometry(2.5, 0.12, 2.5), mat(0x3d2a1a), tx, y, tz, false));
    root.add(mesh(new THREE.BoxGeometry(3.6, 0.3, 3.6), mat(0x5a3d26), tx, 11.7, tz));
    root.add(mesh(new THREE.BoxGeometry(3.0, 2.2, 3.0), mat(0x6d4a30), tx, 12.9, tz));
    const r = atapRoof(4.6, 4.6, 15, 1.2, 0xb89a5a);
    r.position.x = tx;
    r.position.z = tz;
    root.add(r);
  }

  // ---------------------------------------------------------------- palisade (N, E, W) + jetty bounds
  const posts: THREE.Matrix4[] = [];
  const postAt = (x: number, z: number, h: number) => {
    dummy.position.set(x, h / 2, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, h, 1);
    dummy.updateMatrix();
    posts.push(dummy.matrix.clone());
    dummy.scale.set(1, 1, 1);
  };
  const pal = def.palisade;
  for (let x = pal.minX; x <= pal.maxX; x += 0.55) postAt(x, pal.maxZ, 4.2 + rnd() * 0.5);
  for (let z = pal.minZ; z <= pal.maxZ; z += 0.55) {
    postAt(pal.minX, z, 4.2 + rnd() * 0.5);
    postAt(pal.maxX, z, 4.2 + rnd() * 0.5);
  }
  // inner palisades: posts and a solid wall, open at the gates (a low beam over each gate)
  for (const f of def.fences ?? []) {
    const inGate = (x: number) => f.gates.some((g) => Math.abs(x - g.x) < g.w / 2);
    for (let x = f.minX; x <= f.maxX; x += 0.55) if (!inGate(x)) postAt(x, f.z, 4.2 + rnd() * 0.5);
    const cuts = [...f.gates].sort((a, b) => a.x - b.x).flatMap((g) => [g.x - g.w / 2, g.x + g.w / 2]);
    const edges = [f.minX, ...cuts, f.maxX];
    for (let i = 0; i < edges.length; i += 2) if (edges[i + 1] - edges[i] > 0.05) addCollider(boxOf((edges[i] + edges[i + 1]) / 2, f.z, edges[i + 1] - edges[i], 0.6, 4.5));
    for (const g of f.gates) root.add(mesh(new THREE.BoxGeometry(g.w + 0.8, 0.35, 0.4), mat(0x4e3622), g.x, 4.3, f.z));
  }
  const postGeo = new THREE.CylinderGeometry(0.22, 0.26, 1, 6);
  const postMesh = new THREE.InstancedMesh(postGeo, mat(0x4e3622), posts.length);
  posts.forEach((m, i) => postMesh.setMatrixAt(i, m));
  postMesh.castShadow = true;
  postMesh.receiveShadow = true;
  root.add(postMesh);

  // ---------------------------------------------------------------- jetty
  const j = def.jetty;
  addCollider(boxOf(j.x, j.z, j.w, j.d, 0.4));
  root.add(mesh(new THREE.BoxGeometry(j.w, 0.22, j.d), mat(0x6e5237), j.x, 0.28, j.z));
  for (let z = j.z - j.d / 2 + 0.5; z <= j.z + j.d / 2 - 0.5; z += 1.75)
    for (const sx of [-1, 1]) root.add(mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.6, 6), mat(0x3d2a1a), j.x + sx * (j.w / 2), -0.1, z));

  // ---------------------------------------------------------------- bridges and river jetties
  for (const dk of def.decks) {
    addCollider(boxOf(dk.x, dk.z, dk.w, dk.d, 0.4));
    root.add(mesh(new THREE.BoxGeometry(dk.w, 0.22, dk.d), mat(0x6e5237), dk.x, 0.28, dk.z));
    for (let z = dk.z - dk.d / 2 + 0.5; z <= dk.z + dk.d / 2 - 0.5; z += 1.75)
      for (const sx of [-1, 1]) {
        const px = dk.x + sx * (dk.w / 2);
        root.add(mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.6, 6), mat(0x3d2a1a), px, -0.1, z));
        // rail posts (no collider: the water stops anyone stepping off)
        if (dk.rails) root.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 5), mat(0x4a3220), px, 0.9, z));
      }
    if (dk.rails) for (const sx of [-1, 1]) root.add(mesh(new THREE.BoxGeometry(0.1, 0.1, dk.d), mat(0x4a3220), dk.x + sx * (dk.w / 2), 1.35, dk.z));
  }

  // ---------------------------------------------------------------- stalls (gerai)
  const goods = [0xd24a2b, 0xe0a82e, 0x4d9a3a, 0xf0e0b0];
  for (const { x, z, w, d } of def.stalls) {
    addCollider(boxOf(x, z, w, d, 1.3));
    root.add(mesh(new THREE.BoxGeometry(w, 1.3, d), mat(0x6a4a2c), x, 0.65, z));
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        root.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 5), mat(0x3d2a1a), x + sx * (w / 2 - 0.1), 1.85, z + sz * (d / 2 - 0.1)));
    const aw = atapRoof(w + 0.8, d + 0.8, 2.5, 0.35, pick(roofCols));
    aw.position.x = x;
    aw.position.z = z;
    root.add(aw);
    for (let i = 0; i < 5; i++)
      root.add(mesh(new THREE.SphereGeometry(0.17, 6, 5), mat(pick(goods)), x + (rnd() - 0.5) * (w - 0.5), 1.4, z + (rnd() - 0.5) * (d - 0.5), false));
  }

  // ---------------------------------------------------------------- plaza: wells + cannons
  for (const { x, z } of def.wells) {
    addCollider(boxOf(x, z, 2.6, 2.6, 0.8));
    root.add(mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.8, 10), mat(0x7d7466), x, 0.4, z));
    root.add(mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.1, 10), mat(0x1f4a55, { roughness: 0.2 }), x, 0.82, z, false));
  }
  for (const { x, z } of def.cannons) {
    addCollider(boxOf(x, z, 2.2, 0.9, 0.9));
    const cannon = mesh(new THREE.CylinderGeometry(0.3, 0.38, 2.2, 8), mat(0x2f3338, { metalness: 0.5, roughness: 0.5 }), x, 0.95, z);
    cannon.rotation.z = Math.PI / 2.1;
    root.add(cannon);
    root.add(mesh(new THREE.BoxGeometry(1.4, 0.45, 0.9), mat(0x4e3622), x, 0.35, z));
  }

  // ---------------------------------------------------------------- hiding spots (jerami + semak)
  for (const { x, z } of def.hay) {
    hides.push({ x, z, r: 1.5 });
    root.add(mesh(new THREE.ConeGeometry(1.25, 1.9, 9), mat(0xc9a64a), x, 0.95, z));
    root.add(mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.5, 9), mat(0xb8953e), x, 0.25, z));
  }
  for (const { x, z } of def.bushes) {
    hides.push({ x, z, r: 1.6 });
    for (let i = 0; i < 4; i++)
      root.add(mesh(new THREE.IcosahedronGeometry(0.9 + rnd() * 0.3, 0), mat(0x3f6b34), x + (rnd() - 0.5) * 1.2, 0.7 + rnd() * 0.3, z + (rnd() - 0.5) * 1.2));
  }

  // ---------------------------------------------------------------- palms
  const leafGeo = new THREE.PlaneGeometry(0.7, 3.4, 1, 3);
  leafGeo.translate(0, 1.7, 0);
  for (const { x, z } of def.palms) {
    const g = new THREE.Group();
    const trunk = mesh(new THREE.CylinderGeometry(0.2, 0.32, 7.5, 7), mat(0x6e5538), 0, 3.75, 0);
    g.add(trunk);
    for (let i = 0; i < 8; i++) {
      const leaf = new THREE.Mesh(leafGeo, mat(0x3c7a38, { side: THREE.DoubleSide }));
      leaf.position.y = 7.4;
      leaf.rotation.order = "YXZ";
      leaf.rotation.y = (i / 8) * Math.PI * 2;
      leaf.rotation.x = 1.15;
      leaf.castShadow = true;
      g.add(leaf);
    }
    g.position.set(x, 0, z);
    g.rotation.z = (rnd() - 0.5) * 0.12;
    root.add(g);
  }

  // ---------------------------------------------------------------- harbour: prahu + a big foreign ship
  function prahu(x: number, z: number, rotY: number, scale = 1) {
    const g = new THREE.Group();
    const hull = mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0x5a3d26), 0, 0.35, 0);
    hull.scale.set(0.9, 0.7, 3.2);
    g.add(hull);
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, 4.2, 5), mat(0x3d2a1a), 0, 2.2, 0));
    const sail = new THREE.Shape();
    sail.moveTo(0, 0);
    sail.lineTo(2.4, 0);
    sail.lineTo(0, 3.4);
    const sm = mesh(new THREE.ShapeGeometry(sail), mat(0xd9c9a0, { side: THREE.DoubleSide }), 0, 1.0, 0);
    sm.rotation.y = Math.PI / 2;
    g.add(sm);
    g.position.set(x, -0.1, z);
    g.rotation.y = rotY;
    g.scale.setScalar(scale);
    root.add(g);
    // the hull as a row of small squares along its keel (colliders are axis-aligned, the hull is turned), topped at
    // the gunwale: it stops a swimmer, a swimmer can climb aboard (Space), and a walker can stand in it
    const half = 3.2 * scale;
    const deck = -0.1 + 0.35 * scale;
    for (let u = -half + 0.5 * scale; u <= half - 0.5 * scale + 1e-6; u += 0.6 * scale) {
      const hw = 0.9 * scale * Math.sqrt(Math.max(0, 1 - (u / half) ** 2)) * 0.9;
      if (hw < 0.2) continue;
      addCollider(boxOf(x + Math.sin(rotY) * u, z + Math.cos(rotY) * u, 2 * hw, 2 * hw, deck, -3));
    }
  }
  for (const b of def.prahus) prahu(b.x, b.z, b.rotY, b.scale);
  for (const ship of def.ships) {
    // foreign carrack at anchor, hazy in the fog
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(9, 5, 30), mat(0x2f2620), 0, 1.5, 0));
    g.add(mesh(new THREE.BoxGeometry(9.6, 2.4, 8), mat(0x3a2e24), 0, 5.2, -11));
    for (const z of [-8, 1, 9]) {
      g.add(mesh(new THREE.CylinderGeometry(0.2, 0.25, 22, 6), mat(0x3d2a1a), 0, 14, z));
      g.add(mesh(new THREE.BoxGeometry(11, 7, 0.15), mat(0xe8dcc0), 0, 14, z + 0.3));
    }
    g.position.set(ship.x, 0, ship.z);
    g.rotation.y = ship.rotY;
    root.add(g);
    // the hull (9 x 30, turned) as squares along its keel, sized to stay inside the turned hull: the deck at 4 m, the
    // aft castle 2.4 m above it (climbable from the deck), and the three masts
    const along = (u: number) => ({ x: ship.x + Math.sin(ship.rotY) * u, z: ship.z + Math.cos(ship.rotY) * u });
    const side = (2 * 4.5) / (Math.abs(Math.cos(ship.rotY)) + Math.abs(Math.sin(ship.rotY)));
    for (let u = -15 + side / 2; u <= 15 - side / 2 + 1e-6; u += side / 2) {
      const c = along(u);
      addCollider(boxOf(c.x, c.z, side, side, 4, -3));
    }
    for (let u = -15 + side / 2; u <= -7 - side / 2 + 1e-6; u += side / 2) {
      const c = along(u);
      addCollider(boxOf(c.x, c.z, side, side, 6.4, 4));
    }
    for (const u of [-8, 1, 9]) {
      const c = along(u);
      addCollider(boxOf(c.x, c.z, 0.5, 0.5, 25, 4));
    }
  }

  // ---------------------------------------------------------------- sampans (moving; the engine places them each frame)
  const boats: Level["boats"] = def.boats.map((b) => {
    const g = new THREE.Group();
    const hull = mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0x4e3420), 0, 0.42, 0);
    hull.scale.set(0.62, 0.42, 2.2);
    g.add(hull);
    // gunwale rim and two thwarts
    const rim = mesh(new THREE.TorusGeometry(1, 0.05, 4, 16), mat(0x3d2a1a), 0, 0.42, 0, false);
    rim.rotation.x = Math.PI / 2;
    rim.scale.set(0.62, 2.2, 1);
    g.add(rim);
    for (const z of [-0.8, 0.9]) g.add(mesh(new THREE.BoxGeometry(1.1, 0.06, 0.22), mat(0x6e5237), 0, 0.36, z, false));
    // a paddle laid across
    const paddle = mesh(new THREE.BoxGeometry(0.06, 0.04, 1.9), mat(0x6e5237), 0.3, 0.46, 0.2, false);
    paddle.rotation.y = 0.5;
    g.add(paddle);
    g.position.set(b.x, 0, b.z);
    g.rotation.y = b.rotY;
    root.add(g);
    return { group: g, x: b.x, z: b.z, yaw: b.rotY };
  });

  // ---------------------------------------------------------------- lanterns
  const litLamps = spreadIndices(def.lamps.length, opts.lampLights ?? def.lamps.length);
  const lampLights: THREE.PointLight[] = [];
  for (const [i, { x, z }] of def.lamps.entries()) {
    root.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 3, 5), mat(0x3d2a1a), x, 1.5, z));
    root.add(mesh(new THREE.SphereGeometry(0.28, 8, 6), glow(0xffb14a), x, 3.1, z, false));
    if (!litLamps.has(i)) continue;
    const l = new THREE.PointLight(0xffa04a, 11, 17, 1.5);
    l.position.set(x, 3.0, z);
    root.add(l);
    lampLights.push(l);
  }

  // ---------------------------------------------------------------- instanced windows
  const addWindows = (list: THREE.Matrix4[], m: THREE.Material) => {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.85, 1.0, 0.12), m, Math.max(list.length, 1));
    im.count = list.length;
    list.forEach((mx, i) => im.setMatrixAt(i, mx));
    root.add(im);
  };
  addWindows(winLit, glow(0xffc069));
  addWindows(winDark, mat(0x1c120b));

  // ---------------------------------------------------------------- exit beam
  const exitBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 30, 16, 1, true),
    own(new THREE.MeshBasicMaterial({ color: 0x5affc8, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide })),
  );
  exitBeam.position.set(def.exit.x, 15, def.exit.z);
  root.add(exitBeam);
  mergeStatic(root);

  return {
    root,
    colliders,
    occluders,
    hides,
    guards: def.guards,
    start: def.start,
    exit: def.exit,
    exitBeam,
    bounds: { ...def.bounds, water: def.water.map(areaOf), decks: def.decks.map(areaOf) },
    text: def.text,
    lamps: def.lamps,
    lampLights,
    boats,
    foliage: { trees, treeGroup, ferns, fernGroup, rocks, rockGroup },
    flow,
    tide,
  };
}
