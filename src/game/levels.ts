// Level definitions: plain data, no three.js. buildLevel() in level.ts turns one into meshes and
// colliders, so a new mission is a new definition built from the same kit of parts.
import type { Vec2 } from "./logic";
import { mt } from "./strings/missions";
import { DICTS, t, type Lang } from "./i18n";
import type { WayangDef } from "./wayang";
import { TIDE_HOUSES } from "./tide";
import { PENJARA } from "./levels/penjara";
import { GUA_LANUN } from "./guaLanun";
import { KOTA } from "./kota";

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

/** A scattered plant or rock: position, scale and turn; y lifts it onto a ledge (default: the ground). */
export interface Placed {
  x: number;
  y?: number;
  z: number;
  s: number;
  r: number;
}

/** Axis-aligned footprint on the ground: centre plus width (x) and depth (z). */
export interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface GuardDef {
  /** y: the ledge a waypoint stands on (default: the ground) */
  waypoints: (Vec2 & { y?: number })[];
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
  /** inner palisades across the map (west to east at z), solid except at the gates */
  fences?: { z: number; minX: number; maxX: number; gates: { x: number; w: number }[] }[];
  /** jungle trees (solid trunks that block sight) and ferns (scenery only); s scales, r turns */
  trees?: Placed[];
  ferns?: Placed[];
  /** dirt trails (polylines) and bare clearings, painted on the ground */
  trails?: Vec2[][];
  clearings?: { x: number; z: number; r: number }[];
  /** darker forest floor */
  forestFloor?: Rect[];
  /** rock terraces, solid from the ground to h and climbable (keep each rise at most 3.7 m) */
  cliffs?: (Rect & { h: number })[];
  /** boulders, scenery only; kind picks the model */
  rocks?: (Placed & { kind: number })[];
  /** a waterfall: sheets down the cliff faces and streams across the ledges between them */
  falls?: { sheets: { x: number; z: number; w: number; y0: number; y1: number }[]; streams: (Rect & { y: number })[] };
  /** a hilltop shrine (pavilion and altar) standing on a ledge at y */
  shrine?: { x: number; z: number; y: number };
  /** mountain mist: the fog thickens north of this z */
  mistZ?: number;
  /** underground or night mood, 0..1: darker, closer fog and dimmer sun (engine.ts) */
  gloom?: number;
  /** colour of the forestFloor rects (default: jungle green) */
  floorColor?: number;
  /** played as wayang kulit: ink silhouettes on a lit screen, and guards see the player's shadow near these lamps (wayang.ts) */
  wayang?: WayangDef;
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
  /** a place of worship: no weapon, stone, pepper or takedown is used inside it, and guards never enter (nav keep-out) */
  sanctuary?: Rect;
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
export const RIVER = { x: 0, z: 41.5, w: 80, d: 9 };

// ---------------------------------------------------------------------------------------------------------------
// Hutan: the jungle beyond Kampung Hulu's north fence (z = 112) up to the map's north edge.
export const JUNGLE_Z0 = 35 + KAMPUNG_DZ;
export const JUNGLE_Z1 = 166;
/** the Portuguese scouts' camp, in a clearing */
export const CAMP = { x: 2, z: 143, r: 10 };
/** gates in the kampung's north fence: the main lane, and the north-east gate by the Kampung Hulu start */
const JUNGLE_GATES = [
  { x: 0, w: 4 },
  { x: 31, w: 4 },
];
const JUNGLE_TRAILS: Vec2[][] = [
  // main gate up to the camp
  [{ x: 0, z: JUNGLE_Z0 - 1 }, { x: -4, z: 120 }, { x: 1, z: 128 }, { x: CAMP.x, z: CAMP.z - CAMP.r + 1 }],
  // north-east gate, winding west to the camp
  [{ x: 31, z: JUNGLE_Z0 - 1 }, { x: 26, z: 122 }, { x: 17, z: 132 }, { x: CAMP.x + 8, z: CAMP.z - 4 }],
  // the old trail west out of the camp
  [{ x: CAMP.x - 8, z: CAMP.z + 4 }, { x: -14, z: 152 }, { x: -25, z: 157 }, { x: -31, z: 162 }],
  // on from the old trail to the foot of Gunung Ledang and its first stairs
  [{ x: -25, z: 157 }, { x: -25, z: 167 }, { x: -16, z: 175 }, { x: -4, z: 176.5 }],
  // north out of the camp to the pool below the falls
  [{ x: CAMP.x + 4, z: CAMP.z + 9 }, { x: 6, z: 163 }, { x: 8, z: 173.5 }],
];
function segDist(p: Vec2, a: Vec2, b: Vec2) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t));
}
const trailDist = (p: Vec2) => Math.min(...JUNGLE_TRAILS.flatMap((t) => t.slice(1).map((b, i) => segDist(p, t[i], b))));
/** Jittered grid over the jungle, clear of the trails, the camp, the fence and the map edge. Seeded: always the same. */
function scatter(spacing: number, trailClear: number, campClear: number, seed: number, scale: [number, number]): Placed[] {
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296), s / 4294967296);
  const out: Placed[] = [];
  for (let z = JUNGLE_Z0 + 3; z < JUNGLE_Z1 - 2; z += spacing)
    for (let x = -32.5; x < 32.5; x += spacing) {
      const p = { x: x + (rnd() - 0.5) * spacing * 0.8, z: z + (rnd() - 0.5) * spacing * 0.8 };
      const sc = scale[0] + rnd() * (scale[1] - scale[0]);
      const r = rnd() * Math.PI * 2;
      if (Math.abs(p.x) > 32.6 || p.z < JUNGLE_Z0 + 2.5 || p.z > JUNGLE_Z1 - 2) continue;
      if (trailDist(p) < trailClear || Math.hypot(p.x - CAMP.x, p.z - CAMP.z) < CAMP.r + campClear) continue;
      out.push({ ...p, s: sc, r });
    }
  return out;
}
const JUNGLE = {
  trees: scatter(6, 3.4, 4.5, 7, [0.8, 1.25]),
  ferns: scatter(2.8, 1.3, 0, 11, [0.8, 1.5]),
  // undergrowth thick enough to hide in, beside the trails
  bushes: [
    { x: 3, z: 118 }, { x: -6.5, z: 124 }, { x: 4, z: 131 }, { x: 29, z: 117 }, { x: 22.5, z: 129 }, { x: 13, z: 136 },
    { x: -9, z: 144 }, { x: 13.5, z: 145 }, { x: -12, z: 155.5 }, { x: -22, z: 154 }, { x: 2, z: 155.5 },
  ],
  houses: [
    // the scouts' huts, low and solid, roofs in reach
    { x: -3.5, z: 149, w: 5, d: 4, h: 3.2, stilts: false, wall: 0x5f4630, roof: 0x7d6b45, windows: false },
    { x: 8, z: 149, w: 5, d: 4, h: 3.2, stilts: false, wall: 0x5f4630, roof: 0x7d6b45, windows: false },
  ],
  towers: [{ x: 15.5, z: 140 }],
  stalls: [{ x: 2, z: 139.5, w: 2.6, d: 1.6 }],
  hay: [{ x: -6, z: 139 }],
  lamps: [{ x: -2, z: 141.5 }, { x: 6.5, z: 145 }, { x: 2, z: 151.5 }, { x: 0.5, z: 114 }, { x: 29.5, z: 114 }],
};

