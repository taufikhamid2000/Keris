// Melaka 1511 map viewer: the Blender terrain and placed assets, walkable in the browser.
// World data is Blender's (X east, Y north, Z up, metres); three.js here is (x, y up, z = -north).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

const SIZE = 8000, N = 1025, STEP = SIZE / (N - 1), CELL = 400;
const SKIP = new Set(["balairung", "sawah"]); // interior shares the Istana origin; rice tiles are too heavy here
const BIG = new Set(["istana", "masjid", "rumah_bendahara", "rumah_bendahara_1511", "jambatan", "jambatan_1511", "gua",
  "jong", "jong_berlabuh", "kapal_gujerat", "kapal_gujerat_berlabuh", "junk", "junk_furled", "junk_small", "pokok_tualang"]);
const TREES = new Set(["pokok_hutan", "pokok_bukit", "buluh", "paku_pakis", "bakau", "nipah", "palm_tall", "palm_lean",
  "palm_young", "banana_clump", "banana_single", "bush_wide", "bush_small", "bush_flower", "rock_cluster"]);
const range = (a) => (BIG.has(a) ? 9000 : TREES.has(a) ? 1100 : 1800);

const hud = document.getElementById("hud");
const progress = document.getElementById("progress");
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const SKY = new THREE.Color(0xc9c1ae);
scene.background = SKY;
scene.fog = new THREE.Fog(SKY, 1200, 7000);
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.3, 12000);
scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x6b5a3a, 1.4));
const sun = new THREE.DirectionalLight(0xffe2b8, 2.2);
sun.position.set(-0.5, 0.8, 0.4);
scene.add(sun);
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const toThree = (x, y, z) => new THREE.Vector3(x, z, -y);

// ---------------------------------------------------------------- terrain

let H; // Float32Array N*N, row 0 = north
function ground(x, z) {
  const c = (x + SIZE / 2) / STEP, r = (z + SIZE / 2) / STEP;
  const c0 = Math.max(0, Math.min(N - 2, Math.floor(c))), r0 = Math.max(0, Math.min(N - 2, Math.floor(r)));
  const fc = Math.min(1, Math.max(0, c - c0)), fr = Math.min(1, Math.max(0, r - r0));
  const a = H[r0 * N + c0], b = H[r0 * N + c0 + 1], d = H[(r0 + 1) * N + c0], e = H[(r0 + 1) * N + c0 + 1];
  return (a * (1 - fc) + b * fc) * (1 - fr) + (d * (1 - fc) + e * fc) * fr;
}

function gridMesh(values, keep, mat, lift = 0) {
  const pos = new Float32Array(N * N * 3), uv = new Float32Array(N * N * 2);
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      const i = r * N + c;
      pos.set([-SIZE / 2 + c * STEP, values[i] + lift, -SIZE / 2 + r * STEP], i * 3);
      uv.set([c / (N - 1), 1 - r / (N - 1)], i * 2);
    }
  const idx = [];
  for (let r = 0; r < N - 1; r++)
    for (let c = 0; c < N - 1; c++) {
      const a = r * N + c, b = a + 1, d = a + N, e = d + 1;
      if (keep && !(keep(a) && keep(b) && keep(d) && keep(e))) continue;
      idx.push(a, d, b, b, d, e);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

async function loadTerrain() {
  const [h, w, tex] = await Promise.all([
    fetch("/data/terrain_h.f32").then((r) => r.arrayBuffer()),
    fetch("/data/terrain_w.f32").then((r) => r.arrayBuffer()),
    new THREE.TextureLoader().loadAsync("/data/terrain_albedo.png"),
  ]);
  H = new Float32Array(h);
  const W = new Float32Array(w);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  scene.add(gridMesh(H, null, new THREE.MeshLambertMaterial({ map: tex })));
  const water = new THREE.MeshPhongMaterial({ color: 0x1e4f56, specular: 0x556666, shininess: 60, transparent: true, opacity: 0.88 });
  scene.add(gridMesh(W, (i) => W[i] > 0, water, 0.03));
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), water);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.03;
  scene.add(sea);
}

// ---------------------------------------------------------------- assets: one merged, vertex-coloured geometry each

const MAT = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
const chunks = []; // {mesh, centre, range}

async function loadAsset(loader, name) {
  const gltf = await loader.loadAsync(`/data/${name}.glb`);
  gltf.scene.updateMatrixWorld(true);
  const parts = [];
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    let g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    if (g.index) g = g.toNonIndexed();
    if (!g.attributes.normal) g.computeVertexNormals();
    for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    const col = m && m.color ? m.color : new THREE.Color(0.6, 0.6, 0.6);
    const n = g.attributes.position.count, cols = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) cols.set([col.r, col.g, col.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    parts.push(g);
  });
  return parts.length ? mergeGeometries(parts) : null;
}

