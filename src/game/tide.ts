// Pasang surut: the sea and the river rise and fall on a clock while a mission plays. Pure data and maths, no
// three.js, so the HUD and the pause menu can read the tide too. engine.ts moves the water and uses the strips
// below; tideScene.ts (three.js) draws the mudflats.
//
// The tide is a sine over TIDE.period seconds of play, starting at a phase picked per mission. Its level is an
// offset in metres from mean water, TIDE.low to TIDE.high. From it come:
// - mud: at low water a strip along the sea shore and both river banks is bare mud. The player (only the player:
//   guards keep to their nav grid, which treats all water as blocked) can walk it, slowly and loudly.
// - flood: at high water the river spills a little over its banks, so ground right by the water (under the stilt
//   house on the north bank, for one) turns to wading and swimming.
// - reach: at high water a swimmer floats higher, and can climb a little higher onto decks and hulls.

import { t, type Lang } from "./i18n";

export const TIDE = {
  /** seconds of play for a full cycle, low to low */
  period: 270,
  /** metres from mean water */
  low: -0.6,
  high: 0.5,
  /** the bare mud strip at dead low water: metres out from the sea shore, metres in from each river bank */
  seaMud: 2.6,
  riverMud: 1.5,
  /** how far the river spills over each bank at the top of the tide */
  flood: 1.2,
  /** mud: footsteps carry this much further, and the player moves this much slower */
  mudNoise: 1.45,
  mudSpeed: 0.7,
  /** at the top of the tide a swimmer can climb this much higher */
  reach: 0.8,
};

export type TideState = "surut" | "naik" | "pasang" | "turun";

/** The Malay name of each state, and an English gloss. */
export const TIDE_NAMES: Record<TideState, { name: string; en: string }> = {
  surut: { name: "Air surut", en: "low water" },
  naik: { name: "Pasang naik", en: "rising" },
  pasang: { name: "Air pasang", en: "high water" },
  turun: { name: "Air turun", en: "falling" },
};

export interface TideReading {
  /** metres from mean water */
  off: number;
  /** 0 at dead low water, 1 at the top of the tide */
  k: number;
  rising: boolean;
  state: TideState;
  /** seconds until the tide turns (low to rising, or high to falling) */
  toTurn: number;
}

/** Where each mission's tide starts, as a fraction of the cycle (0.75 is dead low water, 0.25 the top). */
const PHASES: Record<string, number> = {
  // the harbour opens on the last of the ebb: the shore mud is out from the start, and the flood comes in later
  harbour: 0.68,
  // the kampung missions open near high water, so the river runs into the bank under the stilt house
  kampung: 0.2,
  plans: 0.45,
  jungle: 0.95,
  ledang: 0.5,
};

