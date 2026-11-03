// README screenshots: title, gameplay, Mata Helang. Usage: node scripts/shots.mjs [url] [outDir]
import { launch, gameReady, waitPhase, dismissSplash, sleep } from "./lib.mjs";
const url = process.argv[2] || "http://localhost:3000";
const out = process.argv[3] || "docs";
const b = await launch();
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
pg.on("console", (m) => m.type() === "error" && errs.push(m.text()));
pg.on("pageerror", (e) => errs.push(String(e)));
const r = await pg.goto(url, { waitUntil: "load" });
console.log("status", r.status());
await gameReady(pg);
await sleep(800); // let the menu fade in
await pg.screenshot({ path: `${out}/title.png` });
await dismissSplash(pg);
await pg.click("text=New game");
await pg.keyboard.press("Space"); // skip the first-run intro
await waitPhase(pg, "playing");
await pg.evaluate(() => window.__keris.look(357, 0));
await pg.keyboard.down("ShiftLeft");
await pg.keyboard.down("KeyW");
await pg.evaluate(() => window.__keris.debugAdvance(3.5)); // run forward 3.5 s of game time
await pg.keyboard.up("ShiftLeft");
await pg.keyboard.up("KeyW");
await pg.evaluate(() => window.__keris.look(0, 60));
await sleep(200);
await pg.screenshot({ path: `${out}/gameplay.png` });
await pg.keyboard.press("KeyV");
await sleep(600); // vision fades in over real frames
await pg.screenshot({ path: `${out}/mata-helang.png` });
console.log("debug", JSON.stringify(await pg.evaluate(() => { const d = window.__keris.debug(); return { phase: d.phase, p: d.player, calls: d.drawCalls }; })));
const px = await pg.evaluate(() => { const c = document.querySelector("canvas"); return [c.width, c.height]; });
console.log("canvas", px, "errors", JSON.stringify(errs));
await b.close();
process.exit(errs.length ? 1 : 0);
