"use client";

import { useMemo } from "react";
import type { MapState } from "@/game/engine";
import { exploredFraction } from "@/game/fog";
import { placesInBounds } from "@/game/kitab";
import type { LevelDef } from "@/game/levels";

/** Left of the Peta map: what the markers mean. */
export function MapLegend({ def }: { def: LevelDef }) {
  return (
    <aside className="map-side" aria-label="Legend">
      <h4>Petunjuk</h4>
      <p className="legend small dim">
        <span>
          <i className="k-you" /> You
        </span>
        <span>
          <i className="k-obj" /> {def.objective.kind === "steal" ? "Item" : "Target"}
        </span>
        <span>
          <i className="k-exit" /> Escape
        </span>
        <span>
          <i className="k-hide" /> Hiding spot
        </span>
        <span>
          <i className="k-fog" /> Not explored yet
        </span>
      </p>
    </aside>
  );
}

/** Right of the Peta map: mission objectives, Kitab places on this level and how much of it is explored. */
export function MapObjectives({ def, s, places }: { def: LevelDef; s: MapState | null; places: string[] }) {
  const here = useMemo(() => placesInBounds(def.bounds), [def.bounds]);
  const mainDone = !!s && !s.escape && s.objective === null;
  const escapeNow = !!s && s.escape;
  const pct = s ? Math.round(exploredFraction(s.fog.seen) * 100) : 0;
  const goals: { key: string; text: string; done: boolean }[] = [
    { key: "main", text: def.text.objective, done: mainDone || escapeNow },
    { key: "escape", text: def.text.escape, done: false },
  ];
  const open = here.filter((p) => places.includes(p.id)).length;
  return (
    <aside className="map-side" aria-label="Mission">
      <div>
        <h4>Misi</h4>
        <ul>
          {goals.map((g) => (
            <li key={g.key} className={g.done ? "done" : ""}>
              <span>{g.text}</span>
            </li>
          ))}
          {def.undetected && (
            <li>
              <span>Stay unseen: any alarm fails the mission</span>
            </li>
          )}
        </ul>
      </div>
      <div>
        <h4>
          Diterokai <span className="dim small">{s ? `${pct}% explored` : "-"}</span>
        </h4>
        <span className="map-pct" aria-hidden="true">
          <i style={{ width: `${pct}%` }} />
        </span>
      </div>
      <div>
        <h4>
          Tempat{" "}
          <span className="dim small">
            {open} of {here.length}
          </span>
        </h4>
        <ul>
          {here.map((p) => {
            const have = places.includes(p.id);
            return (
              <li key={p.id} className={have ? "" : "missing"}>
                <b>{have ? p.title : "Not written yet"}</b>
                <span className="small dim">{have ? p.text : p.hint}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