// ---------------------------------------------------------------------------------------------------------------
// Gunung Ledang: a terraced mountain north of the hutan. Five rock tiers 2.4 m apart (each a climb), stone stairs
// up each south face for walkers and horses, a waterfall down to a pool at the foot, and a shrine on the summit.
const MOUNT_Z1 = 236;
const TIER_H = 2.4;
/** each tier: its main block plus lobes that touch it (never overlap: same-height tops would flicker) */
const TIERS: Rect[][] = [
  [{ x: 0, z: 207, w: 60, d: 50 }, { x: -19, z: 180.5, w: 14, d: 3 }],
  [{ x: 0, z: 209, w: 48, d: 40 }, { x: 15, z: 187.5, w: 8, d: 3 }, { x: -12, z: 230.5, w: 12, d: 3 }],
  [{ x: 0, z: 211, w: 36, d: 30 }, { x: -19.5, z: 208, w: 3, d: 12 }],
  [{ x: 0, z: 213, w: 24, d: 20 }, { x: -9, z: 201.5, w: 6, d: 3 }],
  [{ x: 0, z: 214, w: 12, d: 10 }],
];
export const SUMMIT = { x: 0, z: 214, y: TIERS.length * TIER_H };
/** stairs up the south face of each tier: x, and the z of the face they climb */
const STAIRS = [
  { x: -4, face: 182 },
  { x: -14, face: 189 },
  { x: 13, face: 196 },
  { x: -2, face: 203 },
  { x: 3, face: 209 },
];
const STAIR = { n: 5, depth: 0.9, w: 3 };
/** the falls run down the south faces at this x, from a spring on the fourth tier to the pool */
const FALLS_X = 8;
export const POOL = { x: FALLS_X, z: 178, w: 7, d: 7 };
const inRect = (r: Rect, x: number, z: number, m = 0) => Math.abs(x - r.x) < r.w / 2 + m && Math.abs(z - r.z) < r.d / 2 + m;
/** the tier (1-based) a point stands on, 0 for the ground */
const tierAt = (x: number, z: number, m = 0) => {
  for (let t = TIERS.length; t >= 1; t--) if (TIERS[t - 1].some((r) => inRect(r, x, z, m))) return t;
  return 0;
};
const nearStairsOrFalls = (x: number, z: number, m: number) =>
  Math.abs(x - FALLS_X) < 1.5 + m || STAIRS.some((s) => Math.abs(x - s.x) < STAIR.w / 2 + m && z > s.face - STAIR.n * STAIR.depth - m && z < s.face + m);
