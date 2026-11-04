// Upload public/models/**/*.fbx to the public Supabase Storage bucket the live game loads from.
// Usage: node scripts/upload-models.mjs
// Needs a Supabase personal access token in SUPABASE_ACCESS_TOKEN (or the "All Supabase" env var on this machine);
// the project's service key is fetched with it at run time and never written anywhere.
import fs from "node:fs";
import path from "node:path";

const REF = "hmkjszolqnpcsoatrgcu";
const BUCKET = "keris-models";
const ROOT = path.resolve("public/models");

const pat = process.env.SUPABASE_ACCESS_TOKEN || process.env["All Supabase"];
if (!pat) {
  console.error("Set SUPABASE_ACCESS_TOKEN to a Supabase personal access token.");
  process.exit(1);
}

const keys = await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, {
  headers: { Authorization: `Bearer ${pat}` },
}).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`api-keys: ${r.status}`))));
const service = keys.find((k) => k.name === "service_role")?.api_key;
if (!service) throw new Error("no service_role key on the project");

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.toLowerCase().endsWith(".fbx")) files.push(p);
  }
})(ROOT);
if (!files.length) {
  console.log("No .fbx files under public/models. See docs/models.md.");
  process.exit(0);
}

let failed = 0;
for (const f of files) {
  const key = path.relative(ROOT, f).split(path.sep).join("/");
  const body = fs.readFileSync(f);
  const r = await fetch(`https://${REF}.supabase.co/storage/v1/object/${BUCKET}/${key}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${service}`,
      "Content-Type": "application/octet-stream",
      "x-upsert": "true",
      "Cache-Control": "max-age=3600",
    },
    body,
  });
  if (r.ok) console.log(`ok   ${key} (${(body.length / 1e6).toFixed(1)} MB)`);
  else {
    failed++;
    console.log(`FAIL ${key}: ${r.status} ${await r.text()}`);
  }
}
console.log(`\n${files.length - failed}/${files.length} uploaded to https://${REF}.supabase.co/storage/v1/object/public/${BUCKET}/`);
process.exit(failed ? 1 : 0);
