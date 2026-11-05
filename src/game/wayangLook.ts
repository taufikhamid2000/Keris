// The wayang kulit look: while a shadow-play mission is loaded, every lit mesh is drawn as a flat ink silhouette on a
// warm, backlit kelir (the screen), flat ground in a paler tone, and the player's own shadow is thrown out from the
// nearest blencong. Only the engine imports this (it needs three.js). Turning it off puts every material back.
import * as THREE from "three";
import { nearestLamp, type WayangDef } from "./wayang";

/** the lit screen (background and fog), the puppets' ink, and the flat ground below them */
const SCREEN = 0xf2d9a4;
const INK = 0x140b06;
const FLOOR = 0xc9a26a;
/** fog near / far: puppets far from the screen blur into the lamplight */
const FOG = { near: 12, far: 78, farLow: 58 };
/** seconds between sweeps for meshes added since (rigs and props load late) */
const SWEEP = { high: 0.5, low: 1.2 };

const LIT = new Set(["MeshStandardMaterial", "MeshPhysicalMaterial", "MeshLambertMaterial", "MeshPhongMaterial", "MeshToonMaterial", "MeshMatcapMaterial"]);

type Mat = THREE.Material | THREE.Material[];

export class WayangLook {
  private on = false;
  /** each swapped mesh: the material it had, and the one we gave it (a mesh given a new material since is re-swapped) */
  private swapped = new Map<THREE.Mesh, { orig: Mat; ink: Mat }>();
  /** one ink material per original (alpha-cut leaves keep their cut-outs), so there are few programs */
  private inks = new Map<THREE.Material, THREE.Material>();
  private sweepT = 0;
  private prevBg: THREE.Scene["background"] = null;
  private prevShadowAuto = true;
  private shadow: THREE.Mesh;

  constructor(
    private scene: THREE.Scene,
    private renderer: THREE.WebGLRenderer,
    private sky: THREE.Object3D,
    private low: boolean,
  ) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.55, "rgba(255,255,255,.65)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: INK, map: tex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.3 }),
    );
    this.shadow.visible = false;
    this.shadow.renderOrder = 2;
  }

  get active() {
    return this.on;
  }

  /** Switch the shadow play on (a wayang mission was loaded) or off (any other), restoring the normal look exactly. */
  setActive(on: boolean) {
    if (on === this.on) {
      if (on) this.sweep();
      return;
    }
    this.on = on;
    if (on) {
      this.prevBg = this.scene.background;
      this.prevShadowAuto = this.renderer.shadowMap.autoUpdate;
      this.scene.background = new THREE.Color(SCREEN);
      this.sky.visible = false;
      // ink takes no light or shadow: stop redrawing the shadow map while the play is on
      this.renderer.shadowMap.autoUpdate = false;
      this.scene.add(this.shadow);
      this.sweepT = 0;
      this.sweep();
    } else {
      for (const [mesh, s] of this.swapped) if (mesh.material === s.ink) mesh.material = s.orig;
      this.swapped.clear();
      this.scene.background = this.prevBg;
      this.sky.visible = true;
      this.renderer.shadowMap.autoUpdate = this.prevShadowAuto;
      this.renderer.shadowMap.needsUpdate = true;
      this.scene.remove(this.shadow);
      this.shadow.visible = false;
    }
  }

  /**
   * Each frame while the play is on, after the engine has set its own fog: the screen colour and depth, a sweep now
   * and then for new meshes, and the player's shadow cast away from the nearest blencong (bigger the closer, k 0..1).
   */
  frame(dt: number, fog: THREE.Fog, p: { x: number; y: number; z: number }, w: WayangDef | undefined, k: number, showPlayer: boolean) {
    if (!this.on) return;
    fog.color.setHex(SCREEN);
    fog.near = FOG.near;
    fog.far = this.low ? FOG.farLow : FOG.far;
    this.sweepT -= dt;
    if (this.sweepT <= 0) {
      this.sweepT = this.low ? SWEEP.low : SWEEP.high;
      this.sweep();
    }
    const s = this.shadow;
    s.visible = showPlayer;
    if (!showPlayer) return;
    const lamp = nearestLamp(w, p);
    const dx = lamp ? p.x - lamp.x : 0;
    const dz = lamp ? p.z - lamp.z : 1;
    const yaw = Math.atan2(dx, dz);
    const len = 1.2 + 5.5 * k;
    const wid = 0.8 + 1.6 * k;
    s.rotation.y = yaw;
    s.scale.set(wid, 1, len);
    // the shadow starts at the feet and reaches away from the flame
    s.position.set(p.x + Math.sin(yaw) * len * 0.42, p.y + 0.08, p.z + Math.cos(yaw) * len * 0.42);
    (s.material as THREE.MeshBasicMaterial).opacity = 0.22 + 0.5 * k;
  }

  /** Swap every lit mesh in the scene to ink (or to the floor tone, for flat ground near y = 0). */
  private sweep() {
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || mesh === this.shadow) return;
      const had = this.swapped.get(mesh);
      if (had && mesh.material === had.ink) return;
      const cur = mesh.material;
      const list = Array.isArray(cur) ? cur : [cur];
      if (!list.some((m) => LIT.has(m.type))) return;
      const flat = isFlatGround(mesh);
      const ink = Array.isArray(cur) ? cur.map((m) => this.inkFor(m, flat)) : this.inkFor(cur, flat);
      this.swapped.set(mesh, { orig: cur, ink });
      mesh.material = ink;
    });
  }

  private inkFor(m: THREE.Material, flat: boolean): THREE.Material {
    if (!LIT.has(m.type)) return m;
    const key = flat ? FLAT_KEY : m;
    let out = this.inks.get(key);
    if (!out) {
      const src = m as THREE.MeshStandardMaterial;
      // leaves and fronds cut out of a texture keep their outline; solid things need no map at all
      const cut = !flat && !!src.map && (src.alphaTest > 0 || src.transparent);
      out = new THREE.MeshBasicMaterial({
        color: flat ? FLOOR : INK,
        side: flat ? THREE.FrontSide : m.side,
        map: cut ? src.map : null,
        alphaTest: cut ? Math.max(src.alphaTest, 0.4) : 0,
        transparent: false,
        toneMapped: false,
      });
      this.inks.set(key, out);
    }
    return out;
  }

  dispose() {
    for (const m of new Set(this.inks.values())) m.dispose();
    this.inks.clear();
    this.shadow.geometry.dispose();
    const sm = this.shadow.material as THREE.MeshBasicMaterial;
    sm.map?.dispose();
    sm.dispose();
  }
}

/** a stand-in key: every flat piece of ground shares one floor material */
const FLAT_KEY = new THREE.MeshBasicMaterial();

const box = new THREE.Box3();
/** Ground, water sheets, trails and banks: thin and lying at about ground level (instanced plants never count). */
function isFlatGround(mesh: THREE.Mesh): boolean {
  if ((mesh as THREE.InstancedMesh).isInstancedMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh) return false;
  const geo = mesh.geometry;
  if (!geo) return false;
  if (!geo.boundingBox) geo.computeBoundingBox();
  if (!geo.boundingBox) return false;
  mesh.updateWorldMatrix(true, false);
  box.copy(geo.boundingBox).applyMatrix4(mesh.matrixWorld);
  return box.max.y - box.min.y < 0.2 && box.max.y < 0.35;
}
