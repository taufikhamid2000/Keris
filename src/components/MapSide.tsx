"use client";

import { useMemo } from "react";
import type { MapState } from "@/game/engine";
import { exploredFraction } from "@/game/fog";
import { placesInBounds } from "@/game/kitab";
import type { LevelDef } from "@/game/levels";

/** A walkable gate to another map, as the engine reports it in MapState.exits. */
export interface MapExit {
  id: string;
  x: number;
  z: number;
  label: string;
  to: string;
}

/** The gates on this map. (Cast until MapState.exits is in the engine type everywhere.) */
export function mapExits(s: MapState | null): MapExit[] {
  return (s as (MapState & { exits?: MapExit[] }) | null)?.exits ?? [];
}

/** Where a gate leads: the map's name once the player has been there, a vague hint before. */
export function gateText(e: MapExit, known: Record<string, string>): string {
  return known[e.to] ? `Ke ${known[e.to]}` : "Jalan ke ...?";
}

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
          <i className="k-gate" /> Pintu ke peta lain
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
export function MapObjectives({ def, s, places, known = {} }: { def: LevelDef; s: MapState | null; places: string[]; known?: Record<string, string> }) {
  const exits = mapExits(s);
  const here = useMemo(() => placesInBounds(def.bounds, def.id), [def.bounds, def.id]);
  const mainDone = !!s && !s.escape && s.objective === null;
  const escapeNow = !!s && s.escape;
  const cols = s?.fog.cols ?? 0;
  const rows = s?.fog.rows ?? 0;
  const walk = useMemo(() => {
    if (!s || !cols) return undefined;
    const { minX, minZ, cell } = s.fog;
    const m = new Uint8Array(cols * rows).fill(1);
    const inside = (r: { x: number; z: number; w: number; d: number }, x: number, z: number) => x >= r.x && x <= r.x + r.w && z >= r.z && z <= r.z + r.d;
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const x = minX + (i + 0.5) * cell;
        const z = minZ + (j + 0.5) * cell;
        const onDeck = inside(def.jetty, x, z) || def.decks.some((r) => inside(r, x, z));
        const blocked = (def.water.some((r) => inside(r, x, z)) && !onDeck) || def.houses.some((r) => inside(r, x, z)) || (def.cliffs?.some((r) => inside(r, x, z)) ?? false);
        if (blocked) m[j * cols + i] = 0;
      }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def, cols, rows]);
  const pct = s ? Math.round(exploredFraction(s.fog.seen, walk) * 100) : 0;
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
      {exits.length > 0 && (
        <div>
          <h4>Laluan</h4>
          <ul>
            {exits.map((e) => (
              <li key={e.id}>
                <b>{e.label}</b>
                <span className="small dim">{gateText(e, known)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
