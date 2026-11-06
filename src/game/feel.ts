/**
 * Game feel: camera shake (trauma), hit-stop and a weighted camera dip. Plain numbers, no three.js.
 * Kept quiet on purpose: this is a stealth game, so most events get a nudge, not a jolt.
 */

/** One event's feedback: trauma added (0..1, shake is trauma squared), hit-stop seconds, camera dip metres. */
export interface Kick {
  trauma?: number;
  stop?: number;
  dip?: number;
}

/** Sized to the event: a pickup is a nudge, a kill is a beat, getting cut is the loudest. */
export const KICK = {
  takedown: { trauma: 0.28, stop: 0.07, dip: 0.04 },
  air: { trauma: 0.42, stop: 0.09, dip: 0.09 },
  strike: { trauma: 0.14, stop: 0.035 },
  heavy: { trauma: 0.3, stop: 0.06 },
  parry: { trauma: 0.22, stop: 0.06 },
  hurt: { trauma: 0.4, stop: 0.05 },
  knifeStun: { trauma: 0.1, stop: 0.04 },
  spotted: { trauma: 0.12 },
  carry: { dip: 0.06 },
  drop: { dip: 0.035 },
  charm: { dip: 0.025 },
} satisfies Record<string, Kick>;

export const FEEL = {
  /** trauma lost per second */
  decay: 1.4,
  /** camera offset (metres) and roll (radians) at full trauma */
  maxOffset: 0.07,
  maxRoll: 0.014,
  /** noise speed of the shake */
  freq: 17,
  /** world speed during hit-stop */
  stopScale: 0.05,
  /** dip spring stiffness (critically damped) */
  stiff: 130,
  /** charm pop and guard marker pop lengths, seconds */
  charmPop: 0.45,
  markerPop: 0.35,
};

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** back ease-out: overshoots then settles (pops) */
export function easeOutBack(k: number, s = 1.70158): number {
  const t = clamp01(k) - 1;
  return 1 + (s + 1) * t * t * t + s * t * t;
}

/** Landing: how far the camera dips for a given impact speed (m/s, positive down). A plain jump barely registers. */
export function landDip(fallSpeed: number): number {
  return clamp01((fallSpeed - 4) / 14) * 0.12;
}
/** Landing: shake only for real drops (off a roof, not a hop). */
export function landTrauma(fallSpeed: number): number {
  return Math.min(0.3, Math.max(0, (fallSpeed - 11) / 10));
}

/** Guard marker scale while it pops: noticing swells past full size and settles; losing you shrinks it away. */
export function markerPopScale(t: number, gain: boolean): number {
  const k = clamp01(t / FEEL.markerPop);
  if (gain) return 1 + 0.55 * Math.sin(Math.PI * k) * (1 - k * 0.5);
  // a small last swell, then gone: he has given up
  if (k < 0.3) return 1 + 0.25 * (k / 0.3);
  const r = 1 - (k - 0.3) / 0.7;
  return 1.25 * r * r;
}

/** Charm pickup: swells and lifts, then shrinks to nothing. Returns scale and extra height. */
export function charmPop(t: number): { scale: number; lift: number } {
  const k = clamp01(t / FEEL.charmPop);
  const scale = k < 0.4 ? 1 + 0.5 * easeOutBack(k / 0.4) : 1.5 * (1 - (k - 0.4) / 0.6);
  return { scale: Math.max(0, scale), lift: 0.5 * k * (2 - k) };
}

/** smooth pseudo-noise in about -1..1: a few incommensurate sines, so the shake drifts rather than buzzes */
function wobble(t: number, seed: number): number {
  return Math.sin(t + seed) * 0.5 + Math.sin(t * 2.31 + seed * 1.7) * 0.3 + Math.sin(t * 3.77 + seed * 2.9) * 0.2;
}

export class Feel {
  trauma = 0;
  private stopT = 0;
  private t = 0;
  /** camera dip spring: displacement (metres, negative is down) and velocity */
  dipY = 0;
  private dipV = 0;
  /** "Kurangkan gegaran": no shake and no dip; hit-stop and marker pops stay (they are not camera motion) */
  reduce = false;

  kick(k: Kick) {
    if (k.trauma) this.trauma = Math.min(1, this.trauma + k.trauma);
    if (k.stop) this.stopT = Math.max(this.stopT, k.stop);
    if (k.dip) this.dip(k.dip);
  }

  /** push the camera down by about `metres` at the bottom of the dip */
  dip(metres: number) {
    // critically damped: peak = v0 / (e * w)
    this.dipV -= metres * Math.E * Math.sqrt(FEEL.stiff);
  }

  /** Advance by real time; returns the world time scale (hit-stop slows the world, never the input). */
  step(dt: number): number {
    this.t += dt;
    this.trauma = Math.max(0, this.trauma - FEEL.decay * dt);
    const w = Math.sqrt(FEEL.stiff);
    // semi-implicit Euler is stable at these rates; dt is capped at 0.05 by the loop
    this.dipV += (-FEEL.stiff * this.dipY - 2 * w * this.dipV) * dt;
    this.dipY += this.dipV * dt;
    if (Math.abs(this.dipY) < 1e-4 && Math.abs(this.dipV) < 1e-3) this.dipY = this.dipV = 0;
    if (this.stopT > 0) {
      this.stopT -= dt;
      return FEEL.stopScale;
    }
    return 1;
  }

  /** camera offset to add this frame: right/up in metres, roll in radians, and the dip */
  offset(): { x: number; y: number; roll: number; dip: number } {
    if (this.reduce) return { x: 0, y: 0, roll: 0, dip: 0 };
    const s = this.trauma * this.trauma;
    const t = this.t * FEEL.freq;
    return {
      x: FEEL.maxOffset * s * wobble(t, 1.3),
      y: FEEL.maxOffset * s * wobble(t, 7.1),
      roll: FEEL.maxRoll * s * wobble(t, 4.2),
      dip: this.dipY,
    };
  }

  reset() {
    this.trauma = 0;
    this.stopT = 0;
    this.dipY = 0;
    this.dipV = 0;
  }
}
