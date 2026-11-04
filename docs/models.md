# Character models

The game runs with its built-in block figures. Put model files in `public/models/` and it uses them instead, with
no code change. GLB / glTF and FBX all work. Anything missing falls back: a role with no character keeps the block
figure, and a missing clip falls back to a similar one (run to walk, crouch walk to walk, and so on).

```
public/models/
  pendekar/   the player
  guard/      every guard
  target/     optional: the Kapitan / clerk (uses guard/ when empty)
  shared/     optional: an animation library used by every role that has none of its own
  props/      optional: sampan.glb, the boat
```

## Recommended: Quaternius (CC0, no account)

Two free packs built on the same skeleton, so the animations fit the characters without retargeting:

- **Universal Base Characters**: https://quaternius.itch.io/universal-base-characters (Standard, free)
- **Universal Animation Library**: https://quaternius.itch.io/universal-animation-library (Standard, free, 45 clips)

On itch.io choose "Download Now", then "No thanks, just take me to the downloads" to skip paying.

1. From the characters zip, copy one character's glTF/GLB file (and its `.bin` and textures, if any) into
   `public/models/pendekar/`, and another into `public/models/guard/`. Any file name works; `character.glb` is only
   needed when a folder holds more than one model.
2. From the animation zip, copy the GLB that holds all the clips into `public/models/shared/` and name it
   `animations.glb`.
3. Run `npm run models:manifest`, then `npm run dev`. The browser console prints which clip went to each slot:
   `[models] pendekar: idle=Idle_Loop walk=Walk_Loop ...`.
4. If a slot got the wrong clip (or none), add `clips.json` next to the files, in the role folder or in `shared/`:
   `{ "stab": "Sword_Attack", "crouchWalk": "Crouch_Fwd_Loop" }`. Names are the ones printed in step 3.

## Slots

| Slot | Used for | File name for a one-clip file |
|---|---|---|
| idle | standing | `idle.glb` / `idle.fbx` |
| walk | walking | `walk` |
| run | running (falls back to walk) | `run` |
| crouchIdle | crouched, still (falls back to idle) | `crouch-idle` |
| crouchWalk | crouched, moving (falls back to walk) | `crouch-walk` |
| stab | the player's takedown and strikes, and a guard's strike | `stab` |
| jump | the player's climbs and leaps | `jump` |
| carry | the player carrying a body (falls back to walk) | `carry` |
| death | guards when killed (else they tip over) | `death` |
| roll | the player's dodge roll (falls back to jump) | `roll` |
| hit | flinching from a blow, and a parried guard reeling | `hit` |
| block | the player's parry stance, and readying a heavy strike (falls back to idle) | `block` |
| heavy | the player's heavy strike (falls back to stab) | `heavy` |
| sit | the player sitting in a sampan (falls back to crouch idle) | `sit` |

A one-clip file (e.g. `run.fbx`) wins over the library's pick for that slot.

## Props

`public/models/props/sampan.glb` replaces the built-in sampan mesh. The live one is Quaternius's CC0 "Boat"
(https://poly.pizza/m/OknDJkGeJ8, Download, GLB). It is scaled to 4 m long and turned so its long side runs along the
boat's heading; `BOAT.modelLength` and `BOAT.modelY` at the top of `src/game/engine.ts` set the size and how low it sits.

## Mixamo (FBX, Adobe account)

Characters from mixamo.com: **Download** with `FBX Binary`, Pose `T-pose`, into the role folder. Animations with
the same character selected: tick **In Place**, then `FBX Binary`, Skin `Without Skin`, 30 fps, saved under the slot
file names above. Clips without In Place are fixed in code (the root bone is pinned), but In Place looks better.

## Putting them on the live site

Model files are gitignored. The live game loads them from a public Supabase Storage bucket (`keris-models` on the
master_db project); Vercel's `NEXT_PUBLIC_MODELS_URL` points at it.

```bash
npm run models:upload
```

This writes `manifest.json` and uploads everything under `public/models/` with the same layout, overwriting
files of the same name. The live site picks them up on the next load (models are cached for up to an hour).
Without `NEXT_PUBLIC_MODELS_URL`, as with `npm run dev`, the game reads `public/models/` directly.
Supabase free plan: 50 MB per file, 1 GB stored, about 5 GB of downloads a month.

## Size and licence

- Every player downloads the models, so prefer low-poly characters; a few MB per role is plenty.
- Quaternius packs are CC0 (public domain). Mixamo files are free to use in games, but Adobe's terms do not allow
  redistributing the raw files, which is why model files stay out of this public repo.
