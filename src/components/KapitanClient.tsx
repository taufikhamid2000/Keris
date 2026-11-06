"use client";

import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { MapView } from "./PauseMenu";
import { LEVELS } from "@/game/levels";
import {
  KAPITAN,
  KG_DEAD,
  KG_ORDERED,
  KG_STUNNED,
  KG_TARGET,
  cleanRoomCode,
  parseSnap,
  type KapitanCmd,
  type KapitanSnap,
} from "@/game/kapitan";
import { RoomLink, kapitanConfig, peerId, type LinkStatus } from "@/game/kapitanNet";
import css from "./kapitan.module.css";
import { useT } from "./useT";
import { useLang } from "./useLang";

/** Dua pemain, the Kapitan's side: a phone page with a live map of the mission and three limited powers. No three.js. */
const CFG = kapitanConfig();

const PHASES = ["title", "intro", "paused", "won", "lost"];

type Mode = "look" | "lantern" | "send";

export default function KapitanClient({ room }: { room: string | null }) {
  const t = useT(useLang());
  const [code, setCode] = useState<string | null>(cleanRoomCode(room));
  const [typed, setTyped] = useState(room ?? "");
  const [status, setStatus] = useState<LinkStatus>("connecting");
  const [snap, setSnap] = useState<KapitanSnap | null>(null);
  const [ended, setEnded] = useState(false);
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<Mode>("look");
  const [picked, setPicked] = useState<number | null>(null);
  const [armed, setArmed] = useState(false);
  const linkRef = useRef<RoomLink | null>(null);
  const meRef = useRef("");

  useEffect(() => {
    if (!code || !CFG) return;
    const me = peerId();
    meRef.current = me;
    const link = new RoomLink(CFG, {
      code,
      onStatus: setStatus,
      onMessage: (e, p) => {
        if (e === "snap") {
          const s = parseSnap(p);
          if (s) {
            setSnap(s);
            link.markPeer();
          }
        } else if (e === "note" && p.to === me && typeof p.text === "string") {
          setNote(p.text.slice(0, 160));
          link.markPeer();
        } else if (e === "end") {
          setEnded(true);
          link.close();
        }
      },
    });
    linkRef.current = link;
    const hello = setInterval(() => link.send("hello", { from: me }), 2000);
    const bye = () => link.send("bye", { from: me });
    window.addEventListener("pagehide", bye);
    return () => {
      clearInterval(hello);
      window.removeEventListener("pagehide", bye);
      bye();
      link.close();
      linkRef.current = null;
    };
  }, [code]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(""), 4000);
    return () => clearTimeout(t);
  }, [note]);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  const join = (v: string) => {
    const c = cleanRoomCode(v);
    if (!c) {
      setNote(t("kapitan.badCode"));
      return;
    }
    setEnded(false);
    setSnap(null);
    setStatus("connecting");
    setCode(c);
    try {
      window.history.replaceState(null, "", `/kapitan?room=${c}`);
    } catch {
      /* fine without */
    }
  };
  const leave = () => {
    setCode(null);
    setSnap(null);
    setEnded(false);
    try {
      window.history.replaceState(null, "", "/kapitan");
    } catch {
      /* fine without */
    }
  };

  if (!CFG) return null;

  if (!code || ended) {
    return (
      <main className={css.page}>
        <form
          className={css.join}
          onSubmit={(e) => {
            e.preventDefault();
            join(typed);
          }}
        >
          <p className="kicker">{t("kapitan.kicker")}</p>
          <h1>{t("kapitan.name")}</h1>
          {ended ? (
            <p>{t("kapitan.ended")}</p>
          ) : (
            <p>
              {t("kapitan.intro.before")}
              <b>{t("kapitan.title")}</b>
              {t("kapitan.intro.after")}
            </p>
          )}
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="ABCD"
            aria-label={t("kapitan.roomCode")}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            maxLength={4}
          />
          <button className="btn" type="submit">
            {t("kapitan.join")}
          </button>
          {note && <p className="small">{note}</p>}
        </form>
      </main>
    );
  }

  const def = snap ? (LEVELS.find((l) => l.id === snap.level) ?? null) : null;
  const live = status === "connected" && snap?.phase === "playing";
  const pw = snap?.powers;
  const b = def?.bounds;
  const mark = b ? Math.max(b.maxX - b.minX, b.maxZ - b.minZ) / 60 : 1;

  const send = (c: KapitanCmd) => {
    if (!linkRef.current?.send("cmd", { from: meRef.current, c })) setNote(t("kapitan.notConnected"));
  };
  const nearestGuard = (x: number, z: number) => {
    let best: number | null = null;
    let bd = mark * 3;
    for (const g of snap?.guards ?? []) {
      if (g[5] & KG_DEAD) continue;
      const d = Math.hypot(g[1] - x, g[2] - z);
      if (d < bd) {
        bd = d;
        best = g[0];
      }
    }
    return best;
  };
  const onTap = (e: RPointerEvent<HTMLDivElement>) => {
    if (!snap || !live) return;
    const svg = e.currentTarget.querySelector("svg");
    const m = svg?.getScreenCTM();
    if (!m) return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const x = -pt.x;
    const z = -pt.y;
    if (mode === "lantern") {
      send({ k: "lantern", x, z });
      setMode("look");
      return;
    }
    const g = nearestGuard(x, z);
    if (mode === "send" && picked !== null && g === null) {
      send({ k: "send", id: picked, x, z });
      setPicked(null);
      setMode("look");
    } else if (g !== null) {
      setPicked(g);
      setMode("send");
    } else if (mode === "send") setNote(t("kapitan.tapGuardFirst"));
  };

  const hint = !snap
    ? t("kapitan.waitingGame")
    : !live
      ? ""
      : mode === "lantern"
        ? t("kapitan.hint.lantern", { r: KAPITAN.lanternR })
        : mode === "send"
          ? picked === null
            ? t("kapitan.hint.pick")
            : t("kapitan.hint.send")
          : t("kapitan.hint.idle");

  return (
    <main className={css.page}>
      <header className={css.head}>
        <h1>{t("kapitan.name")} {code}</h1>
        <span className={css.status}>
          <i className={`${css.dot} ${css[status]}`} /> {t(`kapitan.status.${status}`)}
        </span>
      </header>
      <div className={css.mapWrap} onPointerDown={onTap}>
        {def && snap ? (
          <MapView def={def} s={null}>
            <g transform={`translate(${-snap.exit.x} ${-snap.exit.z})`}>
              <circle className={`m-exit${snap.escape ? " on" : ""}`} r={mark * 0.9} />
            </g>
            {snap.objective && (
              <g transform={`translate(${-snap.objective.x} ${-snap.objective.z}) rotate(45)`}>
                <rect className="m-obj" x={-mark * 0.7} y={-mark * 0.7} width={mark * 1.4} height={mark * 1.4} />
              </g>
            )}
            {snap.lanterns.map(([x, z], i) => (
              <g key={i} transform={`translate(${-x} ${-z})`}>
                <circle className={css.glow} r={KAPITAN.lanternR} />
                <circle className={css.lamp} r={mark * 0.4} />
              </g>
            ))}
            {snap.guards.map(([id, x, z, yaw, st, f]) =>
              f & KG_DEAD ? (
                <g key={id} transform={`translate(${-x} ${-z})`}>
                  <line className={css.downed} x1={-mark * 0.6} y1={-mark * 0.6} x2={mark * 0.6} y2={mark * 0.6} />
                  <line className={css.downed} x1={mark * 0.6} y1={-mark * 0.6} x2={-mark * 0.6} y2={mark * 0.6} />
                </g>
              ) : (
                <g key={id} transform={`translate(${-x} ${-z}) rotate(${(-yaw * 180) / Math.PI})`} opacity={f & KG_STUNNED ? 0.5 : 1}>
                  <line className={css.face} x1={0} y1={0} x2={0} y2={-mark * 1.8} />
                  <circle className={`${css.guard} ${css[`s${st}`]}`} r={mark * 0.75} />
                  {f & KG_TARGET ? <circle className={css.ring} r={mark * 1.2} /> : null}
                  {f & KG_ORDERED ? <circle className={css.ordered} r={mark * 1.5} /> : null}
                  {picked === id && <circle className={css.picked} r={mark * 1.9} />}
                </g>
              ),
            )}
            {snap.pendekar &&
              (snap.pendekar.seen ? (
                <circle className={css.seen} cx={-snap.pendekar.x} cy={-snap.pendekar.z} r={mark * 0.9} />
              ) : (
                <g transform={`translate(${-snap.pendekar.x} ${-snap.pendekar.z})`}>
                  <circle className={css.last} r={mark * 0.9} />
                  <text className={css.lastTxt} y={-mark * 1.4} style={{ fontSize: mark * 1.3 }}>
                    {t("kapitan.ago", { s: Math.round(snap.pendekar.age) })}
                  </text>
                </g>
              ))}
          </MapView>
        ) : (
          <p className={css.banner}>{status === "connected" ? t("kapitan.loadingMap") : t("kapitan.waitingGame")}</p>
        )}
        {snap && snap.phase !== "playing" && <p className={css.banner}>{PHASES.includes(snap.phase) ? t(`kapitan.phase.${snap.phase}`) : ""}</p>}
        {snap && status === "lost" && <p className={css.banner}>{t("kapitan.retrying")}</p>}
        {note && <p className={css.note}>{note}</p>}
      </div>
      <p className={css.hint}>{hint}</p>
      <div className={css.tools}>
        <button
          className={`${css.tool}${mode === "lantern" ? ` ${css.on}` : ""}`}
          disabled={!live || !pw || pw.lanternsLeft <= 0 || pw.lanternCd > 0}
          onClick={() => setMode(mode === "lantern" ? "look" : "lantern")}
        >
          <b>{t("kapitan.tool.lantern")}</b>
          <span>{pw ? (pw.lanternCd > 0 && pw.lanternsLeft > 0 ? t("kapitan.tool.sec", { n: Math.ceil(pw.lanternCd) }) : t("kapitan.tool.left", { n: pw.lanternsLeft })) : "-"}</span>
        </button>
        <button
          className={`${css.tool}${mode === "send" ? ` ${css.on}` : ""}`}
          disabled={!live || !pw || pw.sendCd > 0}
          onClick={() => {
            setPicked(null);
            setMode(mode === "send" ? "look" : "send");
          }}
        >
          <b>{t("kapitan.tool.send")}</b>
          <span>{pw ? (pw.sendCd > 0 ? t("kapitan.tool.sec", { n: Math.ceil(pw.sendCd) }) : t("kapitan.tool.sendReady")) : "-"}</span>
        </button>
        <button
          className={`${css.tool}${armed ? ` ${css.arm}` : ""}`}
          disabled={!live || !pw?.alarm}
          onClick={() => {
            if (!armed) return setArmed(true);
            setArmed(false);
            send({ k: "alarm" });
          }}
        >
          <b>{t("kapitan.tool.alarm")}</b>
          <span>{pw?.alarm ? (armed ? t("kapitan.tool.armed") : t("kapitan.tool.once")) : t("kapitan.tool.used")}</span>
        </button>
      </div>
      <p className={css.legend}>
        {t("kapitan.legend")}{" "}
        <button className="btn ghost sm" onClick={leave}>
          {t("kapitan.leave")}
        </button>
      </p>
    </main>
  );
}
