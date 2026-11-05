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

/** Dua pemain, the Kapitan's side: a phone page with a live map of the mission and three limited powers. No three.js. */
const CFG = kapitanConfig();

const STATUS: Record<LinkStatus, string> = {
  connecting: "Menyambung · connecting",
  waiting: "Menunggu pendekar · waiting for the game",
  connected: "Bersambung · connected",
  lost: "Hilang hubungan · connection lost",
  closed: "Tamat · ended",
};

const PHASE_TEXT: Record<string, string> = {
  title: "The pendekar is at the main menu",
  intro: "The pendekar watches the opening",
  paused: "Berhenti · the pendekar has paused",
  won: "The pendekar got away. Misi berjaya",
  lost: "The pendekar has fallen. Misi gagal",
};

type Mode = "look" | "lantern" | "send";

export default function KapitanClient({ room }: { room: string | null }) {
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
      setNote("A room code is four letters.");
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
          <p className="kicker">Keris · Dua pemain</p>
          <h1>Kapitan</h1>
          {ended ? (
            <p>Sesi tamat. The pendekar ended the session.</p>
          ) : (
            <p>
              Your friend plays the pendekar. You are the Kapitan who holds the town: watch your guards, hang pelita, send men to look, and beat the
              kentung once. On the game&apos;s title screen they pick <b>Dua pemain</b> and read you a four-letter code.
            </p>
          )}
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="ABCD"
            aria-label="Room code"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            maxLength={4}
          />
          <button className="btn" type="submit">
            Masuk · join
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
    if (!linkRef.current?.send("cmd", { from: meRef.current, c })) setNote("Not connected right now.");
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
    } else if (mode === "send") setNote("Tap one of your guards first.");
  };

  const hint = !snap
    ? "Waiting for the pendekar's game…"
    : !live
      ? ""
      : mode === "lantern"
        ? `Tap the map to hang a pelita. Guards spot the pendekar faster within ${KAPITAN.lanternR} m of it.`
        : mode === "send"
          ? picked === null
            ? "Tap a guard."
            : "Now tap where he should go and look. Tap another guard to pick him instead."
          : "Tap a guard to give him an order.";

  return (
    <main className={css.page}>
      <header className={css.head}>
        <h1>Kapitan {code}</h1>
        <span className={css.status}>
          <i className={`${css.dot} ${css[status]}`} /> {STATUS[status]}
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
                    {Math.round(snap.pendekar.age)} s ago
                  </text>
                </g>
              ))}
          </MapView>
        ) : (
          <p className={css.banner}>{status === "connected" ? "Loading the map…" : "Waiting for the pendekar's game…"}</p>
        )}
        {snap && snap.phase !== "playing" && <p className={css.banner}>{PHASE_TEXT[snap.phase] ?? ""}</p>}
        {snap && status === "lost" && <p className={css.banner}>Hilang hubungan · trying again…</p>}
        {note && <p className={css.note}>{note}</p>}
      </div>
      <p className={css.hint}>{hint}</p>
      <div className={css.tools}>
        <button
          className={`${css.tool}${mode === "lantern" ? ` ${css.on}` : ""}`}
          disabled={!live || !pw || pw.lanternsLeft <= 0 || pw.lanternCd > 0}
          onClick={() => setMode(mode === "lantern" ? "look" : "lantern")}
        >
          <b>Pelita</b>
          <span>{pw ? (pw.lanternCd > 0 && pw.lanternsLeft > 0 ? `${Math.ceil(pw.lanternCd)} s` : `${pw.lanternsLeft} left`) : "-"}</span>
        </button>
        <button
          className={`${css.tool}${mode === "send" ? ` ${css.on}` : ""}`}
          disabled={!live || !pw || pw.sendCd > 0}
          onClick={() => {
            setPicked(null);
            setMode(mode === "send" ? "look" : "send");
          }}
        >
          <b>Hantar</b>
          <span>{pw ? (pw.sendCd > 0 ? `${Math.ceil(pw.sendCd)} s` : "send a guard") : "-"}</span>
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
          <b>Kentung</b>
          <span>{pw?.alarm ? (armed ? "tap again to beat it" : "once per attempt") : "used"}</span>
        </button>
      </div>
      <p className={css.legend}>
        White patrol · yellow suspicious · orange searching · red alert · gold ring the target · red dot the pendekar where a guard sees him, dashed where last seen.{" "}
        <button className="btn ghost sm" onClick={leave}>
          Leave
        </button>
      </p>
    </main>
  );
}
