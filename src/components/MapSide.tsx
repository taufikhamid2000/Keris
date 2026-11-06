"use client";

import { useMemo } from "react";
import type { MapState } from "@/game/engine";
import { exploredFraction } from "@/game/fog";
import { placesInBounds } from "@/game/kitab";
import { missionText, type LevelDef } from "@/game/levels";
import { gateLabel } from "@/game/worldgraph";
import { DEFAULT_LANG, t as tr, type Lang } from "@/game/i18n";
import { useT } from "./useT";

/** A walkable gate to another map, as the engine reports it in MapState.exits. */
export interface MapExit {
  id: string;
  x: number;
  z: number;
  label: string;
  to: string;
}

/** The gates on this map. */
export function mapExits(s: MapState | null): MapExit[] {
  return s?.exits ?? [];
}

/** Where a gate leads: the map's name once the player has been there, a vague hint before. */
export function gateText(e: MapExit, known: Record<string, string>, lang: Lang = DEFAULT_LANG): string {
  return known[e.to] ? tr(lang, "map.gateTo", { name: known[e.to] }) : tr(lang, "map.gateUnknown");
}

/** Left of the Peta map: what the markers mean. */
export function MapLegend({ def, lang = DEFAULT_LANG }: { def: LevelDef; lang?: Lang }) {
  const t = useT(lang);
  return (
    <aside className="map-side" aria-label={t("map.legend")}>
      <h4>{t("map.legend")}</h4>
      <p className="legend small dim">
        <span>
          <i className="k-you" /> {t("map.legend.you")}
        </span>
        <span>
          <i className="k-obj" /> {def.objective.kind === "steal" ? t("map.legend.item") : t("map.legend.target")}
        </span>
        <span>
          <i className="k-exit" /> {t("map.legend.escape")}
        </span>
        <span>
          <i className="k-gate" /> {t("map.legend.gate")}
        </span>
        <span>
          <i className="k-hide" /> {t("map.legend.hide")}
        </span>
        <span>
          <i className="k-fog" /> {t("map.legend.fog")}
        </span>
      </p>
    </aside>
  );
}

/** Right of the Peta map: mission objectives, Kitab places on this level and how much of it is explored. */
export function MapObjectives({ def, s, places, known = {}, lang = DEFAULT_LANG }: { def: LevelDef; s: MapState | null; places: string[]; known?: Record<string, string>; lang?: Lang }) {
  const t = useT(lang);
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
    { key: "main", text: missionText(lang, def, "objective") ?? def.text.objective, done: mainDone || escapeNow },
    { key: "escape", text: missionText(lang, def, "escape") ?? def.text.escape, done: false },
  ];
  const open = here.filter((p) => places.includes(p.id)).length;
  return (
    <aside className="map-side" aria-label={t("map.mission")}>
      <div>
        <h4>{t("map.mission")}</h4>
        <ul>
          {goals.map((g) => (
            <li key={g.key} className={g.done ? "done" : ""}>
              <span>{g.text}</span>
            </li>
          ))}
          {def.undetected && (
            <li>
              <span>{t("map.unseen")}</span>
            </li>
          )}
        </ul>
      </div>
      {exits.length > 0 && (
        <div>
          <h4>{t("map.routes")}</h4>
          <ul>
            {exits.map((e) => (
              <li key={e.id}>
                <b>{gateLabel(lang, e)}</b>
                <span className="small dim">{gateText(e, known, lang)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <h4>
          {t("map.explored")} <span className="dim small">{s ? t("map.exploredPct", { pct }) : "-"}</span>
        </h4>
        <span className="map-pct" aria-hidden="true">
          <i style={{ width: `${pct}%` }} />
        </span>
      </div>
      <div>
        <h4>
          {t("map.places")}{" "}
          <span className="dim small">
            {t("map.placesCount", { open, total: here.length })}
          </span>
        </h4>
        <ul>
          {here.map((p) => {
            const have = places.includes(p.id);
            return (
              <li key={p.id} className={have ? "" : "missing"}>
                <b>{have ? p.title : t("map.placeMissing")}</b>
                <span className="small dim">{have ? p.text : p.hint}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
