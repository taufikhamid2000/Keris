import { describe, expect, it } from "vitest";
import { DRIFT_PERIOD, harbourDrift } from "./menuCamera";

describe("harbourDrift", () => {
  it("stays over the water, behind the boats, facing the town", () => {
    for (let t = 0; t < 600; t += 7) {
      const { pos, look } = harbourDrift(t);
      expect(pos.z).toBeLessThan(-46); // prahu are moored around z -36..-44
      expect(Math.abs(pos.x)).toBeLessThanOrEqual(16);
      expect(pos.y).toBeGreaterThan(5);
      expect(look.z).toBeGreaterThan(pos.z); // looking +z, toward town and sun
    }
  });
  it("moves slowly", () => {
    const a = harbourDrift(10).pos;
    const b = harbourDrift(10.1).pos;
    expect(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)).toBeLessThan(0.2);
  });
  it("sweeps side to side over one period", () => {
    expect(harbourDrift(DRIFT_PERIOD / 4).pos.x).toBeCloseTo(16);
    expect(harbourDrift((3 * DRIFT_PERIOD) / 4).pos.x).toBeCloseTo(-16);
  });
});
