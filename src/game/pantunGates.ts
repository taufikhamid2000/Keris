// Pantun passwords in play: the gate sentries and the rehearsing pairs (static figures on the level root),
// the answer dialogue, overheard lines, the disguise after a right answer and the cry after a wrong one.
// Imported only by engine.ts (so three.js stays in the engine's chunk); the data is in pantun.ts.
import * as THREE from "three";
import type { Brain, Vec2 } from "./logic";
import {
  PANTUN_TUNE as T,
  REHEARSALS,
  SENTRIES,
  SENTRY_LINES,
  choicesFor,
  gateDraw,
  pantunById,
  type PantunHud,
  type PantunLineView,
  type PantunOption,
} from "./pantun";

/** What the gates need of an engine guard (structural: the engine's Guard fits). */
export interface GateGuard {
  x: number;
  y: number;
  z: number;
  dead: boolean;
  stun: number;
  meter: number;
  brain: Brain;
  investigate: Vec2 | null;
  investigateY: number;
}
type Pos = { x: number; y: number; z: number };

interface Gate {
  pantun: string;
  state: "open" | "passed" | "burned";
  greeted: boolean;
  cd: number;
  group: THREE.Group | null;
  yaw: number;
}

const mats = new Map<number, THREE.MeshStandardMaterial>();
const mat = (c: number) => {
  let m = mats.get(c);
  if (!m) mats.set(c, (m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true })));
  return m;
};
function part(parent: THREE.Object3D, geo: THREE.BufferGeometry, color: number, x: number, y: number, z: number) {
  const m = new THREE.Mesh(geo, mat(color));
  m.castShadow = true;
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
/** A Malay hired man: kain samping over trousers, baju, tengkolok; sentries carry a lembing. */
function hiredMan(baju: number, kain: number, spear: boolean) {
  const g = new THREE.Group();
  part(g, new THREE.CylinderGeometry(0.17, 0.2, 0.75, 6), 0x2a2420, 0, 0.38, 0);
  part(g, new THREE.CylinderGeometry(0.36, 0.38, 0.42, 8), kain, 0, 0.92, 0);
  part(g, new THREE.CylinderGeometry(0.28, 0.36, 0.62, 8), baju, 0, 1.38, 0);
  part(g, new THREE.SphereGeometry(0.19, 10, 8), 0x8a5a3a, 0, 1.86, 0);
  part(g, new THREE.CylinderGeometry(0.2, 0.22, 0.12, 8), 0x1e2a4a, 0, 2.0, 0);
  part(g, new THREE.ConeGeometry(0.1, 0.16, 4), 0x1e2a4a, 0.08, 2.1, -0.04);
  if (spear) {
    part(g, new THREE.CylinderGeometry(0.025, 0.025, 2.3, 5), 0x6a4a2a, 0.38, 1.15, 0.1);
    part(g, new THREE.ConeGeometry(0.05, 0.22, 5), 0xb8b8b0, 0.38, 2.4, 0.1);
  }
  return g;
}

const SENTRY_WHO = "Penjaga pintu";
const HIRED_WHO = ["Orang upahan", "Kawannya"];
const turn = (from: number, to: number, k: number) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;

export class PantunGates {
  private gates: Gate[] = SENTRIES.map(() => ({ pantun: "", state: "open", greeted: false, cd: 0, group: null, yaw: 0 }));
  private known = new Set<string>();
  /** a fresh salt per page load, and the attempt count: each attempt rotates the pantun at every gate */
  private salt = Math.floor(Math.random() * 1e9);
  private attempt = 0;
  private choice: { gate: number; options: PantunOption[]; correct: number; sel: number; acc: number } | null = null;
  private disguise: { t: number; x: number; z: number } | null = null;
  /** the line on screen, and who owns it (sentry lines win over a rehearsal) */
  private line: { v: PantunLineView; t: number; sentry: boolean } | null = null;
  private rehearsal: { spot: number; i: number; t: number } | null = null;
  private spotCd = REHEARSALS.map(() => 0);

  constructor(private on: { toast: (t: string) => void; learn: (id: string) => void }) {
    this.reset();
  }

  /** Put the figures on a freshly built level root (disposed with it). */
  build(root: THREE.Object3D) {
    SENTRIES.forEach((s, i) => {
      const g = hiredMan(0x3a5a3a, 0x8a2a2a, true);
      g.position.set(s.x, 0, s.z);
      g.rotation.y = s.yaw;
      root.add(g);
      this.gates[i].group = g;
      this.gates[i].yaw = s.yaw;
    });
    REHEARSALS.forEach((r) => {
      for (const side of [-1, 1]) {
        const g = hiredMan(side < 0 ? 0x5a4a2a : 0x2a3a5a, side < 0 ? 0x2a4a3a : 0x6a3a1a, false);
        g.position.set(r.x + side * 0.7, 0, r.z);
        g.rotation.y = -side * (Math.PI / 2);
        root.add(g);
      }
    });
  }

  setKnown(ids: readonly string[]) {
    for (const id of ids) this.known.add(id);
  }

  /** A new attempt: new pantun at every gate, every gate open again, no disguise. */
  reset() {
    this.attempt++;
    const draw = gateDraw(this.salt + this.attempt * 7919);
    this.gates.forEach((g, i) => {
      g.pantun = draw[i];
      g.state = "open";
      g.greeted = false;
      g.cd = 0;
      g.yaw = SENTRIES[i].yaw;
      if (g.group) g.group.rotation.y = g.yaw;
    });
    this.choice = null;
    this.disguise = null;
    this.line = null;
    this.rehearsal = null;
    this.spotCd = REHEARSALS.map(() => 0);
  }

  get choosing() {
    return this.choice !== null;
  }

  private nearGate(p: Pos, r: number) {
    let best = -1;
    let bd = r;
    SENTRIES.forEach((s, i) => {
      const d = Math.hypot(p.x - s.x, p.z - s.z);
      if (d < bd && p.y < 1.5) {
        bd = d;
        best = i;
      }
    });
    return best;
  }

  /** The prompt to show near a sentry who is still waiting for an answer, else "". */
  prompt(p: Pos) {
    const i = this.nearGate(p, T.askR);
    return i >= 0 && this.gates[i].state === "open" ? "E  Answer the penjaga pintu" : "";
  }

  /** E beside a waiting sentry opens the answer dialogue. */
  tryOpen(p: Pos) {
    const i = this.nearGate(p, T.askR);
    if (i < 0 || this.gates[i].state !== "open") return false;
    const { options, correct } = choicesFor(this.gates[i].pantun, this.salt + this.attempt * 31 + i * 101);
    this.choice = { gate: i, options, correct, sel: 0, acc: 0 };
    this.line = null;
    return true;
  }

  private say(v: { text: string; gloss: string }, who = SENTRY_WHO) {
    this.line = { v: { who, text: v.text, gloss: v.gloss }, t: 2.6 + v.text.length * 0.04, sentry: true };
  }

  /** Keys while the dialogue is open (it takes every key): 1-4 answer, up / down and confirm, X steps back. */
  key(code: string, p: Pos, guards: readonly GateGuard[]) {
    const c = this.choice;
    if (!c) return;
    const n = c.options.length;
    if (/^Digit[1-9]$/.test(code) && Number(code.slice(5)) <= n) this.pick(Number(code.slice(5)) - 1, p, guards);
    else if (["KeyW", "ArrowUp", "Tab", "ToolPrev"].includes(code)) c.sel = (c.sel + n - 1) % n;
    else if (["KeyS", "ArrowDown", "PadDown", "ToolNext"].includes(code)) c.sel = (c.sel + 1) % n;
    else if (["KeyE", "Space", "Enter", "Mouse0"].includes(code)) this.pick(c.sel, p, guards);
    else if (code === "KeyX" || code === "Backspace") {
      this.choice = null;
      this.on.toast("You say nothing and step back.");
    }
  }

  /** Mouse (pointer locked) or right stick while the dialogue is open: vertical movement walks the options. */
  look(dy: number) {
    const c = this.choice;
    if (!c) return;
    c.acc += dy;
    const n = c.options.length;
    while (c.acc > 60) {
      c.acc -= 60;
      c.sel = Math.min(n - 1, c.sel + 1);
    }
    while (c.acc < -60) {
      c.acc += 60;
      c.sel = Math.max(0, c.sel - 1);
    }
  }

  /** Answer with option i. */
  pick(i: number, p: Pos, guards: readonly GateGuard[]) {
    const c = this.choice;
    if (!c || i < 0 || i >= c.options.length) return;
    this.choice = null;
    const gate = this.gates[c.gate];
    const s = SENTRIES[c.gate];
    if (i === c.correct) {
      gate.state = "passed";
      this.disguise = { t: T.disguiseT, x: s.x, z: s.z };
      this.say(SENTRY_LINES.pass);
      this.on.toast(`The penjaga pintu waves you through. Disguised near ${s.where} for ${T.disguiseT} s.`);
      if (!this.known.has(gate.pantun)) {
        this.known.add(gate.pantun);
        this.on.learn(gate.pantun);
      }
    } else {
      gate.state = "burned";
      gate.cd = 8;
      this.say(SENTRY_LINES.shout);
      this.on.toast("Wrong answer! The penjaga pintu raises the cry.");
      this.raiseCry(s, p, guards);
    }
  }

  /** Guards in earshot of the sentry turn to look where the player stands. */
  private raiseCry(s: { x: number; z: number }, p: Pos, guards: readonly GateGuard[]) {
    for (const g of guards) {
      if (g.dead || g.stun > 0 || g.brain.state === "alert") continue;
      if (Math.hypot(g.x - s.x, g.z - s.z) > T.shoutR) continue;
      g.brain = { state: "suspicious", timer: 0 };
      g.meter = Math.max(g.meter, T.shoutMeter);
      g.investigate = { x: p.x, z: p.z };
      g.investigateY = p.y;
    }
  }

  /** Detection rate multiplier for a guard: lower while disguised and near the gate that let the player through. */
  detectMul(g: { x: number; z: number }) {
    const d = this.disguise;
    return d && d.t > 0 && Math.hypot(g.x - d.x, g.z - d.z) < T.disguiseR ? T.disguiseMul : 1;
  }

  update(dt: number, p: Pos, guards: readonly GateGuard[]) {
    if (this.disguise) {
      this.disguise.t -= dt;
      if (this.disguise.t <= 0) {
        this.disguise = null;
        this.on.toast("Your disguise wears thin.");
      }
    }
    if (this.line) {
      this.line.t -= dt;
      if (this.line.t <= 0) this.line = null;
    }
    // sentries turn to watch the player close by, and call out
    this.gates.forEach((g, i) => {
      const s = SENTRIES[i];
      const d = Math.hypot(p.x - s.x, p.z - s.z);
      g.cd = Math.max(0, g.cd - dt);
      const want = d < 8 ? Math.atan2(p.x - s.x, p.z - s.z) : s.yaw;
      g.yaw = turn(g.yaw, want, Math.min(1, dt * 4));
      if (g.group) g.group.rotation.y = g.yaw;
      if (d > 10) g.greeted = false;
      if (g.state === "open" && !g.greeted && d < T.greetR) {
        g.greeted = true;
        this.say(SENTRY_LINES.greet);
      }
      if (g.state === "burned" && g.cd <= 0 && d < 4) {
        g.cd = 8;
        this.say(SENTRY_LINES.again);
        this.raiseCry(s, p, guards);
      }
    });
    this.rehearse(dt, p);
  }

  /** Pairs of hired men run through a pantun; stay within earshot for all four lines to learn it. */
  private rehearse(dt: number, p: Pos) {
    this.spotCd = this.spotCd.map((c) => Math.max(0, c - dt));
    const r = this.rehearsal;
    if (r) {
      const spot = REHEARSALS[r.spot];
      const pt = pantunById(spot.pantun);
      if (!pt || Math.hypot(p.x - spot.x, p.z - spot.z) > T.keepR) {
        this.rehearsal = null;
        this.spotCd[r.spot] = 6;
        return;
      }
      r.t -= dt;
      if (r.t > 0) return;
      r.i++;
      if (r.i >= 4) {
        this.rehearsal = null;
        this.spotCd[r.spot] = 30;
        if (!this.known.has(pt.id)) {
          this.known.add(pt.id);
          this.on.learn(pt.id);
          this.on.toast(`Pantun overheard: "${pt.title}". Written in the Kitab.`);
        }
        return;
      }
      r.t = T.lineT;
      this.showLine(pt.lines[r.i], pt.gloss[r.i], HIRED_WHO[r.i < 2 ? 0 : 1]);
      return;
    }
    for (let i = 0; i < REHEARSALS.length; i++) {
      const s = REHEARSALS[i];
      if (this.known.has(s.pantun) || this.spotCd[i] > 0) continue;
      if (Math.hypot(p.x - s.x, p.z - s.z) > T.hearR || p.y > 3) continue;
      const pt = pantunById(s.pantun);
      if (!pt) continue;
      this.rehearsal = { spot: i, i: 0, t: T.lineT };
      this.showLine(pt.lines[0], pt.gloss[0], HIRED_WHO[0]);
      return;
    }
  }

  private showLine(text: string, gloss: string, who: string) {
    if (this.line?.sentry) return;
    this.line = { v: { who, text, gloss }, t: T.lineT, sentry: false };
  }

  hud(): PantunHud {
    const c = this.choice;
    let choice: PantunHud["choice"] = null;
    if (c) {
      const pt = pantunById(this.gates[c.gate].pantun);
      if (pt)
        choice = {
          where: SENTRIES[c.gate].where,
          lines: [pt.lines[0], pt.lines[1]],
          gloss: [pt.gloss[0], pt.gloss[1]],
          options: c.options,
          sel: c.sel,
          known: this.known.has(pt.id) ? c.correct : null,
        };
    }
    return { choice, line: this.line?.v ?? null, disguise: this.disguise ? Math.ceil(this.disguise.t) : 0 };
  }
}