const MOUNTAIN = (() => {
  let s = 1511;
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296), s / 4294967296);
  const cliffs = TIERS.flatMap((rs, t) => rs.map((r) => ({ ...r, h: (t + 1) * TIER_H })));
  const steps = STAIRS.flatMap((st, t) =>
    Array.from({ length: STAIR.n }, (_, k) => ({
      x: st.x,
      z: st.face - (STAIR.n - 1 - k) * STAIR.depth - STAIR.depth / 2,
      w: STAIR.w,
      d: STAIR.depth,
      h: t * TIER_H + ((k + 1) * TIER_H) / STAIR.n,
    })),
  );
  // boulders along the foot of every cliff, half sunk into the face
  const rocks: (Placed & { kind: number })[] = [];
  TIERS.forEach((rs, t) =>
    rs.forEach((r) => {
      const per = 2 * (r.w + r.d);
      for (let u = rnd() * 5; u < per; u += 4.5 + rnd() * 4) {
        let x: number, z: number, nx: number, nz: number;
        if (u < r.w) [x, z, nx, nz] = [r.x - r.w / 2 + u, r.z - r.d / 2, 0, -1];
        else if (u < r.w + r.d) [x, z, nx, nz] = [r.x + r.w / 2, r.z - r.d / 2 + (u - r.w), 1, 0];
        else if (u < 2 * r.w + r.d) [x, z, nx, nz] = [r.x + r.w / 2 - (u - r.w - r.d), r.z + r.d / 2, 0, 1];
        else [x, z, nx, nz] = [r.x - r.w / 2, r.z + r.d / 2 - (u - 2 * r.w - r.d), -1, 0];
        const sc = 1.1 + rnd() * 1.3;
        const p = { x: x - nx * sc * 0.35, z: z - nz * sc * 0.35 };
        const base = tierAt(x + nx * 0.6, z + nz * 0.6);
        if (base > t || nearStairsOrFalls(p.x, p.z, 1) || Math.abs(p.x) > 33 || p.z > MOUNT_Z1 - 1.5) continue;
        rocks.push({ ...p, y: base * TIER_H, s: sc, r: rnd() * Math.PI * 2, kind: rocks.length % 2 });
      }
    }),
  );
  // small montane trees on the lower ledges, clear of the cliff edges, stairs and falls
  const trees: Placed[] = [];
  for (let z = 168; z < MOUNT_Z1 - 2; z += 6.5)
    for (let x = -32; x < 32.5; x += 6.5) {
      const p = { x: x + (rnd() - 0.5) * 4, z: z + (rnd() - 0.5) * 4 };
      const sc = 0.55 + rnd() * 0.3;
      const r = rnd() * Math.PI * 2;
      const t = tierAt(p.x, p.z);
      if (t > 3 || Math.abs(p.x) > 32.5 || tierAt(p.x, p.z, 1.6) !== t || tierAt(p.x, p.z, -1.6) !== t) continue;
      if (nearStairsOrFalls(p.x, p.z, 2.5) || inRect(POOL, p.x, p.z, 2.5) || (t === 0 && (p.z < 168.5 || trailDist(p) < 3))) continue;
      trees.push({ ...p, y: t * TIER_H, s: sc, r });
    }
  // the falls: a sheet down each face from the fourth tier, a stream across each ledge below
  const fronts = [203, 196, 189, 182];
  const sheets = fronts.map((z, i) => ({ x: FALLS_X, z, w: 2.2, y0: (3 - i) * TIER_H, y1: (4 - i) * TIER_H }));
  const streams = [
    { x: FALLS_X, z: 205.5, w: 2.2, d: 5, y: 4 * TIER_H },
    ...fronts.slice(1).map((z, i) => ({ x: FALLS_X, z: (z + fronts[i]) / 2, w: 2.2, d: fronts[i] - z, y: (3 - i) * TIER_H })),
  ];
  return { cliffs, steps, rocks, trees, falls: { sheets, streams } };
})();

