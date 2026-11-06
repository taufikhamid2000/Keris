// Browser progress saving. Pure data helpers plus a small store over an injected Storage-like object,
// so everything is unit tested in save.test.ts. No DOM or three.js. Every storage access is wrapped in
// try/catch and degrades to in-memory when localStorage is missing or blocked (private mode, SSR).
import { cleanSkills } from "./skills";
import { cleanAmulets } from "./amulets";
import { cleanExplored } from "./fog";
import { cleanKitab } from "./kitab";
import { cleanTales } from "./hikayat";
import { cleanPantun } from "./pantun";
import { cleanPuteri, defaultPuteri, type PuteriSave } from "./ghaib";

export const SAVE_KEY = "keris:save";
export const SAVE_VERSION = 3;
export const MISSION_ID = "malacca-1511";

/** "target": the mission's target is down and the player only has to escape */
export type Checkpoint = "start" | "target";
export type QualityPref = "auto" | "low" | "high";

export interface MissionStats {
  completed: boolean;
  attempts: number;
  /** fastest full run from the mission start, in seconds */
  bestTime: number | null;
  /** best stealth rating, 1..3 (see stealthRating) */
  bestRating: number | null;
}

import { DEFAULT_LANG, isLang, type Lang } from "./i18n";

export interface SaveSettings {
  quality: QualityPref;
  /** look sensitivity multiplier, applies to mouse and touch */
  lookSens: number;
  invertY: boolean;
  /** "Kurangkan gegaran": no camera shake or landing dip */
  reduceShake: boolean;
  /** interface language, Malay by default */
  lang: Lang;
}

export interface SaveData {
  version: number;
  /** last checkpoint reached in the current attempt, null if the player never started */
  checkpoint: Checkpoint | null;
  /** the mission that attempt belongs to (Continue resumes it); starting another mission replaces it */
  checkpointMission: string | null;
  missions: Record<string, MissionStats>;
  settings: SaveSettings;
  /** the intro cutscene has been shown (or skipped) once; Reset progress clears it */
  seenIntro: boolean;
  /** Ilmu upgrades learned, by id (skills.ts); points are worked out from the mission records */
  skills: string[];
  /** tangkal found, by id (amulets.ts), and the one worn */
  amulets: string[];
  amulet: string | null;
  /** pause-map ground explored, per level id (packed grid, fog.ts); kept across attempts */
  explored: Record<string, string>;
  /** Kitab places reached, by id (kitab.ts); tangkal and mission pages come from amulets and missions */
  kitab: string[];
  /** the last hikayat told for each mission id (hikayat.ts), shown in the pause menu */
  tales: Record<string, string>;
  /** pantun passwords overheard, by id (pantun.ts); the right answer is marked at the gates */
  pantun: string[];
  /** the puteri of Gunung Ledang's cumulative restu (mercy less blood) and how many missions she has judged (ghaib.ts) */
  puteri: PuteriSave;
}

export const LOOK_SENS_MIN = 0.4;
export const LOOK_SENS_MAX = 2.5;

export function defaultMission(): MissionStats {
  return { completed: false, attempts: 0, bestTime: null, bestRating: null };
}

export function defaultSettings(): SaveSettings {
  return { quality: "auto", lookSens: 1, invertY: false, reduceShake: false, lang: DEFAULT_LANG };
}

export function defaultSave(): SaveData {
  return { version: SAVE_VERSION, checkpoint: null, checkpointMission: null, missions: {}, settings: defaultSettings(), seenIntro: false, skills: [], amulets: [], amulet: null, explored: {}, kitab: [], tales: {}, pantun: [], puteri: defaultPuteri() };
}

// ---------------------------------------------------------------- rating and formatting

/** 3 = never spotted, 2 = spotted once or twice, 1 = more. Alerts are guards that went fully alert. */
export function stealthRating(alerts: number): number {
  if (!(alerts > 0)) return 3;
  return alerts <= 2 ? 2 : 1;
}

export const RATING_NAMES: Record<number, string> = { 3: "Ghost", 2: "Shadow", 1: "Seen" };

