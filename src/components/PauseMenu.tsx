"use client";

import type { ReactNode } from "react";
import type { MapState } from "@/game/engine";
import { AMULETS, amuletById, amuletDesc, amuletForLevel } from "@/game/amulets";
import { missionText, type LevelDef, type Rect } from "@/game/levels";
import { toolName } from "@/game/tools";
import { formatTime } from "@/game/save";
import { DEFAULT_LANG, type Lang } from "@/game/i18n";
import { useT } from "./useT";
import { TideNote } from "./Tide";
import PetaMap from "./PetaMap";
import { MapLegend, MapObjectives } from "./MapSide";

export const PAUSE_TABS = [
  { id: "peta" },
  { id: "kelengkapan" },
  { id: "ilmu" },
  { id: "kitab" },
  { id: "hikayat" },
] as const;

// The map looks down with north (+z, inland) up; facing +z, +x is on the left, so screen x is -x.
const sx = (x: number) => -x;
const sy = (z: number) => -z;
const box = (r: Rect, key: string | number, cls: string) => (
  <rect key={key} className={cls} x={sx(r.x + r.w / 2)} y={sy(r.z + r.d / 2)} width={r.w} height={r.d} />
);

/** Unexplored ground under a dark veil; explored squares are cut out of it with soft edges. */
function Fog({ f, vx, vy, vw, vh }: { f: MapState["fog"]; vx: number; vy: number; vw: number; vh: number }) {
  const holes: ReactNode[] = [];
  for (let z = 0; z < f.rows; z++)
    for (let x = 0; x < f.cols; x++) {
      if (!f.seen[z * f.cols + x]) continue;
      const x0 = f.minX + x * f.cell;
      const z0 = f.minZ + z * f.cell;
      // world box [x0, x0+cell] x [z0, z0+cell] on screen (x and z flip), a hair wider so squares meet
      holes.push(<rect key={z * f.cols + x} x={sx(x0 + f.cell) - 0.2} y={sy(z0 + f.cell) - 0.2} width={f.cell + 0.4} height={f.cell + 0.4} />);
    }
  return (
    <>
      <defs>
        <filter id="fog-soft" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation={f.cell * 0.6} />
        </filter>
        <mask id="fog-mask" maskUnits="userSpaceOnUse" x={vx} y={vy} width={vw} height={vh}>
          <rect x={vx} y={vy} width={vw} height={vh} fill="#fff" />
          <g fill="#000" filter="url(#fog-soft)">{holes}</g>
        </mask>
      </defs>
      <rect className="m-fog" x={vx} y={vy} width={vw} height={vh} mask="url(#fog-mask)" />
    </>
  );
}

