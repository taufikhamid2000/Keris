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

export interface LevelDef {
  id: string;
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
  start: Vec2;
  exit: Vec2;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number; jettyZ: number; jettyHalf: number };
  /** mission wording shown in the HUD */
  text: {
    objective: string;
    escape: string;
    targetDown: string;
    targetSpotted: string;
    strike: string;
    leap: string;
  };
}

const PALACE_ROOF = 0x9a3b2a;

/** Malacca, 1511: the kampung and harbour below the bridge battery. */
export const HARBOUR: LevelDef = {
  id: "harbour",
  seed: 1511,
  shoreZ: -31,
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
  palisade: { minX: -35, maxX: 35, minZ: -31, maxZ: 35 },
  jetty: { x: 0, z: -34, w: 3, d: 8 },
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
  guards: [
    { waypoints: [{ x: -7.8, z: -24 }, { x: -7.8, z: 24 }] },
    { waypoints: [{ x: 8, z: -24 }, { x: 8, z: 24 }] },
    { waypoints: [{ x: -24, z: -8.5 }, { x: 24, z: -8.5 }] },
    { waypoints: [{ x: 24, z: 8.5 }, { x: -24, z: 8.5 }] },
    { waypoints: [{ x: -4.5, z: -4.5 }, { x: 4.5, z: -4.5 }, { x: 4.5, z: 4.5 }, { x: -4.5, z: 4.5 }] },
    { waypoints: [{ x: -2.4, z: 5.8 }, { x: 2.4, z: 5.8 }], isTarget: true },
  ],
  start: { x: -31.5, z: 31.5 },
  exit: { x: 0, z: -36 },
  bounds: { minX: -33.6, maxX: 33.6, minZ: -37.4, maxZ: 33.6, jettyZ: -31, jettyHalf: 1.1 },
  text: {
    objective: "Find and silence the Kapitan of the bridge battery",
    escape: "Slip away to the jetty",
    targetDown: "The Kapitan is down. Reach the jetty.",
    targetSpotted: "The Kapitan has seen you!",
    strike: "Strike the Kapitan with the keris",
    leap: "Leap down on the Kapitan",
  },
};

/** Every mission, in play order. */
export const LEVELS: LevelDef[] = [HARBOUR];
