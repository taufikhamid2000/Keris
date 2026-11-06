"use client";

import { tideAt, tideLine, tideName, tidePhase, type TideReading } from "@/game/tide";
import { useT } from "./useT";
import { useLang } from "./useLang";

/** The HUD's tide gauge under the compass: water in a little well at the tide's level, its name, and which way it runs. */
export function TideBadge({ t }: { t: TideReading | undefined }) {
  const lang = useLang();
  const tr = useT(lang);
  if (!t) return null;
  const name = tideName(t.state, lang);
  const label = lang === "en" ? `${tr("tide.heading")}: ${name}` : tr("tide.aria", { name, gloss: tr(`tide.gloss.${t.state}`) });
  return (
    <div className={`tide tide-${t.state}`} aria-label={label} title={label}>
      <span className="tide-well" aria-hidden>
        <i style={{ height: `${Math.round(12 + t.k * 76)}%` }} />
      </span>
      <b>{name}</b>
      <span className="tide-dir" aria-hidden>
        {t.rising ? "▲" : "▼"}
      </span>
    </div>
  );
}

/** The pause menu's tide line, from the attempt's play time. */
export function TideNote({ levelId, time }: { levelId: string; time: number }) {
  const lang = useLang();
  const line = tideLine(tideAt(time, tidePhase(levelId)), lang);
  return <p className="tide-note small">{line}</p>;
}
