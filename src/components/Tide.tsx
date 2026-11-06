"use client";

import { TIDE_NAMES, floodShare, mudShare, tideAt, tideClock, tidePhase, type TideReading } from "@/game/tide";
import { useT } from "./useT";
import { useLang } from "./useLang";

/** The HUD's tide gauge under the compass: water in a little well at the tide's level, its name, and which way it runs. */
export function TideBadge({ t }: { t: TideReading | undefined }) {
  const tr = useT(useLang());
  if (!t) return null;
  const n = TIDE_NAMES[t.state];
  const label = tr("tide.aria", { name: n.name, gloss: tr(`tide.gloss.${t.state}`) });
  return (
    <div className={`tide tide-${t.state}`} aria-label={label} title={label}>
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
  const tr = useT(useLang());
  const r = tideAt(time, tidePhase(levelId));
  const lvl = `${r.off >= 0 ? "+" : "−"}${Math.abs(r.off).toFixed(1)} m`;
  const mud = mudShare(r.k) > 0.3 ? ` · ${tr("tide.mud")}` : floodShare(r.k) > 0.3 ? ` · ${tr("tide.flood")}` : "";
  const line = tr("tide.line", {
    name: TIDE_NAMES[r.state].name,
    gloss: tr(`tide.gloss.${r.state}`),
    lvl,
    mud,
    next: tr(r.rising ? "tide.toEbb" : "tide.toFlood"),
    clock: tideClock(r.toTurn),
  });
  return <p className="tide-note small">{line}</p>;
}
