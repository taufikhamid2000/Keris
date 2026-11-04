// Level definitions: plain data, no three.js. buildLevel() in level.ts turns one into meshes and
// colliders, so a new mission is a new definition built from the same kit of parts.
import type { Vec2 } from "./logic";

export interface HouseDef {
  x: number;
  z: number;
  w: number;
  d: number;
  /** top of the roof */
  h: number;
  /** colours; picked from the kampung palette when left out */
  wall?: number;
  roof?: number;
  windows?: boolean;
  /** raised on stilts with open ground underneath (default) */
  stilts?: boolean;
}

/** Axis-aligned footprint on the ground: centre plus width (x) and depth (z). */
export interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface GuardDef {
  waypoints: Vec2[];
  isTarget?: boolean;
}

/**
 * What the mission asks for before the escape to the jetty. Any level can use any kind:
 * - kill: take down the guard marked isTarget
 * - steal: walk up to an item and take it (E)
 */
export type ObjectiveDef = { kind: "kill" } | { kind: "steal"; at: { x: number; y: number; z: number } };

export interface LevelDef {
  id: string;
  /** shown on the mission list */
  name: string;
  /** key for best time / rating in the save */
  missionId: string;
  /** plays the opening cutscene before the first attempt (its camera shots are framed for this map) */
  intro?: boolean;
  /** seeds every random choice (colours, lit windows, post heights), so a level always looks the same */
  seed: number;
  /** z of the shoreline: land lies at +z, the sea at -z */
  shoreZ: number;
  houses: HouseDef[];
  /** gold finials on top of palace roofs */
  finials: { x: number; y: number; z: number }[];
  /** low stone steps, climbable */
  steps: (Rect & { h: number })[];
  /** watch towers with a lookout platform */
  towers: Vec2[];
  /** palisade along the north, east and west edges; the south is open to the sea */
  palisade: { minX: number; maxX: number; minZ: number; maxZ: number };
  jetty: Rect;
  /** rivers and ponds: nobody walks here except on a deck */
  water: Rect[];
  /** walkable timber over water: bridges (with side rails) and jetties */
  decks: (Rect & { rails?: boolean })[];
  /** sampans moored on the water, free to take (E) */
  boats: { x: number; z: number; rotY: number }[];
  /** horses standing free to ride (E) */
  horses?: { x: number; z: number; rotY: number }[];
  /** market stalls */
  stalls: Rect[];
  wells: Vec2[];
  cannons: Vec2[];
  /** hiding spots: haystacks and bushes */
  hay: Vec2[];
  bushes: Vec2[];
  palms: Vec2[];
  prahus: { x: number; z: number; rotY: number; scale?: number }[];
  /** large foreign ships riding at anchor */
  ships: { x: number; z: number; rotY: number }[];
  lamps: Vec2[];
  guards: GuardDef[];
  objective: ObjectiveDef;
  /** the mission fails the moment any guard raises the alarm */
  undetected?: boolean;
  start: Vec2;
  exit: Vec2;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number; jettyZ: number; jettyHalf: number };
  /** mission wording on the title screen and the win screen */
  story: string;
  /** shown on the title when the objective-done checkpoint is saved, e.g. "the Kapitan is down" */
  checkpointLabel: string;
  win: { title: string; body: string };
  /** mission wording shown in the HUD */
  text: {
    objective: string;
    escape: string;
    /** toast when the objective is done */
    targetDown: string;
    /** kill: the target raised the alarm */
    targetSpotted?: string;
    /** kill: takedown prompts on the target */
    strike?: string;
    leap?: string;
    /** steal: prompt next to the item */
    take?: string;
  };
}

const PALACE_ROOF = 0x9a3b2a;
const PENGHULU_WALL = 0x5a3a24;
const PENGHULU_ROOF = 0x7a4a32;

/** The scenery of one district: everything a LevelDef places except the missions' guards, start, exit and wording. */
type Area = Pick<
  LevelDef,
  "houses" | "finials" | "steps" | "towers" | "stalls" | "wells" | "cannons" | "hay" | "bushes" | "palms" | "prahus" | "ships" | "lamps"
>;

