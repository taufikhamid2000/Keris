// Pure game logic: no three.js, no DOM. Everything here is unit-tested.
// Coordinates: x/z are the ground plane, y is up. A "yaw" of 0 faces +z and
// the forward vector for a yaw is (sin yaw, cos yaw).

export interface Vec2 {
  x: number;
  z: number;
}
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
export interface Box {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function wrapAngle(a: number): number {
  let r = a % (Math.PI * 2);
  if (r > Math.PI) r -= Math.PI * 2;
  if (r < -Math.PI) r += Math.PI * 2;
  return r;
}

export const yawTo = (from: Vec2, to: Vec2) => Math.atan2(to.x - from.x, to.z - from.z);
export const dist2D = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);

/** Is `target` inside the horizontal vision cone (range + half-angle) of an eye facing `facingYaw`? */
export function inVisionCone(
  eye: Vec2,
  facingYaw: number,
  target: Vec2,
  range: number,
  halfAngle: number,
): boolean {
  const dx = target.x - eye.x;
  const dz = target.z - eye.z;
  const d2 = dx * dx + dz * dz;
  if (d2 > range * range) return false;
  if (d2 < 1e-6) return true;
  const diff = Math.abs(wrapAngle(Math.atan2(dx, dz) - facingYaw));
  return diff <= halfAngle;
}

/** Slab test. Returns distance along the (normalised) ray to the box, or null. 0 if origin is inside. */
export function rayBoxDistance(o: Vec3, d: Vec3, b: Box, maxDist = Infinity): number | null {
  let tmin = 0;
  let tmax = maxDist;
  const axes: [number, number, number, number][] = [
    [o.x, d.x, b.minX, b.maxX],
    [o.y, d.y, b.minY, b.maxY],
    [o.z, d.z, b.minZ, b.maxZ],
  ];
  for (const [oo, dd, lo, hi] of axes) {
    if (Math.abs(dd) < 1e-9) {
      if (oo < lo || oo > hi) return null;
    } else {
      let t1 = (lo - oo) / dd;
      let t2 = (hi - oo) / dd;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  return tmin;
}

/** Nearest hit of a ray against many boxes. */
export function raycastBoxes(o: Vec3, d: Vec3, boxes: Box[], maxDist: number): number | null {
  let best: number | null = null;
  for (const b of boxes) {
    const t = rayBoxDistance(o, d, b, maxDist);
    if (t !== null && (best === null || t < best)) best = t;
  }
  return best;
}

/** Line of sight: true if no occluding box lies on the segment from -> to. */
export function hasLineOfSight(from: Vec3, to: Vec3, occluders: Box[]): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) return true;
  const dir = { x: dx / len, y: dy / len, z: dz / len };
  const hit = raycastBoxes(from, dir, occluders, len);
  return hit === null || hit >= len - 0.05;
}

export interface VisionParams {
  range: number;
  halfAngle: number;
}

/** Full sight check: cone + line of sight. A hidden player is only seen at point-blank range. */
export function canSee(
  eye: Vec3,
  yaw: number,
  target: Vec3,
  vision: VisionParams,
  occluders: Box[],
  hidden: boolean,
): boolean {
  const range = hidden ? Math.min(vision.range, 1.8) : vision.range;
  if (!inVisionCone({ x: eye.x, z: eye.z }, yaw, { x: target.x, z: target.z }, range, vision.halfAngle)) {
    return false;
  }
  return hasLineOfSight(eye, target, occluders);
}

// ---------------------------------------------------------------- detection

export interface Stance {
  crouched: boolean;
  running: boolean;
}

/** Detection meter gain per second while seen. Closer = faster; crouching slower; running faster. */
export function detectionRate(distance: number, range: number, stance: Stance): number {
  const closeness = clamp(1 - distance / range, 0, 1);
  let rate = 0.3 + 1.9 * closeness;
  if (stance.crouched) rate *= 0.6;
  if (stance.running) rate *= 1.4;
  return rate;
}

/** Advance a 0..1 detection meter: rises while seen, decays otherwise. */
export function stepMeter(meter: number, seen: boolean, rate: number, dt: number, decay = 0.25): number {
  return clamp(seen ? meter + rate * dt : meter - decay * dt, 0, 1);
}

/** How far the player's footsteps carry, in metres. */
export function noiseRadius(stance: Stance, moving: boolean): number {
  if (!moving) return 0;
  if (stance.crouched) return 1.8;
  return stance.running ? 8 : 4;
}

/** True if `player` is in the rear arc of a guard facing `guardYaw`. */
export function isBehind(guard: Vec2, guardYaw: number, player: Vec2, maxDot = -0.25): boolean {
  const dx = player.x - guard.x;
  const dz = player.z - guard.z;
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return true;
  const dot = (Math.sin(guardYaw) * dx + Math.cos(guardYaw) * dz) / len;
  return dot < maxDot;
}

// ---------------------------------------------------------------- guard brain

export type GuardState = "patrol" | "suspicious" | "alert" | "search";

export interface Brain {
  state: GuardState;
  /** seconds spent in the current "waiting" condition (unsure / lost sight / searching) */
  timer: number;
}

export interface Senses {
  meter: number;
  seesPlayer: boolean;
  heardNoise: boolean;
}

export const BRAIN = {
  suspiciousAt: 0.25,
  alertAt: 1,
  suspiciousCooldown: 4,
  loseSight: 3,
  searchTime: 8,
} as const;

export const newBrain = (): Brain => ({ state: "patrol", timer: 0 });

/** Pure transition function of the guard state machine. */
export function stepBrain(brain: Brain, s: Senses, dt: number): Brain {
  if (s.meter >= BRAIN.alertAt) return brain.state === "alert" ? { ...brain, timer: 0 } : { state: "alert", timer: 0 };

  switch (brain.state) {
    case "patrol":
      if (s.meter >= BRAIN.suspiciousAt || s.heardNoise) return { state: "suspicious", timer: 0 };
      return brain;
    case "suspicious": {
      if (s.seesPlayer || s.meter >= BRAIN.suspiciousAt || s.heardNoise) return { ...brain, timer: 0 };
      const timer = brain.timer + dt;
      return timer >= BRAIN.suspiciousCooldown ? { state: "patrol", timer: 0 } : { ...brain, timer };
    }
    case "alert": {
      if (s.seesPlayer) return { ...brain, timer: 0 };
      const timer = brain.timer + dt;
      return timer >= BRAIN.loseSight ? { state: "search", timer: 0 } : { ...brain, timer };
    }
    case "search": {
      if (s.seesPlayer && s.meter >= BRAIN.suspiciousAt) return { state: "suspicious", timer: 0 };
      const timer = brain.timer + dt;
      return timer >= BRAIN.searchTime ? { state: "patrol", timer: 0 } : { ...brain, timer };
    }
  }
}

/** Another guard shouted: jump straight to alert. */
export const forceAlert = (): Brain => ({ state: "alert", timer: 0 });
