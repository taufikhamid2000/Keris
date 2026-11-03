// Main-menu camera: a slow drift over the harbour water at dusk, looking back at the jetty and town. Pure, so it is unit tested.

export interface CameraPose {
  pos: { x: number; y: number; z: number };
  look: { x: number; y: number; z: number };
}

/** One side-to-side sweep takes this many seconds. */
export const DRIFT_PERIOD = 90;

/** Camera pose at time t (seconds). Sits behind the moored prahu (sea is -z) and faces the town and the dusk sun (+z). */
export function harbourDrift(t: number): CameraPose {
  const x = 16 * Math.sin((t * 2 * Math.PI) / DRIFT_PERIOD);
  const y = 7 + Math.sin(t * 0.05);
  const z = -52 + 2 * Math.cos(t * 0.04);
  return { pos: { x, y, z }, look: { x: x * 0.35, y: 3, z: -22 } };
}
