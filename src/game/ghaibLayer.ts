// The semangat layer drawn over the world while Mata Helang is open: a pale green-gold tint in the fog, fireflies
// (kelip-kelip) drifting round the player, kemenyan smoke curling up at the ends of each bunian path, and the paths
// themselves (stones, planks and vine-bound boards with sirih leaves on them). It also owns the semangat meter, the
// paths' colliders and the puteri's tally of the attempt. The engine calls step() in update and render() in render.

import * as THREE from "three";
import type { Box } from "./logic";
import { BUNIAN_PATHS, SEMANGAT, blessingFor, spiritBoxes, stepSemangat, type Blessing, type SpiritPiece, type Tally } from "./ghaib";

const GLOW = 0xd9e7a4;
const STONE = 0xc9dc9a;
const VINE = 0x7fae5a;
const LEAF = 0xa6d86e;
const TINT = new THREE.Color(0x8ea566);
/** fireflies kept within MOTE_R metres of the player */
const MOTES = 150;
const MOTE_R = 15;
/** how close (m, around the footprint) and how far above a piece still counts as standing on it */
const ON = { pad: 0.45, above: 3 };

/** A heart-shaped sirih (betel) leaf, flat on the ground, tip toward +z, about a metre long before scaling. */
function sirihLeaf(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -0.28);
  s.bezierCurveTo(0.15, -0.45, 0.45, -0.35, 0.4, -0.05);
  s.bezierCurveTo(0.35, 0.2, 0.1, 0.38, 0, 0.5);
  s.bezierCurveTo(-0.1, 0.38, -0.35, 0.2, -0.4, -0.05);
  s.bezierCurveTo(-0.45, -0.35, -0.15, -0.45, 0, -0.28);
  return new THREE.ShapeGeometry(s, 6).rotateX(-Math.PI / 2);
}

