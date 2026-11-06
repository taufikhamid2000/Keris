import { beforeAll, describe, expect, it } from "vitest";
import { blocksFootprint, buildLevel } from "./level";
import { LEVELS } from "./levels";
import { EXITS } from "./worldgraph";

// buildLevel paints a few canvas textures; a blank canvas is enough to build a level in node
beforeAll(() => {
  const ctx: unknown = new Proxy(function () {}, { get: () => ctx, apply: () => ctx, set: () => true });
  (globalThis as unknown as { document: unknown }).document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
});

const all = Object.entries(EXITS).flatMap(([from, list]) => list.map((e) => [from, e] as const));

describe("real gates are walkable", () => {
  for (const [from, e] of all) {
    it(`${e.id}: footprint is clear in ${from}`, () => {
      const level = buildLevel(LEVELS.find((l) => l.id === from)!);
      expect(level.colliders.filter((b) => blocksFootprint(b, e.at))).toEqual([]);
    });
    it(`${e.id}: arrival point is clear in ${e.to}`, () => {
      const level = buildLevel(LEVELS.find((l) => l.id === e.to)!);
      const spot = { x: e.arrive.x, z: e.arrive.z, w: 1, d: 1 };
      expect(level.colliders.filter((b) => blocksFootprint(b, spot))).toEqual([]);
    });
  }
});
