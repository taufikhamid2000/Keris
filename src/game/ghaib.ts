// Alam ghaib: the unseen world that Mata Helang opens. Pure data and helpers, no DOM or three.js, so the UI can
// import them as values. ghaibLayer.ts draws it and makes the bunian paths solid; this file holds the paths, the
// semangat meter's numbers, and the puteri of Gunung Ledang's judgement of how each mission was played.
//
// The orang bunian are the unseen folk of Malay belief, who keep their own kampung and paths beside ours. The
// puteri is from the legend of Gunung Ledang. Everything she says here is written for this game.

import { CAMP, HARBOUR, JUNGLE_Z0, POOL, RIVER } from "./levels";
import type { SaveData } from "./save";
import { t as tr, type Lang } from "./i18n";
import { variants } from "./tx";

// ---------------------------------------------------------------- semangat (the cost of Mata Helang)

/**
 * Semangat: the spirit Mata Helang burns. 1 is full. It drains while the vision is open (drain per second, so
 * 1 / drain seconds from full) and comes back while it is shut. Below reopen it cannot be opened again. In the
 * spirit layer the player walks at slow times their speed; guards see them exactly as before.
 */
export const SEMANGAT = { drain: 1 / 16, refill: 1 / 9, reopen: 0.25, slow: 0.85, blessedDrain: 0.7 };

/** One step of the meter. Returns the new value and whether the vision must close (empty, or too low to open). */
export function stepSemangat(s: number, open: boolean, dt: number, opts: { blessed: boolean; held: boolean; wasOpen: boolean }) {
  if (open && !opts.wasOpen && s < SEMANGAT.reopen) return { s, open: false, why: "low" as const };
  if (open) {
    const n = Math.max(0, s - dt * SEMANGAT.drain * (opts.blessed ? SEMANGAT.blessedDrain : 1));
    return n <= 0 ? { s: 0, open: false, why: "empty" as const } : { s: n, open: true, why: null };
  }
  // standing on a bunian path that is only being held for you: nothing comes back
  return { s: opts.held ? s : Math.min(1, s + dt * SEMANGAT.refill), open: false, why: null };
}

// ---------------------------------------------------------------- the bunian paths

/** One walkable piece: footprint centre and size, top at y, thick metres deep (the collider), and how it looks. */
export interface SpiritPiece {
  x: number;
  z: number;
  w: number;
  d: number;
  y: number;
  thick: number;
  /** batu: a stepping stone; papan: a plank; akar: a vine-bound plank in the trees */
  kind: "batu" | "papan" | "akar";
  /** visual turn about y (the collider stays axis-aligned) */
  rot?: number;
}

export interface SpiritPath {
  id: string;
  name: string;
  pieces: SpiritPiece[];
  /** where kemenyan smoke rises: the two ends */
  ends: { x: number; y: number; z: number }[];
}

const THICK = 0.3;
const RISE = 0.48;

/** No jungle or mountain tree trunk stands in any piece's footprint (with margin) below its top. */
function clearOfTrees(pieces: SpiritPiece[], margin = 0.45): boolean {
  const trees = HARBOUR.trees ?? [];
  return pieces.every((p) =>
    trees.every((t) => {
      const half = 0.45 * t.s + margin;
      const base = t.y ?? 0;
      if (p.y - p.thick > base + 7) return true;
      return Math.abs(t.x - p.x) > p.w / 2 + half || Math.abs(t.z - p.z) > p.d / 2 + half;
    }),
  );
}
/** The first of the layouts with no tree in the way, else the first. */
const firstClear = (layouts: SpiritPiece[][]) => layouts.find((l) => clearOfTrees(l)) ?? layouts[0];

/** Titian bunian: stepping stones over the river between the plank and the kampung jetty, clear of the moored prahu. */
function riverStones(): SpiritPiece[] {
  const x = -6.5;
  const z0 = RIVER.z - RIVER.d / 2 - 1.2;
  const z1 = RIVER.z + RIVER.d / 2 + 1.2;
  const n = 8;
  const d = (z1 - z0) / n;
  return Array.from({ length: n }, (_, i) => ({ x, z: z0 + d * (i + 0.5), w: 1.4, d, y: 0.32, thick: THICK, kind: "batu" as const }));
}

