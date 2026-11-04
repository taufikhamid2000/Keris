// Headless check of the fight that starts when the player is seen: a strike costs health instead of ending the run,
// three cuts lose with "slain", a timed parry staggers the guard for a counter kill, a roll dodges, open strikes kill
// in three hits, and an unseen-only mission still fails the moment a guard raises the alarm.
// Simulated time is stepped with debugAdvance, so timing does not depend on frame rate.
// Usage: node scripts/combat-check.mjs [url]   (needs a running server, e.g. npm run dev)
import { launch, gameReady, waitPhase, dismissSplash } from "./lib.mjs";

const url = process.argv[2] || "http://localhost:3000";
const fails = [];
const check = (ok, msg, extra) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}${extra === undefined ? "" : `  ${JSON.stringify(extra)}`}`);
  if (!ok) fails.push(msg);
};
const b = await launch();
const errs = [];

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
  // page-side helpers: step in 1/30 s ticks until guard i is `lead` seconds short of landing his strike
  await pg.evaluate(() => {
    const k = window.__keris;
    window.__c = {
      untilStrike(i, lead) {
        for (let t = 0; t < 6; t += 1 / 30) {
          const d = k.debug();
          const a = d.guards[i].atk;
          if (a !== null && a >= d.windup - lead) return true;
          k.debugAdvance(1 / 30);
        }
        return false;
      },
      press(code) {
        k.pressKey(code);
        k.releaseKey(code);
      },
    };
  });
  return pg;
}

let code = 1;
try {
  const pg = await open();

  // 1. a landed strike costs one health and the run goes on
  let r = await pg.evaluate(() => {
    const k = window.__keris;
    const i = k.debugDuel();
    if (i < 0) return { i };
    const swung = window.__c.untilStrike(i, 0);
    k.debugAdvance(0.1);
    const d = k.debug();
    return { i, swung, hp: d.hp, phase: d.phase };
  });
  if (r.i < 0) throw new Error("no guard on open ground for a duel");
  check(r.swung && Math.abs(r.hp - 2) < 0.01 && r.phase === "playing", "a guard's strike costs one of three health, not the run", r);

  // 2. standing there loses, as "slain"
  r = await pg.evaluate(() => {
    const k = window.__keris;
    for (let t = 0; t < 20 && k.debug().phase === "playing"; t += 0.25) k.debugAdvance(0.25);
    const d = k.debug();
    return { phase: d.phase, lose: d.lose, hp: d.hp };
  });
  check(r.phase === "lost" && r.lose === "slain", "three cuts lose the fight", r);
  await pg.waitForFunction(() => /You were cut down/.test(document.body.innerText), null, { timeout: 3000 }).then(
    () => check(true, "lose screen says 'You were cut down'"),
    () => check(false, "lose screen says 'You were cut down'"),
  );

  // 3. a parry just before the blow staggers him; E then kills him outright
  r = await pg.evaluate(() => {
    const k = window.__keris;
    const c = window.__c;
    k.start("start");
    const i = k.debugDuel();
    const swung = c.untilStrike(i, 0.15);
    c.press("KeyR");
    k.debugAdvance(0.3);
    let d = k.debug();
    const after = { hp: d.hp, stagger: d.guards[i].stagger };
    c.press("KeyE");
    k.debugAdvance(0.3);
    d = k.debug();
    return { i, swung, ...after, dead: d.guards[i].dead };
  });
  check(r.swung && r.hp === 3 && r.stagger > 0, "a timed parry takes no damage and staggers the guard", r);
  check(r.dead, "E on a staggered guard is a counter kill", r);

  // 4. a parry too early is wasted
  r = await pg.evaluate(() => {
    const k = window.__keris;
    const c = window.__c;
    k.start("start");
    const i = k.debugDuel();
    const swung = c.untilStrike(i, 0.6);
    c.press("KeyR");
    k.debugAdvance(0.5);
    return { swung, hp: k.debug().hp };
  });
  check(r.swung && r.hp < 3, "a parry well before the blow does not save you", r);

  // 5. a roll through the blow takes no damage
  r = await pg.evaluate(() => {
    const k = window.__keris;
    const c = window.__c;
    k.start("start");
    const i = k.debugDuel();
    const swung = c.untilStrike(i, 0.2);
    const p0 = k.debug().player;
    c.press("KeyX");
    const rolling = k.debug().rolling;
    k.debugAdvance(0.4);
    const d = k.debug();
    return { swung, rolling, hp: d.hp, moved: +Math.hypot(d.player.x - p0.x, d.player.z - p0.z).toFixed(2) };
  });
  check(r.swung && r.rolling && r.hp === 3 && r.moved > 0.5, "a roll dodges the strike and moves the player", r);

  // 6. open strikes kill in three hits, interrupting his swing
  r = await pg.evaluate(() => {
    const k = window.__keris;
    const c = window.__c;
    k.start("start");
    const i = k.debugDuel();
    const hps = [];
    let presses = 0;
    while (presses < 10 && !k.debug().guards[i].dead && k.debug().phase === "playing") {
      c.press("KeyE");
      presses++;
      k.debugAdvance(0.5);
      hps.push(k.debug().guards[i].hp);
    }
    const d = k.debug();
    return { dead: d.guards[i].dead, presses, hps, hp: d.hp, phase: d.phase };
  });
  check(r.dead && r.presses <= 4 && r.phase === "playing", "open strikes cut a guard down in three hits (one may be lost to his counter)", r);

  // 7. a held strike is heavy: double damage and a stagger; the next strike kills
  r = await pg.evaluate(() => {
    const k = window.__keris;
    const c = window.__c;
    k.start("start");
    const i = k.debugDuel();
    // take his first blow so his cooldown leaves room to wind up
    c.untilStrike(i, 0);
    k.debugAdvance(0.2);
    k.pressKey("KeyE");
    k.debugAdvance(0.5);
    const charging = k.debug().charging;
    k.releaseKey("KeyE");
    k.debugAdvance(0.3);
    let g = k.debug().guards[i];
    const after = { hp: g.hp, stagger: g.stagger };
    c.press("KeyE");
    k.debugAdvance(0.3);
    g = k.debug().guards[i];
    return { charging, ...after, dead: g.dead };
  });
  check(r.charging >= 0.45 && r.hp === 1 && r.stagger > 0, "a held strike is heavy: two damage and a stagger", r);
  check(r.dead, "a strike on the guard a heavy blow staggered kills him", r);
  await pg.close();

  // 8. on The Battery Plans, being seen still ends it
  const pp = await open("plans");
  r = await pp.evaluate(() => {
    const k = window.__keris;
    const i = k.debugDuel(false);
    if (i < 0) return { i };
    for (let t = 0; t < 8 && k.debug().phase === "playing"; t += 0.1) k.debugAdvance(0.1);
    const d = k.debug();
    return { i, phase: d.phase, lose: d.lose };
  });
  check(r.i >= 0 && r.phase === "lost" && r.lose === "detected", "unseen-only mission fails when a guard spots you, fight or not", r);
  await pp.close();

  check(errs.length === 0, "no page errors", errs);
  code = fails.length ? 1 : 0;
} catch (e) {
  console.error("combat check failed:", e.message);
} finally {
  await b.close();
}
if (fails.length) console.log(`\n${fails.length} failed`);
process.exit(code);
