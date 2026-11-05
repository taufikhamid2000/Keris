import * as THREE from "three";
import { SEA_MUD, TIDE, floodShare, isTidal, mudShare, seaMudY } from "./tide";

// The tide's meshes: mudflats under the sea shore and along the river beds, and the water sheets they move.
// Built by buildLevel (level.ts), moved each frame by the engine with applyTide.

/** the sea's surface at the top of the tide (just under the ground) and at mid tide (just under the shore mud) */
const SEA_Y = { high: -0.02, mid: -0.045 };
const RIVER_Y = { base: 0.06, flood: 0.11 };

export interface TideScene {
  sea: THREE.Mesh;
  rivers: { mesh: THREE.Mesh; d: number }[];
}

const mudMat = () => new THREE.MeshStandardMaterial({ color: 0x4a3a29, roughness: 0.55, metalness: 0.05 });

/** Lay the mudflats under the sea shore and the tidal rivers; `sheets` are the water meshes level.ts made for `water`. */
export function addTideScene(
  root: THREE.Group,
  shoreZ: number,
  sea: THREE.Mesh,
  water: { x: number; z: number; w: number; d: number }[],
  sheets: THREE.Mesh[],
): TideScene {
  // the shore: a gentle slope of mud out under the sea, bared as the water drops
  const slope = Math.atan2(SEA_MUD.topY - SEA_MUD.bottomY, SEA_MUD.len);
  const shore = new THREE.Mesh(new THREE.PlaneGeometry(72, SEA_MUD.len / Math.cos(slope)), mudMat());
  shore.rotation.x = -Math.PI / 2 - slope;
  shore.position.set(0, (SEA_MUD.topY + SEA_MUD.bottomY) / 2, shoreZ - SEA_MUD.len / 2);
  shore.receiveShadow = true;
  root.add(shore);
  const rivers: TideScene["rivers"] = [];
  water.forEach((r, i) => {
    if (!isTidal(r) || !sheets[i]) return;
    // the river bed: mud under the water sheet, seen where the sheet narrows at low water
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), mudMat());
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(r.x, 0.035, r.z);
    bed.receiveShadow = true;
    root.add(bed);
    rivers.push({ mesh: sheets[i], d: r.d });
  });
  return { sea, rivers };
}

/** Move the water to the tide (k: 0 dead low water, 1 the top of the tide). */
export function applyTide(t: TideScene, k: number) {
  const m = mudShare(k);
  const f = floodShare(k);
  // the sea: below mid tide, just under the edge of the bared mud; above it, creeping up to the shoreline
  t.sea.position.y = m > 0 ? seaMudY(TIDE.seaMud * m) - 0.01 : SEA_Y.mid + ((SEA_Y.high - SEA_Y.mid) * (k - 0.6)) / 0.4;
  // the river: narrower at low water (baring the bed by each bank), wider and a touch higher over its banks at high water
  for (const r of t.rivers) {
    const d = Math.max(1, r.d - 2 * TIDE.riverMud * m + 2 * TIDE.flood * f);
    r.mesh.scale.y = d / r.d;
    r.mesh.position.y = RIVER_Y.base + (RIVER_Y.flood - RIVER_Y.base) * f;
  }
}

/** The sea's surface at this tide (for the swimmer's ripple). */
export const seaSurface = (t: TideScene | null | undefined) => t?.sea.position.y ?? -0.3;
