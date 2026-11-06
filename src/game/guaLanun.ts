// Gua Lanun: a sea-cave that is also a pirate lair. Plain data (plus a little seeded generation), no three.js.
//
// The engine has no roofed space, so the cave is faked with what it has: tall rock blocks (cliffs, far above the 3.7 m
// climbing limit) carved out of a grid leave a narrow winding cleft and a round cavern, a dark floor, torches for the only
// light, and `gloom` (levels.ts) to darken the fog and the sun. The map is its own pocket of the ground plane, far to the
// east of Malacca (x = CAVE_X), so it shares no scenery with the other missions. Everything below is written in
// "local" coordinates (u across, z along) and shifted by X().
//
//   z 118  +----------------------------------+
//          |  chest ledge (steps)   shelf     |   north: the chief's ledge, a lookout shelf
//          |  huts   camp fires     LAGOON    |   centre: pirate camp west, flooded lagoon east, dock and sampans
//          |  mouth of the cavern   exit deck |   exit: a plank landing, the "water gate", on the lagoon's east side
//   z  60  |  \__ the winding cleft (south)   |
//   z   3  |  start glade                     |
//          +----------------------------------+
import type { PlaceDef } from "./kitab";
import type { GuardDef, LevelDef, Placed, Rect } from "./levels";

/** x of the cave's local origin */
export const CAVE_X = 90;
const X = (u: number) => CAVE_X + u;

type P = [number, number];
const CELL = 2.5;
const U0 = -35;
const COLS = 28;
const ROWS = 48;

// ---------------------------------------------------------------- the shape of the cave (what is open floor)
/** the cleft from the glade to the cavern, as a polyline (u, z) */
const APPROACH: P[] = [[-24, 7], [-24, 18], [-14, 25], [-4, 31], [6, 36], [13, 44], [8, 53], [-6, 57], [-18, 62], [-16, 68]];
/** a blind side passage off the cleft: somewhere to wait out a patrol */
const SPUR: P[] = [[-4, 31], [-14, 38], [-24, 43]];
const HALF_WIDTH = 2.3;
/** round pockets: the start glade (and its mouth to the south, where a gate can stand), the guard chamber, the spur's end and three niches beside the cleft (u, z, radius) */
const DISCS: [number, number, number][] = [[-24, 8, 4.5], [-24, 5, 4], [6, 38, 4.2], [-24, 43, 4.5], [-7, 25, 2.2], [13.5, 40, 2.2], [2, 58.5, 2.2]];
/** the cavern is an ellipse, with a lobe to the north for the chief's ledge */
const CAVERN = { u: 0.5, z: 88, a: 31.5, b: 29 };
const LOBE = { minU: -22, maxU: -4, minZ: 100, maxZ: 116 };

