// Kota Batu: the Portuguese stone fortress on the hill above the harbour, the last infiltration.
// Plain data in the same shape as levels.ts (no three.js), built by buildLevel() from the same kit: rock "cliffs" make
// the walls, crags and stairs, solid houses make the barracks, armoury, gate bastions and the three-tier keep.
//
// This mission has a map of its own: its sea shore lies at z = KOTA_Z0, well north of the shared Malacca map, so none
// of that map's fixed pieces (pantun sentries, bunian paths, the river) stand anywhere near it. All numbers below are
// written in local metres (z = 0 on the shore, land to +z) and moved to KOTA_Z0 by Z().
//
//   z 120  north edge, the town road comes in from the harbour quarter; start in the north-west corner
//   z  92 - 78  forecourt crags (two tiers, 2.4 m each) climb to the foot of the north wall
//   z  73.5 - 70  north wall: gate (x 3.5..8.5) between two bastions, a collapsed stretch (x 20..26, 3.4 m high)
//   z  70 - 47  outer ward: barracks (west), armoury (east), cannons, weapon racks
//   z  47 - 44  inner wall: the inner gate at x -12..-8 (the dog-leg: the two gates do not line up)
//   z  44 - 6.5 inner courtyard: well, haystacks, the keep (three tiers) at the south end, a stair up to the east wall
//   z  6.5 - 3  sea wall, then a strip of beach and the jetty at x = 0
//
// Three ways in. Loud: the gate and both wards. Quiet: up the west crags (x -45..-22) onto the north wall, or over the
// collapsed stretch in the east. Clever: the sally port in the west wall (z 19..21), hidden behind a bush and a haystack.

import type { GuardDef, HouseDef, LevelDef, Placed, Rect } from "./levels";
import type { Vec2 } from "./logic";

/** z of the Kota's sea shore on the world axis (the shared map ends at z = 236). */
export const KOTA_Z0 = 300;
const Z = (z: number) => KOTA_Z0 + z;

/** A footprint from x0..x1 and z0..z1 in local metres. */
const box = (x0: number, x1: number, z0: number, z1: number): Rect => ({ x: (x0 + x1) / 2, z: Z((z0 + z1) / 2), w: x1 - x0, d: z1 - z0 });
const block = (x0: number, x1: number, z0: number, z1: number, h: number) => ({ ...box(x0, x1, z0, z1), h });
const pt = (x: number, z: number): Vec2 => ({ x, z: Z(z) });
const pty = (x: number, y: number, z: number) => ({ x, y, z: Z(z) });

/** The rooftop with the council's map: the top of the keep. */
export const KEEP = { x: 0, z: Z(13.5), y: 10.5 };
/** Where the walls and the gate stand, for the Kitab. */
export const KOTA_WALLS = { minX: -28, maxX: 28, minZ: Z(6.5), maxZ: Z(70) };

const WALL_H = 7;
const STONE = 0x8d8a80;
const TILE = 0xa04630;

// ---------------------------------------------------------------------------------------------------------------
// Rock: the walls, and the crags the quiet route climbs. Every rise between two tops is at most 3.6 m.
const WALLS = [
  // sea wall
  block(-31, 31, 3, 6.5, WALL_H),
  // west wall, with the sally port between z 19 and 21
  block(-31, -28, 6.5, 19, WALL_H),
  block(-31, -28, 21, 70, WALL_H),
  // east wall
  block(28, 31, 6.5, 70, WALL_H),
  // north wall: gate gap x 3.5..8.5; the collapsed stretch (x 20..26) is only 3.4 m, a climb from the ground
  block(-31, 3.5, 70, 73.5, WALL_H),
  block(8.5, 20, 70, 73.5, WALL_H),
  block(20, 26, 70, 73.5, 3.4),
  block(26, 31, 70, 73.5, WALL_H),
  // inner wall, 6 m, with the inner gate x -12..-8
  block(-28, -12, 44, 47, 6),
  block(-8, 28, 44, 47, 6),
];
/** x0, x1, z0, z1, h */
const CRAG_BOXES: [number, number, number, number, number][] = [
  // west flank: a low shelf, and a higher one against the west wall (2.4 + 2.4, then 2.2 to the wall top)
  [-45, -37, 24, 64, 2.4],
  [-37, -31, 30, 58, 4.8],
  // forecourt, north-west: the same two tiers up to the north wall
  [-45, -20, 78, 92, 2.4],
  [-37, -22, 73.5, 78, 4.8],
  // east flank: a shelf of rock, cover only
  [34, 45, 40, 70, 2.4],
];
const CRAGS = CRAG_BOXES.map(([x0, x1, z0, z1, h]) => block(x0, x1, z0, z1, h));

