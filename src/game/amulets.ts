// Tangkal: one amulet hidden on each mission's map, kept once found, one worn at a time for a small edge.
// Pure data and helpers, no DOM or three.js. Each is tucked into a haystack or bush (the one inside the
// mission's walls furthest from the start), so it sits on reachable ground without hand-placed coordinates.

import type { LevelDef } from "./levels";
import type { Vec2 } from "./logic";
import type { SkillMods } from "./skills";

export interface AmuletDef {
  id: string;
  /** the level it is hidden in */
  level: string;
  name: string;
  desc: string;
  apply: (m: SkillMods) => SkillMods;
}

export const AMULETS: AmuletDef[] = [
  { id: "harimau", level: "harbour", name: "Tangkal Harimau", desc: "Footsteps 20% quieter", apply: (m) => ({ ...m, noise: m.noise * 0.8 }) },
  { id: "kancil", level: "kampung", name: "Tangkal Kancil", desc: "Guards take a little longer to spot you", apply: (m) => ({ ...m, detect: m.detect * 0.85 }) },
  { id: "besi", level: "plans", name: "Tangkal Besi", desc: "Carry 2 more throwing knives", apply: (m) => ({ ...m, knives: m.knives + 2 }) },
  { id: "buaya", level: "jungle", name: "Tangkal Buaya", desc: "Hold your breath half again as long", apply: (m) => ({ ...m, breath: m.breath * 1.5 }) },
  { id: "puteri", level: "ledang", name: "Tangkal Puteri", desc: "Health starts coming back 2 s sooner", apply: (m) => ({ ...m, regenDelay: Math.max(1, m.regenDelay - 2) }) },
];

AMULETS.push({ id: "merpati", level: "masjid", name: "Tangkal Merpati", desc: "A quarter longer to catch a parry", apply: (m) => ({ ...m, parryWin: m.parryWin * 1.25 }) });

const byId = new Map(AMULETS.map((a) => [a.id, a]));
export const amuletById = (id: string | null | undefined) => (id ? byId.get(id) ?? null : null);
export const amuletForLevel = (levelId: string) => AMULETS.find((a) => a.level === levelId) ?? null;

/** The worn amulet's edge on top of the skill mods (none worn, or not found yet: unchanged). */
export function withAmulet(m: SkillMods, worn: string | null, found: readonly string[]): SkillMods {
  const a = worn && found.includes(worn) ? byId.get(worn) : null;
  return a ? a.apply(m) : m;
}

/** Known ids, once each, in list order. */
export function cleanAmulets(v: unknown): string[] {
  const ids = new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return AMULETS.filter((a) => ids.has(a.id)).map((a) => a.id);
}

/**
 * Where a level's amulet lies. The missions share one big map, so it is a hiding spot tied to this mission:
 * among those 12..32 m from the objective (off the target's own path, still in his part of the map), the one
 * furthest from the start; failing that, the spot nearest the objective. Null if the map has no hiding spots.
 */
export function amuletSpot(def: LevelDef): Vec2 | null {
  const o = def.objective;
  const goal: Vec2 | undefined = o.kind === "steal" ? o.at : def.guards.find((g) => g.isTarget)?.waypoints[0];
  const spots = [...def.hay, ...def.bushes];
  if (!goal || !spots.length) return null;
  const d = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);
  const ring = spots.filter((h) => d(h, goal) >= 12 && d(h, goal) <= 32);
  const pick = ring.length
    ? ring.reduce((a, b) => (d(b, def.start) > d(a, def.start) ? b : a))
    : spots.reduce((a, b) => (d(b, goal) < d(a, goal) ? b : a));
  return { x: pick.x, z: pick.z };
}
