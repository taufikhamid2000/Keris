"use client";

import type { HudState } from "@/game/engine";

/**
 * Over a wayang kulit mission: the kelir's backlit glow and grain (pure CSS, no per-frame work), the dalang's
 * narration in the caption style, and a quiet hint while the player's shadow is thrown on the screen.
 */
export default function WayangOverlay({ hud, playing }: { hud: HudState; playing: boolean }) {
  const shadow = hud.shadow ?? 0;
  return (
    <div className="wayang" aria-hidden={!playing}>
      <div className="wayang-glow" />
      <div className="wayang-grain" />
      {playing && hud.narration && (
        <p className="wayang-dalang" aria-live="polite">
          <span>Dalang</span>
          {hud.narration}
        </p>
      )}
      {playing && shadow > 0.05 && (
        <p className="wayang-shadow" style={{ opacity: 0.45 + 0.55 * shadow }}>
          Your shadow is on the kelir{shadow > 0.6 ? ": the guards can see it" : ""}
        </p>
      )}
    </div>
  );
}