/** A stair up the inside of the east wall: 12 steps of 0.58 m, the last level with the wall top. */
const STAIR_STEPS = Array.from({ length: 12 }, (_, k) => ({ ...box(25.6, 28, 14 + k * 0.8, 14 + (k + 1) * 0.8), h: ((k + 1) * WALL_H) / 12 }));

// ---------------------------------------------------------------------------------------------------------------
const HOUSES: HouseDef[] = [
  // the barracks (west) and the armoury (east) of the outer ward, low enough to climb onto
  { x: -19, z: Z(58), w: 14, d: 8, h: 3.6, wall: 0x9a948a, roof: 0x8c4a32, stilts: false },
  { x: 19, z: Z(58), w: 12, d: 8, h: 3.4, wall: 0x7d786e, roof: 0x6f3d2b, stilts: false, windows: false },
  // the gate bastions, a little over the wall
  { x: 0.5, z: Z(71.75), w: 6, d: 7.5, h: 9, wall: STONE, roof: TILE, stilts: false },
  { x: 11.5, z: Z(71.75), w: 6, d: 7.5, h: 9, wall: STONE, roof: TILE, stilts: false },
  // the keep: three tiers 3.5 m apart, flush on the south side (2.5 m from the sea wall, a jump)
  { x: 0, z: Z(16), w: 18, d: 14, h: 3.5, wall: STONE, roof: TILE, stilts: false },
  { x: 0, z: Z(14), w: 12, d: 10, h: 7, wall: STONE, roof: TILE, stilts: false, windows: false },
  { x: KEEP.x, z: KEEP.z, w: 5, d: 4.4, h: KEEP.y, wall: STONE, roof: TILE, stilts: false, windows: false },
];

const TOWERS: Vec2[] = [pt(-14, 88), pt(24, 88)];
const STALLS: Rect[] = [
  // weapon racks by the armoury and barracks doors
  { x: 10.5, z: Z(58), w: 1.6, d: 2.6 },
  { x: -10.5, z: Z(58), w: 1.6, d: 2.6 },
];
const WELLS: Vec2[] = [pt(14, 30)];
const CANNONS: Vec2[] = [pt(-22, 49), pt(22, 49)];

// Hiding places. The two by the sally port and the gate road are the clever route's.
const HAY_L: [number, number][] = [[10, 88], [-6, 78], [23, 76], [26, 66], [-26, 18], [24, 12], [0, 34], [-3, 56]];
const BUSH_L: [number, number][] = [[-42, 112], [-34, 17.5], [-40, 68], [38, 66], [36, 22], [-14, 102], [26, 104], [40, 100], [-2, 92], [22, 1.5], [-30, 2]];
const PALMS_L: [number, number][] = [[-38, 1.5], [-26, 1], [26, 1], [38, 1.5], [40, 30], [-40, 10], [-42, 5]];
const LAMPS_L: [number, number][] = [
  [3, 106], [9, 96], [3, 86], [10, 79], [2, 67], [10, 64], [-6, 54], [2, 50], [-12, 40], [10, 36], [-18, 24], [18, 22], [-6, 26], [-11, 12], [11, 12], [3, 1.2],
];

// ---------------------------------------------------------------------------------------------------------------
// Guards. Ground patrols first (local coordinates, so the trees below can keep clear of them), then the walls and roofs.
const GROUND_PATROLS: [number, number][][] = [
  // the road, and the forecourt
  [[2, 112], [2, 92]],
  [[-6, 84], [18, 84]],
  [[4.5, 78], [7.5, 78]],
  // east of the gate, past the collapsed stretch
  [[16, 80], [40, 80]],
  // the beach, across the jetty's head
  [[-12, 1.5], [12, 1.5]],
  // outer ward
  [[-8, 66], [24, 66]],
  [[-8, 51], [24, 51]],
  // through the inner gate
  [[-10, 50], [-10, 41]],
  // inner courtyard
  [[-18, 10], [-18, 40]],
  [[18, 40], [18, 10]],
  [[-6, 38], [10, 38]],
];
const GUARDS: GuardDef[] = [
  ...GROUND_PATROLS.map((w) => ({ waypoints: w.map(([x, z]) => pt(x, z)) })),
  // the west crag shelf (2.4 m)
  { waypoints: [pty(-41, 2.4, 28), pty(-41, 2.4, 60)] },
  // the walls (7 m): north-west, east, west, the sea wall
  { waypoints: [pty(-26, WALL_H, 71.75), pty(-6, WALL_H, 71.75)] },
  { waypoints: [pty(29.5, WALL_H, 66), pty(29.5, WALL_H, 28)] },
  { waypoints: [pty(-29.5, WALL_H, 66), pty(-29.5, WALL_H, 26)] },
  { waypoints: [pty(-24, WALL_H, 4.75), pty(24, WALL_H, 4.75)] },
  // the gatehouse watch on both bastion roofs (9 m)
  { waypoints: [pty(-1, 9, 71.75), pty(2, 9, 71.75)] },
  { waypoints: [pty(10, 9, 71.75), pty(13, 9, 71.75)] },
  // the keep: the first roof (3.5 m) and the second (7 m); the map lies on the third
  { waypoints: [pty(-7, 3.5, 21), pty(7, 3.5, 21)] },
  { waypoints: [pty(-4.5, 7, 17.3), pty(4.5, 7, 17.3)] },
];