/** A soft round puff for the kemenyan smoke. */
function puffTexture(): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  if (!g) return null;
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  grd.addColorStop(0, "rgba(240,238,226,0.9)");
  grd.addColorStop(0.5, "rgba(220,224,206,0.35)");
  grd.addColorStop(1, "rgba(200,206,190,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const glowMat = (color: number) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, fog: false, side: THREE.DoubleSide });

export class GhaibLayer {
  /** 0..1 */
  semangat = 1;
  private boxes: Box[] = spiritBoxes();
  /** the colliders array the path boxes are in right now, or null */
  private on: Box[] | null = null;
  private wasOpen = false;
  private vis = 0;
  private blessing: Blessing = "none";
  private root = new THREE.Group();
  private mats: { m: THREE.Material & { opacity: number }; k: number }[] = [];
  private motes: THREE.Points;
  private motePos = new Float32Array(MOTES * 3);
  private moteCol = new Float32Array(MOTES * 3);
  private motePh = Float32Array.from({ length: MOTES }, () => Math.random() * Math.PI * 2);
  private moteMat: THREE.PointsMaterial;
  private smoke: { s: THREE.Sprite; x: number; y: number; z: number; ph: number }[] = [];
  private smokeMat: THREE.SpriteMaterial;
  // the puteri's tally for this attempt
  private kills = 0;
  private stunned = new Set<number>();

  constructor(scene: THREE.Scene) {
    this.root.visible = false;
    this.root.renderOrder = 4;
    scene.add(this.root);
    this.buildPaths();

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.motePos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(this.moteCol, 3));
    this.moteMat = new THREE.PointsMaterial({ size: 0.13, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    this.motes = new THREE.Points(geo, this.moteMat);
    this.motes.frustumCulled = false;
    this.root.add(this.motes);
    for (let i = 0; i < MOTES; i++) this.motePos[i * 3 + 1] = -999; // placed round the player on first show

    this.smokeMat = new THREE.SpriteMaterial({ map: puffTexture(), color: 0xe8e6d8, transparent: true, opacity: 0, depthWrite: false, fog: false });
    for (const p of BUNIAN_PATHS)
      for (const e of p.ends)
        for (let k = 0; k < 3; k++) {
          const s = new THREE.Sprite(this.smokeMat.clone());
          this.root.add(s);
          this.smoke.push({ s, x: e.x, y: e.y, z: e.z, ph: k / 3 + Math.random() * 0.1 });
        }
  }

  /** Instanced stones, planks, vine rails and sirih leaves for every path: a handful of draw calls in all. */
  private buildPaths() {
    const all = BUNIAN_PATHS.flatMap((p) => p.pieces);
    const stones = all.filter((q) => q.kind === "batu");
    const planks = all.filter((q) => q.kind !== "batu");
    const vines = all.filter((q) => q.kind === "akar");
    const m4 = new THREE.Matrix4();
    const q4 = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const inst = (geo: THREE.BufferGeometry, color: number, k: number, list: SpiritPiece[], place: (q: SpiritPiece, i: number) => [number, number, number, number, number, number, number]) => {
      const mat = glowMat(color);
      this.mats.push({ m: mat, k });
      const mesh = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((q, i) => {
        const [x, y, z, rot, sx, sy, sz] = place(q, i);
        m4.compose(v.set(x, y, z), q4.setFromAxisAngle(up, rot), sc.set(sx, sy, sz));
        mesh.setMatrixAt(i, m4);
      });
      mesh.frustumCulled = false;
      this.root.add(mesh);
    };
    // along: the piece's length on its path; a ring piece is turned to the arc, a straight one runs along z
    const along = (q: SpiritPiece) => (q.rot === undefined ? q.d * 0.86 : 0.78);
    const across = (q: SpiritPiece) => (q.rot === undefined ? q.w * 0.92 : 1.15);
    inst(new THREE.CylinderGeometry(0.5, 0.56, 1, 9), STONE, 0.55, stones, (q, i) => [q.x, q.y - 0.12, q.z, i * 1.7, q.w * 0.95, 0.24, q.d * 0.9]);
    inst(new THREE.BoxGeometry(1, 1, 1), GLOW, 0.5, planks, (q) => [q.x, q.y - 0.07, q.z, q.rot ?? 0, across(q), 0.14, along(q)]);
    // vine rails either side of the canopy bridge, at hand height
    const rails = vines.flatMap((q) => [-1, 1].map((side) => ({ ...q, side })));
    inst(new THREE.BoxGeometry(1, 1, 1), VINE, 0.7, rails, (q) => {
      const r = q.rot ?? 0;
      const off = (q as SpiritPiece & { side: number }).side * 0.6;
      return [q.x + Math.cos(r) * off, q.y + 0.75, q.z - Math.sin(r) * off, r, 0.05, 0.05, 0.95];
    });
    // a sirih leaf on every other piece, a little askew
    const leafed = all.filter((_, i) => i % 2 === 0);
    inst(sirihLeaf(), LEAF, 0.85, leafed, (q, i) => [q.x + 0.15 * Math.sin(i * 2.3), q.y + 0.02, q.z + 0.15 * Math.cos(i * 1.9), (q.rot ?? 0) + i * 0.9, 0.42, 1, 0.42]);
  }

  /** A fresh attempt: full semangat, paths gone, tally cleared. */
  reset() {
    this.detach();
    this.semangat = 1;
    this.wasOpen = false;
    this.vis = 0;
    this.root.visible = false;
    this.kills = 0;
    this.stunned.clear();
  }

  setRestu(restu: number) {
    this.blessing = blessingFor(restu);
  }

  /** Movement speed multiplier: slower in the spirit layer. */
  speedMul(open: boolean) {
    return open ? SEMANGAT.slow : 1;
  }

  onStun(id: number) {
    this.stunned.add(id);
  }
  /** duty: the kill mission's target, which the puteri does not count */
  onKill(id: number, duty: boolean) {
    this.stunned.delete(id);
    if (!duty) this.kills++;
  }
  tally(alerts: number): Tally {
    return { kills: this.kills, spared: this.stunned.size, alerts };
  }

  private standingOn(p: { x: number; y: number; z: number }) {
    return this.boxes.some(
      (b) => p.x > b.minX - ON.pad && p.x < b.maxX + ON.pad && p.z > b.minZ - ON.pad && p.z < b.maxZ + ON.pad && p.y >= b.minY - 0.05 && p.y <= b.maxY + ON.above,
    );
  }
  private attach(c: Box[]) {
    if (this.on === c) return;
    this.detach();
    c.push(...this.boxes);
    this.on = c;
  }
  private detach() {
    const c = this.on;
    if (!c) return;
    const mine = new Set(this.boxes);
    for (let i = c.length - 1; i >= 0; i--) if (mine.has(c[i])) c.splice(i, 1);
    this.on = null;
  }

  /**
   * One update: drain or refill semangat, close the vision when it runs out, and make the paths solid while it is
   * open, or while the player is still on one after it closes (they stay until stepped off; nothing refills then).
   * Returns whether Mata Helang stays open and a line to toast, if any.
   */
  step(dt: number, open: boolean, p: { x: number; y: number; z: number }, colliders: Box[]): { open: boolean; say: string | null } {
    const held = !open && this.on === colliders && this.standingOn(p);
    const r = stepSemangat(this.semangat, open, dt, { blessed: this.blessing === "restu", held, wasOpen: this.wasOpen });
    this.semangat = r.s;
    this.wasOpen = r.open;
    if (r.open || held) this.attach(colliders);
    else this.detach();
    const say = r.why === "low" ? "Too little semangat for Mata Helang. Let it gather." : r.why === "empty" ? "Semangat spent. Mata Helang closes." : null;
    return { open: r.open, say };
  }

  /** Draw the layer: fade it in or out, flicker or brighten with the puteri's mood, drift the motes and smoke, tint the fog. */
  render(dt: number, time: number, open: boolean, p: { x: number; y: number; z: number }, fog: THREE.Fog) {
    const want = open ? 1 : this.on ? 0.4 : 0;
    this.vis += (want - this.vis) * Math.min(1, dt * 5);
    if (this.vis < 0.01 && !open) {
      this.vis = 0;
      this.root.visible = false;
      return;
    }
    this.root.visible = true;
    const v = this.vis;
    fog.color.lerp(TINT, 0.4 * v);
    const bright = this.blessing === "restu" ? 1.35 : 1;
    const flick = this.blessing === "murka" ? (Math.random() < 0.05 ? 0.15 : 0.6 + 0.4 * Math.sin(time * 19) * Math.sin(time * 7.3)) : 1;
    const breathe = 0.85 + 0.15 * Math.sin(time * 1.7);
    for (const { m, k } of this.mats) m.opacity = Math.min(0.95, k * v * bright * flick * breathe);

    // kelip-kelip: wander, blink, and come back round the player when left behind
    this.moteMat.opacity = v;
    const pos = this.motePos;
    const col = this.moteCol;
    for (let i = 0; i < MOTES; i++) {
      const j = i * 3;
      const ph = this.motePh[i];
      const dx = pos[j] - p.x;
      const dz = pos[j + 2] - p.z;
      if (pos[j + 1] < -100 || dx * dx + dz * dz > MOTE_R * MOTE_R || Math.abs(pos[j + 1] - p.y) > 6) {
        const a = Math.random() * Math.PI * 2;
        const r = 2 + Math.random() * (MOTE_R - 2);
        pos[j] = p.x + Math.cos(a) * r;
        pos[j + 1] = p.y + 0.3 + Math.random() * 3.2;
        pos[j + 2] = p.z + Math.sin(a) * r;
      }
      pos[j] += Math.sin(time * 0.6 + ph) * 0.25 * dt;
      pos[j + 1] += Math.sin(time * 0.9 + ph * 2) * 0.12 * dt;
      pos[j + 2] += Math.cos(time * 0.5 + ph) * 0.25 * dt;
      const blink = Math.max(0, Math.sin(time * (1.3 + (ph % 1)) + ph * 5)) ** 3 * bright;
      col[j] = 0.85 * blink;
      col[j + 1] = 0.95 * blink;
      col[j + 2] = 0.45 * blink;
    }
    this.motes.geometry.attributes.position.needsUpdate = true;
    this.motes.geometry.attributes.color.needsUpdate = true;

    // kemenyan smoke rising from each path end
    for (const s of this.smoke) {
      const t = (time * 0.22 + s.ph) % 1;
      s.s.position.set(s.x + Math.sin(time * 0.7 + s.ph * 9) * 0.3 * t, s.y + 0.2 + t * 2.6, s.z + Math.cos(time * 0.6 + s.ph * 7) * 0.3 * t);
      s.s.scale.setScalar(0.5 + t * 1.8);
      (s.s.material as THREE.SpriteMaterial).opacity = 0.32 * v * Math.sin(Math.PI * t) * flick;
    }
  }
}
