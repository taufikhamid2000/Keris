// Headless check of the sampans: board one from the bank, paddle along the river, fail to paddle up onto the bank,
// go ashore, and on Kampung Hulu escape by pulling up at the river jetty in a boat.
// Simulated time is stepped with debugAdvance; the camera yaw is set so "forward" is a known direction.
// Usage: node scripts/boat-check.mjs [url]   (needs a running server, e.g. npm run dev)
import { launch, gameReady, waitPhase, dismissSplash } from "./lib.mjs";

const url = process.argv[2] || "http://localhost:3000";
const fails = [];
const check = (ok, msg, extra) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}${extra === undefined ? "" : `  ${JSON.stringify(extra)}`}`);
  if (!ok) fails.push(msg);
};
const b = await launch();
const errs = [];
// the river in levels.ts: z 37 to 46
const RIVER = { minZ: 37, maxZ: 46 };

async function open(level) {
  const pg = await b.newPage({ viewport: { width: 960, height: 540 } });
  pg.on("pageerror", (e) => errs.push(String(e)));
  await pg.goto(`${url}/?quality=low${level ? `&level=${level}` : ""}`, { waitUntil: "load" });
  await gameReady(pg);
  await dismissSplash(pg);
  await pg.click("text=New game");
  await pg.waitForFunction(() => ["intro", "playing"].includes(window.__keris.debug().phase), null, { timeout: 15000 });
  if ((await pg.evaluate(() => window.__keris.debug().phase)) === "intro") await pg.keyboard.press("Space");
  await waitPhase(pg, "playing");
  return pg;
}
const press = (pg, code) => pg.evaluate((c) => (window.__keris.pressKey(c), window.__keris.releaseKey(c)), code);
/** hold a key for `secs` of game time */
const hold = (pg, code, secs) =>
  pg.evaluate(
    ([c, s]) => {
      const k = window.__keris;
      k.pressKey(c);
      k.debugAdvance(s);
      k.releaseKey(c);
      return k.debug();
    },
    [code, secs],
  );

let code = 1;
try {
  const pg = await open();

  // 1. walk up to the harbour-bank sampan and board it
  await pg.evaluate(() => (window.__keris.debugPlace(-21, 36.6), window.__keris.debugAdvance(0.1)));
  const prompt = await pg
    .waitForFunction(() => /Board the sampan/.test(document.body.innerText), null, { timeout: 3000 })
    .then(() => true, () => false);
  check(prompt, "standing by a moored sampan offers 'Board the sampan'");
  await press(pg, "KeyE");
  let d = await pg.evaluate(() => (window.__keris.debugAdvance(0.1), window.__keris.debug()));
  check(d.boat && d.player.z > RIVER.minZ, "E boards it: the player sits in the boat on the river", { boat: d.boat, p: d.player });

  // 2. paddle east along the river
  const x0 = d.player.x;
  await pg.evaluate(() => window.__keris.debugCamYaw(Math.PI / 2));
  d = await hold(pg, "KeyW", 4);
  check(d.boat && d.player.x - x0 > 6 && d.player.z > RIVER.minZ && d.player.z < RIVER.maxZ, "paddling moves the boat along the river", {
    moved: +(d.player.x - x0).toFixed(2),
    z: +d.player.z.toFixed(2),
  });

  // 3. paddling at the harbour bank stops at the water's edge
  await pg.evaluate(() => window.__keris.debugCamYaw(Math.PI));
  d = await hold(pg, "KeyW", 4);
  check(d.boat && d.player.z > RIVER.minZ + 0.5, "the boat cannot leave the water", { z: +d.player.z.toFixed(2) });

  // 4. step ashore onto the bank
  await pg.evaluate(() => window.__keris.debugAdvance(1));
  await press(pg, "KeyE");
  d = await pg.evaluate(() => (window.__keris.debugAdvance(0.1), window.__keris.debug()));
  check(!d.boat && d.player.z < RIVER.minZ && d.player.y < 0.5, "E at the bank goes ashore onto dry ground", { boat: d.boat, p: d.player });
  await pg.close();

  // 5. Kampung Hulu, clerk down: take the boat by the river jetty and pull up at the jetty end to escape
  const kp = await open("kampung");
  d = await kp.evaluate(() => {
    const k = window.__keris;
    k.start("target");
    k.debugPlace(1.2, 43.5);
    k.debugAdvance(0.1);
    return k.debug();
  });
  check(d.objective === "escape" && d.phase === "playing", "kampung escape checkpoint, standing on the river jetty", { objective: d.objective, phase: d.phase });
  await press(kp, "KeyE");
  d = await kp.evaluate(() => (window.__keris.debugAdvance(0.1), window.__keris.debug()));
  check(d.boat, "boards the sampan moored at the river jetty");
  await kp.evaluate(() => window.__keris.debugCamYaw(Math.PI));
  d = await kp.evaluate(() => {
    const k = window.__keris;
    k.pressKey("KeyW");
    for (let t = 0; t < 6 && k.debug().phase === "playing"; t += 0.1) k.debugAdvance(0.1);
    k.releaseKey("KeyW");
    return k.debug();
  });
  check(d.phase === "won", "pulling up at the jetty end in the boat completes the escape", { phase: d.phase, p: d.player });
  await kp.close();

  check(errs.length === 0, "no page errors", errs);
  code = fails.length ? 1 : 0;
} catch (e) {
  console.error("boat check failed:", e.message);
} finally {
  await b.close();
}
if (fails.length) console.log(`\n${fails.length} failed`);
process.exit(code);