/** The level map; `children` are drawn on top in the same coordinates (screen x = -world x, y = -world z). */
export function MapView({
  def,
  s,
  children,
  view,
  labels,
  labelSize,
  gates,
  lang = DEFAULT_LANG,
}: {
  def: LevelDef;
  s: MapState | null;
  children?: ReactNode;
  /** optional zoomed window in map units (default: the whole map) */
  view?: { x: number; y: number; w: number; h: number };
  /** place names, in world coordinates, drawn over the map */
  labels?: { text: string; x: number; z: number }[];
  /** label font size in map units */
  labelSize?: number;
  /** gates to other maps, in world coordinates, with their label text */
  gates?: { id: string; x: number; z: number; text: string }[];
  lang?: Lang;
}) {
  const t = useT(lang);
  const b = def.bounds;
  const pad = 6;
  const vx = sx(b.maxX) - pad;
  const vy = sy(b.maxZ) - pad;
  const vw = b.maxX - b.minX + pad * 2;
  const vh = b.maxZ - b.minZ + pad * 2;
  const pal = def.palisade;
  const mark = Math.max(vw, vh) / 60;
  const fs = labelSize ?? mark * 1.1;
  const vb = view ?? { x: vx, y: vy, w: vw, h: vh };
  return (
    <svg className="map" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={t("map.aria", { name: missionText(lang, def, "name") ?? def.name })}>
      <rect className="m-land" x={vx} y={vy} width={vw} height={vh} />
      {def.forestFloor?.map((r, i) => box(r, i, "m-forest"))}
      {def.clearings?.map((c, i) => <circle key={i} className="m-clear" cx={sx(c.x)} cy={sy(c.z)} r={c.r} />)}
      <rect className="m-sea" x={vx} y={sy(def.shoreZ)} width={vw} height={Math.max(0, vy + vh - sy(def.shoreZ))} />
      {def.water.map((r, i) => box(r, i, "m-water"))}
      {def.trails?.map((t, i) => <polyline key={i} className="m-trail" points={t.map((p) => `${sx(p.x)},${sy(p.z)}`).join(" ")} />)}
      {def.cliffs?.map((r, i) => box(r, i, "m-cliff"))}
      {def.decks.map((r, i) => box(r, i, "m-deck"))}
      {box(def.jetty, "jetty", "m-deck")}
      {def.steps.map((r, i) => box(r, i, "m-deck"))}
      {def.stalls.map((r, i) => box(r, i, "m-stall"))}
      {def.houses.map((h, i) => box(h, i, "m-house"))}
      {def.towers.map((t, i) => <rect key={i} className="m-house" x={sx(t.x) - 1.5} y={sy(t.z) - 1.5} width={3} height={3} />)}
      {def.prahus.map((p, i) => <ellipse key={i} className="m-boat" cx={sx(p.x)} cy={sy(p.z)} rx={1.4 * (p.scale ?? 1)} ry={1.4 * (p.scale ?? 1)} />)}
      {def.ships.map((p, i) => <circle key={i} className="m-boat" cx={sx(p.x)} cy={sy(p.z)} r={4} />)}
      {[...def.hay, ...def.bushes].map((h, i) => <circle key={i} className="m-hide" cx={sx(h.x)} cy={sy(h.z)} r={0.9} />)}
      <rect className="m-wall" x={sx(pal.maxX)} y={sy(pal.maxZ)} width={pal.maxX - pal.minX} height={pal.maxZ - pal.minZ} />
      {def.fences?.map((f, i) => <line key={i} className="m-fence" x1={sx(f.minX)} x2={sx(f.maxX)} y1={sy(f.z)} y2={sy(f.z)} />)}
      {s && s.fog.cols > 0 && <Fog f={s.fog} vx={vx} vy={vy} vw={vw} vh={vh} />}
      {s && (
        <>
          <g transform={`translate(${sx(s.exit.x)} ${sy(s.exit.z)})`}>
            <circle className={`m-exit${s.escape ? " on" : ""}`} r={mark * 0.9} />
          </g>
          {s.objective && (
            <g transform={`translate(${sx(s.objective.x)} ${sy(s.objective.z)}) rotate(45)`}>
              <rect className="m-obj" x={-mark * 0.7} y={-mark * 0.7} width={mark * 1.4} height={mark * 1.4} />
            </g>
          )}
          <g transform={`translate(${sx(s.player.x)} ${sy(s.player.z)}) rotate(${(-s.player.yaw * 180) / Math.PI})`}>
            <path className="m-you" d={`M0 ${-mark * 1.3} L${mark * 0.8} ${mark * 0.9} L0 ${mark * 0.4} L${-mark * 0.8} ${mark * 0.9} Z`} />
          </g>
        </>
      )}
      {gates?.map((g) => {
        const m = mark * 0.9;
        return (
          <g key={g.id} transform={`translate(${sx(g.x)} ${sy(g.z)})`}>
            <path className="m-gate" d={`M${-m} ${m * 0.7} L${-m} ${-m * 0.2} L0 ${-m} L${m} ${-m * 0.2} L${m} ${m * 0.7}`} strokeWidth={m * 0.35} />
            <path className="m-gate" d={`M${-m * 0.5} ${m * 0.1} L0 ${-m * 0.4} L${m * 0.5} ${m * 0.1}`} strokeWidth={m * 0.25} />
            <text className="m-place m-gate-t" y={m * 0.7 + fs * 0.9} fontSize={fs} textAnchor="middle" dominantBaseline="middle">
              {g.text}
            </text>
          </g>
        );
      })}
      {labels?.map((l) => {
        // keep clear of the player marker: nudge the name above it when they would collide
        const lx = sx(l.x);
        let ly = sy(l.z);
        const halfW = l.text.length * fs * 0.3;
        if (s && Math.abs(lx - sx(s.player.x)) < halfW + mark && Math.abs(ly - sy(s.player.z)) < fs + mark * 1.4) ly = sy(s.player.z) - mark * 1.6 - fs * 0.5;
        return (
          <text key={l.text} className="m-place" x={lx} y={ly} fontSize={fs} textAnchor="middle" dominantBaseline="middle">
            {l.text}
          </text>
        );
      })}
      {children}
    </svg>
  );
}

function Slot({ name, sub, value, empty = false }: { name: string; sub: string; value: string; empty?: boolean }) {
  return (
    <div className={`slot${empty ? " empty" : ""}`}>
      <span className="label">{sub}</span>
      <b>{name}</b>
      <span className="dim small">{value}</span>
    </div>
  );
}