function segDist(u: number, z: number, a: P, b: P) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((u - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(u - (a[0] + dx * t), z - (a[1] + dz * t));
}
const nearPath = (path: P[], u: number, z: number) => path.slice(1).some((b, i) => segDist(u, z, path[i], b) <= HALF_WIDTH);

function isOpen(u: number, z: number) {
  if (Math.abs(u) >= 31.5 || z <= 3.5 || z >= 116.5) return false;
  if (nearPath(APPROACH, u, z) || nearPath(SPUR, u, z)) return true;
  if (DISCS.some(([cu, cz, r]) => Math.hypot(u - cu, z - cz) <= r)) return true;
  if (((u - CAVERN.u) / CAVERN.a) ** 2 + ((z - CAVERN.z) / CAVERN.b) ** 2 <= 1) return true;
  return u >= LOBE.minU && u <= LOBE.maxU && z >= LOBE.minZ && z <= LOBE.maxZ;
}
/** whether the wall grid leaves the square under (u, z) open; props are only kept where this holds */
const cellOpen = (u: number, z: number) => {
  const c = Math.floor((u - U0) / CELL);
  const r = Math.floor(z / CELL);
  return isOpen(U0 + (c + 0.5) * CELL, (r + 0.5) * CELL);
};
const keep = <T extends { x: number; z: number }>(list: T[]) => list.filter((p) => cellOpen(p.x - CAVE_X, p.z));

/** Rock walls: every closed square of the grid, merged along rows and then down columns into as few blocks as possible. */
function carveWalls(): (Rect & { h: number })[] {
  let s = 4021;
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296), s / 4294967296);
  const out: (Rect & { h: number })[] = [];
  type Run = { c0: number; c1: number; r0: number };
  const flush = (run: Run, r1: number) =>
    out.push({
      x: X(U0 + ((run.c0 + run.c1 + 1) / 2) * CELL),
      z: ((run.r0 + r1) / 2) * CELL,
      w: (run.c1 - run.c0 + 1) * CELL,
      d: (r1 - run.r0) * CELL,
      // far taller than anything can be climbed (3.7 m), a little uneven
      h: 6 + rnd() * 2,
    });
  let active = new Map<string, Run>();
  for (let r = 0; r <= ROWS; r++) {
    const runs: [number, number][] = [];
    if (r < ROWS) {
      let c0 = -1;
      for (let c = 0; c <= COLS; c++) {
        const rock = c < COLS && !isOpen(U0 + (c + 0.5) * CELL, (r + 0.5) * CELL);
        if (rock && c0 < 0) c0 = c;
        if (!rock && c0 >= 0) {
          runs.push([c0, c - 1]);
          c0 = -1;
        }
      }
    }
    const next = new Map<string, Run>();
    for (const [c0, c1] of runs) {
      const k = `${c0}:${c1}`;
      next.set(k, active.get(k) ?? { c0, c1, r0: r });
    }
    for (const [k, run] of active) if (!next.has(k)) flush(run, r);
    active = next;
  }
  return out;
}

/** Boulders along the foot of the walls (scenery only). */
function scatterRocks(): (Placed & { kind: number })[] {
  let s = 77;
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296), s / 4294967296);
  const out: (Placed & { kind: number })[] = [];
  const lagoonU = (u: number, z: number) => u > -1 && u < 27 && z > 73 && z < 101;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const u = U0 + (c + 0.5) * CELL;
      const z = (r + 0.5) * CELL;
      if (!isOpen(u, z)) continue;
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => !isOpen(u + dc * CELL, z + dr * CELL));
      const roll = rnd();
      if (!edge || roll > 0.4 || lagoonU(u, z) || out.length >= 60) continue;
      out.push({ x: X(u + (rnd() - 0.5) * 1.2), z: z + (rnd() - 0.5) * 1.2, s: 0.8 + rnd() * 0.9, r: rnd() * Math.PI * 2, kind: out.length % 2 });
    }
  return out;
}

// ---------------------------------------------------------------- the lair
const LAGOON: Rect = { x: X(13), z: 87, w: 26, d: 26 };
/** the pirates' own dock, out into the lagoon from the camp shore, with a sampan either side */
const DOCK: Rect = { x: X(3), z: 84, w: 7, d: 2 };
/** the water gate: a plank landing on the lagoon's east side, where the tide runs out to the sea */
const EXIT_DECK: Rect = { x: X(24), z: 97, w: 7, d: 2 };
/** the chief's ledge, with its back to the rock, and the stair up its south face */
const LEDGE_H = 2.4;
const LEDGE: Rect & { h: number } = { x: X(-13.75), z: 111.75, w: 12.5, d: 6.5, h: LEDGE_H };
/** a lookout shelf over the lagoon's north shore */
const SHELF: Rect & { h: number } = { x: X(10), z: 107.5, w: 10, d: 5, h: LEDGE_H };
const STAIR = { n: 5, depth: 0.9, w: 3 };
const LEDGE_STEPS = Array.from({ length: STAIR.n }, (_, k) => ({
  x: LEDGE.x,
  z: LEDGE.z - LEDGE.d / 2 - (STAIR.n - 1 - k) * STAIR.depth - STAIR.depth / 2,
  w: STAIR.w,
  d: STAIR.depth,
  h: ((k + 1) * LEDGE_H) / STAIR.n,
}));

