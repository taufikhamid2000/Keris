"use client";

import type { ReactNode } from "react";
import type { MapState } from "@/game/engine";
import { AMULETS, amuletById, amuletForLevel } from "@/game/amulets";
import type { LevelDef, Rect } from "@/game/levels";
import { formatTime } from "@/game/save";
import { TideNote } from "./Tide";

export const PAUSE_TABS = [
  { id: "peta", name: "Peta", sub: "Map" },
  { id: "kelengkapan", name: "Kelengkapan", sub: "Gear" },
  { id: "ilmu", name: "Ilmu", sub: "Skills" },
  { id: "kitab", name: "Kitab", sub: "Journal" },
  { id: "hikayat", name: "Hikayat", sub: "Mission" },
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

function MapView({ def, s }: { def: LevelDef; s: MapState | null }) {
  const b = def.bounds;
  const pad = 6;
  const vx = sx(b.maxX) - pad;
  const vy = sy(b.maxZ) - pad;
  const vw = b.maxX - b.minX + pad * 2;
  const vh = b.maxZ - b.minZ + pad * 2;
  const pal = def.palisade;
  const mark = Math.max(vw, vh) / 60;
  return (
    <svg className="map" viewBox={`${vx} ${vy} ${vw} ${vh}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Map of ${def.name}`}>
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
  charms,
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
  /** tangkal found (ids) and the one worn */
  charms: { found: string[]; worn: string | null; wear: (id: string | null) => void };
}) {
  const cur = PAUSE_TABS[tab]?.id ?? "peta";
  const worn = amuletById(charms.found.includes(charms.worn ?? "") ? charms.worn : null);
  const here = amuletForLevel(def.id);
  const step = (d: number) => setTab((tab + d + PAUSE_TABS.length) % PAUSE_TABS.length);
  return (
    <div className="overlay menu-screen pause">
      <nav className="menu" aria-label="Pause menu">
        <p className="kicker">{def.name}</p>
        <h2 className="pause-title">Berhenti</h2>
        {actions}
      </nav>
      <section className="songket menu-pane pause-pane">
        <div className="tabs" role="tablist">
          {!touch && <kbd onClick={() => step(-1)}>Q</kbd>}
          {PAUSE_TABS.map((t, i) => (
            <button key={t.id} role="tab" aria-selected={i === tab} className={`tab${i === tab ? " on" : ""}`} onClick={() => setTab(i)}>
              {t.name}
              <span>{t.sub}</span>
            </button>
          ))}
          {!touch && <kbd onClick={() => step(1)}>E</kbd>}
        </div>
        <div role="tabpanel">
          {cur === "peta" && (
            <>
              <MapView def={def} s={s} />
              <p className="legend small dim">
                <i className="k-you" /> You <i className="k-obj" /> {def.objective.kind === "steal" ? "Item" : "Target"} <i className="k-exit" /> Escape{" "}
                <i className="k-hide" /> Hiding spot <i className="k-fog" /> Not explored yet
              </p>
              {s && <TideNote levelId={def.id} time={s.time} />}
            </>
          )}
          {cur === "kelengkapan" && (
            <div className="slots">
              <Slot sub="Senjata" name="Keris" value="Takedowns and close fighting" />
              <Slot sub="Alat 1" name="Pisau lempar" value={s ? `${s.knives} of ${s.maxKnives} left` : "-"} />
              <Slot sub="Alat 2" name="Batu" value={s ? `${s.stones} stones left` : "-"} />
              <Slot sub="Alat 3" name="Serbuk lada" value={s ? `${s.pepper} handfuls left` : "-"} />
              <Slot sub="Pakaian" name="Baju pendekar" value="Dark cloth for the dusk" />
              {worn ? <Slot sub="Tangkal" name={worn.name} value={worn.desc} /> : <Slot sub="Tangkal" name="Empty" value={charms.found.length ? "None worn" : "No amulet found yet"} empty />}
              <Slot sub="Nyawa" name="Health" value={s ? `${Math.ceil(s.hp)} of ${s.maxHp}` : "-"} />
            </div>
          )}
          {cur === "kelengkapan" && (
            <div className="charms">
              <h3>
                Tangkal <span className="dim small">{charms.found.length} of {AMULETS.length} found · one hidden in a haystack or bush on each mission</span>
              </h3>
              <ul>
                {AMULETS.map((a) => {
                  const have = charms.found.includes(a.id);
                  const on = charms.worn === a.id;
                  return (
                    <li key={a.id} className={`charm${have ? "" : " missing"}${on ? " on" : ""}`}>
                      <b>{have ? a.name : "Not found yet"}</b>
                      <span className="small dim">{have ? a.desc : a.level === def.id ? "Hidden somewhere on this mission" : "On another mission"}</span>
                      {have && (
                        <button className="btn ghost sm" onClick={() => charms.wear(on ? null : a.id)}>
                          {on ? "Take off" : "Wear"}
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
              <h3>{def.name}</h3>
              <p className="story">{def.story}</p>
              {s && (
                <p className="small">
                  Time {formatTime(s.time)} · Guards down {s.guardsDown} of {s.guards} · Times seen {s.alerts}
                </p>
              )}
              {s && <TideNote levelId={def.id} time={s.time} />}
              {best}
              {here && <p className="small">Tangkal: {charms.found.includes(here.id) ? `${here.name} found` : "still hidden on this mission"}</p>}
              <h3>Controls</h3>
              {controls}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