export default function PauseMenu({
  def,
  s,
  tab,
  setTab,
  touch,
  controls,
  best,
  actions,
  skills,
  kitab,
  places = [],
  charms,
  lastTale,
  visited = [],
  known = {},
  lang = DEFAULT_LANG,
}: {
  def: LevelDef;
  s: MapState | null;
  tab: number;
  setTab: (i: number) => void;
  touch: boolean;
  controls: ReactNode;
  best: ReactNode;
  actions: ReactNode;
  skills: ReactNode;
  kitab: ReactNode;
  /** Kitab place ids written so far (save.kitab) */
  places?: string[];
  /** tangkal found (ids) and the one worn */
  charms: { found: string[]; worn: string | null; wear: (id: string | null) => void };
  /** the hikayat told at the end of this mission's last attempt, if any */
  lastTale?: ReactNode;
  /** Kitab place ids the player has reached; their names are drawn on the map */
  visited?: string[];
  /** maps the player has been to: level id -> name (a gate shows its destination only for these) */
  known?: Record<string, string>;
  lang?: Lang;
}) {
  const t = useT(lang);
  const cur = PAUSE_TABS[tab]?.id ?? "peta";
  const worn = amuletById(charms.found.includes(charms.worn ?? "") ? charms.worn : null);
  const here = amuletForLevel(def.id);
  const step = (d: number) => setTab((tab + d + PAUSE_TABS.length) % PAUSE_TABS.length);
  return (
    <div className="overlay menu-screen pause">
      <nav className="menu" aria-label={t("pause.menu.aria")}>
        <p className="kicker">{missionText(lang, def, "name") ?? def.name}</p>
        <h2 className="pause-title">{t("pause.title")}</h2>
        {actions}
      </nav>
      <section className="songket menu-pane pause-pane">
        <div className="tabs" role="tablist">
          {!touch && <kbd onClick={() => step(-1)}>Q</kbd>}
          {PAUSE_TABS.map((tb, i) => (
            <button key={tb.id} role="tab" aria-selected={i === tab} className={`tab${i === tab ? " on" : ""}`} onClick={() => setTab(i)}>
              {t(`pause.tab.${tb.id}`)}
              <span>{t(`pause.tab.${tb.id}.sub`)}</span>
            </button>
          ))}
          {!touch && <kbd onClick={() => step(1)}>E</kbd>}
        </div>
        <div role="tabpanel">
          {cur === "peta" && (
            <div className="peta-tab">
              <div className="map-tab">
                <MapLegend def={def} lang={lang} />
                <div className="map-mid">
                  <PetaMap def={def} s={s} visited={visited} known={known} lang={lang} />
                </div>
                <MapObjectives def={def} s={s} places={places} known={known} lang={lang} />
              </div>
              {s && <TideNote levelId={def.id} time={s.time} />}
            </div>
          )}
          {cur === "kelengkapan" && (
            <div className="slots">
              <Slot sub={t("menu.slot.weapon")} name="Keris" value={t("menu.gear.keris")} />
              <Slot sub={t("menu.slot.tool1")} name={toolName(lang, "knife")} value={s ? t("menu.gear.knives", { n: s.knives, max: s.maxKnives }) : "-"} />
              <Slot sub={t("menu.slot.tool2")} name={toolName(lang, "stone")} value={s ? t("menu.gear.stones", { n: s.stones }) : "-"} />
              <Slot sub={t("menu.slot.tool3")} name={toolName(lang, "pepper")} value={s ? t("menu.gear.pepper", { n: s.pepper }) : "-"} />
              <Slot sub={t("menu.slot.clothing")} name={t("menu.gear.clothingName")} value={t("menu.gear.clothing")} />
              {worn ? <Slot sub={t("menu.slot.charm")} name={worn.name} value={amuletDesc(lang, worn.id)} /> : <Slot sub={t("menu.slot.charm")} name={t("menu.gear.empty")} value={charms.found.length ? t("menu.gear.noneWorn") : t("menu.gear.noneFound")} empty />}
              <Slot sub={t("menu.slot.health")} name={t("menu.gear.healthName")} value={s ? t("menu.gear.healthValue", { n: Math.ceil(s.hp), max: s.maxHp }) : "-"} />
            </div>
          )}
          {cur === "kelengkapan" && (
            <div className="charms">
              <h3>
                Tangkal <span className="dim small">{t("menu.charms.count", { n: charms.found.length, total: AMULETS.length })}</span>
              </h3>
              <ul>
                {AMULETS.map((a) => {
                  const have = charms.found.includes(a.id);
                  const on = charms.worn === a.id;
                  return (
                    <li key={a.id} className={`charm${have ? "" : " missing"}${on ? " on" : ""}`}>
                      <b>{have ? a.name : t("menu.charms.missing")}</b>
                      <span className="small dim">{have ? amuletDesc(lang, a.id) : a.level === def.id ? t("menu.charms.hereHidden") : t("menu.charms.elsewhere")}</span>
                      {have && (
                        <button className="btn ghost sm" onClick={() => charms.wear(on ? null : a.id)}>
                          {on ? t("menu.charms.takeOff") : t("menu.charms.wear")}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {cur === "ilmu" && skills}
          {cur === "kitab" && kitab}
          {cur === "hikayat" && (
            <>
              <h3>{missionText(lang, def, "name") ?? def.name}</h3>
              <p className="story">{missionText(lang, def, "story") ?? def.story}</p>
              {s && (
                <p className="small">
                  {t("menu.hikayat.stats", { time: formatTime(s.time), down: s.guardsDown, total: s.guards, alerts: s.alerts })}
                </p>
              )}
              {s && <TideNote levelId={def.id} time={s.time} />}
              {best}
              {here && <p className="small">{charms.found.includes(here.id) ? t("menu.hikayat.charmFound", { name: here.name }) : t("menu.hikayat.charmHidden")}</p>}
              {lastTale}
              <h3>{t("title.controls")}</h3>
              {controls}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