/** Tangga bunian: steps up the kampung side of the north fence (4.5 m, too tall to climb), over it, and down into the hutan. */
function fenceStair(x: number): SpiritPiece[] {
  const out: SpiritPiece[] = [];
  const dz = 0.8;
  const z0 = JUNGLE_Z0 - 8.5;
  for (let k = 0; k < 10; k++) out.push({ x, z: z0 + dz * (k + 0.5), w: 1.4, d: dz, y: (k + 1) * RISE, thick: THICK, kind: "papan" });
  // over the top of the fence
  const top = z0 + dz * 10;
  out.push({ x, z: top + 0.9, w: 1.4, d: 1.8, y: 10 * RISE, thick: THICK, kind: "papan" });
  // and down on the far side, a step at a time
  [3.6, 2.4, 1.2].forEach((y, i) => out.push({ x, z: top + 1.8 + dz * (i + 0.5), w: 1.4, d: dz, y, thick: THICK, kind: "papan" }));
  return out;
}

/** Tangga air terjun: floating steps beside the falls, from the pool's east bank straight up to the second ledge. */
function fallsStair(x: number): SpiritPiece[] {
  // the second ledge's lobe east of the falls starts at z = 186, 4.8 m up
  const dz = 0.9;
  const z0 = 186 - 10 * dz;
  return Array.from({ length: 10 }, (_, k) => ({ x, z: z0 + dz * (k + 0.5), w: 1.4, d: dz, y: (k + 1) * RISE, thick: THICK, kind: "batu" as const }));
}

/**
 * Jambatan akar: a vine bridge in a ring round the scouts' camp, from its south-east edge to its north side, high
 * enough to pass over the huts. The ring stays in the tree-free band around the clearing and inside the watch tower.
 * Square pieces along the arc overlap, so the colliders (axis-aligned) make one continuous walk.
 */
function campRing(): SpiritPiece[] {
  const r = 11;
  const a0 = (-60 * Math.PI) / 180;
  const a1 = (100 * Math.PI) / 180;
  const step = 0.85;
  const n = Math.round(((a1 - a0) * r) / step);
  const top = 4.0;
  const ramp = Math.ceil(top / 0.5);
  const out: SpiritPiece[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const y = Math.min(top, (i + 1) * 0.5, (n - i + 1) * 0.5);
    out.push({ x: CAMP.x + Math.cos(a) * r, z: CAMP.z + Math.sin(a) * r, w: 1.3, d: 1.3, y, thick: THICK, kind: i < ramp || i > n - ramp ? "papan" : "akar", rot: -a });
  }
  return out;
}

const ends = (ps: SpiritPiece[]) => [ps[0], ps[ps.length - 1]].map((p) => ({ x: p.x, y: p.y, z: p.z }));
const path = (id: string, name: string, pieces: SpiritPiece[]): SpiritPath => ({ id, name, pieces, ends: ends(pieces) });

/** Every bunian path on the shared map (every mission plays on it, so they are there on each). */
export const BUNIAN_PATHS: SpiritPath[] = [
  path("titian", "Titian bunian", riverStones()),
  path("pagar", "Tangga bunian", firstClear([-28.5, -29.5, -27.5, -30.5, -26.5].map(fenceStair))),
  path("terjun", "Tangga air terjun", firstClear([0.5, 0.8, 0.3].map((o) => fallsStair(POOL.x + POOL.w / 2 + o)))),
  path("akar", "Jambatan akar", campRing()),
];

/** Collider boxes for every piece (logic.ts Box shape). */
export function spiritBoxes(paths: SpiritPath[] = BUNIAN_PATHS) {
  return paths.flatMap((p) =>
    p.pieces.map((q) => ({ minX: q.x - q.w / 2, maxX: q.x + q.w / 2, minY: q.y - q.thick, maxY: q.y, minZ: q.z - q.d / 2, maxZ: q.z + q.d / 2 })),
  );
}

// ---------------------------------------------------------------- the puteri's judgement

/** What one attempt did, as the puteri saw it. Killing the mission's target is the task, not counted as blood. */
export interface Tally {
  /** guards killed other than a kill mission's target */
  kills: number;
  /** guards stunned or blinded and left alive */
  spared: number;
  /** guards that went fully alert */
  alerts: number;
}

export type Mood = "suci" | "berkenan" | "diam" | "murka";

/** The cumulative restu is kept within this, and these are the blessing thresholds. */
export const RESTU = { min: -30, max: 30, bless: 8, wrath: -8, perMission: 5 };

export type Blessing = "restu" | "none" | "murka";
export const blessingFor = (restu: number): Blessing => (restu >= RESTU.bless ? "restu" : restu <= RESTU.wrath ? "murka" : "none");

