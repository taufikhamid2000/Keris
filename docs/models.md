# Character models (Mixamo)

The game runs with its built-in block figures. Drop Mixamo FBX files into `public/models/` and it uses them instead,
no code change needed. Anything missing falls back: no files for a role keeps the block figure, a missing clip falls
back to a similar one (run to walk, crouch walk to walk, and so on).

```
public/models/
  pendekar/   the player
  guard/      every guard
  target/     optional: the Kapitan / clerk (uses guard/ when empty)
```

Each folder takes:

| File | Mixamo search (any similar clip works) | Needed? |
|---|---|---|
| `character.fbx` | the character itself | yes |
| `idle.fbx` | Idle | yes |
| `walk.fbx` | Walking | yes |
| `run.fbx` | Running | recommended |
| `crouch-idle.fbx` | Crouch Idle | player |
| `crouch-walk.fbx` | Crouched Walking / Sneak Walk | player |
| `stab.fbx` | Stabbing | player |
| `jump.fbx` | Jump | player |
| `carry.fbx` | Carrying / walking with a load | player, optional |
| `death.fbx` | Dying / Death | guards |

## Downloading from Mixamo

1. Sign in at mixamo.com with a free Adobe account.
2. **Characters** tab: pick a character, then **Download** with Format `FBX Binary (.fbx)`, Pose `T-pose`.
   Save it as `character.fbx` in the role's folder.
3. **Animations** tab, with that same character selected: search a clip, tick **In Place** when it is offered,
   then **Download** with Format `FBX Binary`, Skin `Without Skin`, 30 fps. Save it under the name in the table.
4. Reload the game. The browser console shows `[models] ...` warnings if a file failed to load.

Characters are scaled to about 1.8 m automatically and faced along their walking direction, so the export
size does not matter. Clips without In Place are fixed in code (the hips are pinned), but In Place looks better.

## Size and licence

- A character with textures is often 5 to 30 MB; animations without skin are about 1 MB each. Pick low-poly
  characters for the web, the whole folder is downloaded by every player.
- Mixamo characters and animations are free to use in games, but Adobe's terms do not allow redistributing
  the raw files on their own. This repo is public, so committing the FBX files puts them up for download on
  GitHub; decide on that before committing them.
