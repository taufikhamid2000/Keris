// Shrink the 3D assets without changing how the game looks. Repeatable: `npm run optimize:models`.
//
// Originals live in assets-src/models/ (committed, outside the shipped bundle). The first run moves them there from
// public/models/; every run then reads assets-src and writes the optimized files to public/models/ under the names the
// game loads. Pipeline: dedup, prune, weld, [simplify], resample, quantize, textures -> WebP, EXT_meshopt_compression.
// The game's GLTFLoader registers the meshopt decoder (src/game/models.ts); WebP is native to three's GLTFLoader.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { dedup, prune, weld, resample, quantize, textureCompress, meshopt, simplify } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from "meshoptimizer";
import { writeManifest } from "./models-manifest.mjs";

const SRC = path.resolve("assets-src/models");
const OUT = path.resolve("public/models");

// KEEP: the animation clips the game uses. Everything else in the library is dropped.
// shared/animations.glb: the ones src/game/models.ts matchClips() picks for the 15 slots (the "carry" slot matches
// nothing and falls back to walk). props/horse.glb: src/game/engine.ts looks up Idle, Walk and Gallop (plain names).
const KEEP = {
  "shared/animations.glb": [
    "Idle_Loop", "Walk_Loop", "Jog_Fwd_Loop", "Crouch_Idle_Loop", "Crouch_Fwd_Loop", "Sword_Attack", "Death01",
    "Jump_Start", "Roll", "Hit_Chest", "Sword_Idle", "Punch_Cross", "Sitting_Idle_Loop", "Swim_Fwd_Loop", "Swim_Idle_Loop",
  ],
  "props/horse.glb": ["Idle", "Walk", "Gallop"],
};

// in: file under assets-src/models, out: file under public/models (a .gltf becomes one .glb the loader finds as character.*)
// simplify: mild decimation (props only, never characters). maxTex: texture size cap.
const JOBS = [
  { in: "shared/animations.glb", out: "shared/animations.glb", dropMeshes: true },
  { in: "props/horse.glb", out: "props/horse.glb", maxTex: 1024 },
  { in: "props/tree_a.glb", out: "props/tree_a.glb", maxTex: 1024, simplify: true },
  { in: "props/tree_b.glb", out: "props/tree_b.glb", maxTex: 1024, simplify: true },
  { in: "props/fern.glb", out: "props/fern.glb", maxTex: 1024, simplify: true },
  { in: "props/rock_a.glb", out: "props/rock_a.glb", maxTex: 1024 },
  { in: "props/rock_b.glb", out: "props/rock_b.glb", maxTex: 1024 },
  { in: "props/sampan.glb", out: "props/sampan.glb", maxTex: 1024 },
  // the main character keeps its 1024 textures; the guard shares the pendekar files, so it gets its own .glb
  { in: "pendekar/character.gltf", out: "pendekar/character.glb", maxTex: 1024, loose: "pendekar" },
  { in: "guard/character.gltf", out: "guard/character.glb", maxTex: 1024, loose: "guard" },
];

/** first run: move the originals out of public/models into assets-src/models */
function archiveOriginals() {
  if (fs.existsSync(SRC) || !fs.existsSync(OUT)) return;
  for (const f of fs.readdirSync(OUT, { recursive: true })) {
    const p = path.join(OUT, f);
    if (!fs.statSync(p).isFile() || /(^|[\/])(manifest\.json|\.gitkeep)$/.test(f)) continue;
    fs.mkdirSync(path.dirname(path.join(SRC, f)), { recursive: true });
    fs.renameSync(p, path.join(SRC, f));
  }
}

const kb = (p) => (fs.statSync(p).size / 1024).toFixed(0);

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
archiveOriginals();
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });

for (const job of JOBS) {
  const src = path.join(SRC, job.in);
  if (!fs.existsSync(src)) continue;
  const dst = path.join(OUT, job.out);
  const doc = await io.read(src);
  const root = doc.getRoot();

  const keep = KEEP[job.out];
  if (keep) {
    for (const a of root.listAnimations()) if (!keep.includes(a.getName())) a.dispose();
  }
  if (job.dropMeshes) {
    // the library only needs its bones: animation targets are nodes, so the skinned dummy mesh can go
    for (const n of root.listNodes()) {
      n.setMesh(null);
      n.setSkin(null);
    }
    root.listMeshes().forEach((m) => m.dispose());
    root.listSkins().forEach((s) => s.dispose());
  }

  const steps = [dedup(), prune({ keepLeaves: true }), weld()];
  if (job.simplify) steps.push(simplify({ simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.001 }));
  steps.push(resample(), prune({ keepLeaves: true }));
  if (root.listMeshes().length) steps.push(quantize());
  if (root.listTextures().length) {
    const size = [job.maxTex, job.maxTex];
    // normal maps keep a higher quality than colour maps
    steps.push(
      textureCompress({ encoder: sharp, targetFormat: "webp", resize: size, quality: 85, slots: /^(?!normalTexture)/ }),
      textureCompress({ encoder: sharp, targetFormat: "webp", resize: size, quality: 95, slots: /^normalTexture$/ }),
    );
  }
  steps.push(meshopt({ encoder: MeshoptEncoder, level: "high" }));
  await doc.transform(...steps);

  fs.mkdirSync(path.dirname(dst), { recursive: true });
  await io.write(dst, doc);
  const before = fs.statSync(src).size + (job.loose ? looseSize(job.loose) : 0);
  console.log(`${job.out}: ${(before / 1024).toFixed(0)} KB -> ${kb(dst)} KB`);
}

// the .gltf's loose .bin/textures are now inside the .glb: remove them from public/models
for (const job of JOBS.filter((j) => j.loose)) {
  const dir = path.join(OUT, job.loose);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) if (f !== path.basename(job.out)) fs.rmSync(path.join(dir, f));
}
writeManifest();

function looseSize(dir) {
  const d = path.join(SRC, dir);
  return fs.readdirSync(d).reduce((s, f) => s + fs.statSync(path.join(d, f)).size, 0) - fs.statSync(path.join(d, "character.gltf")).size;
}