/** Mercy less blood for one mission: spared guards and an unseen pass count for, kills and alarms against. */
export function restuDelta(t: Tally): number {
  const mercy = t.spared + (t.alerts === 0 ? 3 : 0) + (t.kills === 0 ? 2 : 0);
  const blood = t.kills * 2 + t.alerts;
  return Math.max(-RESTU.perMission, Math.min(RESTU.perMission, mercy - blood));
}

export function moodFor(t: Tally): Mood {
  if (t.kills === 0 && t.alerts === 0) return "suci";
  const d = restuDelta(t);
  return d >= 2 ? "berkenan" : d >= -1 ? "diam" : "murka";
}

/** The puteri's lines for a mood (ghaib.whisper.<mood> in strings/story.ts). */
const whispers = (mood: Mood, lang: Lang): string[] => variants(lang, `ghaib.whisper.${mood}`);

export interface Whisper {
  mood: Mood;
  line: string;
  delta: number;
  restu: number;
  /** the blessing changed with this judgement */
  change: "granted" | "lost" | "wrath" | "eased" | null;
}

/** The puteri's verdict on a finished mission, and the save's restu after it. The line is picked without randomness. */
export function judge(t: Tally, restuBefore: number, levelId: string, judged: number, lang: Lang = "ms"): Whisper {
  const mood = moodFor(t);
  const delta = restuDelta(t);
  const restu = clampRestu(restuBefore + delta);
  const pool = whispers(mood, lang);
  let h = judged;
  for (const c of levelId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const was = blessingFor(restuBefore);
  const now = blessingFor(restu);
  const change = was === now ? null : now === "restu" ? "granted" : now === "murka" ? "wrath" : was === "restu" ? "lost" : "eased";
  return { mood, line: pool[h % pool.length], delta, restu, change };
}

/** The note under a judgement that changed her blessing, in one language. */
export const changeNote = (lang: Lang, change: NonNullable<Whisper["change"]>): string => tr(lang, `ghaib.change.${change}`);

/** The same notes in Malay (the default language). */
export const CHANGE_NOTE: Record<NonNullable<Whisper["change"]>, string> = {
  granted: changeNote("ms", "granted"),
  lost: changeNote("ms", "lost"),
  wrath: changeNote("ms", "wrath"),
  eased: changeNote("ms", "eased"),
};

// ---------------------------------------------------------------- save

export interface PuteriSave {
  /** cumulative mercy less blood, RESTU.min..RESTU.max */
  restu: number;
  /** missions she has judged (wins) */
  judged: number;
}

export const defaultPuteri = (): PuteriSave => ({ restu: 0, judged: 0 });
export const clampRestu = (n: number) => Math.max(RESTU.min, Math.min(RESTU.max, Math.round(n)));

export function cleanPuteri(v: unknown): PuteriSave {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return defaultPuteri();
  const o = v as Record<string, unknown>;
  const restu = typeof o.restu === "number" && Number.isFinite(o.restu) ? clampRestu(o.restu) : 0;
  const judged = typeof o.judged === "number" && Number.isFinite(o.judged) ? Math.max(0, Math.min(1e6, Math.floor(o.judged))) : 0;
  return { restu, judged };
}

/** A mission judged: store the new restu. */
export function recordJudgement(d: SaveData, w: Whisper): SaveData {
  return { ...d, puteri: { restu: w.restu, judged: d.puteri.judged + 1 } };
}

// ---------------------------------------------------------------- Kitab pages

export interface GhaibPage {
  key: string;
  open: boolean;
  title: string;
  text: string;
  hint: string;
}

/** Two pages for the journal: the bunian paths, and the puteri's restu (with where the player stands). */
export function ghaibPages(d: SaveData, lang: Lang = "ms"): GhaibPage[] {
  const p = d.puteri;
  const standing = tr(lang, `ghaib.standing.${blessingFor(p.restu)}`);
  return [
    {
      key: "jalan-bunian",
      open: p.judged > 0,
      title: tr(lang, "ghaib.page.bunian.title"),
      text: tr(lang, "ghaib.page.bunian.text"),
      hint: tr(lang, "ghaib.page.bunian.hint"),
    },
    {
      key: "restu-puteri",
      open: p.judged >= 2 || blessingFor(p.restu) !== "none",
      title: tr(lang, "ghaib.page.restu.title"),
      text: tr(lang, "ghaib.page.restu.text", { standing }),
      hint: tr(lang, "ghaib.page.restu.hint"),
    },
  ];
}
