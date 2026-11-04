// Run the browser check scripts in parallel and print a pass/fail summary.
// Usage: node scripts/check-all.mjs [url] [names...]   e.g. node scripts/check-all.mjs http://localhost:3000 save intro
// Names match scripts/<name>-check.mjs, plus "ai" (smoke-ai) and "shots". No names runs them all.
// CHECK_JOBS sets the concurrency (default 3); output from each script is shown only when it fails.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const all = { intro: "intro-check.mjs", save: "save-check.mjs", combat: "combat-check.mjs", boat: "boat-check.mjs", mobile: "mobile-check.mjs", ai: "smoke-ai.mjs", shots: "shots.mjs" };
const args = process.argv.slice(2);
const url = args[0]?.startsWith("http") ? args.shift() : "http://localhost:3000";
const names = args.length ? args : Object.keys(all);
const unknown = names.filter((n) => !all[n]);
if (unknown.length) {
  console.error(`unknown check(s): ${unknown.join(", ")}; pick from ${Object.keys(all).join(", ")}`);
  process.exit(2);
}
// screenshots from check runs go to a temp dir so docs/ only changes when shots.mjs is run on its own
const out = join(tmpdir(), "keris-checks");
mkdirSync(out, { recursive: true });
const jobs = Number(process.env.CHECK_JOBS || 3);

function run(name) {
  const script = all[name];
  const argv = [`scripts/${script}`, url];
  if (!["save", "combat", "boat"].includes(name)) argv.push(name === "ai" ? "90" : out);
  const t0 = Date.now();
  return new Promise((done) => {
    const p = spawn(process.execPath, argv, { stdio: ["ignore", "pipe", "pipe"] });
    let log = "";
    p.stdout.on("data", (d) => (log += d));
    p.stderr.on("data", (d) => (log += d));
    p.on("close", (code) => {
      const secs = (Date.now() - t0) / 1000;
      console.log(`${code === 0 ? "PASS" : "FAIL"}  ${name.padEnd(7)} ${secs.toFixed(1)}s`);
      if (code !== 0) console.log(log.replace(/^/gm, "    "));
      done({ name, ok: code === 0, secs });
    });
  });
}

const t0 = Date.now();
const queue = [...names];
const results = [];
await Promise.all(
  Array.from({ length: Math.min(jobs, queue.length) }, async () => {
    while (queue.length) results.push(await run(queue.shift()));
  }),
);
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
process.exit(failed.length ? 1 : 0);
