// Headless smoke check for guard pathfinding: put the player on a rooftop, alert the guards,
// and assert a guard climbs up and reaches them. Before that, an air assassination: leap off a roof edge onto a guard. Simulated time is fast-forwarded, so it runs in seconds.
// Usage: node scripts/smoke-ai.mjs [url] [simSeconds]
import { launch, gameReady, waitPhase, dismissSplash } from "./lib.mjs";
const url = process.argv[2] || "http://localhost:3000";
const simSeconds = Number(process.argv[3] || 90);
const b = await launch();
const pg = await b.newPage({ viewport: { width: 640, height: 360 } });
const errs = [];
pg.on("pageerror", (e) => errs.push(String(e)));
let code = 1;
try {
  await pg.goto(`${url}/?quality=low`, { waitUntil: "load" });
  await gameReady(pg);
  await dismissSplash(pg);
  await pg.click("text=New game");
  await pg.keyboard.press("Space"); // skip the first-run intro
  await waitPhase(pg, "playing");
  // air assassination: E from a roof edge leaps onto the calm guard below and kills him
  const gi = await pg.evaluate(() => window.__keris.debugAirSetup());
  if (gi < 0) throw new Error("no roof edge with open ground below found for the air assassination");
  await pg.evaluate(() => window.__keris.debugAdvance(0.1));
  const prompt = await pg.waitForFunction(() => /Air assassination/.test(document.body.innerText), null, { timeout: 3000 }).then(() => "Air assassination", () => "");
  await pg.keyboard.press("KeyE");
  const leaping = await pg.evaluate(() => window.__keris.debug().leaping);
  const after = await pg.evaluate(() => (window.__keris.debugAdvance(1.5), window.__keris.debug()));
  const g = after.guards[gi];
  const air = { prompt: /Air assassination/.test(prompt), leaping, killed: g.dead, landed: after.player.y < 0.1 && Math.hypot(after.player.x - g.x, after.player.z - g.z) < 1.5 };
  console.log("air", JSON.stringify(air));
  if (!Object.values(air).every(Boolean)) throw new Error("air assassination failed");
  const spot = await pg.evaluate(() => window.__keris.debugRoofSpot());
  if (!spot) throw new Error("no climbable rooftop spot found in the nav graph");
  console.log("roof spot", JSON.stringify(spot));
  await pg.evaluate((s) => window.__keris.debugAlertAt(s.x, s.y, s.z), spot);
  const t0 = Date.now();
  let maxY = 0;
  let minD = Infinity;
  let sawClimb = false;
  let reached = false;
  let sim = 0;
  // step a quarter second of game time at a time, sampling guards in between (as the old real-time poll did)
  while (sim < simSeconds) {
    const d = await pg.evaluate(() => (window.__keris.debugAdvance(0.25), window.__keris.debug()));
    sim += 0.25;
    for (const g of d.guards) {
      if (g.dead) continue;
      sawClimb ||= g.climbing;
      maxY = Math.max(maxY, g.y);
      const dist = Math.hypot(g.x - spot.x, g.z - spot.z);
      if (g.y > spot.y - 0.5) minD = Math.min(minD, dist);
      if (g.y > spot.y - 0.5 && dist < 3) reached = true;
    }
    if (reached) break;
    if (d.phase !== "playing") break;
  }
  console.log(JSON.stringify({ reached, sawClimb, maxGuardY: +maxY.toFixed(2), minRoofDist: Number.isFinite(minD) ? +minD.toFixed(2) : null, simSeconds: sim, wallSeconds: +((Date.now() - t0) / 1000).toFixed(1), errors: errs }));
  code = reached && !errs.length ? 0 : 1;
} catch (e) {
  console.error("smoke failed:", e.message);
} finally {
  await b.close();
}
process.exit(code);
