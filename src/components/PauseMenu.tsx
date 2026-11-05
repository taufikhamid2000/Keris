"use client";

import type { ReactNode } from "react";
import type { MapState } from "@/game/engine";
import type { LevelDef, Rect } from "@/game/levels";
import { formatTime } from "@/game/save";

export const PAUSE_TABS = [
  { id: "peta", name: "Peta", sub: "Map" },
  { id: "kelengkapan", name: "Kelengkapan", sub: "Gear" },
  { id: "ilmu", name: "Ilmu", sub: "Skills" },
  { id: "hikayat", name: "Hikayat", sub: "Mission" },
] as const;

// The map looks down with north (+z, inland) up; facing +z, +x is on the left, so screen x is -x.
const sx = (x: number) => -x;
const sy = (z: number) => -z;
const box = (r: Rect, key: string | number, cls: string) => (
  <rect key={key} className={cls} x={sx(r.x + r.w / 2)} y={sy(r.z + r.d / 2)} width={r.w} height={r.d} />
);

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

const ILMU: { branch: string; sub: string; skills: [string, string][] }[] = [
  {
    branch: "Bayang",
    sub: "Shadow",
    skills: [
      ["Langkah senyap", "Crouch to move quietly and stay low"],
      ["Bersembunyi", "Vanish into haystacks and bushes"],
      ["Angkat mayat", "Carry a body and hide it"],
      ["Selam", "Dive under the water while your breath lasts"],
    ],
  },
  {
    branch: "Silat",
    sub: "Combat",
    skills: [
      ["Tikam", "Keris takedown from behind, or from a ledge above"],
      ["Pukulan berat", "Hold to strike hard and break a guard"],
      ["Tangkis", "Parry just before a guard strikes"],
      ["Golek", "Roll clear of a blow or a crowd"],
    ],
  },
  {
    branch: "Helang",
    sub: "Eagle",
    skills: [
      ["Mata Helang", "See every guard and where he is looking"],
      ["Pisau lempar", "Throw a knife to stun or distract"],
    ],
  },
];

export default function PauseMenu({
  def,
  s,
  tab,
  setTab,
  touch,
  controls,
  best,
  actions,
}: {
  def: LevelDef;
  s: MapState | null;
  tab: number;
  setTab: (i: number) => void;
  touch: boolean;
  controls: ReactNode;
  best: ReactNode;
  actions: ReactNode;
}) {
  const cur = PAUSE_TABS[tab]?.id ?? "peta";
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
                <i className="k-hide" /> Hiding spot
              </p>
            </>
          )}
          {cur === "kelengkapan" && (
            <div className="slots">
              <Slot sub="Senjata" name="Keris" value="Takedowns and close fighting" />
              <Slot sub="Lempar" name="Pisau lempar" value={s ? `${s.knives} of ${s.maxKnives} left` : "-"} />
              <Slot sub="Pakaian" name="Baju pendekar" value="Dark cloth for the dusk" />
              <Slot sub="Tangkal" name="Empty" value="No amulet found yet" empty />
              <Slot sub="Nyawa" name="Health" value={s ? `${Math.ceil(s.hp)} of ${s.maxHp}` : "-"} />
            </div>
          )}
          {cur === "ilmu" && (
            <div className="ilmu">
              {ILMU.map((b) => (
                <div key={b.branch} className="branch">
                  <h3>
                    {b.branch} <span className="dim small">{b.sub}</span>
                  </h3>
                  <ul>
                    {b.skills.map(([n, d]) => (
                      <li key={n}>
                        <b>{n}</b>
                        <span className="dim small">{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {cur === "hikayat" && (
            <>
              <h3>{def.name}</h3>
              <p className="story">{def.story}</p>
              {s && (
                <p className="small">
                  Time {formatTime(s.time)} · Guards down {s.guardsDown} of {s.guards} · Times seen {s.alerts}
                </p>
              )}
              {best}
              <h3>Controls</h3>
              {controls}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
