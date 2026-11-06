import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { blocksFootprint, buildLevel, gateParts, gateStyle } from "./level";
import { LEVELS } from "./levels";

const getLevel = (id: string) => LEVELS.find((l) => l.id === id)!;
import { EXITS, type ExitDef } from "./worldgraph";

// buildLevel paints a few canvas textures; a blank canvas is enough to build a level in node
beforeAll(() => {
  const ctx: unknown = new Proxy(function () {}, { get: () => ctx, apply: () => ctx, set: () => true });
  (globalThis as unknown as { document: unknown }).document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => ctx }),
  };
});
afterEach(() => {
  for (const k of Object.keys(EXITS)) delete EXITS[k];
});

const gate = (id: string, to: string, at: ExitDef["at"]): ExitDef => ({ id, at, to, arrive: { x: 0, z: 0, rotY: 0 }, label: "Pintu" });

describe("gate markers", () => {
  it("leaves body height free over the footprint (only a high lintel crosses it)", () => {
    const e = gate("g", "kampung", { x: 10, z: -4, w: 4, d: 2 });
    for (const p of gateParts(e)) {
      if (p.shape !== "box" || p.sy < 0.2) continue;
      const over = Math.abs(p.x - 10) < 2 + p.sx / 2 - 0.01 && Math.abs(p.z + 4) < 1 + p.sz / 2 - 0.01;
      const inside = Math.abs(p.x - 10) < 2 - p.sx / 2 + 0.01 && Math.abs(p.z + 4) < 1 - p.sz / 2 + 0.01;
      if (inside && over) expect(p.y - p.sy / 2).toBeGreaterThan(2.2);
    }
  });
  it("styles by destination", () => {
    expect(gateStyle("gualanun")).toBe("gua");
    expect(gateStyle("kota")).toBe("kota");
    expect(gateStyle("jungle")).toBe("pintu");
  });
  it("adds meshes but no colliders over the footprint", () => {
    const at = { x: 0, z: -12, w: 3, d: 2 };
    const before = buildLevel(getLevel("harbour"));
    EXITS.harbour = [gate("h-test", "kampung", at)];
    const after = buildLevel(getLevel("harbour"));
    expect(after.colliders.length).toBe(before.colliders.length);
    expect(after.colliders.some((b) => blocksFootprint(b, at))).toBe(false);
    let n = 0;
    after.root.traverse(() => n++);
    let m = 0;
    before.root.traverse(() => m++);
    expect(n).toBeGreaterThan(m);
  });
});

// the places where the world-graph gates will stand must be walkable ground in every map
const SPOTS: [string, string, ExitDef["at"]][] = [
  ["masjid", "alley gate by the start", { x: -31.5, z: 29.8, w: 2.4, d: 3.6 }],
  ["gualanun", "glade mouth, south end of the cleft", { x: 66.25, z: 4, w: 6, d: 2.2 }],
  ["penjara", "yard corner by the start", { x: -103.4, z: -17.5, w: 3.4, d: 1.8 }],
  ["penjara", "drain landing over the river", { x: -81.25, z: 30.9, w: 2.5, d: 1.5 }],
  ["kota", "beach below the sea wall", { x: 0, z: 301.6, w: 7, d: 2.4 }],
  ["kota", "sally port in the west wall", { x: -29.5, z: 320, w: 3, d: 2 }],
];
describe("gate spots are walkable", () => {
  for (const [id, name, at] of SPOTS)
    it(`${id}: ${name}`, () => {
      const level = buildLevel(getLevel(id));
      expect(level.colliders.filter((b) => blocksFootprint(b, at))).toEqual([]);
    });
});