export function ratingLabel(r: number | null): string {
  if (r === null) return "-";
  const n = Math.max(1, Math.min(3, Math.round(r)));
  return `${"*".repeat(n)} ${RATING_NAMES[n]}`;
}

export function formatTime(sec: number | null): string {
  if (sec === null || !Number.isFinite(sec) || sec < 0) return "-";
  const t = Math.floor(sec);
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ---------------------------------------------------------------- validation and migration

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, lo: number, hi: number, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);

function cleanMission(v: unknown): MissionStats {
  const d = defaultMission();
  if (!isObj(v)) return d;
  return {
    completed: v.completed === true,
    attempts: Math.floor(num(v.attempts, 0, 1e6, 0)),
    bestTime: typeof v.bestTime === "number" && Number.isFinite(v.bestTime) && v.bestTime > 0 ? Math.min(v.bestTime, 1e6) : null,
    bestRating: typeof v.bestRating === "number" && Number.isFinite(v.bestRating) ? Math.round(num(v.bestRating, 1, 3, 1)) : null,
  };
}

function cleanSettings(v: unknown): SaveSettings {
  const d = defaultSettings();
  if (!isObj(v)) return d;
  return {
    quality: v.quality === "low" || v.quality === "high" ? v.quality : "auto",
    lookSens: num(v.lookSens, LOOK_SENS_MIN, LOOK_SENS_MAX, d.lookSens),
    invertY: v.invertY === true,
    reduceShake: v.reduceShake === true,
    lang: isLang(v.lang) ? v.lang : d.lang,
  };
}

function cleanCharms(list: unknown, worn: unknown): { amulets: string[]; amulet: string | null } {
  const amulets = cleanAmulets(list);
  return { amulets, amulet: typeof worn === "string" && amulets.includes(worn) ? worn : null };
}

/** A tangkal picked up; the first one found is put on straight away. */
export function addAmulet(d: SaveData, id: string): SaveData {
  if (d.amulets.includes(id)) return d;
  const next = cleanCharms([...d.amulets, id], d.amulet ?? id);
  return { ...d, ...next };
}

/** Store a level's explored map (unchanged data keeps the same object, so no rewrite). */
export function setExplored(d: SaveData, level: string, packed: string): SaveData {
  return d.explored[level] === packed ? d : { ...d, explored: { ...d.explored, [level]: packed } };
}

/** A Kitab place reached. */
export function addKitab(d: SaveData, id: string): SaveData {
  return d.kitab.includes(id) ? d : { ...d, kitab: cleanKitab([...d.kitab, id]) };
}

/** Keep the tale just told as the mission's last one. */
export function setTale(d: SaveData, mission: string, tale: string): SaveData {
  return d.tales[mission] === tale ? d : { ...d, tales: cleanTales({ ...d.tales, [mission]: tale }) };
}

/** Wear a found tangkal, or none (null). */
export function wearAmulet(d: SaveData, id: string | null): SaveData {
  return { ...d, amulet: id && d.amulets.includes(id) ? id : null };
}

/** Field-by-field clean of a current-version object: bad fields fall back to defaults, unknown fields are dropped. */
export function sanitize(v: unknown): SaveData {
  if (!isObj(v)) return defaultSave();
  const missions: Record<string, MissionStats> = {};
  if (isObj(v.missions)) {
    for (const k of Object.keys(v.missions)) if (k.length <= 64 && Object.keys(missions).length < 32) missions[k] = cleanMission(v.missions[k]);
  }
  const checkpoint = v.checkpoint === "start" || v.checkpoint === "target" ? v.checkpoint : null;
  const cpMission = typeof v.checkpointMission === "string" && v.checkpointMission.length <= 64 ? v.checkpointMission : null;
  return {
    version: SAVE_VERSION,
    // a checkpoint is only usable with the mission it belongs to
    checkpoint: cpMission ? checkpoint : null,
    checkpointMission: checkpoint ? cpMission : null,
    missions,
    settings: cleanSettings(v.settings),
    seenIntro: v.seenIntro === true,
    skills: cleanSkills(v.skills),
    ...cleanCharms(v.amulets, v.amulet),
    explored: cleanExplored(v.explored),
    kitab: cleanKitab(v.kitab),
    tales: cleanTales(v.tales),
    pantun: cleanPantun(v.pantun),
    puteri: cleanPuteri(v.puteri),
  };
}