/** The phase a level starts at; levels without one get a phase from their id, so it is always the same. */
export function tidePhase(levelId: string): number {
  if (levelId in PHASES) return PHASES[levelId];
  let h = 0;
  for (const c of levelId) h = (h * 31 + c.charCodeAt(0)) % 997;
  return h / 997;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** The tide after `time` seconds of play, from the level's starting phase. */
export function tideAt(time: number, phase: number): TideReading {
  const u = time / TIDE.period + phase;
  const a = 2 * Math.PI * u;
  const s = Math.sin(a);
  const k = (s + 1) / 2;
  const off = TIDE.low + (TIDE.high - TIDE.low) * k;
  const rising = Math.cos(a) > 0;
  // turns at the top (u = 0.25) and the bottom (u = 0.75) of each cycle
  const since = (((u - 0.25) % 0.5) + 0.5) % 0.5;
  const toTurn = (0.5 - since) * TIDE.period;
  const state: TideState = k > 0.82 ? "pasang" : k < 0.18 ? "surut" : rising ? "naik" : "turun";
  return { off, k, rising, state, toTurn };
}

/** How much of the mud is bare: 0 from mid tide up, 1 near dead low water. */
export const mudShare = (k: number) => clamp01((0.6 - k) / 0.5);
/** How far over its banks the river runs: 0 until near the top of the tide. */
export const floodShare = (k: number) => clamp01((k - 0.7) / 0.3);

/** The walkable strips this tide: metres of firm-enough mud from the shore and each bank, metres of flood past each bank. */
export function tideStrips(k: number) {
  const m = mudShare(k);
  const f = floodShare(k);
  // a margin off the water's edge, and nothing under half a metre: a sliver of mud is not a path
  const sea = TIDE.seaMud * m - 0.25;
  const river = TIDE.riverMud * m - 0.2;
  const flood = TIDE.flood * f - 0.15;
  return { sea: sea >= 0.5 ? sea : 0, river: river >= 0.5 ? river : 0, flood: flood >= 0.3 ? flood : 0 };
}

/** The sea shore's mud slopes down from just under the ground at the shoreline to bottomY at its seaward edge. */
export const SEA_MUD = { topY: -0.03, bottomY: -0.36, len: TIDE.seaMud + 0.2 };
/** Height of the shore mud `dz` metres out from the shoreline. */
export const seaMudY = (dz: number) => SEA_MUD.topY - ((SEA_MUD.topY - SEA_MUD.bottomY) * Math.min(Math.max(dz, 0), SEA_MUD.len)) / SEA_MUD.len;

/** An axis-aligned area (the same shape as level.ts's Area). */
export interface TideArea {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** What the strips need from the map: the shoreline (land at +z), the map's x edges, and the tidal rivers. */
export interface TideMap {
  shoreZ: number;
  minX: number;
  maxX: number;
  rivers: TideArea[];
}

const inX = (a: TideArea, x: number) => x >= a.minX && x <= a.maxX;

/** Bare mud here at this tide: just off the sea shore, or just inside a river bank. */
export function onMudflat(m: TideMap, k: number, x: number, z: number): boolean {
  const s = tideStrips(k);
  if (s.sea > 0 && z < m.shoreZ && z > m.shoreZ - s.sea && x >= m.minX && x <= m.maxX) return true;
  if (s.river > 0) for (const r of m.rivers) if (inX(r, x) && ((z >= r.minZ && z < r.minZ + s.river) || (z <= r.maxZ && z > r.maxZ - s.river))) return true;
  return false;
}

/** The river over its banks here at this tide. */
export function inFlood(m: TideMap, k: number, x: number, z: number): boolean {
  const f = tideStrips(k).flood;
  if (f <= 0) return false;
  return m.rivers.some((r) => inX(r, x) && ((z < r.minZ && z > r.minZ - f) || (z > r.maxZ && z < r.maxZ + f)));
}

/** Rivers are tidal when they run the width of the map down to the sea; pools and ponds keep still. */
export const isTidal = (r: { w: number }) => r.w >= 40;

/** The stilt house on the river's north bank, half over the water: crawl under it on the mud at low water, swim under it at high. */
export const TIDE_HOUSES = [{ x: -19.5, z: 47.6, w: 4.5, d: 4, h: 3.4, windows: false }];

/** "3:05" */
export function tideClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The name of a tide state in `lang` (Malay by default). */
export function tideName(state: TideState, lang: Lang = "ms"): string {
  return t(lang, `tide.${state}`);
}

/** The toast when the tide reaches low or high water (the engine shows it on arriving in a tidal map). */
export function tideToast(state: "surut" | "pasang", lang: Lang = "ms"): string {
  return t(lang, `tide.toast.${state}`, { state: tideName(state, lang) });
}

/** One line for the pause menu: where the tide stands and when it turns. */
export function tideLine(r: TideReading, lang: Lang = "ms"): string {
  const lvl = `${r.off >= 0 ? "+" : "\u2212"}${Math.abs(r.off).toFixed(1)} m`;
  const mud = mudShare(r.k) > 0.3 ? t(lang, "tide.mudBare") : floodShare(r.k) > 0.3 ? t(lang, "tide.overBanks") : "";
  return t(lang, "tide.line", {
    heading: t(lang, "tide.heading"),
    state: tideName(r.state, lang),
    level: lvl,
    extra: mud ? ` \u00b7 ${mud}` : "",
    next: t(lang, r.rising ? "tide.toEbb" : "tide.toFlood"),
    clock: tideClock(r.toTurn),
  });
}
