// Penjara: the Portuguese prison cells beneath the fort. A stand-alone map (its own walls, its own corner of the world),
// drawn as a character grid and turned into the same kit of parts the other missions use: stone walls are rock
// terraces (cliffs) laid as corridors and cells, the "sunken yard" is a walled court with a low step down to the gate,
// the drain is a deck over a river. Plain data, no three.js. Registered in LEVELS (levels.ts).
import type { GuardDef, LevelDef, Rect } from "../levels";
import type { Vec2 } from "../logic";

/** One character of MAP is one T x T metre tile; the grid is COLS wide (x, west to east) and ROWS deep (z, north to south). */
const T = 1.25;
const COLS = 44;
const ROWS = 44;
/** Where the grid sits in the world: far to the west of the shared Malacca map (x -107.5 .. -52.5), so nothing there is in the way. */
const OX = -80;
const OZ = 7.75;
const X0 = OX - (COLS * T) / 2;
const Z0 = OZ + (ROWS * T) / 2;
/** wall height: above the 3.7 m a climber can reach from the ground, so the walls are not a way over */
const WALL_H = 4.2;

/**
 * # stone wall   . floor   ~ river
 * S start   K the captive's cell   * lantern   h straw (hide)   b bush (hide)   c crate stall   w well   n cannon
 * A-W and 1-6 are guard waypoints (see PATROLS).
 *
 * North to south: the river, the drain (a shaft up to the river and a channel under the cells), the cell wing in the
 * west and a winding wing in the east around a spine corridor, then the guard rooms and the gate hall, the wall with
 * the gate (and the jailer's back door on the west), and the yard.
 */
const MAP = [
  "############################################",
  "#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#",
  "#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#",
  "#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#",
  "#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#",
  "####################..######################",
  "####################..######################",
  "##....................######################",
  "##......3.......4.....######################",
  "##...*......h.........######################",
  "###..#######################################",
  "###..#######################################",
  "###..###############....####################",
  "##...#...#...#...###.V..##........h......###",
  "##.K.#.h.#...#...###....##...5........6..###",
  "##...#...#...#...###..*.##.h...########*.###",
  "##...#...#.h.#...###....##.....########..###",
  "###..##..##..##..###....###..##########..###",
  "##....*.........*.................*......###",
  "##.T..............U.......1...........2..###",
  "##..........*.c.............*............###",
  "###..##..##..##..###....###..##########..###",
  "##...#...#...#...###....##.....########..###",
  "##h..#...#..h#.h.###.*..##.....########.h###",
  "##...#...#...#...###....##...h...........###",
  "##...#.h.#...#...###....##....*..........###",
  "###..###############....####################",
  "##.........#########..W.#########.........##",
  "##.*.......#########....#########..J....L*##",
  "##.........#....................#.........##",
  "##..O....P.#.*................*.#.........##",
  "##............H..............I............##",
  "##.................*....*.........*N....M.##",
  "##.........#....................#.........##",
  "###..###############....####################",
  "#..........................................#",
  "#......h.........*........*...........h....#",
  "#...A............BE......F.................#",
  "#....c.......................c.............#",
  "#.........n..........w.....................#",
  "#.....*...................C.........*.D....#",
  "#bS................................h.......#",
  "#.............h......*.....................#",
  "############################################",
];

const tileX = (c: number) => X0 + (c + 0.5) * T;
const tileZ = (r: number) => Z0 - (r + 0.5) * T;
const tile = (c: number, r: number): Vec2 => ({ x: tileX(c), z: tileZ(r) });
/** the ground covered by tiles c0..c1, r0..r1 (inclusive) */
const rectOf = (c0: number, c1: number, r0: number, r1: number): Rect => ({
  x: X0 + ((c0 + c1 + 1) / 2) * T,
  z: Z0 - ((r0 + r1 + 1) / 2) * T,
  w: (c1 - c0 + 1) * T,
  d: (r1 - r0 + 1) * T,
});

/** Stone walls: runs of # along each row, joined with the identical run in the row below, so no two walls overlap. */
function wallsFromMap(): (Rect & { h: number })[] {
  const out: (Rect & { h: number })[] = [];
  const open = new Map<string, { c0: number; c1: number; r0: number }>();
  for (let r = 0; r <= ROWS; r++) {
    const runs: { c0: number; c1: number }[] = [];
    const row = r < ROWS ? MAP[r] : "";
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== "#") continue;
      const c0 = c;
      while (c + 1 < row.length && row[c + 1] === "#") c++;
      runs.push({ c0, c1: c });
    }
    const keys = new Set(runs.map((u) => `${u.c0}-${u.c1}`));
    for (const [k, o] of open)
      if (!keys.has(k)) {
        out.push({ ...rectOf(o.c0, o.c1, o.r0, r - 1), h: WALL_H });
        open.delete(k);
      }
    for (const u of runs) if (!open.has(`${u.c0}-${u.c1}`)) open.set(`${u.c0}-${u.c1}`, { c0: u.c0, c1: u.c1, r0: r });
  }
  return out;
}

