"use client";

import type { HudState } from "@/game/engine";
import type { Lang } from "@/game/i18n";
import { useT } from "./useT";

/**
 * Over a wayang kulit mission: the kelir's backlit glow and grain (pure CSS, no per-frame work), the dalang's
 * narration in the caption style, and a quiet hint while the player's shadow is thrown on the screen.
 */
export default function WayangOverlay({ hud, playing, lang }: { hud: HudState; playing: boolean; lang: Lang }) {
  const t = useT(lang);
  const shadow = hud.shadow ?? 0;
  return (
    <div className="wayang" aria-hidden={!playing}>
      <div className="wayang-glow" />
      <div className="wayang-grain" />
      {playing && hud.narration && (
        <p className="wayang-dalang" aria-live="polite">
          <span>{t("wayang.dalang")}</span>
          {hud.narration}
        </p>
      )}
      {playing && shadow > 0.05 && (
        <p className="wayang-shadow" style={{ opacity: 0.45 + 0.55 * shadow }}>
          {t(shadow > 0.6 ? "wayang.shadowSeen" : "wayang.shadow")}
        </p>
      )}
    </div>
  );
}
