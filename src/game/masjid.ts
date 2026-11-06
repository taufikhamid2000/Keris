// The Masjid mission: a quiet, non-lethal errand to the old timber masjid at the heart of a Melaka lane-town.
// Plain data in LevelDef's own shape (no three.js); levels.ts appends MASJID to LEVELS. Types only are imported
// from levels.ts, so the two files never import each other at run time.
//
// The compound is a sanctuary (LevelDef.sanctuary): inside its low wall no blade, stone or pepper is used, no
// takedown is made, and the guards' navigation never enters. The patrols keep to the streets outside, so all
// the tension is in the approach and in the way out. The map shares the harbour's frame (sea shore at z = -31).
import type { GuardDef, HouseDef, LevelDef, Rect } from "./levels";

/** The compound inside its low wall: courtyard, hall, beduk house and pond. */
export const MASJID_COURT: Rect = { x: 0, z: 8, w: 24, d: 24 };
/** The pond for ablutions (wudhu), by the south gate. */
export const MASJID_POND: Rect = { x: -7.5, z: 0.2, w: 6, d: 3.2 };
/** The beduk house (a drum on a raised floor) in the north-east corner of the courtyard. */
export const BEDUK = { x: 9, z: 15.5 };

const WALL = 0.8;
const wall = (x: number, z: number, w: number, d: number) => ({ x, z, w, d, h: 0.9 });

const TIMBER = 0x8b6b42;
const ATAP = 0x7a5a38;

const HOUSES: HouseDef[] = [
  // the masjid: three timber tiers under stacked atap roofs, the lowest raised on posts with a verandah in front
  { x: 0, z: 12, w: 12, d: 12, h: 4.0, wall: TIMBER, roof: ATAP },
  { x: 0, z: 12, w: 8, d: 8, h: 6.6, wall: TIMBER, roof: ATAP, stilts: false },
  { x: 0, z: 12, w: 4.4, d: 4.4, h: 9.0, wall: TIMBER, roof: ATAP, stilts: false, windows: false },
  // the beduk house, small and raised, with room to crawl beneath its floor
  { x: BEDUK.x, z: BEDUK.z, w: 3.4, d: 3.4, h: 5.6, wall: TIMBER, roof: ATAP, windows: false },
  // west column (taller house at z 12.5)
  { x: -29, z: 22, w: 6, d: 7, h: 3.4 },
  { x: -29, z: 12.5, w: 6, d: 7, h: 6.6 },
  { x: -29, z: 3, w: 6, d: 7, h: 3.4 },
  // east column (taller house at z 3)
  { x: 29, z: 22, w: 6, d: 7, h: 3.4 },
  { x: 29, z: 12.5, w: 6, d: 7, h: 3.4 },
  { x: 29, z: 3, w: 6, d: 7, h: 6.6 },
  // north row, 1.5 m behind the north lane
  { x: -17, z: 30, w: 8, d: 6, h: 3.4 },
  { x: -6.5, z: 30, w: 8, d: 6, h: 3.4 },
  { x: 4, z: 30, w: 8, d: 6, h: 3.4 },
  { x: 14.5, z: 30, w: 8, d: 6, h: 6.6 },
  { x: 25, z: 30, w: 8, d: 6, h: 3.4 },
  // south row, either side of the main street down to the jetty
  { x: -26.5, z: -17, w: 8, d: 6, h: 3.4 },
  { x: -16, z: -17, w: 8, d: 6, h: 6.6 },
  { x: -5.5, z: -17, w: 8, d: 6, h: 3.4 },
  { x: 5.5, z: -17, w: 8, d: 6, h: 3.4 },
  { x: 16, z: -17, w: 8, d: 6, h: 6.6 },
  { x: 26.5, z: -17, w: 8, d: 6, h: 3.4 },
];

/** Patrols of the lanes outside the wall. None comes within 6 m of the compound. */
const GUARDS: GuardDef[] = [
  // the north lane, behind the compound
  { waypoints: [{ x: -24, z: 23.7 }, { x: 24, z: 23.7 }] },
  // the west lane and the east lane, along the compound's sides (the east gate looks onto this one)
  { waypoints: [{ x: -19.2, z: 17 }, { x: -19.2, z: -9.2 }] },
  { waypoints: [{ x: 19.2, z: 17 }, { x: 19.2, z: -9.2 }] },
  // the south lane, in front of the south gate
  { waypoints: [{ x: -27, z: -9.2 }, { x: 27, z: -9.2 }] },
  // the main street to the shore, and the watch on the shore plaza
  { waypoints: [{ x: 0, z: -11 }, { x: 0, z: -21 }] },
  { waypoints: [{ x: -15, z: -26 }, { x: 15, z: -26 }] },
  // the corridor by the start
  { waypoints: [{ x: -24, z: 28 }, { x: -24, z: 33.5 }] },
];

/**
 * Masjid: a messenger's errand. The penjaga has left a sealed warkah beneath the beduk house for the envoy's boatman at the
 * jetty. The town is searched and watched; the compound is the one place nobody will follow. Unseen only.
 */
