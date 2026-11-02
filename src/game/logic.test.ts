import { describe, expect, it } from "vitest";
import {
  BRAIN,
  type Brain,
  canSee,
  detectionRate,
  forceAlert,
  hasLineOfSight,
  inVisionCone,
  isBehind,
  newBrain,
  noiseRadius,
  rayBoxDistance,
  stepBrain,
  stepMeter,
  wrapAngle,
  type Box,
} from "./logic";

const wall: Box = { minX: -1, maxX: 1, minY: 0, maxY: 5, minZ: 4, maxZ: 5 };
const calm = { meter: 0, seesPlayer: false, heardNoise: false };

describe("wrapAngle", () => {
  it("wraps into [-pi, pi]", () => {
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI, 5);
    expect(wrapAngle(-Math.PI * 2.5)).toBeCloseTo(-Math.PI / 2, 5);
  });
});

describe("inVisionCone", () => {
  const eye = { x: 0, z: 0 };
  const half = Math.PI / 6; // 30 degrees
  it("sees a target straight ahead within range", () => {
    expect(inVisionCone(eye, 0, { x: 0, z: 10 }, 15, half)).toBe(true);
  });
  it("does not see beyond range", () => {
    expect(inVisionCone(eye, 0, { x: 0, z: 20 }, 15, half)).toBe(false);
  });
  it("does not see behind", () => {
    expect(inVisionCone(eye, 0, { x: 0, z: -5 }, 15, half)).toBe(false);
  });
  it("respects the half angle edge", () => {
    expect(inVisionCone(eye, 0, { x: Math.sin(0.4) * 10, z: Math.cos(0.4) * 10 }, 15, half)).toBe(true);
    expect(inVisionCone(eye, 0, { x: Math.sin(0.7) * 10, z: Math.cos(0.7) * 10 }, 15, half)).toBe(false);
  });
  it("follows the facing yaw", () => {
    expect(inVisionCone(eye, Math.PI / 2, { x: 10, z: 0 }, 15, half)).toBe(true);
    expect(inVisionCone(eye, Math.PI / 2, { x: -10, z: 0 }, 15, half)).toBe(false);
  });
  it("handles wrap-around at +/- pi", () => {
    expect(inVisionCone(eye, Math.PI - 0.05, { x: -0.5, z: -10 }, 15, half)).toBe(true);
  });
});

describe("line of sight", () => {
  it("is blocked by a wall between eye and target", () => {
    expect(hasLineOfSight({ x: 0, y: 1.7, z: 0 }, { x: 0, y: 1, z: 10 }, [wall])).toBe(false);
  });
  it("is clear when the wall is not in the way", () => {
    expect(hasLineOfSight({ x: 5, y: 1.7, z: 0 }, { x: 5, y: 1, z: 10 }, [wall])).toBe(true);
  });
  it("passes over a low wall", () => {
    expect(hasLineOfSight({ x: 0, y: 8, z: 0 }, { x: 0, y: 7, z: 10 }, [wall])).toBe(true);
  });
  it("rayBoxDistance reports the entry distance", () => {
    expect(rayBoxDistance({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }, wall)).toBeCloseTo(4, 5);
  });
});

describe("canSee", () => {
  const eye = { x: 0, y: 1.7, z: 0 };
  const vision = { range: 15, halfAngle: Math.PI / 5 };
  const target = { x: 0, y: 1, z: 10 };
  it("sees an exposed player in the cone", () => {
    expect(canSee(eye, 0, target, vision, [], false)).toBe(true);
  });
  it("cannot see through a wall", () => {
    expect(canSee(eye, 0, target, vision, [wall], false)).toBe(false);
  });
  it("cannot see a hidden player at normal distance", () => {
    expect(canSee(eye, 0, target, vision, [], true)).toBe(false);
  });
  it("sees a hidden player at point-blank range", () => {
    expect(canSee(eye, 0, { x: 0, y: 1, z: 1.2 }, vision, [], true)).toBe(true);
  });
});