const at = ([u, z]: P, y?: number): { x: number; z: number; y?: number } => (y === undefined ? { x: X(u), z } : { x: X(u), z, y });
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const hut = (u: number, z: number) => ({ x: X(u), z, w: 5, d: 4, h: 3.2, stilts: false, wall: 0x4a3828, roof: 0x5a4a32, windows: false });
const crate = (u: number, z: number): Rect => ({ x: X(u), z, w: 2.6, d: 1.6 });
const spot = ([u, z]: number[]) => ({ x: X(u), z });

const GUARDS: GuardDef[] = [
  // the cleft: a sentry at its first bend, one in the chamber halfway, one at the cavern's mouth
  { waypoints: [at(lerp(APPROACH[1], APPROACH[2], 0.35)), at(lerp(APPROACH[2], APPROACH[3], 0.35))] },
  { waypoints: [at([3.5, 38]), at([8.5, 40])] },
  { waypoints: [at(lerp(APPROACH[7], APPROACH[8], 0.5)), at(APPROACH[9])] },
  // the camp: a round of the fires, the dock, the south beach and the cavern's floor
  { waypoints: [at([-18, 76]), at([-8, 76]), at([-8, 92]), at([-18, 92])] },
  { waypoints: [at([-3, 78]), at([-3, 90])] },
  { waypoints: [at([2, 66.5]), at([18, 67])] },
  { waypoints: [at([-8, 64]), at([-8, 72])] },
  // the lagoon's shores: north, and east towards the water gate
  { waypoints: [at([-2, 101.5]), at([18, 102.5])] },
  { waypoints: [at([27.8, 78]), at([27.8, 94.5])] },
  // the chief paces in front of his ledge; a lookout walks the shelf above the lagoon
  { waypoints: [at([-21, 105.5]), at([-6, 105.5])] },
  { waypoints: [at([7.5, 107.5], LEDGE_H), at([12.5, 107.5], LEDGE_H)] },
];

