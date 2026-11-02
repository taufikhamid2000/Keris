"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Game, HudState, LoseReason, Phase } from "@/game/engine";

const EMPTY: HudState = {
  meter: 0,
  alert: "calm",
  objective: "",
  northDeg: 0,
  objDeg: null,
  eagle: false,
  crouched: false,
  hidden: false,
  knives: 0,
  prompt: "",
  toast: "",
  caught: 0,
};

declare global {
  interface Window {
    __keris?: Game;
  }
}

const subscribeMQ = (cb: () => void) => {
  const mq = window.matchMedia("(pointer: coarse), (max-width: 760px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const isMobileSnapshot = () => window.matchMedia("(pointer: coarse), (max-width: 760px)").matches;

const CONTROLS: [string, string][] = [
  ["W A S D", "Move"],
  ["Shift", "Run (louder)"],
  ["C / Ctrl", "Crouch (quieter)"],
  ["Space", "Jump / climb ledge"],
  ["Mouse", "Look"],
  ["E", "Tikam: keris takedown from behind"],
  ["Q", "Pisau lempar: stun / distract"],
  ["F", "Carry / drop a body (hide it in hay or bush)"],
  ["V", "Mata Helang vision"],
  ["Esc", "Pause"],
];

function Compass({ north, obj }: { north: number; obj: number | null }) {
  const marks = ["N", "E", "S", "W"];
  return (
    <div className="compass" aria-label="compass">
      <div className="compass-ring" style={{ transform: `rotate(${north}deg)` }}>
        {marks.map((m, i) => (
          <span key={m} style={{ transform: `rotate(${i * 90}deg) translateY(-34px)` }}>
            {m}
          </span>
        ))}
      </div>
      {obj !== null && (
        <div className="compass-obj" style={{ transform: `rotate(${obj}deg)` }}>
          <i />
        </div>
      )}
      <b />
    </div>
  );
}

function Controls() {
  return (
    <table className="controls">
      <tbody>
        {CONTROLS.map(([k, d]) => (
          <tr key={k}>
            <td>
              <kbd>{k}</kbd>
            </td>
            <td>{d}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function GameClient() {
  const mount = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [phase, setPhase] = useState<Phase>("title");
  const [reason, setReason] = useState<LoseReason>(null);
  const [hud, setHud] = useState<HudState>(EMPTY);
  const [failed, setFailed] = useState(false);
  const mobile = useSyncExternalStore(subscribeMQ, isMobileSnapshot, () => false);

  useEffect(() => {
    if (mobile || !mount.current) return;
    let disposed = false;
    let inst: Game | null = null;
    import("@/game/engine")
      .then(({ Game }) => {
        if (disposed || !mount.current) return;
        inst = new Game(mount.current, {
          onHud: setHud,
          onPhase: (p, r) => {
            setPhase(p);
            setReason(r);
          },
        });
        window.__keris = inst;
        setGame(inst);
      })
      .catch(() => setFailed(true));
    return () => {
      disposed = true;
      inst?.dispose();
      delete window.__keris;
    };
  }, [mobile]);

  if (mobile) {
    return (
      <main className="center-screen">
        <h1>Keris</h1>
        <p>Keris is a desktop game. It needs a keyboard and mouse.</p>
        <p className="dim">Open this page on a computer to play.</p>
      </main>
    );
  }

  const g = () => game;
  const alertCls = hud.alert === "calm" ? "" : hud.alert;

  return (
    <div className="root">
      <div ref={mount} className="stage" />
      {failed && (
        <div className="overlay">
          <div className="panel">
            <h2>WebGL unavailable</h2>
            <p>The game could not start in this browser.</p>
          </div>
        </div>
      )}

      {phase === "playing" && (
        <div className="hud">
          <div className="topleft">
            <div className="objective">
              <span className="label">Objective</span>
              {hud.objective}
            </div>
            <div className={`meter ${alertCls}`}>
              <div className="meter-fill" style={{ width: `${Math.round(hud.meter * 100)}%` }} />
              <span>{hud.alert === "calm" ? "Unseen" : hud.alert}</span>
            </div>
            <div className="chips">
              {hud.hidden && <em>Hidden</em>}
              {hud.crouched && <em>Crouched</em>}
              {hud.eagle && <em className="gold">Mata Helang</em>}
              <em>Pisau lempar x{hud.knives}</em>
            </div>
          </div>
          <Compass north={hud.northDeg} obj={hud.objDeg} />
          {hud.caught > 0.02 && (
            <div className="caught">
              <span>Caught!</span>
              <div style={{ width: `${hud.caught * 100}%` }} />
            </div>
          )}
          {hud.prompt && <div className="prompt">{hud.prompt}</div>}
          {hud.toast && <div className="toast">{hud.toast}</div>}
          <div className="hint">
            WASD move · Shift run · C crouch · Space climb · E tikam · Q throw · F carry body · V Mata Helang · Esc pause
          </div>
        </div>
      )}

      {phase === "title" && (
        <div className="overlay title">
          <div className="panel wide">
            <p className="kicker">Malacca, July 1511</p>
            <h1>Keris</h1>
            <p className="story">
              The Portuguese fleet lies in the roads and their battery commands the bridge. The elder Hang Tuah has chosen you, Pendekar, to
              silence the Kapitan before the guns are turned on the town. Move over the atap roofs and through the kampung lanes, strike once with your
              keris, and slip out by the jetty.
            </p>
            <Controls />
            <button className="btn" onClick={() => g()?.start()} disabled={!game}>
              Begin
            </button>
            <p className="dim small">Click Begin to capture the mouse. Best on a desktop browser.</p>
          </div>
        </div>
      )}

      {phase === "paused" && (
        <div className="overlay">
          <div className="panel">
            <h2>Paused</h2>
            <Controls />
            <button className="btn" onClick={() => g()?.resume()}>
              Resume
            </button>
            <button className="btn ghost" onClick={() => g()?.start()}>
              Restart
            </button>
          </div>
        </div>
      )}

      {phase === "won" && (
        <div className="overlay">
          <div className="panel">
            <h2>The Kapitan is silenced</h2>
            <p>You reached the jetty and vanished into the harbour. The battery will wait for a new commander.</p>
            <button className="btn" onClick={() => g()?.start()}>
              Play again
            </button>
          </div>
        </div>
      )}

      {phase === "lost" && (
        <div className="overlay lost">
          <div className="panel">
            <h2>{reason === "caught" ? "You were caught" : "Mission failed"}</h2>
            <p>The alarm spread through the lanes. Try another route.</p>
            <button className="btn" onClick={() => g()?.start()}>
              Restart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
