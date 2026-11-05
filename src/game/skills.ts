// Ilmu: skill points earned from missions, spent on upgrades in three branches. Pure data and helpers,
// no DOM or three.js. Points are worked out from the save's mission records rather than stored, so they
// cannot drift: each completed mission gives MISSION_POINTS and a Ghost best rating gives GHOST_POINTS more.
// The moves themselves (crouch, hide, parry, roll, knives, Mata Helang) are always there; these make them better.

import type { SaveData } from "./save";

export const MISSION_POINTS = 2;
export const GHOST_POINTS = 1;

export type BranchId = "bayang" | "silat" | "helang";

export interface SkillDef {
  id: string;
  branch: BranchId;
  name: string;
  desc: string;
  cost: number;
  /** must be learned first (the one above it in the branch) */
  needs?: string;
}

export const BRANCHES: { id: BranchId; name: string; sub: string }[] = [
  { id: "bayang", name: "Bayang", sub: "Shadow" },
  { id: "silat", name: "Silat", sub: "Combat" },
  { id: "helang", name: "Helang", sub: "Eagle" },
];

export const SKILLS: SkillDef[] = [
  { id: "langkah-kucing", branch: "bayang", name: "Langkah kucing", desc: "Footsteps carry 40% less far", cost: 1 },
  { id: "bayang-senja", branch: "bayang", name: "Bayang senja", desc: "Guards take a third longer to spot you", cost: 1, needs: "langkah-kucing" },
  { id: "nafas-panjang", branch: "bayang", name: "Nafas panjang", desc: "Hold your breath 75% longer under water", cost: 2, needs: "bayang-senja" },
  { id: "tangkis-tajam", branch: "silat", name: "Tangkis tajam", desc: "Half again as long to catch a parry", cost: 1 },
  { id: "kebal", branch: "silat", name: "Kebal", desc: "One more point of health", cost: 1, needs: "tangkis-tajam" },
  { id: "pulih", branch: "silat", name: "Pulih", desc: "Health starts coming back after 3 s instead of 6 s", cost: 2, needs: "kebal" },
  { id: "pisau-tambahan", branch: "helang", name: "Pisau tambahan", desc: "Carry 3 more throwing knives", cost: 1 },
  { id: "pisau-berat", branch: "helang", name: "Pisau berat", desc: "A knife stuns for 9 s instead of 5 s", cost: 1, needs: "pisau-tambahan" },
  { id: "sambar", branch: "helang", name: "Sambar", desc: "Leap onto a guard from up to 10 m instead of 7 m", cost: 2, needs: "pisau-berat" },
];

const byId = new Map(SKILLS.map((s) => [s.id, s]));
export const isSkillId = (id: unknown): id is string => typeof id === "string" && byId.has(id);

/** Points earned so far: completed missions, plus a bonus for each one with a Ghost best. */
export function earnedPoints(d: SaveData): number {
  let n = 0;
  for (const m of Object.values(d.missions)) {
    if (m.completed) n += MISSION_POINTS;
    if (m.bestRating === 3) n += GHOST_POINTS;
  }
  return n;
}

export function spentPoints(learned: readonly string[]): number {
  return learned.reduce((n, id) => n + (byId.get(id)?.cost ?? 0), 0);
}

export const freePoints = (d: SaveData) => Math.max(0, earnedPoints(d) - spentPoints(d.skills));

export type SkillStatus = "learned" | "open" | "short" | "locked";

/** learned; open (can buy now); short (unlocked but not enough points); locked (the one before it is still to learn) */
export function skillStatus(d: SaveData, id: string): SkillStatus {
  const s = byId.get(id);
  if (!s) return "locked";
  if (d.skills.includes(id)) return "learned";
  if (s.needs && !d.skills.includes(s.needs)) return "locked";
  return freePoints(d) >= s.cost ? "open" : "short";
}

export function learnSkill(d: SaveData, id: string): SaveData {
  return skillStatus(d, id) === "open" ? { ...d, skills: [...d.skills, id] } : d;
}

/** Give back every point (the tree can be relearned in another order). */
export function resetSkills(d: SaveData): SaveData {
  return d.skills.length ? { ...d, skills: [] } : d;
}

/** Keep known ids whose prerequisite is also kept, once each, in tree order. */
export function cleanSkills(v: unknown): string[] {
  const ids = new Set(Array.isArray(v) ? v.filter(isSkillId) : []);
  const out: string[] = [];
  for (const s of SKILLS) if (ids.has(s.id) && (!s.needs || out.includes(s.needs))) out.push(s.id);
  return out;
}

/** What the learned skills change in play; the engine multiplies or adds these to its base numbers. */
export interface SkillMods {
  noise: number;
  detect: number;
  breath: number;
  parryWin: number;
  maxHp: number;
  regenDelay: number;
  knives: number;
  knifeStun: number;
  airDrop: number;
}

export const BASE_MODS: SkillMods = { noise: 1, detect: 1, breath: 1, parryWin: 1, maxHp: 0, regenDelay: 6, knives: 0, knifeStun: 5, airDrop: 7 };

export function skillMods(learned: readonly string[]): SkillMods {
  const has = (id: string) => learned.includes(id);
  return {
    noise: has("langkah-kucing") ? 0.6 : 1,
    detect: has("bayang-senja") ? 0.75 : 1,
    breath: has("nafas-panjang") ? 1.75 : 1,
    parryWin: has("tangkis-tajam") ? 1.5 : 1,
    maxHp: has("kebal") ? 1 : 0,
    regenDelay: has("pulih") ? 3 : 6,
    knives: has("pisau-tambahan") ? 3 : 0,
    knifeStun: has("pisau-berat") ? 9 : 5,
    airDrop: has("sambar") ? 10 : 7,
  };
}
