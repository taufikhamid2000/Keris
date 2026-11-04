// Optional character models. Drop files into public/models/<role>/ (or upload them to the storage bucket) and the
// game uses them; with none it keeps the built-in procedural figures, so nothing is required to run.
// Formats: GLB / glTF (e.g. the CC0 Quaternius packs) and FBX (e.g. Mixamo). See docs/models.md.
import * as THREE from "three";

export type Role = "pendekar" | "guard" | "target";
/** Animation slots the engine asks for. Missing ones fall back (see FALLBACK). */
export type Anim = "idle" | "walk" | "run" | "crouchIdle" | "crouchWalk" | "stab" | "death" | "jump" | "carry" | "roll" | "hit" | "block";
export const ANIMS: Anim[] = ["idle", "walk", "run", "crouchIdle", "crouchWalk", "stab", "death", "jump", "carry", "roll", "hit", "block"];

/** one file per slot (any model extension), which wins over a clip picked from an animation library */
export const ANIM_FILES: Record<Anim, string> = {
  idle: "idle",
  walk: "walk",
  run: "run",
  crouchIdle: "crouch-idle",
  crouchWalk: "crouch-walk",
  stab: "stab",
  death: "death",
  jump: "jump",
  carry: "carry",
  roll: "roll",
  hit: "hit",
  block: "block",
};
const MODEL_EXT = /\.(glb|gltf|fbx)$/i;
/** played once and held on the last frame, instead of looping */
const ONE_SHOT: Anim[] = ["stab", "death", "jump", "roll", "hit"];
const FALLBACK: Partial<Record<Anim, Anim>> = { run: "walk", crouchIdle: "idle", crouchWalk: "walk", carry: "walk", roll: "jump", block: "idle" };
/** the target uses the guard files when it has none of its own */
const ROLE_FALLBACK: Partial<Record<Role, Role>> = { target: "guard" };
/** characters are scaled to this height (metres), whatever size the file was exported at */
const HEIGHT: Record<Role, number> = { pendekar: 1.8, guard: 1.85, target: 1.8 };
/** colour multiplied into a role's materials, so guards sharing the player's model still read as guards */
const TINT: Partial<Record<Role, number>> = { guard: 0xc8705a };

export interface RigTemplate {
  role: Role;
  object: THREE.Object3D;
  clips: Partial<Record<Anim, THREE.AnimationClip>>;
}

/** where the files are served from: NEXT_PUBLIC_MODELS_URL (a storage bucket, set at build time), else public/models */
const MODELS_URL = (process.env.NEXT_PUBLIC_MODELS_URL || "/models").replace(/\/+$/, "");

/**
 * manifest.json lists the files in each folder (written by `npm run models:manifest` and `models:upload`), so the
 * game makes one request to learn what exists instead of probing every name.
 */
export interface Manifest {
  folders: Record<string, string[]>;
}

/**
 * Pick a library clip for each slot by name. Rules run in order and the first clip that matches wins. Clip names
 * differ between packs, so a clips.json ({ "walk": "Walk_Loop", ... }) in the folder overrides any of these.
 */
const RULES: Record<Anim, ((n: string) => boolean)[]> = {
  idle: [(n) => /^idle(_loop)?$/.test(n), (n) => /idle/.test(n) && !/crouch|sit|swim|gun|pistol|rifle/.test(n)],
  walk: [(n) => /^walk(_loop|_fwd|_forward)?$/.test(n), (n) => /walk/.test(n) && !/crouch|back|left|right|carry|gun|pistol|rifle|zombie/.test(n)],
  run: [(n) => /^(run|jog)(_loop|_fwd|_forward)?$/.test(n), (n) => /jog|run|sprint/.test(n) && !/back|left|right|gun|pistol|rifle|zombie/.test(n)],
  crouchIdle: [(n) => /crouch/.test(n) && /idle/.test(n)],
  crouchWalk: [(n) => /crouch/.test(n) && /walk|fwd|forward|move/.test(n) && !/back|left|right/.test(n), (n) => /sneak/.test(n)],
  stab: [
    (n) => /stab/.test(n),
    (n) => /(sword|dagger|knife).*(attack|slash|swing)|(attack|slash|swing).*(sword|dagger|knife)/.test(n),
    (n) => /punch/.test(n),
    (n) => /attack|slash/.test(n),
  ],
  death: [(n) => /death|die|dying|dead/.test(n)],
  jump: [(n) => /^jump(_start)?$/.test(n), (n) => /jump/.test(n) && !/land/.test(n)],
  carry: [(n) => /carry/.test(n)],
  roll: [(n) => /^roll/.test(n), (n) => /roll|dodge/.test(n)],
  hit: [(n) => /^hit(_chest)?$/.test(n), (n) => /hit|hurt|impact/.test(n) && !/head/.test(n), (n) => /hit|hurt/.test(n)],
  // no parry clip in the Quaternius pack: a held sword stance stands in
  block: [(n) => /block|parry/.test(n), (n) => /(sword|fight|combat).*idle/.test(n)],
};
export function matchClips(names: string[], overrides: Partial<Record<Anim, string>> = {}): Partial<Record<Anim, string>> {
  const out: Partial<Record<Anim, string>> = {};
  for (const a of ANIMS) {
    const o = overrides[a];
    if (o && names.includes(o)) {
      out[a] = o;
      continue;
    }
    for (const rule of RULES[a]) {
      const hit = names.find((n) => rule(n.toLowerCase()));
      if (hit) {
        out[a] = hit;
        break;
      }
    }
  }
  return out;
}