function instance(name, geom, list) {
  const cells = new Map();
  for (const p of list) {
    const key = `${Math.floor(p.x / CELL)},${Math.floor(p.y / CELL)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(p);
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  for (const items of cells.values()) {
    const mesh = new THREE.InstancedMesh(geom, MAT, items.length);
    const centre = new THREE.Vector3();
    items.forEach((p, i) => {
      const v = toThree(p.x, p.y, p.z);
      centre.add(v);
      q.setFromAxisAngle(up, (p.yaw_deg * Math.PI) / 180);
      mesh.setMatrixAt(i, m4.compose(v, q, one));
    });
    mesh.computeBoundingSphere();
    scene.add(mesh);
    chunks.push({ mesh, centre: centre.divideScalar(items.length), range: range(name) });
  }
}

// ---------------------------------------------------------------- movement

const controls = new PointerLockControls(camera, document.body);
const start = document.getElementById("start");
start.addEventListener("click", () => controls.lock());
controls.addEventListener("lock", () => (start.style.display = "none"));
controls.addEventListener("unlock", () => (start.style.display = "grid"));
const keys = new Set();
addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (e.code === "KeyF") fly = !fly;
  const spot = SPOTS[e.key];
  if (spot) jump(...spot);
});
addEventListener("keyup", (e) => keys.delete(e.code));
let fly = true, flySpeed = 60;
addEventListener("wheel", (e) => (flySpeed = Math.min(800, Math.max(5, flySpeed * (e.deltaY < 0 ? 1.25 : 0.8)))));

const SPOTS = {};
function jump(x, y, h, lookX, lookY) {
  camera.position.copy(toThree(x, y, Math.max(ground(x, -y), 0) + h));
  camera.lookAt(toThree(lookX, lookY, Math.max(ground(lookX, -lookY), 0) + 5));
}

const fwd = new THREE.Vector3(), side = new THREE.Vector3();
function move(dt) {
  const run = keys.has("ShiftLeft") || keys.has("ShiftRight");
  const speed = fly ? flySpeed * (run ? 4 : 1) : run ? 9 : 3.5;
  camera.getWorldDirection(fwd);
  if (!fly) fwd.y = 0;
  fwd.normalize();
  side.crossVectors(fwd, camera.up).normalize();
  const d = new THREE.Vector3();
  if (keys.has("KeyW") || keys.has("ArrowUp")) d.add(fwd);
  if (keys.has("KeyS") || keys.has("ArrowDown")) d.sub(fwd);
  if (keys.has("KeyD") || keys.has("ArrowRight")) d.add(side);
  if (keys.has("KeyA") || keys.has("ArrowLeft")) d.sub(side);
  if (fly && keys.has("Space")) d.y += 1;
  if (fly && keys.has("KeyC")) d.y -= 1;
  if (d.lengthSq()) camera.position.addScaledVector(d.normalize(), speed * dt);
  const lim = SIZE / 2 + 1500;
  camera.position.x = Math.max(-lim, Math.min(lim, camera.position.x));
  camera.position.z = Math.max(-lim, Math.min(lim, camera.position.z));
  const floor = Math.max(ground(camera.position.x, camera.position.z), 0) + 1.7;
  if (!fly) camera.position.y = floor;
  else camera.position.y = Math.max(camera.position.y, floor);
}

// ---------------------------------------------------------------- go

async function main() {
  await loadTerrain();
  const [placements, meta] = await Promise.all([fetch("/data/placements.json").then((r) => r.json()), fetch("/data/terrain.json").then((r) => r.json())]);
  const L = meta.landmarks;
  const mouth = [-366.7, 100.0];
  SPOTS["1"] = [mouth[0] - 260, mouth[1] - 360, 60, mouth[0] + 200, mouth[1] + 150];
  SPOTS["2"] = [L.istana.x - 120, L.istana.y + 110, 25, L.istana.x, L.istana.y];
  SPOTS["3"] = [L.masjid.x - 60, L.masjid.y - 70, 12, L.masjid.x, L.masjid.y];
  SPOTS["4"] = [-1500, -700, 40, -1300, -200];
  SPOTS["5"] = [L.cave.x - 60, L.cave.y - 120, 20, L.cave.x, L.cave.y];
  SPOTS["6"] = [2400, 2000, 300, 3600, 3700];
  jump(...SPOTS["1"]);

  const byAsset = new Map();
  for (const p of placements) {
    if (SKIP.has(p.asset)) continue;
    if (!byAsset.has(p.asset)) byAsset.set(p.asset, []);
    byAsset.get(p.asset).push(p);
  }
  const loader = new GLTFLoader();
  let done = 0, tris = 0;
  const names = [...byAsset.keys()];
  await Promise.all(names.map(async (name) => {
    try {
      const g = await loadAsset(loader, name);
      if (g) {
        instance(name, g, byAsset.get(name));
        tris += (g.attributes.position.count / 3) * byAsset.get(name).length;
      }
    } catch (e) {
      console.warn("could not load", name, e);
    }
    progress.textContent = `Loading models ${++done} / ${names.length}`;
  }));
  progress.textContent = `Ready: ${placements.length} placed, ${names.length} models`;
  console.log("triangles if all visible:", Math.round(tris / 1e6), "M");
}

const clock = new THREE.Clock();
let frames = 0, fpsT = 0, fps = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.1, clock.getDelta());
  if (controls.isLocked && H) move(dt);
  for (const c of chunks) c.mesh.visible = c.centre.distanceTo(camera.position) < c.range;
  renderer.render(scene, camera);
  frames++;
  fpsT += dt;
  if (fpsT > 0.5) {
    fps = Math.round(frames / fpsT);
    frames = 0;
    fpsT = 0;
    const p = camera.position;
    hud.textContent = `${fly ? "FLY " + Math.round(flySpeed) + " m/s" : "WALK"}   ${fps} fps   x ${Math.round(p.x)}  y ${Math.round(-p.z)}  z ${Math.round(p.y)} m\n` +
      `F walk/fly · wheel fly speed · 1-6 places · Esc mouse`;
  }
});
main();
