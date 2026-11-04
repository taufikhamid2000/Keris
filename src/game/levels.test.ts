import { describe, expect, it } from "vitest";
import { LEVELS } from "./levels";

// Sanity rules every level definition must keep, so a new map fails here rather than in play.
describe.each(LEVELS.map((l) => [l.id, l] as const))("level %s", (_id, l) => {
  const inBounds = (p: { x: number; z: number }) => p.x >= l.bounds.minX && p.x <= l.bounds.maxX && p.z >= l.bounds.minZ && p.z <= l.bounds.maxZ;

  it("has exactly one target guard and every guard patrols at least two waypoints", () => {
    expect(l.guards.filter((g) => g.isTarget)).toHaveLength(1);
    for (const g of l.guards) expect(g.waypoints.length).toBeGreaterThanOrEqual(2);
  });
  it("keeps the start, exit and guard routes inside the playable bounds", () => {
    expect(inBounds(l.start)).toBe(true);
    expect(inBounds(l.exit)).toBe(true);
    for (const g of l.guards) for (const w of g.waypoints) expect(inBounds(w)).toBe(true);
  });
  it("puts the exit out on the jetty, past the shoreline", () => {
    expect(l.exit.z).toBeLessThan(l.shoreZ);
    expect(Math.abs(l.exit.x - l.jetty.x)).toBeLessThanOrEqual(l.jetty.w / 2);
  });
});

it("level ids are unique", () => {
  expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
});
