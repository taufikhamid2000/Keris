// Chronicle: a small log of what happened in one attempt, for the hikayat told at the end (hikayat.ts).
// Pure data, no DOM or three.js. The engine makes one-line calls into a Chronicle at the moments that
// matter, and a per-frame tick() picks up state changes (hiding, water, mounts, places, wounds) itself.

import { placesAt } from "./kitab";

export type KillHow = "silent" | "air" | "counter" | "cut";
export type ChronTool = "knife" | "stone" | "pepper";

export type ChronEvent =
  | { t: number; k: "start"; from: "start" | "target" }
  | { t: number; k: "place"; id: string }
  | { t: number; k: "kill"; how: KillHow; target: boolean; cover: boolean }
  | { t: number; k: "tool"; tool: ChronTool; hit: number }
  | { t: number; k: "spotted"; body: boolean; target: boolean }
  | { t: number; k: "hide" }
  | { t: number; k: "hideBody" }
  | { t: number; k: "swim" }
  | { t: number; k: "dive" }
  | { t: number; k: "horse" }
  | { t: number; k: "boat" }
  | { t: number; k: "wounded" }
  | { t: number; k: "nearDeath" }
  | { t: number; k: "parry" }
  | { t: number; k: "charm"; name: string }
  | { t: number; k: "objective" }
  | { t: number; k: "end"; won: boolean; reason: string | null };

/** What the hikayat is told from: plain data, safe to keep or pass around. */
export interface ChronicleData {
  levelId: string;
  /** picks the tale's wording, so one attempt always reads the same */
  seed: number;
  /** guards on the map when the attempt began */
  guards: number;
  events: ChronEvent[];
}

export interface ChronTick {
  x: number;
  y: number;
  z: number;
  /** in a haystack, bush or under water */
  hidden: boolean;
  swim: boolean;
  dive: boolean;
  horse: boolean;
  boat: boolean;
  hp: number;
}

const MAX_EVENTS = 400;
type Without<T> = T extends unknown ? Omit<T, "t"> : never;

export class Chronicle {
  private data: ChronicleData = { levelId: "", seed: 1, guards: 0, events: [] };
  private seen = new Set<string>();
  private placeT = 0;
  private prev = { hide: false, swim: false, dive: false, horse: false, boat: false, hp: Infinity };
  /** last time each kind was logged, to fold quick repeats (a dive bobbing up and down) into one */
  private lastAt: Record<string, number> = {};
  private now = 0;

  begin(levelId: string, from: "start" | "target", guards: number) {
    this.data = { levelId, seed: (Math.random() * 0x7fffffff) | 0 || 1, guards, events: [] };
    this.seen.clear();
    this.placeT = 0;
    this.prev = { hide: false, swim: false, dive: false, horse: false, boat: false, hp: Infinity };
    this.lastAt = {};
    this.now = 0;
    this.add({ k: "start", from });
  }

  add(e: Without<ChronEvent>, gap = 0) {
    const ev = this.data.events;
    if (ev.length >= MAX_EVENTS && e.k !== "end" && e.k !== "objective") return;
    const last = this.lastAt[e.k];
    if (gap > 0 && last !== undefined && this.now - last < gap) return;
    this.lastAt[e.k] = this.now;
    ev.push({ ...e, t: Math.round(this.now * 10) / 10 } as ChronEvent);
  }

  /** Every frame of play: run time and the player's state; rising edges become events. */
  tick(t: number, s: ChronTick) {
    this.now = t;
    const hide = s.hidden && !s.swim;
    if (hide && !this.prev.hide) this.add({ k: "hide" }, 4);
    if (s.swim && !this.prev.swim) this.add({ k: "swim" }, 6);
    if (s.dive && !this.prev.dive) this.add({ k: "dive" }, 5);
    if (s.horse && !this.prev.horse) this.add({ k: "horse" }, 10);
    if (s.boat && !this.prev.boat) this.add({ k: "boat" }, 10);
    if (s.hp < this.prev.hp - 0.5) {
      this.add({ k: "wounded" });
      if (s.hp > 0 && s.hp <= 1) this.add({ k: "nearDeath" }, 8);
    }
    this.prev = { hide, swim: s.swim, dive: s.dive, horse: s.horse, boat: s.boat, hp: s.hp };
    // places: every 20th frame is often enough
    this.placeT -= 1;
    if (this.placeT > 0) return;
    this.placeT = 20;
    for (const p of placesAt(s.x, s.y, s.z)) {
      if (this.seen.has(p.id)) continue;
      this.seen.add(p.id);
      this.add({ k: "place", id: p.id });
    }
  }

  /** A guard went down; msg is the engine's toast for it. */
  kill(msg: string, target: boolean, cover: boolean) {
    const how: KillHow = msg.startsWith("Air") ? "air" : msg.startsWith("Silent") ? "silent" : msg.startsWith("Counter") ? "counter" : "cut";
    this.add({ k: "kill", how, target, cover });
  }

  end(won: boolean, reason: string | null) {
    if (this.data.events.some((e) => e.k === "end")) return;
    this.add({ k: "end", won, reason });
  }

  snapshot(): ChronicleData {
    return { ...this.data, events: this.data.events.slice() };
  }
}