/** The harbour below the bridge battery: the sea shore at z = -31, open to the north. */
const HARBOUR_AREA: Area = {
  houses: [
    // SW (start side)
    { x: -22, z: -22, w: 12, d: 5.6, h: 3.4 },
    { x: -22, z: -17.6, w: 12, d: 5.6, h: 3.4 },
    { x: -22, z: -26.2, w: 12, d: 3.2, h: 6.6 },
    // S middle
    { x: 0, z: -22, w: 12, d: 12, h: 3.4 },
    // SE
    { x: 22, z: -22, w: 12, d: 12, h: 3.4 },
    // W middle: low + tall
    { x: -22, z: -3, w: 12, d: 6, h: 3.4 },
    { x: -22, z: 3, w: 12, d: 6, h: 6.6 },
    // E middle
    { x: 22, z: -3, w: 12, d: 6, h: 3.4 },
    { x: 22, z: 3, w: 12, d: 6, h: 6.6 },
    // NW
    { x: -22, z: 22, w: 12, d: 12, h: 3.4 },
    // NE: house plus watch tower
    { x: 22, z: 22, w: 12, d: 12, h: 3.4 },
    // Istana (sultanate palace), three tiers, north middle
    { x: 0, z: 22, w: 13, d: 12, h: 3.4, wall: 0x8a6a3a, roof: PALACE_ROOF },
    { x: 0, z: 22, w: 9, d: 8, h: 6.6, wall: 0x93703f, roof: PALACE_ROOF, stilts: false },
    { x: 0, z: 22, w: 5, d: 4.4, h: 9.6, wall: 0x9d7a45, roof: PALACE_ROOF, windows: false, stilts: false },
  ],
  finials: [{ x: 0, y: 10.4, z: 22 }],
  steps: [{ x: 0, z: 15.2, w: 5, d: 1.4, h: 0.9 }],
  towers: [{ x: 17.3, z: 17.3 }],
  stalls: [
    { x: -11, z: -19, w: 2.6, d: 1.6 },
    { x: 11, z: -8, w: 1.6, d: 2.6 },
    { x: -11, z: 10, w: 2.6, d: 1.6 },
    { x: 11, z: 18, w: 1.6, d: 2.6 },
    { x: -3, z: -11, w: 2.6, d: 1.6 },
    { x: 4, z: 11, w: 2.6, d: 1.6 },
    { x: -20, z: -11, w: 2.6, d: 1.6 },
    { x: 20, z: 11, w: 2.6, d: 1.6 },
    { x: -20, z: 11, w: 2.6, d: 1.6 },
    { x: 11, z: -24, w: 1.6, d: 2.6 },
  ],
  wells: [{ x: 0, z: 0 }],
  cannons: [{ x: -3.2, z: 2.6 }],
  hay: [{ x: -11, z: -3 }, { x: 11, z: 5 }, { x: 3, z: -13 }, { x: -14, z: 18 }, { x: 13, z: -18 }, { x: -8, z: 12 }],
  bushes: [{ x: -31, z: -5 }, { x: 31, z: 8 }, { x: 0, z: -29.2 }, { x: -5, z: 31 }, { x: 31, z: -14 }, { x: -31, z: 14 }],
  palms: [
    { x: -31, z: -12 }, { x: -31, z: 6 }, { x: -31, z: 24 }, { x: 31, z: -22 }, { x: 31, z: 2 }, { x: 31, z: 22 }, { x: -26, z: -29.5 },
    { x: 13, z: -29.5 }, { x: -13, z: -29.8 }, { x: 28.5, z: -29.5 }, { x: -5, z: 31.5 }, { x: 27, z: 31 }, { x: -27, z: 31 },
  ],
  prahus: [
    { x: -11, z: -36, rotY: 0.3 },
    { x: 10, z: -39, rotY: -0.2, scale: 1.1 },
    { x: -22, z: -44, rotY: 1.2, scale: 0.9 },
    { x: 22, z: -34, rotY: 1.5 },
  ],
  ships: [{ x: -26, z: -85, rotY: 0.5 }],
  lamps: [
    { x: -5, z: 5 }, { x: 5, z: -5 }, { x: -11, z: -12 }, { x: 11, z: 12 }, { x: 0, z: -29 },
    { x: -28, z: 28 }, { x: -8, z: 16 }, { x: 8, z: 16 }, { x: -8, z: -15 }, { x: 8, z: -15 }, { x: -15, z: -8.5 }, { x: 15, z: 8.5 },
    { x: -14, z: 0 }, { x: 14, z: 0 }, { x: -10, z: 30 }, { x: 10, z: 30 }, { x: 4, z: -31 },
  ],
};