// ---------------------------------------------------------------------------------------------------------------
// Scenery: trees and ferns where nobody walks, rubble, and boulders.
function lcg(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296), s / 4294967296);
}
function segDist(p: Vec2, a: Vec2, b: Vec2) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t));
}
const near = (list: [number, number][], x: number, z: number, r: number) => list.some(([a, b]) => Math.hypot(x - a, z - b) < r);
/** Ground that trees and ferns may stand on: outside the walls, crags, road, patrols, hiding places, the start and the postern. */
function plantable(x: number, z: number, clear: number) {
  if (Math.abs(x) > 42.5 || z < 6 || z > 118) return false;
  if (Math.abs(x) < 33 && z < 77) return false;
  if (CRAG_BOXES.some(([x0, x1, z0, z1]) => x > x0 - 2 && x < x1 + 2 && z > z0 - 2 && z < z1 + 2)) return false;
  if (Math.abs(x - 6) < 7 && z > 73) return false;
  if (Math.hypot(x + 40, z - 114) < 5 || Math.hypot(x + 33, z - 19) < 4 || near([[-14, 88], [24, 88]], x, z, 4)) return false;
  if (near(HAY_L, x, z, 2.5) || near(BUSH_L, x, z, 2.5)) return false;
  return !GROUND_PATROLS.some((w) => w.slice(1).some((b, i) => segDist({ x, z }, { x: w[i][0], z: w[i][1] }, { x: b[0], z: b[1] }) < clear));
}
function scatter(seed: number, spacing: number, clear: number, scale: [number, number]): Placed[] {
  const rnd = lcg(seed);
  const out: Placed[] = [];
  for (let z = 8; z < 119; z += spacing)
    for (let x = -43; x < 43; x += spacing) {
      const px = x + (rnd() - 0.5) * spacing * 0.8;
      const pz = z + (rnd() - 0.5) * spacing * 0.8;
      const s = scale[0] + rnd() * (scale[1] - scale[0]);
      const r = rnd() * Math.PI * 2;
      if (plantable(px, pz, clear)) out.push({ x: px, z: Z(pz), s, r });
    }
  return out;
}
const TREES: Placed[] = [
  ...scatter(41, 7, 3.2, [0.8, 1.2]),
  // a few small ones on the crag shelves, off the patrol line
  { x: -43.6, y: 2.4, z: Z(40), s: 0.6, r: 1 },
  { x: -43.6, y: 2.4, z: Z(56), s: 0.55, r: 2 },
  { x: -40, y: 2.4, z: Z(86), s: 0.6, r: 3 },
  { x: -27, y: 2.4, z: Z(89), s: 0.55, r: 4 },
];
const FERNS: Placed[] = scatter(43, 3.4, 1.4, [0.8, 1.4]);
const ROCKS: (Placed & { kind: number })[] = [
  // rubble at the collapsed stretch, outside and in
  { x: 23, z: Z(75), s: 1.3, r: 0.4, kind: 0 },
  { x: 21.2, z: Z(75.6), s: 1.0, r: 1.9, kind: 1 },
  { x: 25.2, z: Z(75.2), s: 1.1, r: 3.1, kind: 0 },
  { x: 23.5, z: Z(68.8), s: 0.9, r: 2.2, kind: 1 },
  // the sea wall's foot
  { x: -20, z: Z(1), s: 1.2, r: 0.7, kind: 0 },
  { x: -28, z: Z(1.4), s: 1.5, r: 2.5, kind: 1 },
  { x: 18, z: Z(0.8), s: 1.1, r: 1.2, kind: 0 },
  { x: 30, z: Z(1.2), s: 1.4, r: 0.1, kind: 1 },
  { x: 37, z: Z(2), s: 1.0, r: 2.8, kind: 0 },
  // the west crags
  { x: -43.5, y: 2.4, z: Z(33), s: 1.3, r: 1.0, kind: 1 },
  { x: -43.5, y: 2.4, z: Z(50), s: 1.0, r: 2.0, kind: 0 },
  { x: -34, y: 4.8, z: Z(36), s: 1.1, r: 0.3, kind: 1 },
  { x: -30, y: 2.4, z: Z(80), s: 1.2, r: 1.6, kind: 0 },
  { x: -24, y: 2.4, z: Z(90), s: 1.4, r: 0.8, kind: 1 },
  // beside the sally port, outside the wall
  { x: -32.5, z: Z(22.5), s: 1.2, r: 0.5, kind: 0 },
  { x: -35, z: Z(20.5), s: 1.0, r: 2.4, kind: 1 },
  // east shelf
  { x: 40, y: 2.4, z: Z(48), s: 1.3, r: 1.4, kind: 0 },
  { x: 37, y: 2.4, z: Z(62), s: 1.1, r: 0.2, kind: 1 },
];