/** Every marked tile of the grid, by character. */
function marks(): Record<string, Vec2[]> {
  const out: Record<string, Vec2[]> = {};
  MAP.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === "#" || ch === "." || ch === "~") continue;
      (out[ch] ??= []).push(tile(c, r));
    }
  });
  return out;
}
const M = marks();
const at = (ch: string): Vec2 => M[ch][0];

/** The yard inside the south wall, and the whole cell block behind its gate. */
export const PENJARA_YARD: Rect = rectOf(1, 42, 35, 42);
export const PENJARA_BLOCK: Rect = rectOf(0, 43, 5, 34);

/** The drain mouth: a landing over the river at the end of the shaft, with the exit on it. */
const DECK = rectOf(20, 21, 2, 6);
const EXIT: Vec2 = { x: DECK.x, z: tileZ(3) };

/** Each patrol is a string of waypoint characters, walked to and fro (or round, for four). */
const PATROLS = [
  "AB", // the yard, west half
  "CD", // the yard, east half
  "EF", // the gate, in front of the step
  "HI", // the gate hall, past both doors
  "JLMN", // the guard room
  "OP", // the jailer's room
  "TU", // the cell corridor: the jailer, with his keys
  "VW", // the spine
  "12", // the long corridor of the east wing
  "56", // the top passage of the east wing
  "34", // the drain channel under the cells
];
const GUARDS: GuardDef[] = PATROLS.map((s) => ({ waypoints: [...s].map(at) }));

const START = at("S");
const CAPTIVE = at("K");

export const PENJARA: LevelDef = {
  id: "penjara",
  name: "Penjara",
  missionId: "penjara-kota",
  seed: 4107,
  // the grid lies on dry land; the sea is far off to the south, beyond the walls
  shoreZ: -40,
  houses: [],
  finials: [],
  steps: [
    // a step down at the gate, and at the jailer's back door
    { ...rectOf(20, 23, 35, 35), h: 0.4 },
    { ...rectOf(3, 4, 35, 35), h: 0.4 },
  ],
  towers: [],
  palisade: { minX: X0 - 0.3, maxX: X0 + COLS * T + 0.3, minZ: Z0 - ROWS * T - 0.3, maxZ: Z0 + 0.3 },
  jetty: { x: OX, z: -46, w: 3, d: 8 },
  // the river is two sheets (a single one that wide would count as the tidal river of the shared map)
  water: [rectOf(1, 21, 1, 4), rectOf(22, 42, 1, 4)],
  decks: [DECK],
  boats: [],
  cliffs: wallsFromMap(),
  // the cell block floor is damp moss
  forestFloor: [rectOf(1, 42, 5, 34)],
  stalls: (M.c ?? []).map((p) => ({ x: p.x, z: p.z, w: 2.5, d: T })),
  wells: M.w ?? [],
  cannons: M.n ?? [],
  hay: M.h ?? [],
  bushes: M.b ?? [],
  palms: [],
  prahus: [],
  ships: [],
  lamps: M["*"] ?? [],
  guards: GUARDS,
  // the captive is the prize: the engine's "steal" objective stands in for unlocking his cell
  objective: { kind: "steal", at: { x: CAPTIVE.x, y: 0, z: CAPTIVE.z } },
  start: START,
  exit: EXIT,
  bounds: { minX: X0 + 0.6, maxX: X0 + COLS * T - 0.6, minZ: Z0 - ROWS * T + T + 0.1, maxZ: tileZ(1) + T / 2 - 0.1, jettyZ: -38, jettyHalf: 1.1 },
  story:
    "Pak Long Hasan, the old boatwright who built half the sultan's prahu, was taken in the night. He knows every channel of the " +
    "harbour, and the Portuguese mean to have it out of him in the penjara under the fort: damp stone, straw, a soldier at every " +
    "corner and a jailer who never takes his keys off. Drop into the yard, go down by the gate or the jailer's back door, find the " +
    "deepest cell and free him. Behind it a rusted grating opens on the old drain that empties into the river. The lanterns are few " +
    "down there. Keep to the dark.",
  checkpointLabel: "Pak Long Hasan is free",
  win: {
    title: "The boatwright is free",
    body: "The drain took you out into the river, and the river took the trail. Pak Long Hasan is away under a sampan's mat, and the penjara has one cell empty.",
  },
  text: {
    objective: "Find Pak Long Hasan in the deepest cell of the penjara",
    escape: "Out through the grating and the drain to the river",
    targetDown: "The boatwright is free. Out by the drain to the river.",
    take: "Unlock the cell and free Pak Long Hasan",
  },
};
