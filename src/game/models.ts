// Optional character models from Mixamo (FBX). Drop files into public/models/<role>/ and the game uses them;
// with no files it keeps the built-in procedural figures, so nothing is required to run.
// See docs/models.md for which Mixamo downloads go where.
import * as THREE from "three";

export type Role = "pendekar" | "guard" | "target";
/** Animation slots the engine asks for. Missing ones fall back (see FALLBACK). */
export type Anim = "idle" | "walk" | "run" | "crouchIdle" | "crouchWalk" | "stab" | "death" | "jump" | "carry";

export const ANIM_FILES: Record<Anim, string> = {
  idle: "idle.fbx",
  walk: "walk.fbx",
  run: "run.fbx",
  crouchIdle: "crouch-idle.fbx",
  crouchWalk: "crouch-walk.fbx",
  stab: "stab.fbx",
  death: "death.fbx",
  jump: "jump.fbx",
  carry: "carry.fbx",
};
/** played once and held on the last frame, instead of looping */
const ONE_SHOT: Anim[] = ["stab", "death", "jump"];
const FALLBACK: Partial<Record<Anim, Anim>> = { run: "walk", crouchIdle: "idle", crouchWalk: "walk", carry: "walk" };
/** the target uses the guard files when it has none of its own */
const ROLE_FALLBACK: Partial<Record<Role, Role>> = { target: "guard" };
/** characters are scaled to this height (metres), whatever size the FBX was exported at */
const HEIGHT: Record<Role, number> = { pendekar: 1.8, guard: 1.85, target: 1.8 };

export interface RigTemplate {
  role: Role;
  object: THREE.Group;
  clips: Partial<Record<Anim, THREE.AnimationClip>>;
}

const base = (role: Role) => `/models/${role}/`;

async function exists(url: string) {
  try {
    const r = await fetch(url, { method: "HEAD" });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Mixamo clips move the hips forward when "In Place" is not ticked; the engine moves the character itself,
 * so keep the hips over the origin on the ground plane (height is kept for crouches and bobbing).
 */
function stripRootMotion(clip: THREE.AnimationClip) {
  for (const t of clip.tracks) {
    if (!/hips\.position$/i.test(t.name)) continue;
    const v = t.values;
    const x0 = v[0];
    const z0 = v[2];
    for (let i = 0; i < v.length; i += 3) {
      v[i] = x0;
      v[i + 2] = z0;
    }
  }
}

/** Load one role's character and clips, or null when public/models/<role>/character.fbx is absent. */
async function loadRole(role: Role): Promise<RigTemplate | null> {
  const url = base(role) + "character.fbx";
  if (!(await exists(url))) return null;
  const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
  const loader = new FBXLoader();
  const object = await loader.loadAsync(url);
  object.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      // skinned meshes are culled by their bind-pose bounds, which can pop them out of view mid-animation
      m.frustumCulled = false;
    }
  });
  // normalise height and stand the feet on y=0
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const h = box.max.y - box.min.y;
  if (h > 0) object.scale.multiplyScalar(HEIGHT[role] / h);
  object.updateMatrixWorld(true);
  object.position.y -= new THREE.Box3().setFromObject(object).min.y;

  const clips: RigTemplate["clips"] = {};
  // a character exported "with skin" may carry its own clip; use it as idle when there is no idle.fbx
  if (object.animations[0]) clips.idle = object.animations[0];
  await Promise.all(
    (Object.keys(ANIM_FILES) as Anim[]).map(async (a) => {
      const f = base(role) + ANIM_FILES[a];
      if (!(await exists(f))) return;
      try {
        const clip = (await loader.loadAsync(f)).animations[0];
        if (!clip) return;
        clip.name = a;
        stripRootMotion(clip);
        clips[a] = clip;
      } catch (e) {
        console.warn(`[models] could not load ${f}`, e);
      }
    }),
  );
  return { role, object, clips };
}

/** Load every role in parallel. Roles without files are left out; the target borrows the guard's. */
export async function loadRigs(): Promise<Partial<Record<Role, RigTemplate>>> {
  const roles: Role[] = ["pendekar", "guard", "target"];
  const out: Partial<Record<Role, RigTemplate>> = {};
  const loaded = await Promise.all(roles.map((r) => loadRole(r).catch((e) => (console.warn(`[models] ${r} failed`, e), null))));
  roles.forEach((r, i) => {
    const t = loaded[i];
    if (t) out[r] = t;
  });
  for (const r of roles) {
    const fb = ROLE_FALLBACK[r];
    if (!out[r] && fb && out[fb]) out[r] = out[fb];
  }
  return out;
}

/** One animated character instance: a skeleton-safe clone of a template plus its mixer. */
export class Rig {
  readonly object: THREE.Object3D;
  private mixer: THREE.AnimationMixer;
  private actions: Partial<Record<Anim, THREE.AnimationAction>> = {};
  private current: Anim | null = null;

  constructor(t: RigTemplate, clone: (o: THREE.Object3D) => THREE.Object3D) {
    this.object = clone(t.object);
    this.mixer = new THREE.AnimationMixer(this.object);
    for (const [name, clip] of Object.entries(t.clips) as [Anim, THREE.AnimationClip][]) {
      const a = this.mixer.clipAction(clip);
      if (ONE_SHOT.includes(name)) {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      this.actions[name] = a;
    }
  }

  has(a: Anim) {
    return !!this.actions[a];
  }

  /** The clip that would play for `a` after fallbacks, or null. */
  private resolve(a: Anim): Anim | null {
    let k: Anim | undefined = a;
    while (k && !this.actions[k]) k = FALLBACK[k];
    return k ?? null;
  }

  /** Cross-fade to `a` (or its fallback). Calling it again with the same slot does nothing; `restart` replays a one-shot. */
  play(a: Anim, fade = 0.2, restart = false) {
    const k = this.resolve(a);
    if (!k || (k === this.current && !restart)) return;
    const next = this.actions[k]!;
    const prev = this.current ? this.actions[this.current] : null;
    next.reset().setEffectiveWeight(1).fadeIn(fade).play();
    if (prev && prev !== next) prev.fadeOut(fade);
    this.current = k;
  }

  /** The slot playing now (after fallbacks). */
  get playing() {
    return this.current;
  }

  update(dt: number) {
    this.mixer.update(dt);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.object);
  }
}
