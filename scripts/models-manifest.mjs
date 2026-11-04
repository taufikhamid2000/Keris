// Write public/models/manifest.json: the files at the top of each folder, which the game reads to learn what exists.
// Usage: node scripts/models-manifest.mjs   (models:upload runs it too)
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const ROOT = path.resolve("public/models");
const SKIP = new Set([".gitkeep", "manifest.json"]);

export function writeManifest() {
  const folders = {};
  for (const d of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const files = fs
      .readdirSync(path.join(ROOT, d.name), { withFileTypes: true })
      .filter((e) => e.isFile() && !SKIP.has(e.name))
      .map((e) => e.name)
      .sort();
    if (files.length) folders[d.name] = files;
  }
  const manifest = { folders };
  fs.writeFileSync(path.join(ROOT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const m = writeManifest();
  const n = Object.values(m.folders).reduce((s, f) => s + f.length, 0);
  console.log(`public/models/manifest.json: ${n} files in ${Object.keys(m.folders).join(", ") || "no folders"}`);
}