/**
 * Kampung Hulu, the upper kampung, in its own coordinates (its south edge at z = -31, like the harbour's).
 * KAMPUNG_DZ moves it north of the river.
 */
const KAMPUNG_AREA: Area = {
  houses: [
    // NE block: two rows, 2.5 m gaps to jump, a tall corner house to climb
    { x: 10, z: 26, w: 8, d: 7, h: 3.4 },
    { x: 20.5, z: 26, w: 8, d: 7, h: 3.4 },
    { x: 10, z: 15.5, w: 8, d: 7, h: 3.4 },
    { x: 20.5, z: 15.5, w: 8, d: 7, h: 6.6 },
    // NW block
    { x: -10, z: 26, w: 8, d: 7, h: 3.4 },
    { x: -20.5, z: 26, w: 8, d: 7, h: 6.6 },
    { x: -10, z: 15.5, w: 8, d: 7, h: 3.4 },
    { x: -20.5, z: 15.5, w: 8, d: 7, h: 3.4 },
    // SE block
    { x: 10, z: -12, w: 8, d: 7, h: 3.4 },
    { x: 20.5, z: -12, w: 8, d: 7, h: 3.4 },
    { x: 10, z: -22.5, w: 8, d: 7, h: 3.4 },
    { x: 20.5, z: -22.5, w: 8, d: 7, h: 6.6 },
    // SW: the penghulu's house, a raised hall with a solid upper tier, and two small houses by the lane
    { x: -18, z: -14, w: 12, d: 10, h: 3.4, wall: PENGHULU_WALL, roof: PENGHULU_ROOF },
    { x: -18, z: -14, w: 7, d: 6, h: 6.6, wall: PENGHULU_WALL, roof: PENGHULU_ROOF, stilts: false },
    { x: -5.5, z: -20, w: 4.5, d: 6, h: 3.4 },
    { x: -5.5, z: -11.5, w: 4.5, d: 6, h: 3.4 },
  ],
  finials: [],
  steps: [],
  towers: [{ x: -28, z: 8 }, { x: 28, z: -3 }],
  stalls: [
    { x: 8, z: 3.5, w: 2.6, d: 1.6 },
    { x: -10, z: 3.5, w: 2.6, d: 1.6 },
    { x: 18, z: 3.5, w: 2.6, d: 1.6 },
    { x: -20, z: 3.5, w: 2.6, d: 1.6 },
    { x: -2, z: -14, w: 1.6, d: 2.6 },
    { x: 2.5, z: 13, w: 1.6, d: 2.6 },
  ],
  wells: [{ x: -4, z: 3 }],
  cannons: [],
  hay: [{ x: -4, z: -2 }, { x: 8, z: -3 }, { x: -14, z: 2 }, { x: 16, z: 10 }, { x: 3, z: 18 }, { x: -26, z: -26 }],
  // the first bush covers the start at the north-east gate: guards in the back alley can see under the stilt houses
  bushes: [{ x: 31.2, z: 31.2 }, { x: -31, z: -5 }, { x: 31, z: 12 }, { x: -31, z: 22 }, { x: -16, z: -27 }, { x: 20, z: -29 }, { x: 31, z: -18 }],
  palms: [
    { x: -31, z: -12 }, { x: -31, z: 4 }, { x: 31, z: -10 }, { x: 31, z: 2 }, { x: -26, z: -29.5 }, { x: 26, z: -29.5 },
    { x: -8, z: -29.6 }, { x: 8, z: -29.6 }, { x: -14, z: 31.5 }, { x: 14, z: 31.5 }, { x: 4, z: 31.5 },
  ],
  // moored on the river, along the current
  prahus: [
    { x: -14, z: -36, rotY: 1.45, scale: 0.8 },
    { x: 22, z: -35.5, rotY: 1.7, scale: 0.85 },
  ],
  ships: [],
  lamps: [
    { x: 3, z: 8 }, { x: -3, z: -6 }, { x: 3, z: -18 }, { x: -3, z: 20 }, { x: 12, z: 6 }, { x: -12, z: 6 }, { x: 24, z: 6 },
    { x: -24, z: 4 }, { x: 15, z: 20.75 }, { x: -15, z: 20.75 }, { x: -8, z: -25 }, { x: 15, z: -17.25 }, { x: 4, z: -31 }, { x: -28, z: -14 },
  ],
};