/** Migration step N upgrades version N data to version N+1. */
export type Migrations = Record<number, (old: Record<string, unknown>) => Record<string, unknown>>;
export const MIGRATIONS: Migrations = {
  // v1 -> v2: adds seenIntro. Anyone who already started or finished the mission has played past where
  // the intro would show, so they are not shown it; a v1 save with no progress sees it once.
  1: (old) => {
    const missions = isObj(old.missions) ? Object.values(old.missions) : [];
    const played =
      old.checkpoint === "start" ||
      old.checkpoint === "kapitan" ||
      missions.some((m) => isObj(m) && (m.completed === true || (typeof m.attempts === "number" && m.attempts > 0)));
    return { ...old, seenIntro: played };
  },
  // v2 -> v3: the checkpoint names the mission it belongs to (there was only the first one), and the
  // first mission's "kapitan" checkpoint becomes the generic "target".
  2: (old) => {
    const checkpoint = old.checkpoint === "kapitan" ? "target" : old.checkpoint;
    return { ...old, checkpoint, checkpointMission: checkpoint === "start" || checkpoint === "target" ? MISSION_ID : null };
  },
};

/**
 * Turn any parsed value into current SaveData, or null if it cannot be used (not an object, no integer
 * version, a version newer than this build understands, or a missing migration step).
 */
export function migrate(raw: unknown, migrations: Migrations = MIGRATIONS, target = SAVE_VERSION): SaveData | null {
  if (!isObj(raw)) return null;
  let v = raw.version;
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > target) return null;
  let cur: Record<string, unknown> = raw;
  while (v < target) {
    const step = migrations[v];
    if (!step) return null;
    try {
      cur = step(cur);
    } catch {
      return null;
    }
    if (!isObj(cur)) return null;
    v++;
    cur = { ...cur, version: v };
  }
  return sanitize(cur);
}

/** Parse stored text. Never throws; anything unusable gives defaults. */
export function parseSave(text: string | null | undefined): SaveData {
  if (!text) return defaultSave();
  try {
    return migrate(JSON.parse(text)) ?? defaultSave();
  } catch {
    return defaultSave();
  }
}

export function serializeSave(d: SaveData): string {
  return JSON.stringify(d);
}

// ---------------------------------------------------------------- pure updates

/** A checkpoint reached in the current attempt (of the mission that attempt started on). */
export function withCheckpoint(d: SaveData, cp: Checkpoint | null): SaveData {
  return { ...d, checkpoint: cp, checkpointMission: cp ? d.checkpointMission : null };
}

/** The player started a mission from the beginning: it becomes the attempt that Continue resumes. */
export function recordStart(d: SaveData, mission = MISSION_ID): SaveData {
  const m = d.missions[mission] ?? defaultMission();
  return { ...d, checkpoint: "start", checkpointMission: mission, missions: { ...d.missions, [mission]: { ...m, attempts: m.attempts + 1 } } };
}

/** The checkpoint to resume `mission` from: its own, or the start if the saved attempt is another mission's. */
export function checkpointFor(d: SaveData, mission: string): Checkpoint {
  return d.checkpointMission === mission && d.checkpoint ? d.checkpoint : "start";
}

export interface RunResult {
  /** seconds of play */
  time: number;
  /** guards that went fully alert */
  alerts: number;
  /** the run began at the mission start, not at a later checkpoint; only those can set bests */
  fromStart: boolean;
}

export interface WinOutcome {
  data: SaveData;
  rating: number;
  newBestTime: boolean;
  newBestRating: boolean;
}

/** Mission escaped: mark complete, update bests (full runs only) and reset the checkpoint to the start. */
export function recordWin(d: SaveData, r: RunResult, mission = MISSION_ID): WinOutcome {
  const m = d.missions[mission] ?? defaultMission();
  const rating = stealthRating(r.alerts);
  const time = Number.isFinite(r.time) && r.time > 0 ? r.time : null;
  const newBestTime = r.fromStart && time !== null && (m.bestTime === null || time < m.bestTime);
  const newBestRating = r.fromStart && (m.bestRating === null || rating > m.bestRating);
  const next: MissionStats = {
    ...m,
    completed: true,
    bestTime: newBestTime ? time : m.bestTime,
    bestRating: newBestRating ? rating : m.bestRating,
  };
  return { data: { ...d, checkpoint: "start", checkpointMission: mission, missions: { ...d.missions, [mission]: next } }, rating, newBestTime, newBestRating };
}