export const MASJID: LevelDef = {
  id: "masjid",
  name: "Masjid: The Warkah",
  missionId: "masjid-warkah",
  seed: 4107,
  shoreZ: -31,
  houses: HOUSES,
  finials: [{ x: 0, y: 9.8, z: 12 }],
  steps: [
    // the verandah (serambi) and its stair, the ledge by the pond
    { x: 0, z: 5, w: 12, d: 2, h: 0.9 },
    { x: 0, z: 3.2, w: 5, d: 1.6, h: 0.45 },
    { x: -7.5, z: 2.9, w: 6, d: 0.8, h: 0.4 },
    // the low boundary wall, open at a south gate and an east gate
    wall(-7.2, -4, 10.4, WALL),
    wall(7.2, -4, 10.4, WALL),
    wall(0, 20, 24.8, WALL),
    wall(-12, 8, WALL, 23.2),
    wall(12, 4.2, WALL, 15.6),
    wall(12, 17.8, WALL, 3.6),
  ],
  towers: [],
  palisade: { minX: -35, maxX: 35, minZ: -31, maxZ: 36 },
  jetty: { x: 0, z: -34, w: 3, d: 8 },
  water: [MASJID_POND],
  decks: [],
  boats: [],
  stalls: [
    { x: -23, z: 9, w: 1.6, d: 2.6 },
    { x: 22, z: 4, w: 1.6, d: 2.6 },
    { x: -22, z: -23, w: 2.6, d: 1.6 },
    { x: 22, z: -22, w: 2.6, d: 1.6 },
  ],
  wells: [],
  cannons: [],
  hay: [{ x: -21, z: 6 }, { x: 21, z: -3 }, { x: -6.5, z: -6.6 }, { x: -10.5, z: -26 }, { x: 11, z: -24.5 }],
  // the first covers the start; two more are inside the courtyard
  bushes: [
    { x: -31.2, z: 31.2 }, { x: 30.5, z: 24.5 }, { x: -30, z: -6 }, { x: 31, z: -10 }, { x: -29, z: -27 }, { x: 29, z: -27 },
    { x: 4.5, z: -29.4 }, { x: -9.5, z: 17.4 }, { x: 9, z: 2.2 },
  ],
  palms: [
    { x: -33.2, z: -8 }, { x: 33.2, z: -6 }, { x: 33.2, z: 16 }, { x: -31, z: 34 }, { x: 31, z: 34 },
    { x: -9.5, z: 8.5 }, { x: 9.5, z: 6.5 }, { x: 9.8, z: -1.5 },
    { x: -26, z: -29.5 }, { x: -13, z: -29.8 }, { x: 13, z: -29.5 }, { x: 27, z: -29.5 },
  ],
  prahus: [
    { x: -11, z: -36, rotY: 0.3 },
    { x: 10, z: -39, rotY: -0.2, scale: 1.1 },
    { x: -22, z: -44, rotY: 1.2, scale: 0.9 },
    { x: 22, z: -34, rotY: 1.5 },
  ],
  ships: [],
  lamps: [
    { x: -3, z: -2.8 }, { x: 3, z: -2.8 }, { x: -9.5, z: 14 }, { x: 14.5, z: 14 }, { x: -19.2, z: 12 }, { x: 19.2, z: 2 },
    { x: -10, z: 24 }, { x: 10, z: 24 }, { x: -5, z: -8 }, { x: 6, z: -10 }, { x: 0, z: -24 }, { x: -24, z: 26 },
  ],
  guards: GUARDS,
  objective: { kind: "steal", at: { x: BEDUK.x, y: 0, z: BEDUK.z } },
  undetected: true,
  sanctuary: MASJID_COURT,
  start: { x: -31.5, z: 31.5 },
  exit: { x: 0, z: -36 },
  bounds: { minX: -33.6, maxX: 33.6, minZ: -37.4, maxZ: 34.6, jettyZ: -31, jettyHalf: 1.1 },
  story:
    "The Portuguese are searching every messenger who comes into the town. An old penjaga at the masjid has kept a sealed warkah " +
    "for the Sultan's envoy, and he has left it wrapped in cloth beneath the floor of the beduk house, where the drum is kept. " +
    "Cross the town at dusk, past the patrols in the lanes, and take it up. The soldiers will not set foot in the compound, and " +
    "neither will any blade of yours: this ground is for peace. Then leave as quietly as you came, and give the warkah to the " +
    "envoy's boatman at the jetty. If a single guard raises the alarm, the letter is lost.",
  checkpointLabel: "the warkah is in hand",
  win: {
    title: "The warkah is delivered",
    body: "The boatman pushed off with the letter wrapped in oilcloth, and the town never learned that anything had passed through the masjid's yard.",
  },
  text: {
    objective: "Find the warkah beneath the beduk house, inside the masjid's wall",
    escape: "Carry the warkah to the jetty unseen",
    targetDown: "You have the warkah. Leave the grounds quietly and reach the jetty unseen.",
    take: "Take up the sealed warkah",
  },
};
