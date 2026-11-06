// The connected world: walkable gates that carry the player from one map to the next.
// Data only, no three.js. Gate positions live here (not in each map file) so maps stay independent.
import type { Rect } from "./levels";

export interface ExitDef {
  id: string;
  /** trigger footprint on the map the gate stands in */
  at: Rect;
  /** level id this gate leads to */
  to: string;
  /** where the player appears on the other side, facing rotY (into that map) */
  arrive: { x: number; z: number; rotY: number };
  /** shown in the prompt and on the Peta map, in Malay */
  label: string;
}

/** Gates per level id. Filled in by the world-graph package; every link has a return gate. */
export const EXITS: Record<string, ExitDef[]> = {};

export function exitsOf(levelId: string): ExitDef[] {
  return EXITS[levelId] ?? [];
}

/** The gate whose footprint contains (x, z), if any. */
export function exitAt(levelId: string, x: number, z: number): ExitDef | null {
  for (const e of exitsOf(levelId)) {
    if (Math.abs(x - e.at.x) <= e.at.w / 2 && Math.abs(z - e.at.z) <= e.at.d / 2) return e;
  }
  return null;
}