/**
 * Malacca, 1511, as one map: the harbour on the sea, the river north of it, Kampung Hulu beyond. A guarded bridge
 * and a narrow plank on the west side cross the river; the upper kampung has its own jetty on the river bank.
 * Every mission plays on this map and only sets its own guards, start, exit and wording.
 */
const WORLD: Area &
  Pick<
    LevelDef,
    "seed" | "shoreZ" | "palisade" | "jetty" | "water" | "decks" | "boats" | "horses" | "fences" | "trees" | "ferns" | "trails" | "clearings" | "forestFloor" | "bounds" | "cliffs" | "rocks" | "falls" | "shrine" | "mistZ"
  > = {
  seed: 1511,
  shoreZ: -31,
  houses: [...HARBOUR_AREA.houses, ...KAMPUNG_N.houses, ...JUNGLE.houses, ...TIDE_HOUSES],
  cliffs: MOUNTAIN.cliffs,
  rocks: MOUNTAIN.rocks,
  falls: MOUNTAIN.falls,
  shrine: SUMMIT,
  mistZ: JUNGLE_Z1,
  finials: [...HARBOUR_AREA.finials, ...KAMPUNG_N.finials],
  steps: [...HARBOUR_AREA.steps, ...KAMPUNG_N.steps, ...MOUNTAIN.steps],
  towers: [...HARBOUR_AREA.towers, ...KAMPUNG_N.towers, ...JUNGLE.towers],
  stalls: [...HARBOUR_AREA.stalls, ...KAMPUNG_N.stalls, ...JUNGLE.stalls],
  wells: [...HARBOUR_AREA.wells, ...KAMPUNG_N.wells],
  cannons: [...HARBOUR_AREA.cannons, ...KAMPUNG_N.cannons],
  hay: [...HARBOUR_AREA.hay, ...KAMPUNG_N.hay, ...JUNGLE.hay],
  // the river banks get a little cover, for the plank crossing in particular
  bushes: [...HARBOUR_AREA.bushes, ...KAMPUNG_N.bushes, { x: -26.5, z: 34.8 }, { x: -27, z: 48.6 }, { x: 24, z: 34.8 }, ...JUNGLE.bushes],
  palms: [...HARBOUR_AREA.palms, ...KAMPUNG_N.palms, { x: 4, z: 35 }, { x: -18, z: 35.2 }, { x: 30, z: 48 }],
  prahus: [...HARBOUR_AREA.prahus, ...KAMPUNG_N.prahus],
  ships: [...HARBOUR_AREA.ships, ...KAMPUNG_N.ships],
  // bridge lanterns at both ends
  lamps: [...HARBOUR_AREA.lamps, ...KAMPUNG_N.lamps, { x: 14.2, z: 35 }, { x: 9.8, z: 48 }, ...JUNGLE.lamps],
  palisade: { minX: -35, maxX: 35, minZ: -31, maxZ: MOUNT_Z1 },
  // the kampung's old north wall, now between it and the jungle
  fences: [{ z: JUNGLE_Z0, minX: -35, maxX: 35, gates: JUNGLE_GATES }],
  trees: [...JUNGLE.trees, ...MOUNTAIN.trees],
  ferns: JUNGLE.ferns,
  trails: JUNGLE_TRAILS,
  clearings: [CAMP],
  forestFloor: [{ x: 0, z: (JUNGLE_Z0 + MOUNT_Z1) / 2, w: 70, d: MOUNT_Z1 - JUNGLE_Z0 }],
  jetty: { x: 0, z: -34, w: 3, d: 8 },
  water: [RIVER, POOL],
  decks: [
    // the bridge, kept by a sentry
    { x: 12, z: RIVER.z, w: 3, d: RIVER.d + 3, rails: true },
    // a single plank on the west side: narrow, dark and unguarded
    { x: -30, z: RIVER.z, w: 1.6, d: RIVER.d + 3 },
    // the upper kampung's jetty, out from its south bank
    { x: 0, z: -34 + KAMPUNG_DZ, w: 3, d: 8 },
    // a bamboo landing into the pool below the falls
    { x: POOL.x, z: POOL.z - POOL.d / 2 + 1, w: 1.8, d: 3 },
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
    // just outside that gate, on the jungle side
    { x: 26.5, z: 115.5, rotY: -Math.PI / 2 },
    // at the foot of Gunung Ledang, where the old trail comes out of the trees
    { x: -22.5, z: 169.5, rotY: Math.PI / 4 },
  ],
  bounds: { minX: -33.6, maxX: 33.6, minZ: -37.4, maxZ: MOUNT_Z1 - 1.4, jettyZ: -31, jettyHalf: 1.1 },
};