export const GUA_LANUN: LevelDef = {
  id: "gualanun",
  name: "Gua Lanun",
  missionId: "gua-lanun",
  seed: 1405,
  shoreZ: -31,
  houses: [hut(-23, 78), hut(-23, 90), hut(-8, 98)],
  finials: [],
  steps: LEDGE_STEPS,
  towers: [],
  // the posts stand inside the rock of the outer ring, out of sight
  palisade: { minX: X(-35), maxX: X(35), minZ: 0, maxZ: 120 },
  jetty: EXIT_DECK,
  water: [LAGOON],
  decks: [DOCK, EXIT_DECK],
  boats: [
    // either side of the pirates' dock, and one tied at the water gate
    { x: X(4.5), z: 81.2, rotY: Math.PI / 2 },
    { x: X(3.5), z: 87.2, rotY: Math.PI / 2 },
    { x: X(19.5), z: 93.5, rotY: 0.5 },
  ],
  cliffs: [...carveWalls(), LEDGE, SHELF],
  rocks: keep(scatterRocks()),
  trees: keep([{ x: X(-28.4), z: 6.2, s: 0.9, r: 0.4 }, { x: X(-21.4), z: 9.2, s: 0.8, r: 2.1 }]),
  ferns: keep(
    [[-26, 12], [-22.5, 13], [-26, 16], [-22.5, 6], [-27, 9], [-25.5, 21], [-9, 28.5], [-3, 31.5], [8, 35], [-16, 38], [10, 47], [-12, 58]].map(([u, z], i) => ({
      x: X(u),
      z,
      s: 0.9 + (i % 3) * 0.25,
      r: i * 1.3,
    })),
  ),
  trails: [APPROACH.map(([u, z]) => ({ x: X(u), z })), [{ x: X(-16), z: 68 }, { x: X(-14), z: 80 }, { x: X(-14), z: 92 }]],
  clearings: [{ x: X(-24), z: 8, r: 4 }, { x: X(-14), z: 84, r: 9 }],
  forestFloor: [{ x: X(0), z: 60, w: 70, d: 120 }],
  floorColor: 0x2e2a24,
  gloom: 0.55,
  stalls: [crate(-12, 70), crate(-14, 99), crate(6, 64)],
  wells: [],
  cannons: [{ x: X(-1.5), z: 74.5 }],
  hay: keep([[-7, 25], [-26.5, 41], [-27.5, 84], [-27, 96], [2, 65.5], [3, 103.5], [28.75, 82]].map(spot)),
  bushes: keep([[-28.5, 9.5], [13.5, 40.5], [2, 58.5], [-27.5, 43], [-28.75, 90.5], [-4.5, 104], [22, 104.5], [16.25, 63.75]].map(spot)),
  palms: [],
  // two pirate prahus at their moorings in the lagoon
  prahus: [{ x: X(13.5), z: 85, rotY: 0.15, scale: 1.1 }, { x: X(8.5), z: 94.5, rotY: Math.PI / 2, scale: 0.8 }],
  ships: [],
  lamps: keep(
    [
      // a few torches in the cleft, otherwise it is dark
      [-25.6, 14], [-9.9, 29.3], [4.5, 35.2], [-24, 40.5], [-13.5, 64],
      // the camp
      [-14, 82], [-14, 90], [-21, 84], [-8, 68], [-1.5, 80.3], [-1.5, 87], [-3, 101.5], [2, 66], [14, 63.5],
      // the east shore and the water gate
      [29, 88], [28.5, 98.5], [20, 104],
      // either side of the chief's ledge
      [-21.2, 109.5], [-6.3, 109.5],
    ].map(spot),
  ),
  guards: GUARDS,
  // the Sultan's casket, on the chief's ledge
  objective: { kind: "steal", at: { x: LEDGE.x, y: LEDGE_H, z: LEDGE.z } },
  start: at([-24, 6]),
  exit: at([23, 97]),
  bounds: { minX: X(-33), maxX: X(33), minZ: 3, maxZ: 117, jettyZ: -500, jettyHalf: 1.1 },
  story:
    "Lanun, sea-raiders out of the Riau waters, took the Sultan's tribute prahu off Tanjung Tuan and ran it into a cave they call Gua Lanun. " +
    "The gold casket of Pahang's tribute sits on their chief's ledge, and they sail with the next tide. Follow the cleft in the rock, " +
    "slip past the sentries into the cavern, take the casket from under the chief's eye, and leave by the water gate on the lagoon's east shore. " +
    "Only their torches give light in here. Keep to the dark between them.",
  checkpointLabel: "the casket is taken",
  win: {
    title: "The tribute is recovered",
    body: "You reached the water gate with the Sultan's casket. By the time the lanun count their loss, the tide has closed the cave behind you.",
  },
  text: {
    objective: "Take the Sultan's gold casket from the lanun chief's ledge",
    escape: "Slip out by the water gate on the lagoon's east shore",
    targetDown: "You have the casket. Out by the water gate.",
    take: "Take the Sultan's gold casket",
  },
};

// ---------------------------------------------------------------- Kitab
const WEST = { xr: [CAVE_X - 36, CAVE_X + 36] as [number, number] };

export const GUA_LANUN_PLACES: PlaceDef[] = [
  {
    id: "gua-lorong",
    title: "The cleft to Gua Lanun",
    hint: "A crack in the rock, far to the east",
    text: "A seam in the hills just wide enough for a man and his shadow. It turns five times before it opens, and the lanun like it so: nobody comes up it quickly, and nobody leaves it unseen.",
    at: (_x, _y, z) => z < 60,
    ...WEST,
  },
  {
    id: "gua-lanun",
    title: "Gua Lanun",
    hint: "Under the hills, where the sea comes in",
    text: "A cavern where the tide runs in through a flooded passage and fills a black lagoon. Sampans knock together at the lanun's dock, and torchlight on wet rock is the only thing that moves.",
    at: (_x, _y, z) => z >= 60,
    ...WEST,
  },
];

export const GUA_LANUN_LORE = {
  title: "The tribute",
  text: "The casket came home with the Sultan's seal still on the wax. The lanun tell of a shadow that crossed their torchlight twice, and the chief says it was only the tide.",
};
