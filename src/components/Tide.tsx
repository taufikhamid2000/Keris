"use client";

import { TIDE_NAMES, tideAt, tideLine, tidePhase, type TideReading } from "@/game/tide";

/** The HUD's tide gauge under the compass: water in a little well at the tide's level, its name, and which way it runs. */
export function TideBadge({ t }: { t: TideReading | undefined }) {
  if (!t) return null;
  const n = TIDE_NAMES[t.state];
  return (
    <div className={`tide tide-${t.state}`} aria-label={`Tide: ${n.name}, ${n.en}`} title={`${n.name} (${n.en})`}>
      <span className="tide-well" aria-hidden>
        <i style={{ height: `${Math.round(12 + t.k * 76)}%` }} />
      </span>
      <b>{n.name}</b>
      <span className="tide-dir" aria-hidden>
        {t.rising ? "▲" : "▼"}
      </span>
    </div>
  );
}

/** The pause menu's tide line, from the attempt's play time. */
export function TideNote({ levelId, time }: { levelId: string; time: number }) {
  return <p className="tide-note small">{tideLine(tideAt(time, tidePhase(levelId)))}</p>;
}