/** Kampung Hulu sits this far north of its own coordinates, across the river. */
export const KAMPUNG_DZ = 77;
const north = <T extends { z: number }>(list: T[]): T[] => list.map((o) => ({ ...o, z: o.z + KAMPUNG_DZ }));
const northArea = (a: Area): Area => ({
  houses: north(a.houses),
  finials: north(a.finials),
  steps: north(a.steps),
  towers: north(a.towers),
  stalls: north(a.stalls),
  wells: north(a.wells),
  cannons: north(a.cannons),
  hay: north(a.hay),
  bushes: north(a.bushes),
  palms: north(a.palms),
  prahus: north(a.prahus),
  ships: north(a.ships),
  lamps: north(a.lamps),
});
const KAMPUNG_N = northArea(KAMPUNG_AREA);
const RIVER = { x: 0, z: 41.5, w: 80, d: 9 };

/**
 * Malacca, 1511, as one map: the harbour on the sea, the river north of it, Kampung Hulu beyond. A guarded bridge
 * and a narrow plank on the west side cross the river; the upper kampung has its own jetty on the river bank.
 * Every mission plays on this map and only sets its own guards, start, exit and wording.
 */
const WORLD: Area & Pick<LevelDef, "seed" | "shoreZ" | "palisade" | "jetty" | "water" | "decks" | "boats" | "horses" | "bounds"> = {
  seed: 1511,
  shoreZ: -31,
  houses: [...HARBOUR_AREA.houses, ...KAMPUNG_N.houses],
  finials: [...HARBOUR_AREA.finials, ...KAMPUNG_N.finials],
  steps: [...HARBOUR_AREA.steps, ...KAMPUNG_N.steps],
  towers: [...HARBOUR_AREA.towers, ...KAMPUNG_N.towers],
  stalls: [...HARBOUR_AREA.stalls, ...KAMPUNG_N.stalls],
  wells: [...HARBOUR_AREA.wells, ...KAMPUNG_N.wells],
  cannons: [...HARBOUR_AREA.cannons, ...KAMPUNG_N.cannons],
  hay: [...HARBOUR_AREA.hay, ...KAMPUNG_N.hay],
  // the river banks get a little cover, for the plank crossing in particular
  bushes: [...HARBOUR_AREA.bushes, ...KAMPUNG_N.bushes, { x: -26.5, z: 34.8 }, { x: -27, z: 48.6 }, { x: 24, z: 34.8 }],
  palms: [...HARBOUR_AREA.palms, ...KAMPUNG_N.palms, { x: 4, z: 35 }, { x: -18, z: 35.2 }, { x: 30, z: 48 }],
  prahus: [...HARBOUR_AREA.prahus, ...KAMPUNG_N.prahus],
  ships: [...HARBOUR_AREA.ships, ...KAMPUNG_N.ships],
  // bridge lanterns at both ends
  lamps: [...HARBOUR_AREA.lamps, ...KAMPUNG_N.lamps, { x: 14.2, z: 35 }, { x: 9.8, z: 48 }],
  palisade: { minX: -35, maxX: 35, minZ: -31, maxZ: 35 + KAMPUNG_DZ },
  jetty: { x: 0, z: -34, w: 3, d: 8 },
  water: [RIVER],
  decks: [
    // the bridge, kept by a sentry
    { x: 12, z: RIVER.z, w: 3, d: RIVER.d + 3, rails: true },
    // a single plank on the west side: narrow, dark and unguarded
    { x: -30, z: RIVER.z, w: 1.6, d: RIVER.d + 3 },
    // the upper kampung's jetty, out from its south bank
    { x: 0, z: -34 + KAMPUNG_DZ, w: 3, d: 8 },
  ],
  boats: [
    // by the harbour bank, a short walk from the Bridge Battery start
    { x: -21, z: 38.6, rotY: Math.PI / 2 },
    // alongside the kampung's river jetty
    { x: 3.4, z: 43, rotY: 0 },
    // the east end, under the kampung's south-east houses
    { x: 26, z: 44.4, rotY: Math.PI / 2 },
  ],
  horses: [
    // by the Bridge Battery start, in the harbour's north-west corner
    { x: -28.5, z: 28.5, rotY: Math.PI / 4 },
    // on the north bank, west of the bridge
    { x: -6, z: 50, rotY: Math.PI / 2 },
    // by the Kampung Hulu start, at the north-east gate
    { x: 28.5, z: 28.5 + KAMPUNG_DZ, rotY: -Math.PI / 2 },
  ],
  bounds: { minX: -33.6, maxX: 33.6, minZ: -37.4, maxZ: 33.6 + KAMPUNG_DZ, jettyZ: -31, jettyHalf: 1.1 },
};

