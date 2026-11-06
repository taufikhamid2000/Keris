// Kitab: the journal. Pure data and helpers, no DOM or three.js. Three kinds of page:
// places (unlocked by reaching them; the engine checks the player's position and the save keeps the ids),
// tangkal (unlocked by finding the amulet) and hikayat (unlocked by completing the mission). The last two are
// worked out from the save's amulets and mission records, so only places are stored.
// The world is a fiction set in Malacca in 1511; these pages are written as in-world notes, not as history.

import { CAMP, JUNGLE_Z0, JUNGLE_Z1, POOL, RIVER, SUMMIT } from "./levels";
import type { LevelDef } from "./levels";
import { MASJID_COURT, MASJID_POND } from "./masjid";
import { PENJARA_BLOCK, PENJARA_YARD } from "./levels/penjara";
import { GUA_LANUN, GUA_LANUN_PLACES } from "./guaLanun";
import { KEEP, KOTA_WALLS, KOTA_Z0 } from "./kota";
import type { Lang } from "./i18n";
import { t } from "./i18n";
import { tx } from "./tx";

/** How reliable an entry is: fakta (cited history), legenda (tradition), rekaan (invented for the game). */
export type KitabKind = "fakta" | "legenda" | "rekaan";
export const KITAB_KINDS: readonly KitabKind[] = ["fakta", "legenda", "rekaan"];
export interface Sumber {
  label: string;
  url?: string;
}

/** Title, hint and text of a place in Malay (the source text; other languages come from placeText). */
const txt = (id: string) => ({ title: t("ms", `kitab.place.${id}.title`), hint: t("ms", `kitab.place.${id}.hint`), text: t("ms", `kitab.place.${id}.text`) });
/** A mission page in one language (strings/story.ts: kitab.mission.<id>.*). */
const loreText = (lang: Lang, id: string) => ({ title: t(lang, `kitab.mission.${id}.title`), text: t(lang, `kitab.mission.${id}.text`) });

export interface PlaceDef {
  id: string;
  /** reliability label; filled in below for every place that does not set it */
  kind?: KitabKind;
  /** cited sources (none yet for the in-world notes) */
  sumber?: Sumber[];
  title: string;
  text: string;
  /** shown while locked */
  hint: string;
  at: (x: number, y: number, z: number) => boolean;
  /** a place that belongs to one mission only (the maps share coordinates); left out, it is on every mission */
  level?: string;
  /** x range the place lies in; places with neither this nor `level` belong to the Malacca map (|x| <= MALACCA_X), whose tests look at z alone */
  xr?: [number, number];
}

/** Is this place on that mission? (No mission given: only the places every mission shares.) */
export const placeOnLevel = (p: PlaceDef, levelId?: string) => !p.level || p.level === levelId;

const MALACCA_X = 36;
const inPlace = (p: PlaceDef, x: number, y: number, z: number, levelId?: string) =>
  placeOnLevel(p, levelId) && (p.xr ? x >= p.xr[0] && x <= p.xr[1] : p.level || Math.abs(x) <= MALACCA_X) && p.at(x, y, z);

const near = (c: { x: number; z: number }, r: number) => (x: number, _y: number, z: number) => Math.hypot(x - c.x, z - c.z) <= r;
const inBox = (r: { x: number; z: number; w: number; d: number }) => (x: number, _y: number, z: number) => Math.abs(x - r.x) <= r.w / 2 && Math.abs(z - r.z) <= r.d / 2;
const riverZ0 = RIVER.z - RIVER.d / 2 - 1;
const riverZ1 = RIVER.z + RIVER.d / 2 + 1;

export const PLACES: PlaceDef[] = [
  {
    id: "jeti",
    ...txt("jeti"),
    at: (_x, _y, z) => z < -20,
  },
  {
    id: "pelabuhan",
    ...txt("pelabuhan"),
    at: (_x, _y, z) => z >= -20 && z < riverZ0,
  },
  {
    id: "sungai",
    ...txt("sungai"),
    at: (_x, _y, z) => z >= riverZ0 && z <= riverZ1,
  },
  {
    id: "kampung-hulu",
    ...txt("kampung-hulu"),
    at: (_x, _y, z) => z > riverZ1 && z < JUNGLE_Z0,
  },
  {
    id: "hutan",
    ...txt("hutan"),
    at: (_x, _y, z) => z >= JUNGLE_Z0 && z < JUNGLE_Z1,
  },
  {
    id: "kem",
    ...txt("kem"),
    at: near(CAMP, CAMP.r + 4),
  },
  {
    id: "ledang",
    ...txt("ledang"),
    at: (_x, _y, z) => z >= JUNGLE_Z1 && z < KOTA_Z0 - 40,
  },
  {
    id: "kolam",
    ...txt("kolam"),
    at: near(POOL, 9),
  },
  {
    id: "puncak",
    ...txt("puncak"),
    at: (x, y, z) => y >= SUMMIT.y - 1 && Math.hypot(x - SUMMIT.x, z - SUMMIT.z) <= 10,
  },
  {
    id: "halaman-penjara",
    ...txt("halaman-penjara"),
    at: inBox(PENJARA_YARD),
  },
  {
    id: "sel",
    ...txt("sel"),
    at: inBox(PENJARA_BLOCK),
  },
];
PLACES.push(...GUA_LANUN_PLACES);
// guaLanun.ts still holds its places in English; the Malay source comes from the dictionary
for (const p of GUA_LANUN_PLACES) Object.assign(p, txt(p.id));