describe("detection meter", () => {
  const range = 15;
  it("rises faster the closer the player is", () => {
    const stance = { crouched: false, running: false };
    expect(detectionRate(3, range, stance)).toBeGreaterThan(detectionRate(12, range, stance));
  });
  it("crouching is slower and running is faster", () => {
    const walk = detectionRate(6, range, { crouched: false, running: false });
    expect(detectionRate(6, range, { crouched: true, running: false })).toBeLessThan(walk);
    expect(detectionRate(6, range, { crouched: false, running: true })).toBeGreaterThan(walk);
  });
  it("fills while seen and drains while unseen, clamped to 0..1", () => {
    let m = 0;
    m = stepMeter(m, true, 2, 0.3);
    expect(m).toBeCloseTo(0.6, 5);
    m = stepMeter(m, true, 2, 1);
    expect(m).toBe(1);
    m = stepMeter(m, false, 2, 10);
    expect(m).toBe(0);
  });
  it("noise: crouch < walk < run, silent when still", () => {
    const s = (crouched: boolean, running: boolean) => noiseRadius({ crouched, running }, true);
    expect(s(true, false)).toBeLessThan(s(false, false));
    expect(s(false, false)).toBeLessThan(s(false, true));
    expect(noiseRadius({ crouched: false, running: true }, false)).toBe(0);
  });
});

describe("isBehind", () => {
  it("detects the rear arc", () => {
    const g = { x: 0, z: 0 };
    expect(isBehind(g, 0, { x: 0, z: -1 })).toBe(true);
    expect(isBehind(g, 0, { x: 0, z: 1 })).toBe(false);
    expect(isBehind(g, 0, { x: 1, z: 0 })).toBe(false);
  });
});

describe("guard state machine", () => {
  it("patrol -> suspicious when the meter passes the threshold", () => {
    expect(stepBrain(newBrain(), { ...calm, meter: 0.3 }, 0.1).state).toBe("suspicious");
  });
  it("patrol -> suspicious on noise", () => {
    expect(stepBrain(newBrain(), { ...calm, heardNoise: true }, 0.1).state).toBe("suspicious");
  });
  it("any state -> alert when the meter is full", () => {
    for (const state of ["patrol", "suspicious", "search"] as const) {
      expect(stepBrain({ state, timer: 1 }, { ...calm, meter: 1 }, 0.1).state).toBe("alert");
    }
  });
  it("suspicious -> patrol after the cooldown with nothing new", () => {
    let b = stepBrain(newBrain(), { ...calm, meter: 0.3 }, 0.1);
    for (let t = 0; t < BRAIN.suspiciousCooldown + 0.5; t += 0.1) b = stepBrain(b, calm, 0.1);
    expect(b.state).toBe("patrol");
  });
  it("suspicious stays suspicious while the player is still seen", () => {
    let b: Brain = { state: "suspicious", timer: 0 };
    for (let i = 0; i < 100; i++) b = stepBrain(b, { meter: 0.5, seesPlayer: true, heardNoise: false }, 0.1);
    expect(b.state).toBe("suspicious");
  });
  it("alert -> search after losing sight, -> patrol after searching", () => {
    let b = forceAlert();
    for (let t = 0; t < BRAIN.loseSight + 0.3; t += 0.1) b = stepBrain(b, calm, 0.1);
    expect(b.state).toBe("search");
    for (let t = 0; t < BRAIN.searchTime + 0.3; t += 0.1) b = stepBrain(b, calm, 0.1);
    expect(b.state).toBe("patrol");
  });
  it("alert holds while the player stays in view", () => {
    let b = forceAlert();
    for (let i = 0; i < 100; i++) b = stepBrain(b, { meter: 0.8, seesPlayer: true, heardNoise: false }, 0.1);
    expect(b.state).toBe("alert");
  });
  it("search -> suspicious when the player is spotted again", () => {
    const b = stepBrain({ state: "search", timer: 2 }, { meter: 0.4, seesPlayer: true, heardNoise: false }, 0.1);
    expect(b.state).toBe("suspicious");
  });
});