/** Patrols of the harbour, on every mission. */
const HARBOUR_GUARDS: GuardDef[] = [
  { waypoints: [{ x: -7.8, z: -24 }, { x: -7.8, z: 24 }] },
  { waypoints: [{ x: 8, z: -24 }, { x: 8, z: 24 }] },
  { waypoints: [{ x: -24, z: -8.5 }, { x: 24, z: -8.5 }] },
  { waypoints: [{ x: 24, z: 8.5 }, { x: -24, z: 8.5 }] },
  { waypoints: [{ x: -4.5, z: -4.5 }, { x: 4.5, z: -4.5 }, { x: 4.5, z: 4.5 }, { x: -4.5, z: 4.5 }] },
];
/** The bridge sentry, pacing the north end, and a watch along the harbour's river bank. */
const RIVER_GUARDS: GuardDef[] = [
  { waypoints: [{ x: 9.5, z: 49.5 }, { x: 14.5, z: 49.5 }] },
  { waypoints: [{ x: -14, z: 33.5 }, { x: 22, z: 33.5 }] },
];
/** Patrols of Kampung Hulu (in its own coordinates), the clerk's post last. */
const KAMPUNG_GUARDS_LOCAL: GuardDef[] = [
  // main lane north to south
  { waypoints: [{ x: 0, z: 26 }, { x: 0, z: -24 }] },
  // market lane west to east
  { waypoints: [{ x: -24, z: 8 }, { x: 26, z: 8 }] },
  // back alley of the NE block
  { waypoints: [{ x: 6, z: 20.75 }, { x: 21, z: 20.75 }] },
  // round the SE block
  { waypoints: [{ x: 4.5, z: -6 }, { x: 30, z: -6 }, { x: 30, z: -28 }, { x: 4.5, z: -28 }] },
  // round the penghulu's compound
  { waypoints: [{ x: -27, z: -22.5 }, { x: -10, z: -22.5 }, { x: -10, z: -5.5 }, { x: -27, z: -5.5 }] },
];
const KAMPUNG_GUARDS = KAMPUNG_GUARDS_LOCAL.map((g) => ({ ...g, waypoints: north(g.waypoints) }));
/** the clerk, pacing in front of the raised hall (its roof edge is 1.5 m away) */
const CLERK_POST: Vec2[] = north([{ x: -22, z: -7.5 }, { x: -14, z: -7.5 }]);

/** Malacca, 1511: the Kapitan of the bridge battery, in the harbour. */
export const HARBOUR: LevelDef = {
  ...WORLD,
  id: "harbour",
  name: "The Bridge Battery",
  missionId: "malacca-1511",
  intro: true,
  guards: [
    ...HARBOUR_GUARDS,
    { waypoints: [{ x: -2.4, z: 5.8 }, { x: 2.4, z: 5.8 }], isTarget: true },
    ...RIVER_GUARDS,
    ...KAMPUNG_GUARDS,
  ],
  objective: { kind: "kill" },
  start: { x: -31.5, z: 31.5 },
  exit: { x: 0, z: -36 },
  story:
    "The Portuguese fleet lies in the roads and their battery commands the bridge. The elder Hang Tuah has chosen you, Pendekar, to " +
    "silence the Kapitan before the guns are turned on the town. Move over the atap roofs and through the kampung lanes, strike once with " +
    "your keris, and slip out by the jetty.",
  checkpointLabel: "the Kapitan is down",
  win: {
    title: "The Kapitan is silenced",
    body: "You reached the jetty and vanished into the harbour. The battery will wait for a new commander.",
  },
  text: {
    objective: "Find and silence the Kapitan of the bridge battery",
    escape: "Slip away to the jetty",
    targetDown: "The Kapitan is down. Reach the jetty.",
    targetSpotted: "The Kapitan has seen you!",
    strike: "Strike the Kapitan with the keris",
    leap: "Leap down on the Kapitan",
  },
};

