// Kitab: the journal. Pure data and helpers, no DOM or three.js. Three kinds of page:
// places (unlocked by reaching them; the engine checks the player's position and the save keeps the ids),
// tangkal (unlocked by finding the amulet) and hikayat (unlocked by completing the mission). The last two are
// worked out from the save's amulets and mission records, so only places are stored.
// The world is a fiction set in Malacca in 1511; these pages are written as in-world notes, not as history.

import { CAMP, JUNGLE_Z0, JUNGLE_Z1, POOL, RIVER, SUMMIT } from "./levels";
import type { LevelDef } from "./levels";
import { MASJID_COURT, MASJID_POND } from "./masjid";

export interface PlaceDef {
  id: string;
  title: string;
  text: string;
  /** shown while locked */
  hint: string;
  at: (x: number, y: number, z: number) => boolean;
  /** a place that belongs to one mission only (the maps share coordinates); left out, it is on every mission */
  level?: string;
}

/** Is this place on that mission? (No mission given: only the places every mission shares.) */
export const placeOnLevel = (p: PlaceDef, levelId?: string) => !p.level || p.level === levelId;

const near = (c: { x: number; z: number }, r: number) => (x: number, _y: number, z: number) => Math.hypot(x - c.x, z - c.z) <= r;
const riverZ0 = RIVER.z - RIVER.d / 2 - 1;
const riverZ1 = RIVER.z + RIVER.d / 2 + 1;

export const PLACES: PlaceDef[] = [
  {
    id: "jeti",
    title: "The harbour jetty",
    hint: "Down by the sea",
    text: "Where the town meets the Straits. Sampans tie up here at dusk, and a pendekar who reaches the end of the boards can be gone before the alarm is raised.",
    at: (_x, _y, z) => z < -20,
  },
  {
    id: "pelabuhan",
    title: "Bandar Melaka",
    hint: "The harbour town",
    text: "Atap roofs packed close above the lanes, stalls under the eaves, and now a Portuguese battery at the bridge. Roofs are roads to anyone light enough to run them.",
    at: (_x, _y, z) => z >= -20 && z < riverZ0,
  },
  {
    id: "sungai",
    title: "The river",
    hint: "Between the harbour and the upper kampung",
    text: "Brown water nobody wades. The guarded bridge is the easy way over; the narrow plank on the west bank is the quiet one.",
    at: (_x, _y, z) => z >= riverZ0 && z <= riverZ1,
  },
  {
    id: "kampung-hulu",
    title: "Kampung Hulu",
    hint: "Upriver, past the bridge",
    text: "The upper kampung around the penghulu's hall. Houses stand on stilts, and the dark under the floors is room enough to crawl.",
    at: (_x, _y, z) => z > riverZ1 && z < JUNGLE_Z0,
  },
  {
    id: "hutan",
    title: "The hutan",
    hint: "Beyond the kampung's north fence",
    text: "Old jungle north of the kampung. The trails are few and the ferns are deep; a scout who strays from the path is easy to lose, and easy to find.",
    at: (_x, _y, z) => z >= JUNGLE_Z0 && z < JUNGLE_Z1,
  },
  {
    id: "kem",
    title: "The scouts' camp",
    hint: "A clearing deep in the hutan",
    text: "A Portuguese camp in a clearing, maps of the jungle trails drying by the fire. They mean to come at Malacca from behind.",
    at: near(CAMP, CAMP.r + 4),
  },
  {
    id: "ledang",
    title: "Gunung Ledang",
    hint: "The mountain to the north",
    text: "The mountain of the legend of its puteri, who is said to have set a sultan impossible gifts as her bride price. Its ledges climb in tiers into the mist.",
    at: (_x, _y, z) => z >= JUNGLE_Z1,
  },
  {
    id: "kolam",
    title: "The pool below the falls",
    hint: "At the foot of the mountain, by falling water",
    text: "A deep, cold pool under the falls. The noise of the water covers footsteps, and a held breath covers the rest.",
    at: near(POOL, 9),
  },
  {
    id: "puncak",
    title: "The summit shrine",
    hint: "As high as the mountain goes",
    text: "A small shrine above the clouds where offerings are left. The golden tepak sireh sat on its altar before the soldiers came.",
    at: (x, y, z) => y >= SUMMIT.y - 1 && Math.hypot(x - SUMMIT.x, z - SUMMIT.z) <= 10,
  },
];