/** The intro has been shown or skipped. */
export function markIntroSeen(d: SaveData): SaveData {
  return d.seenIntro ? d : { ...d, seenIntro: true };
}

/** The intro plays automatically before the first mission only. */
export function shouldShowIntro(d: SaveData): boolean {
  return !d.seenIntro;
}

/** Clear progress and stats (including the seen-intro flag) but keep the player's settings. */
export function resetProgress(d: SaveData): SaveData {
  return { ...defaultSave(), settings: d.settings };
}

export function updateSettings(d: SaveData, patch: Partial<SaveSettings>): SaveData {
  return { ...d, settings: cleanSettings({ ...d.settings, ...patch }) };
}

/** Continue is offered only when the player has actually started the mission. */
export function hasProgress(d: SaveData): boolean {
  return d.checkpoint !== null;
}

// ---------------------------------------------------------------- export / import code

function toB64(s: string): string {
  if (typeof btoa === "function") return btoa(s);
  return Buffer.from(s, "binary").toString("base64");
}
function fromB64(s: string): string {
  if (typeof atob === "function") return atob(s);
  return Buffer.from(s, "base64").toString("binary");
}

/** Base64 of the save JSON (all ASCII: only numbers, booleans and enum strings are stored). */
export function exportCode(d: SaveData): string {
  return toB64(serializeSave(d));
}

/** Validate and decode a pasted code. Returns null on anything invalid. */
export function importCode(code: string): SaveData | null {
  const c = code.trim().replace(/\s+/g, "");
  if (!c || c.length > 20000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(c)) return null;
  try {
    return migrate(JSON.parse(fromB64(c)));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- store

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** localStorage if it exists and works, else null. Never throws. */
export function browserStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined") return null;
    const s = window.localStorage;
    if (!s) return null;
    const probe = "keris:probe";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

/**
 * Holds the current save, mirrors it to storage on every change, and exposes subscribe/getSnapshot for
 * React's useSyncExternalStore. If storage is missing or throws, it keeps working in memory.
 */
export class SaveStore {
  private data: SaveData;
  private listeners = new Set<() => void>();
  /** true when writes are not reaching storage (blocked, full, or unavailable) */
  persistent: boolean;

  constructor(
    private storage: StorageLike | null,
    private key = SAVE_KEY,
  ) {
    this.persistent = storage !== null;
    this.data = this.read();
  }

  private read(): SaveData {
    if (!this.storage) return defaultSave();
    try {
      return parseSave(this.storage.getItem(this.key));
    } catch {
      this.persistent = false;
      return defaultSave();
    }
  }

  private write() {
    if (!this.storage) return;
    try {
      this.storage.setItem(this.key, serializeSave(this.data));
    } catch {
      this.persistent = false; // quota or blocked: keep the in-memory copy
    }
  }

  readonly subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  /** Immutable snapshot; the object identity changes on every update. */
  readonly getSnapshot = (): SaveData => this.data;

  get(): SaveData {
    return this.data;
  }

  set(next: SaveData) {
    this.data = next;
    this.write();
    this.listeners.forEach((l) => l());
  }

  update(fn: (d: SaveData) => SaveData) {
    this.set(fn(this.data));
  }

  /** Wipe progress and stats; settings are kept. */
  reset() {
    this.set(resetProgress(this.data));
  }

  /** Replace everything from an export code. Returns false (and changes nothing) if the code is invalid. */
  importFrom(code: string): boolean {
    const d = importCode(code);
    if (!d) return false;
    this.set(d);
    return true;
  }

  exportCode(): string {
    return exportCode(this.data);
  }
}

let shared: SaveStore | null = null;
/** The page-wide store, created on first use in the browser. */
export function getSaveStore(): SaveStore {
  if (!shared) shared = new SaveStore(browserStorage());
  return shared;
}