// ---------------------------------------------------------------------------------------------------------------
export const KOTA: LevelDef = {
  id: "kota",
  name: "Kota Batu",
  missionId: "kota-batu",
  seed: 151100,
  shoreZ: Z(0),
  houses: HOUSES,
  finials: [],
  steps: STAIR_STEPS,
  towers: TOWERS,
  palisade: { minX: -45, maxX: 45, minZ: Z(0), maxZ: Z(120) },
  jetty: { x: 0, z: Z(-3), w: 3, d: 8 },
  water: [],
  decks: [],
  boats: [],
  trees: TREES,
  ferns: FERNS,
  trails: [
    // the town road to the gate and on through both wards
    [pt(6, 118), pt(5, 104), pt(8, 92), pt(6, 80), pt(6, 72)],
    [pt(6, 70), pt(5, 62), pt(-4, 54), pt(-10, 48), pt(-10, 42)],
    [pt(-10, 42), pt(-6, 34), pt(0, 28), pt(0, 24)],
    // from the start along the north edge to the road, and the east track under the collapsed stretch
    [pt(-40, 114), pt(-26, 110), pt(-10, 106), pt(5, 104)],
    [pt(6, 78), pt(20, 80), pt(38, 80)],
  ],
  clearings: [
    { x: 6, z: Z(78), r: 7 },
    { x: 0, z: Z(30), r: 9 },
  ],
  forestFloor: [{ x: 0, z: Z(108), w: 90, d: 26 }],
  cliffs: [...WALLS, ...CRAGS],
  rocks: ROCKS,
  stalls: STALLS,
  wells: WELLS,
  cannons: CANNONS,
  hay: HAY_L.map(([x, z]) => pt(x, z)),
  bushes: BUSH_L.map(([x, z]) => pt(x, z)),
  palms: PALMS_L.map(([x, z]) => pt(x, z)),
  prahus: [
    { x: -16, z: Z(-11), rotY: 0.4 },
    { x: 17, z: Z(-14), rotY: -0.3, scale: 1.1 },
    { x: -30, z: Z(-20), rotY: 1.3, scale: 0.9 },
  ],
  ships: [],
  lamps: LAMPS_L.map(([x, z]) => pt(x, z)),
  guards: GUARDS,
  objective: { kind: "steal", at: { x: KEEP.x, y: KEEP.y, z: KEEP.z } },
  start: pt(-40, 114),
  exit: pt(0, -6.2),
  bounds: { minX: -43.6, maxX: 43.6, minZ: Z(-6.4), maxZ: Z(118.6), jettyZ: Z(0), jettyHalf: 1.1 },
  story:
    "The Portuguese have raised a stone fort, the Kota, on the hill above the harbour, and tonight their captains sit in its keep " +
    "over a painted map of Malacca: every gun, every gate, every road they mean to take. The elder Hang Tuah has chosen you, Pendekar, " +
    "to take that map from the table on the keep's roof before the council can use it. There are three ways in. The gate is loud and " +
    "watched from every side. The rocks under the west wall are quiet but steep. And a fort that is hard from the front is always " +
    "soft somewhere behind. When you hold the map, go over the sea wall and down to the jetty.",
  checkpointLabel: "the war map is taken",
  win: {
    title: "The war map is taken",
    body: "You went over the sea wall with the council's map under your baju and were gone before the bell. The Kota still stands, but its masters now plan in the dark.",
  },
  text: {
    objective: "Climb the keep and take the council's war map",
    escape: "Over the sea wall and down to the jetty",
    targetDown: "You have the war map. Over the sea wall to the jetty.",
    take: "Take the council's war map",
  },
};
