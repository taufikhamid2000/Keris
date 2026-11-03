// Shared helpers for the browser check scripts.
import { chromium } from "playwright";

// Real GPU via ANGLE/D3D11 runs the game at ~60 fps headless; SwiftShader (CPU) manages ~3 fps.
// Set KERIS_GL=swiftshader on machines without a usable GPU.
const GL = {
  gpu: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
  swiftshader: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
};
export const launch = () => chromium.launch({ args: GL[process.env.KERIS_GL || "gpu"] ?? GL.gpu });

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wait for the engine to exist. */
export const gameReady = (pg, timeout = 30000) => pg.waitForFunction(() => window.__keris, null, { timeout });

/** Wait for a game phase (title / intro / playing / paused / won / lost). */
export const waitPhase = (pg, phase, timeout = 15000) =>
  pg.waitForFunction((p) => window.__keris?.debug().phase === p, phase, { timeout });

/** Resize the viewport, leaving fullscreen first. The window lags the document leaving fullscreen, so retry. */
export async function resize(pg, width, height) {
  for (let i = 0; ; i++) {
    await pg.evaluate(() => document.fullscreenElement && document.exitFullscreen()).catch(() => {});
    try {
      return await pg.setViewportSize({ width, height });
    } catch (e) {
      if (i >= 20 || !/fullscreen/.test(e.message)) throw e;
      await sleep(100);
    }
  }
}

/** Dismiss the "press any button" screen and wait until the menu is up. */
export async function dismissSplash(pg) {
  await pg.locator(".overlay.splash").dispatchEvent("pointerdown");
  await pg.locator(".overlay.splash").waitFor({ state: "detached", timeout: 5000 });
}