// Masjid mission places (this mission only)
PLACES.push(
  {
    id: "masjid",
    level: "masjid",
    ...txt("masjid"),
    at: (x, _y, z) => Math.abs(x - MASJID_COURT.x) <= MASJID_COURT.w / 2 && Math.abs(z - MASJID_COURT.z) <= MASJID_COURT.d / 2,
  },
  {
    id: "kolam-masjid",
    level: "masjid",
    ...txt("kolam-masjid"),
    at: near(MASJID_POND, 4.5),
  },
);

/** Lore for each tangkal, by amulet id (names and effects stay in amulets.ts). */
export const CHARM_LORE: Record<string, string> = Object.fromEntries(
  ["harimau", "kancil", "besi", "buaya", "merpati", "puteri", "rantai"].map((id) => [id, t("ms", `kitab.charm.${id}`)]),
);

/** After-the-mission pages, by level id. */
export const MISSION_LORE: Record<string, { title: string; text: string; kind?: KitabKind; sumber?: Sumber[] }> = Object.fromEntries(
  ["harbour", "kampung", "plans", "jungle", "ledang", "wayang", "penjara", "masjid", GUA_LANUN.id].map((id) => [id, loreText("ms", id)]),
);

// Kota Batu (kota.ts), appended after the shared lists so the missions merge cleanly. Its map lies far north of the
// rest (z from 293), so the Gunung Ledang place above stops short of it.
PLACES.push(
  {
    id: "kota-bukit",
    level: "kota",
    ...txt("kota-bukit"),
    at: (x, _y, z) => z >= KOTA_Z0 + 74 || (z >= KOTA_Z0 + 8 && Math.abs(x) > 31.5),
  },
  {
    id: "kota-halaman",
    level: "kota",
    ...txt("kota-halaman"),
    at: (x, _y, z) => x > KOTA_WALLS.minX && x < KOTA_WALLS.maxX && z > KOTA_WALLS.minZ && z < KOTA_WALLS.maxZ,
  },
  {
    id: "kota-kubu",
    level: "kota",
    ...txt("kota-kubu"),
    at: (x, y, z) => y >= 9 && Math.hypot(x - KEEP.x, z - KEEP.z) <= 6,
  },
);
MISSION_LORE.kota = loreText("ms", "kota");

/** Entries that retell a tradition rather than invent: everything else in the journal is in-world fiction (rekaan). */
const LEGENDA_PLACES = new Set(["ledang"]);
for (const p of PLACES) p.kind ??= LEGENDA_PLACES.has(p.id) ? "legenda" : "rekaan";
for (const l of Object.values(MISSION_LORE)) l.kind ??= "rekaan";
/** Reliability of each tangkal page (all invented), with its sources. */
export const CHARM_META: Record<string, { kind: KitabKind; sumber?: Sumber[] }> = Object.fromEntries(
  Object.keys(CHARM_LORE).map((id) => [id, { kind: "rekaan" as KitabKind }]),
);

const placeIds = new Set(PLACES.map((p) => p.id));
export const placeById = (id: string) => PLACES.find((p) => p.id === id) ?? null;

/** Known place ids, once each, in list order. */
export function cleanKitab(v: unknown): string[] {
  const ids = new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && placeIds.has(x)) : []);
  return PLACES.filter((p) => ids.has(p.id)).map((p) => p.id);
}

/** Where to label a place on the map: the centre of the part of it inside the bounds (null if it lies outside). */
export function placeCentre(p: PlaceDef, b: { minX: number; maxX: number; minZ: number; maxZ: number }): { x: number; z: number } | null {
  let sx = 0;
  let sz = 0;
  let n = 0;
  for (let x = b.minX; x <= b.maxX; x += 2)
    for (let z = b.minZ; z <= b.maxZ; z += 2)
      if (inPlace(p, x, 0, z) || inPlace(p, x, SUMMIT.y, z)) {
        sx += x;
        sz += z;
        n++;
      }
  return n ? { x: sx / n, z: sz / n } : null;
}

/** Places the player is standing in right now. */
export const placesAt = (x: number, y: number, z: number, levelId?: string) => PLACES.filter((p) => inPlace(p, x, y, z, levelId));

/** Places that lie inside a level's bounds (ground level and summit height sampled every 2 m), in list order. */
export function placesInBounds(b: LevelDef["bounds"], levelId?: string): PlaceDef[] {
  const found = new Set<string>();
  for (const y of [0, SUMMIT.y])
    for (let x = b.minX; x <= b.maxX; x += 2)
      for (let z = b.minZ; z <= b.maxZ; z += 2) for (const p of placesAt(x, y, z, levelId)) found.add(p.id);
  return PLACES.filter((p) => found.has(p.id));
}

// ---------------------------------------------------------------- wording per language

/** A place's title, hint and text in one language (falls back to the place's own Malay text). */
export function placeText(lang: Lang, p: PlaceDef): { title: string; hint: string; text: string } {
  return {
    title: tx(lang, `kitab.place.${p.id}.title`, p.title),
    hint: tx(lang, `kitab.place.${p.id}.hint`, p.hint),
    text: tx(lang, `kitab.place.${p.id}.text`, p.text),
  };
}

/** The lore of a tangkal in one language (undefined if it has none). */
export const charmLore = (lang: Lang, id: string): string | undefined => (CHARM_LORE[id] === undefined ? undefined : tx(lang, `kitab.charm.${id}`, CHARM_LORE[id]));

/** The after-mission page for a level in one language (undefined if the level has none). */
export function missionLore(lang: Lang, levelId: string): { title: string; text: string; kind?: KitabKind; sumber?: Sumber[] } | undefined {
  const l = MISSION_LORE[levelId];
  return l ? { ...l, title: tx(lang, `kitab.mission.${levelId}.title`, l.title), text: tx(lang, `kitab.mission.${levelId}.text`, l.text) } : undefined;
}
