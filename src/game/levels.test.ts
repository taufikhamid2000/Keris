import { describe, expect, it } from "vitest";
import { LEVELS, initialLevel } from "./levels";

// Sanity rules every level definition must keep, so a new map fails here rather than in play.
describe.each(LEVELS.map((l) => [l.id, l] as const))("level %s", (_id, l) => {
  const inBounds = (p: { x: number; z: number }) => p.x >= l.bounds.minX && p.x <= l.bounds.maxX && p.z >= l.bounds.minZ && p.z <= l.bounds.maxZ;

  it("marks one target guard for a kill objective (none otherwise) and every guard patrols at least two waypoints", () => {
    expect(l.guards.filter((g) => g.isTarget)).toHaveLength(l.objective.kind === "kill" ? 1 : 0);
    if (l.objective.kind === "steal") expect(inBounds(l.objective.at)).toBe(true);
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

describe("initial mission on the title", () => {
  it("prefers ?level, then the mission with a saved attempt, then the first", () => {
    expect(initialLevel("?level=kampung", "malacca-1511").id).toBe("kampung");
    expect(initialLevel("", "kampung-hulu").id).toBe("kampung");
    expect(initialLevel("", null)).toBe(LEVELS[0]);
    expect(initialLevel("?level=nope", "kampung-hulu")).toBe(LEVELS[0]);
  });
  it("every mission has its own wording and save key", () => {
    for (const l of LEVELS) expect(l.story.length && l.checkpointLabel.length && l.win.title.length && l.name.length).toBeTruthy();
    expect(new Set(LEVELS.map((l) => l.missionId)).size).toBe(LEVELS.length);
  });
});
