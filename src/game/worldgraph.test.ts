import { describe, expect, it } from "vitest";
import { LEVELS, type LevelDef, type Rect } from "./levels";
import { EXITS, exitAt, exitsOf } from "./worldgraph";

const level = (id: string) => LEVELS.find((l) => l.id === id) as LevelDef;
const all = Object.entries(EXITS).flatMap(([from, list]) => list.map((e) => ({ from, e })));
/** distance from a point to a rect (0 inside) */
const dist = (r: Rect, x: number, z: number) => Math.hypot(Math.max(0, Math.abs(x - r.x) - r.w / 2), Math.max(0, Math.abs(z - r.z) - r.d / 2));
const solids = (def: LevelDef): Rect[] => [...def.houses, ...(def.cliffs ?? [])];
/** whether a rect, grown by m, overlaps a house or a rock terrace */
const hitsSolid = (def: LevelDef, r: Rect, m: number) =>
  solids(def).some((s) => Math.abs(s.x - r.x) < s.w / 2 + r.w / 2 + m && Math.abs(s.z - r.z) < s.d / 2 + r.d / 2 + m);

describe("world graph", () => {
  it("has unique gate ids", () => {
    const ids = all.map((a) => a.e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keys and destinations are real levels", () => {
    for (const { from, e } of all) {
      expect(level(from), from).toBeTruthy();
      expect(level(e.to), `${e.id} -> ${e.to}`).toBeTruthy();
      expect(e.label.length).toBeGreaterThan(0);
    }
  });

  it("every gate has a return gate in its destination", () => {
    for (const { from, e } of all) {
      expect(exitsOf(e.to).some((b) => b.to === from), `${e.id} has no way back`).toBe(true);
    }
  });

  it("gates and arrivals lie inside their map bounds", () => {
    for (const { from, e } of all) {
      const b = level(from).bounds;
      expect(e.at.x - e.at.w / 2, e.id).toBeGreaterThanOrEqual(b.minX);
      expect(e.at.x + e.at.w / 2, e.id).toBeLessThanOrEqual(b.maxX);
      expect(e.at.z - e.at.d / 2, e.id).toBeGreaterThanOrEqual(b.minZ);
      expect(e.at.z + e.at.d / 2, e.id).toBeLessThanOrEqual(b.maxZ);
      const d = level(e.to).bounds;
      expect(e.arrive.x, e.id).toBeGreaterThan(d.minX);
      expect(e.arrive.x, e.id).toBeLessThan(d.maxX);
      expect(e.arrive.z, e.id).toBeGreaterThan(d.minZ);
      expect(e.arrive.z, e.id).toBeLessThan(d.maxZ);
    }
  });

  it("arrivals stand at least 3 m outside every gate of the destination", () => {
    for (const { e } of all) {
      for (const g of exitsOf(e.to)) {
        expect(dist(g.at, e.arrive.x, e.arrive.z), `${e.id} lands near ${g.id}`).toBeGreaterThanOrEqual(3);
      }
      expect(exitAt(e.to, e.arrive.x, e.arrive.z)).toBeNull();
    }
  });

  it("arrivals and gates stand clear of houses and rock", () => {
    for (const { from, e } of all) {
      expect(hitsSolid(level(e.to), { x: e.arrive.x, z: e.arrive.z, w: 0, d: 0 }, 0.8), `${e.id} arrival in a solid`).toBe(false);
      expect(hitsSolid(level(from), e.at, 0), `${e.id} gate in a solid`).toBe(false);
    }
  });

  it("arrivals and gates stand clear of trees", () => {
    for (const { from, e } of all) {
      for (const t of level(e.to).trees ?? []) expect(Math.hypot(t.x - e.arrive.x, t.z - e.arrive.z), `${e.id} arrival by a tree`).toBeGreaterThan(0.9);
      for (const t of level(from).trees ?? []) expect(dist(e.at, t.x, t.z), `${e.id} gate by a tree`).toBeGreaterThan(0.5);
    }
  });

  it("no mission starts inside a gate", () => {
    for (const id of Object.keys(EXITS)) {
      const s = level(id).start;
      expect(exitAt(id, s.x, s.z), id).toBeNull();
    }
  });

  it("exitAt finds a gate by its footprint", () => {
    expect(exitAt("harbour", 12, 34.2)?.id).toBe("harbour-kampung");
    expect(exitAt("harbour", 0, 0)).toBeNull();
    expect(exitsOf("nowhere")).toEqual([]);
  });
});
