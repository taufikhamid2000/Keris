/**
 * Dua pemain: a friend on a phone plays the Kapitan, the harbour master who commands the guards.
 * Pure data and rules (no three.js, no network): the wire format, command validation, and the
 * host-side limits, cooldowns and rate limit. The pendekar's game is authoritative; the Kapitan
 * only asks, and the host checks every request here before the engine acts on it.
 */

/** Limits that keep the Kapitan fair. Times are seconds of play (pauses excluded) unless noted. */
export const KAPITAN = {
  /** pelita (lanterns) per mission attempt, their reach in metres, and how much faster a guard spots the pendekar inside one */
  lanterns: 3,
  lanternR: 6,
  lanternBoost: 1.8,
  /** seconds between two pelita, and the least gap between them in metres */
  lanternCd: 15,
  lanternGap: 4,
  /** seconds between two "hantar pengawal" orders, and how long a sent guard keeps walking before he gives up */
  sendCd: 10,
  orderTime: 25,
  /** the kentung (alarm drum): once per attempt, guards stay on edge this long */
  alarmHold: 10,
  /** rate limit on incoming commands (any kind): at most rateN per rateWin wall-clock seconds */
  rateN: 4,
  rateWin: 2,
  /** host snapshots per second, and wall seconds of silence before the other side counts as lost */
  snapHz: 5,
  peerTimeout: 6,
} as const;

export type KapitanPhase = "title" | "intro" | "playing" | "paused" | "won" | "lost";

/** One guard on the wire: id, x, z, yaw (radians), state (0 patrol, 1 suspicious, 2 search, 3 alert), flags (KG_*). */
export type GuardTuple = [number, number, number, number, number, number];
export const KG_DEAD = 1;
export const KG_TARGET = 2;
export const KG_STUNNED = 4;
export const KG_ORDERED = 8;
export const GUARD_STATES = ["patrol", "suspicious", "search", "alert"] as const;

/** What the engine reports for the Kapitan (Game.kapitanSnapshot). */
export interface KapitanWorld {
  /** bumps on every new attempt, so the host resets the Kapitan's limits */
  epoch: number;
  /** LevelDef id of the mission on the map */
  level: string;
  phase: KapitanPhase;
  /** seconds of play in this attempt */
  t: number;
  guards: GuardTuple[];
  /** lit pelita, [x, z] */
  lanterns: [number, number][];
  /** where a guard last saw the pendekar: seen = a guard sees him right now; age = seconds since. null = never seen this attempt */
  pendekar: { x: number; z: number; seen: boolean; age: number } | null;
  objective: { x: number; z: number } | null;
  exit: { x: number; z: number };
  escape: boolean;
}

/** What the Kapitan can still do, sent alongside the world. */
export interface KapitanPowers {
  lanternsLeft: number;
  /** seconds until the next pelita / order is allowed (0 = ready) */
  lanternCd: number;
  sendCd: number;
  alarm: boolean;
}

export interface KapitanSnap extends KapitanWorld {
  powers: KapitanPowers;
}

export type KapitanCmd = { k: "lantern"; x: number; z: number } | { k: "send"; id: number; x: number; z: number } | { k: "alarm" };

const num = (v: unknown, lim = 1e4): v is number => typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= lim;

/** Check an incoming command's shape; anything malformed is null. */
export function parseCmd(raw: unknown): KapitanCmd | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (c.k === "lantern" && num(c.x) && num(c.z)) return { k: "lantern", x: c.x, z: c.z };
  if (c.k === "send" && num(c.id, 1e4) && Number.isInteger(c.id) && num(c.x) && num(c.z)) return { k: "send", id: c.id, x: c.x, z: c.z };
  if (c.k === "alarm") return { k: "alarm" };
  return null;
}

/** Check a snapshot's shape on the Kapitan's side (the host is trusted, but the channel is public). */
export function parseSnap(raw: unknown): KapitanSnap | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<KapitanSnap>;
  if (typeof s.level !== "string" || !Array.isArray(s.guards) || !Array.isArray(s.lanterns) || !s.powers || !s.exit) return null;
  return s as KapitanSnap;
}

export const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Host-side bookkeeping of what the Kapitan has used this attempt.
 * check() says why a command is refused (or null); the caller asks the engine, then commit()s on success.
 */
export class KapitanRules {
  private epoch = -1;
  private lanternsUsed = 0;
  private lanternAt = -Infinity;
  private sendAt = -Infinity;
  private alarmUsed = false;
  private stamps: number[] = [];

  /** a new attempt (epoch changed): everything is available again */
  sync(epoch: number) {
    if (epoch === this.epoch) return;
    this.epoch = epoch;
    this.lanternsUsed = 0;
    this.lanternAt = -Infinity;
    this.sendAt = -Infinity;
    this.alarmUsed = false;
  }

  /** Wall-clock rate limit (seconds); true when this command may be looked at. */
  allow(wall: number): boolean {
    this.stamps = this.stamps.filter((s) => wall - s < KAPITAN.rateWin);
    if (this.stamps.length >= KAPITAN.rateN) return false;
    this.stamps.push(wall);
    return true;
  }

  /** Why the command is refused at play time t, or null if it may go ahead. */
  check(c: KapitanCmd, t: number, phase: KapitanPhase): string | null {
    if (phase !== "playing") return "The pendekar is not on the move right now.";
    const p = this.powers(t);
    if (c.k === "lantern") {
      if (p.lanternsLeft <= 0) return "No pelita left this attempt.";
      if (p.lanternCd > 0) return `Next pelita in ${Math.ceil(p.lanternCd)} s.`;
    } else if (c.k === "send") {
      if (p.sendCd > 0) return `Next order in ${Math.ceil(p.sendCd)} s.`;
    } else if (!p.alarm) return "The kentung has already sounded this attempt.";
    return null;
  }

  commit(c: KapitanCmd, t: number) {
    if (c.k === "lantern") {
      this.lanternsUsed++;
      this.lanternAt = t;
    } else if (c.k === "send") this.sendAt = t;
    else this.alarmUsed = true;
  }

  powers(t: number): KapitanPowers {
    return {
      lanternsLeft: Math.max(0, KAPITAN.lanterns - this.lanternsUsed),
      lanternCd: round1(Math.max(0, this.lanternAt + KAPITAN.lanternCd - t)),
      sendCd: round1(Math.max(0, this.sendAt + KAPITAN.sendCd - t)),
      alarm: !this.alarmUsed,
    };
  }
}

/** Four letters, no look-alikes (no I, O, L, 0, 1). */
const CODE_ABC = "ABCDEFGHJKMNPQRSTUVWXYZ";
export function makeRoomCode(rand: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 4; i++) s += CODE_ABC[Math.floor(rand() * CODE_ABC.length)];
  return s;
}
/** Tidy a typed code; null if it cannot be one. */
export function cleanRoomCode(v: string | null | undefined): string | null {
  const s = (v ?? "").toUpperCase().replace(/[^A-Z]/g, "");
  return s.length === 4 && [...s].every((ch) => CODE_ABC.includes(ch)) ? s : null;
}