/** The river jetty of the upper kampung, where its missions end. */
const RIVER_EXIT: Vec2 = { x: 0, z: -36 + KAMPUNG_DZ };

/**
 * Kampung Hulu: the upper kampung, packed tight. The turncoat clerk who sold the battery plans
 * paces in front of the penghulu's house; its raised floor puts a roof edge right above him.
 * Rows of houses with narrow gaps make a rooftop route from the north-east gate down to the river jetty.
 */
export const KAMPUNG: LevelDef = {
  ...WORLD,
  id: "kampung",
  name: "Kampung Hulu",
  missionId: "kampung-hulu",
  guards: [...KAMPUNG_GUARDS, { waypoints: CLERK_POST, isTarget: true }, ...RIVER_GUARDS, ...HARBOUR_GUARDS],
  objective: { kind: "kill" },
  start: { x: 31.5, z: 31.5 + KAMPUNG_DZ },
  exit: RIVER_EXIT,
  story:
    "Someone sold the battery's plans to the Portuguese, and the trail leads to a harbour clerk hiding in the upper kampung. " +
    "He paces in front of the penghulu's hall, guarded and nervous. Cross the rooftops from the north-east gate, deal with him before " +
    "he can sell anything more, and leave by the river jetty.",
  checkpointLabel: "the clerk is silenced",
  win: {
    title: "The clerk is silenced",
    body: "You slipped out by the river jetty before the kampung woke. Whatever he knew stays in the upper kampung.",
  },
  text: {
    objective: "Find the turncoat clerk who sold the battery plans",
    escape: "Slip away to the river jetty",
    targetDown: "The clerk is silenced. Reach the river jetty.",
    targetSpotted: "The clerk has seen you!",
    strike: "Strike the clerk with the keris",
    leap: "Leap down on the clerk",
  },
};

/** The same kampung after the clerk's death: the plans he hid are still under the penghulu's hall. */
export const PLANS: LevelDef = {
  ...KAMPUNG,
  id: "plans",
  name: "The Battery Plans",
  missionId: "kampung-plans",
  // the clerk's post is kept by an ordinary guard now
  guards: KAMPUNG.guards.map((g) => ({ waypoints: g.waypoints })),
  // a chest in the crawl space under the hall's back corner, clear of the solid upper tier
  objective: { kind: "steal", at: { x: -23, y: 0, z: -18 + KAMPUNG_DZ } },
  undetected: true,
  story:
    "The clerk is dead, but the battery plans he sold were never found. Word is he hid them in a chest under the penghulu's hall " +
    "before the end. Crawl in beneath the floor, take them back, and leave by the river jetty. No one may know you were here: " +
    "if a single guard raises the alarm, the mission fails.",
  checkpointLabel: "the plans are taken",
  win: {
    title: "The plans are recovered",
    body: "The chest under the hall is empty and no one saw who emptied it. The battery's secrets are safe again.",
  },
  text: {
    objective: "Find the chest hidden under the penghulu's hall",
    escape: "Carry the plans to the river jetty unseen",
    targetDown: "You have the plans. Reach the river jetty unseen.",
    take: "Take the battery plans",
  },
};

/** Every mission, in play order. */
export const LEVELS: LevelDef[] = [HARBOUR, KAMPUNG, PLANS];

/** The level named by ?level=<id> in a query string, else the first mission. */
export function levelFromSearch(search: string): LevelDef {
  const id = new URLSearchParams(search).get("level");
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}

/** The mission selected when the title opens: ?level=<id>, else the one with a saved attempt, else the first. */
export function initialLevel(search: string, checkpointMission: string | null): LevelDef {
  if (new URLSearchParams(search).has("level")) return levelFromSearch(search);
  return LEVELS.find((l) => l.missionId === checkpointMission) ?? LEVELS[0];
}