/**
 * Clips that move the character forward (Mixamo without "In Place", some library clips) fight the engine, which
 * moves the character itself: pin the root bone over the origin on the ground plane, keeping its height.
 */
function stripRootMotion(clip: THREE.AnimationClip) {
  for (const t of clip.tracks) {
    if (!/(hips|pelvis|root)\.position$/i.test(t.name)) continue;
    const v = t.values;
    const x0 = v[0];
    const z0 = v[2];
    for (let i = 0; i < v.length; i += 3) {
      v[i] = x0;
      v[i + 2] = z0;
    }
  }
}

interface Loaded {
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
}
type GltfLoaderLike = { loadAsync(url: string): Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }> };
type FbxLoaderLike = { loadAsync(url: string): Promise<THREE.Group> };
let gltfLoader: Promise<GltfLoaderLike> | null = null;
let fbxLoader: Promise<FbxLoaderLike> | null = null;
/** Load a GLB/glTF or FBX file; the loaders are only downloaded when a model exists. */
async function loadFile(url: string): Promise<Loaded> {
  if (/\.fbx$/i.test(url)) {
    fbxLoader ??= import("three/examples/jsm/loaders/FBXLoader.js").then((m) => new m.FBXLoader());
    const o = await (await fbxLoader).loadAsync(url);
    return { scene: o, animations: o.animations };
  }
  gltfLoader ??= import("three/examples/jsm/loaders/GLTFLoader.js").then((m) => new m.GLTFLoader());
  const g = await (await gltfLoader).loadAsync(url);
  return { scene: g.scene, animations: g.animations };
}

const slotOf = (file: string) => ANIMS.find((a) => file.replace(MODEL_EXT, "").toLowerCase() === ANIM_FILES[a]);
const isLibrary = (file: string) => /^animations?\./i.test(file);

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { cache: "no-cache" });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Load one role's character and clips, or null when its folder has no character file. */
async function loadRole(role: Role, m: Manifest): Promise<RigTemplate | null> {
  const files = m.folders[role] ?? [];
  const shared = m.folders.shared ?? [];
  const dir = `${MODELS_URL}/${role}/`;
  // the character: character.<ext>, else the one model file that is neither a slot clip nor an animation library
  const models = files.filter((f) => MODEL_EXT.test(f));
  const charFile = models.find((f) => /^character\./i.test(f)) ?? models.find((f) => !slotOf(f) && !isLibrary(f));
  if (!charFile) return null;
  const char = await loadFile(dir + charFile);
  const object = char.scene;
  object.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      // skinned meshes are culled by their bind-pose bounds, which can pop them out of view mid-animation
      mesh.frustumCulled = false;
      const tint = TINT[role];
      if (tint !== undefined)
        for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          const c = (mat as THREE.MeshStandardMaterial).color;
          if (c && !/eye/i.test(mat.name)) c.multiply(new THREE.Color(tint));
        }
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
  // 1. an animation library (animations.glb ...) in the folder, else in shared/, matched by clip name
  const libFile = files.find((f) => isLibrary(f) && MODEL_EXT.test(f));
  const sharedLib = shared.find((f) => isLibrary(f) && MODEL_EXT.test(f));
  const libUrl = libFile ? dir + libFile : sharedLib ? `${MODELS_URL}/shared/${sharedLib}` : null;
  const lib = [...char.animations];
  if (libUrl) {
    try {
      lib.push(...(await loadFile(libUrl)).animations);
    } catch (e) {
      console.warn(`[models] could not load ${libUrl}`, e);
    }
  }
  if (lib.length) {
    type Overrides = Partial<Record<Anim, string>>;
    const overrides =
      (files.includes("clips.json") ? await fetchJson<Overrides>(dir + "clips.json") : null) ??
      (shared.includes("clips.json") ? await fetchJson<Overrides>(`${MODELS_URL}/shared/clips.json`) : null) ??
      {};
    const picked = matchClips(
      lib.map((c) => c.name),
      overrides,
    );
    for (const a of ANIMS) {
      const c = lib.find((x) => x.name === picked[a]);
      if (c) clips[a] = c.clone();
    }
    console.info(`[models] ${role}: ` + ANIMS.map((a) => `${a}=${picked[a] ?? "-"}`).join(" "));
  }
  // 2. one file per slot wins over the library
  await Promise.all(
    models
      .filter((f) => slotOf(f))
      .map(async (f) => {
        try {
          const c = (await loadFile(dir + f)).animations[0];
          if (c) clips[slotOf(f)!] = c;
        } catch (e) {
          console.warn(`[models] could not load ${dir + f}`, e);
        }
      }),
  );
  for (const [a, c] of Object.entries(clips) as [Anim, THREE.AnimationClip][]) {
    c.name = a;
    stripRootMotion(c);
  }
  return { role, object, clips };
}

/** Load every role in parallel. Roles without files are left out; the target borrows the guard's. */
export async function loadRigs(): Promise<Partial<Record<Role, RigTemplate>>> {
  const out: Partial<Record<Role, RigTemplate>> = {};
  const m = await fetchJson<Manifest>(`${MODELS_URL}/manifest.json`);
  if (!m?.folders) return out;
  const roles: Role[] = ["pendekar", "guard", "target"];
  const loaded = await Promise.all(roles.map((r) => loadRole(r, m).catch((e) => (console.warn(`[models] ${r} failed`, e), null))));
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