// Masjid mission places (this mission only)
PLACES.push(
  {
    id: "masjid",
    level: "masjid",
    title: "The old masjid",
    hint: "Inside the low wall, in the heart of the town",
    text: "A timber masjid under three stacked atap roofs, a verandah at its front and a beduk house in the corner of a quiet yard. The soldiers keep out of the yard, and so does every blade.",
    at: (x, _y, z) => Math.abs(x - MASJID_COURT.x) <= MASJID_COURT.w / 2 && Math.abs(z - MASJID_COURT.z) <= MASJID_COURT.d / 2,
  },
  {
    id: "kolam-masjid",
    level: "masjid",
    title: "The washing pond",
    hint: "By the south gate of the masjid",
    text: "A still pond with a stone ledge, kept for washing before worship. Even at dusk the water is clear.",
    at: near(MASJID_POND, 4.5),
  },
);

/** Lore for each tangkal, by amulet id (names and effects stay in amulets.ts). */
export const CHARM_LORE: Record<string, string> = {
  harimau: "Carved from the claw of a tiger that walked the harbour lanes for years without being seen. Wear it and the floorboards forget you.",
  kancil: "The mousedeer outwits the crocodile and the tiger in every tale. This one is small enough to forget you are wearing it, and so do the guards.",
  besi: "Iron from a broken blade, bound in brass. Smiths say a blade's spirit stays in its iron, and it is happier near other blades.",
  buaya: "A crocodile's tooth on a cord. The buaya waits under the water for as long as it must.",
  merpati: "A grey dove's feather bound in thread, found where the lanes run quiet. Doves nest in old eaves and do not startle at footsteps they know.",
  puteri: "A thread of gold said to be from the puteri's own sash, left on the mountain. Wounds close a little faster near it.",
};

/** After-the-mission pages, by level id. */
export const MISSION_LORE: Record<string, { title: string; text: string }> = {
  harbour: { title: "The Kapitan", text: "With the Kapitan gone the battery sat silent for three nights. Someone, though, had told the Portuguese exactly where to put it." },
  kampung: { title: "The clerk", text: "The clerk was paid in silver for a copy of the battery's plans. Where he kept the copy, he never said." },
  plans: { title: "The plans", text: "The plans came back in a chest from under the penghulu's hall, and nobody in the kampung ever knew they had been gone." },
  jungle: { title: "The scouts", text: "Without their captain the scouts lost the trails they had mapped. The way in from the hutan is closed, for now." },
  ledang: { title: "The tepak sireh", text: "The betel box is back on the summit altar. The mist came down again behind you, as if the mountain had been waiting." },
  wayang: { title: "The shadow play", text: "The dalang keeps the Pendekar's puppet in a box of its own. He says it moves on the kelir before he touches the rods." },
};

MISSION_LORE.masjid = {
  title: "The warkah",
  text: "The letter left the town folded in oilcloth, and not one soldier ever crossed the masjid's wall to ask where it had been kept. The penjaga still sweeps the yard each morning.",
};

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
      if (p.at(x, 0, z) || p.at(x, SUMMIT.y, z)) {
        sx += x;
        sz += z;
        n++;
      }
  return n ? { x: sx / n, z: sz / n } : null;
}

/** Places the player is standing in right now. */
export const placesAt = (x: number, y: number, z: number, levelId?: string) => PLACES.filter((p) => placeOnLevel(p, levelId) && p.at(x, y, z));

/** Places that lie inside a level's bounds (ground level and summit height sampled every 2 m), in list order. */
export function placesInBounds(b: LevelDef["bounds"], levelId?: string): PlaceDef[] {
  const found = new Set<string>();
  for (const y of [0, SUMMIT.y])
    for (let x = b.minX; x <= b.maxX; x += 2)
      for (let z = b.minZ; z <= b.maxZ; z += 2) for (const p of placesAt(x, y, z, levelId)) found.add(p.id);
  return PLACES.filter((p) => found.has(p.id));
}