/** A spot on the anchored ship: u along its keel (stern -15 to bow 15), v across it (port to starboard, within 2.5), on deck or the aft castle. */
const onShip = (u: number, v: number, y = 4) => {
  const s = HARBOUR_AREA.ships[0];
  return { x: s.x + Math.sin(s.rotY) * u + Math.cos(s.rotY) * v, y, z: s.z + Math.cos(s.rotY) * u - Math.sin(s.rotY) * v };
};
/** The ship's crew: two pacing the deck either side of the masts, and a lookout on the aft castle. */
const SHIP_GUARDS: GuardDef[] = [
  { waypoints: [onShip(-5, -2), onShip(12, -2)] },
  { waypoints: [onShip(11, 2), onShip(-5, 2)] },
  { waypoints: [onShip(-11.7, -1.8, 6.4), onShip(-11.7, 1.8, 6.4)] },
];

/** Patrols of the harbour (and the ship in the roads), on every mission. */
const HARBOUR_GUARDS: GuardDef[] = [
  { waypoints: [{ x: -7.8, z: -24 }, { x: -7.8, z: 24 }] },
  { waypoints: [{ x: 8, z: -24 }, { x: 8, z: 24 }] },
  { waypoints: [{ x: -24, z: -8.5 }, { x: 24, z: -8.5 }] },
  { waypoints: [{ x: 24, z: 8.5 }, { x: -24, z: 8.5 }] },
  { waypoints: [{ x: -4.5, z: -4.5 }, { x: 4.5, z: -4.5 }, { x: 4.5, z: 4.5 }, { x: -4.5, z: 4.5 }] },
  ...SHIP_GUARDS,
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
  name: mt("harbour", "name"),
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
  story: mt("harbour", "story"),
  checkpointLabel: mt("harbour", "checkpoint"),
  win: {
    title: mt("harbour", "winTitle"),
    body: mt("harbour", "winBody"),
  },
  text: {
    objective: mt("harbour", "objective"),
    escape: mt("harbour", "escape"),
    targetDown: mt("harbour", "targetDown"),
    targetSpotted: mt("harbour", "targetSpotted"),
    strike: mt("harbour", "strike"),
    leap: mt("harbour", "leap"),
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
  name: mt("kampung", "name"),
  missionId: "kampung-hulu",
  guards: [...KAMPUNG_GUARDS, { waypoints: CLERK_POST, isTarget: true }, ...RIVER_GUARDS, ...HARBOUR_GUARDS],
  objective: { kind: "kill" },
  start: { x: 31.5, z: 31.5 + KAMPUNG_DZ },
  exit: RIVER_EXIT,
  story: mt("kampung", "story"),
  checkpointLabel: mt("kampung", "checkpoint"),
  win: {
    title: mt("kampung", "winTitle"),
    body: mt("kampung", "winBody"),
  },
  text: {
    objective: mt("kampung", "objective"),
    escape: mt("kampung", "escape"),
    targetDown: mt("kampung", "targetDown"),
    targetSpotted: mt("kampung", "targetSpotted"),
    strike: mt("kampung", "strike"),
    leap: mt("kampung", "leap"),
  },
};

/** The same kampung after the clerk's death: the plans he hid are still under the penghulu's hall. */
export const PLANS: LevelDef = {
  ...KAMPUNG,
  id: "plans",
  name: mt("plans", "name"),
  missionId: "kampung-plans",
  // the clerk's post is kept by an ordinary guard now
  guards: KAMPUNG.guards.map((g) => ({ waypoints: g.waypoints })),
  // a chest in the crawl space under the hall's back corner, clear of the solid upper tier
  objective: { kind: "steal", at: { x: -23, y: 0, z: -18 + KAMPUNG_DZ } },
  undetected: true,
  story: mt("plans", "story"),
  checkpointLabel: mt("plans", "checkpoint"),
  win: {
    title: mt("plans", "winTitle"),
    body: mt("plans", "winBody"),
  },
  text: {
    objective: mt("plans", "objective"),
    escape: mt("plans", "escape"),
    targetDown: mt("plans", "targetDown"),
    take: mt("plans", "take"),
  },
};

/** The scouts in the hutan: trail patrols, a round of the camp, and their captain. */
const JUNGLE_GUARDS: GuardDef[] = [
  { waypoints: [{ x: -1, z: 118 }, { x: 1.5, z: 130 }] },
  { waypoints: [{ x: 25, z: 123 }, { x: 15, z: 134 }] },
  { waypoints: [{ x: -6, z: 136.5 }, { x: 10, z: 136.5 }, { x: 11, z: 152 }, { x: -6, z: 152 }] },
  { waypoints: [{ x: -11, z: 151 }, { x: -25, z: 157 }] },
];

/** Hutan: a Portuguese scouting party camped in the jungle north of Kampung Hulu. */
export const JUNGLE_CAMP: LevelDef = {
  ...WORLD,
  id: "jungle",
  name: mt("jungle", "name"),
  missionId: "hutan-camp",
  guards: [...JUNGLE_GUARDS, { waypoints: [{ x: -1, z: 144.5 }, { x: 5, z: 144.5 }], isTarget: true }, ...KAMPUNG_GUARDS],
  objective: { kind: "kill" },
  start: { x: 31, z: 114.5 },
  exit: RIVER_EXIT,
  story: mt("jungle", "story"),
  checkpointLabel: mt("jungle", "checkpoint"),
  win: {
    title: mt("jungle", "winTitle"),
    body: mt("jungle", "winBody"),
  },
  text: {
    objective: mt("jungle", "objective"),
    escape: mt("jungle", "escape"),
    targetDown: mt("jungle", "targetDown"),
    targetSpotted: mt("jungle", "targetSpotted"),
    strike: mt("jungle", "strike"),
    leap: mt("jungle", "leap"),
  },
};

/** The guards on Gunung Ledang: the foot of the mountain, its ledges, and the summit. */
const LEDANG_GUARDS: GuardDef[] = [
  { waypoints: [{ x: -10, z: 172 }, { x: 14, z: 172 }] },
  { waypoints: [{ x: 13.5, z: 175 }, { x: 13.5, z: 180.5 }] },
  { waypoints: [{ x: -27, y: 2.4, z: 186 }, { x: -18.5, y: 2.4, z: 186 }] },
  { waypoints: [{ x: 27, y: 2.4, z: 185 }, { x: 27, y: 2.4, z: 202 }] },
  { waypoints: [{ x: -20, y: 4.8, z: 192.5 }, { x: -4, y: 4.8, z: 192.5 }] },
  { waypoints: [{ x: -15.5, y: 7.2, z: 199 }, { x: -15.5, y: 7.2, z: 214 }] },
  { waypoints: [{ x: -9, y: 9.6, z: 206.5 }, { x: -9, y: 9.6, z: 220 }] },
  { waypoints: [{ x: -4, y: 12, z: 210.6 }, { x: 4, y: 12, z: 210.6 }, { x: 4, y: 12, z: 217.6 }, { x: -4, y: 12, z: 217.6 }] },
];

/** Gunung Ledang: a Portuguese party has climbed to the summit shrine and taken its offerings. */
export const LEDANG: LevelDef = {
  ...WORLD,
  id: "ledang",
  name: mt("ledang", "name"),
  missionId: "gunung-ledang",
  guards: LEDANG_GUARDS,
  objective: { kind: "steal", at: { x: SUMMIT.x, y: SUMMIT.y + 0.9, z: SUMMIT.z } },
  start: { x: -25, z: 167.5 },
  exit: { x: POOL.x, z: POOL.z - POOL.d / 2 + 0.6 },
  story: mt("ledang", "story"),
  checkpointLabel: mt("ledang", "checkpoint"),
  win: {
    title: mt("ledang", "winTitle"),
    body: mt("ledang", "winBody"),
  },
  text: {
    objective: mt("ledang", "objective"),
    escape: mt("ledang", "escape"),
    targetDown: mt("ledang", "targetDown"),
    take: mt("ledang", "take"),
  },
};

/**
 * Wayang kulit: the dalang tells the night of the Bridge Battery again, as a shadow play. The same harbour and the same
 * Kapitan, but drawn in ink on a lit kelir, and the blencong lamps throw the Pendekar's shadow where the guards can see it.
 */
export const WAYANG: LevelDef = {
  ...WORLD,
  id: "wayang",
  name: mt("wayang", "name"),
  missionId: "wayang-kulit",
  guards: [...HARBOUR_GUARDS, { waypoints: [{ x: -2.4, z: 5.8 }, { x: 2.4, z: 5.8 }], isTarget: true }],
  objective: { kind: "kill" },
  start: { x: -31.5, z: 31.5 },
  exit: { x: 0, z: -36 },
  // the harbour's own lanterns around the well, the palace and the market lanes stand in for the blencong
  wayang: {
    lamps: [
      { x: -5, z: 5 }, { x: 5, z: -5 }, { x: -8, z: 16 }, { x: 8, z: 16 }, { x: -14, z: 0 }, { x: 14, z: 0 },
      { x: -11, z: -12 }, { x: 11, z: 12 }, { x: 0, z: -29 },
    ],
    r: 6,
  },
  story: mt("wayang", "story"),
  checkpointLabel: mt("wayang", "checkpoint"),
  win: {
    title: mt("wayang", "winTitle"),
    body: mt("wayang", "winBody"),
  },
  text: {
    objective: mt("wayang", "objective"),
    escape: mt("wayang", "escape"),
    targetDown: mt("wayang", "targetDown"),
    targetSpotted: mt("wayang", "targetSpotted"),
    strike: mt("wayang", "strike"),
    leap: mt("wayang", "leap"),
  },
};

/** Every mission, in play order. */
export const LEVELS: LevelDef[] = [HARBOUR, KAMPUNG, PLANS, JUNGLE_CAMP, LEDANG, WAYANG, PENJARA, GUA_LANUN];

// Masjid: the quiet warkah errand (masjid.ts)
import { MASJID } from "./masjid";
LEVELS.push(MASJID);

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

// Kota Batu, the climax: its own map in kota.ts, appended here so the mission list merges cleanly.
LEVELS.push(KOTA);

/** The user-facing fields of a level that have a translation (keys mission.<levelId>.<field>). */
export type MissionField =
  | "name"
  | "story"
  | "checkpoint"
  | "winTitle"
  | "winBody"
  | "objective"
  | "escape"
  | "targetDown"
  | "targetSpotted"
  | "strike"
  | "leap"
  | "take";

/** A level's text in `lang`; undefined for optional fields the level does not have (e.g. leap on a steal mission). */
export function missionText(lang: Lang, level: string | { id: string }, field: MissionField): string | undefined {
  const key = `mission.${typeof level === "string" ? level : level.id}.${field}`;
  return key in DICTS.ms ? t(lang, key) : undefined;
}
