"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Game, HudState, IntroView, LoseReason, MapState, Phase } from "@/game/engine";
import { TOOLS } from "@/game/tools";
import { isTouchDevice, pickQuality, qualityFromUrl } from "@/game/touch";
import { LEVELS, initialLevel, type LevelDef } from "@/game/levels";
import {
  checkpointFor,
  defaultSave,
  formatTime,
  getSaveStore,
  hasProgress,
  markIntroSeen,
  shouldShowIntro,
  ratingLabel,
  recordStart,
  recordWin,
  addAmulet, setExplored, addKitab,
  wearAmulet,
  withCheckpoint,
  type Checkpoint,
  type MissionStats,
} from "@/game/save";
import KerisEmblem from "./KerisEmblem";
import PauseMenu, { PAUSE_TABS } from "./PauseMenu";
import SettingsPanel from "./SettingsPanel";
import SkillTree from "./SkillTree";
import Kitab from "./Kitab";
import { earnedPoints, learnSkill, resetSkills, skillMods } from "@/game/skills";
import { amuletForLevel, withAmulet } from "@/game/amulets";
import TouchControls, { enterFullscreenLandscape } from "./TouchControls";
import HikayatScroll from "./HikayatScroll";
import { tellHikayat } from "@/game/hikayat";
import { setTale } from "@/game/save";
import WayangOverlay from "./WayangOverlay";
import { PantunChoice, PantunLine } from "./PantunChoice";
import { addPantun } from "@/game/pantun";
import { TideBadge } from "./Tide";
import { DuaPemainButton, KapitanHostPanel } from "./KapitanHost";
import { CHANGE_NOTE, judge, recordJudgement, type Whisper } from "@/game/ghaib";

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
  tool: "knife",
  ammo: { knife: 0, stone: 0, pepper: 0 },
  wheel: null,
  prompt: "",
  toast: "",
  talk: "",
  carrying: false,
  hp: 3,
  maxHp: 3,
  breath: null,
  combat: false,
  incoming: false,
};

const SERVER_SAVE = defaultSave();

interface WinResult {
  time: number;
  rating: number;
  newBestTime: boolean;
  newBestRating: boolean;
  /** skill points this win earned (first completion, first Ghost) */
  points: number;
  /** the win screen's wording for this run (a wayang mission's ending depends on how it was played) */
  text?: { title: string; body: string };
}

declare global {
  interface Window {
    __keris?: Game;
  }
}

const mq = (q: string) => window.matchMedia(q).matches;
const subscribeMQ = (query: string) => (cb: () => void) => {
  const m = window.matchMedia(query);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const subscribeTouch = subscribeMQ("(pointer: coarse)");
const touchSnapshot = () =>
  isTouchDevice({
    coarse: mq("(pointer: coarse)"),
    fine: mq("(pointer: fine)"),
    hasTouchStart: "ontouchstart" in window,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    search: window.location.search,
  });
const subscribePortrait = subscribeMQ("(orientation: portrait)");
const portraitSnapshot = () => mq("(orientation: portrait)");

const CONTROLS: [string, string][] = [
  ["W A S D", "Move"],
  ["Shift", "Run (louder)"],
  ["C / Ctrl", "Crouch (quieter)"],
  ["Space", "Jump / climb ledge"],
  ["Mouse", "Look"],
  ["E / Left click", "Tikam: keris takedown from behind. In a fight, tap to strike, hold and let go for a heavy strike that breaks his guard"],
  ["R / Right click", "Parry: just before a guard strikes (his marker flashes white), then strike to finish him"],
  ["X", "Roll: dodge a strike or break away"],
  ["Q", "Use the tool in hand: pisau lempar (stun / distract), batu (stone: draws guards), serbuk lada (pepper: blinds guards close by)"],
  ["Hold Tab", "Tool wheel: move the mouse to pick, let go to take it (1, 2, 3 pick directly)"],
  ["F", "Carry / drop a body (hide it in hay or bush)"],
  ["E by a horse", "Mount it; WASD rides, Shift gallops (loud), E gets down"],
  ["E by a sampan", "Board it; WASD paddles, Shift faster, E by a bank goes ashore"],
  ["Walk into water (river, pool, sea)", "Swim; Shift faster, Ctrl / C dives out of sight while breath lasts, Space climbs aboard"],
  ["V", "Mata Helang vision"],
  ["Esc", "Pause"],
  ["Controller", "Sticks move / look, A jump, X tikam / strike (hold: heavy), LT parry, B roll, RT use tool, hold d-pad up for the tool wheel (right stick picks), d-pad left / right switch tool, Y carry, R3 crouch, RB vision, LB run, Start pause"],
];

const TOUCH_CONTROLS: [string, string][] = [
  ["Left thumb", "Move (push to the edge to run, louder)"],
  ["Drag right side", "Look"],
  ["Jump", "Jump / climb a ledge (hold at a wall)"],
  ["C", "Crouch toggle (quieter)"],
  ["E", "Tikam: takedown from behind. In a fight, tap to strike, hold for a heavy strike"],
  ["R", "Parry: just before a guard strikes (his marker flashes white)"],
  ["X", "Roll: dodge a strike or break away"],
  ["Q", "Use the tool in hand (knife, stone or pepper)"],
  ["Alat", "Switch tool"],
  ["F", "Carry / drop a body (hide it in hay or bush)"],
  ["E by a horse", "Mount it; the stick rides, E gets down"],
  ["E by a sampan", "Board it; the stick paddles, E by a bank goes ashore"],
  ["Walk into water (river, pool, sea)", "Swim; crouch dives out of sight while breath lasts, jump climbs aboard"],
  ["V", "Mata Helang vision"],
  ["II", "Pause"],
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

function Best({ m, className = "" }: { m: MissionStats | undefined; className?: string }) {
  if (!m || (m.bestTime === null && m.bestRating === null)) return null;
  return (
    <p className={`best ${className}`}>
      Best: {formatTime(m.bestTime)} · {ratingLabel(m.bestRating)}
    </p>
  );
}

function Controls({ touch }: { touch: boolean }) {
  return (
    <table className="controls">
      <tbody>
        {(touch ? TOUCH_CONTROLS : CONTROLS).map(([k, d]) => (
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

/**
 * The engine sends the HUD about 12 times a second; standing still (or looking at a menu) most of those are the
 * same as the last one. This keeps the previous object when nothing changed, so React skips the re-render.
 */
function keepSameHud(set: (h: HudState) => void) {
  let last = "";
  return (h: HudState) => {
    const key = JSON.stringify(h);
    if (key === last) return;
    last = key;
    set(h);
  };
}

/** Ilmu actions: the save store is one per tab, so these never change and the memoized SkillTree can skip renders. */
const learn = (id: string) => getSaveStore().update((d) => learnSkill(d, id));
const unlearnAll = () => getSaveStore().update(resetSkills);

/** The menu currently on top: settings over the title, or whichever overlay is last in the DOM. */
const topOverlay = () => {
  const all = document.querySelectorAll<HTMLElement>(".overlay");
  return all[all.length - 1] ?? null;
};
const menuButtons = () => [...(topOverlay()?.querySelectorAll<HTMLButtonElement>(".btn:not(:disabled)") ?? [])];

/** Move focus up or down through the top menu's buttons (d-pad, arrow keys). */
function moveFocus(dir: -1 | 1) {
  const btns = menuButtons();
  if (!btns.length) return;
  const i = btns.indexOf(document.activeElement as HTMLButtonElement);
  const next = i < 0 ? (dir > 0 ? 0 : btns.length - 1) : (i + dir + btns.length) % btns.length;
  btns[next].focus();
}

/** Gamepad A: the focused menu button, else the menu's primary (non-ghost) button. */
function padConfirm() {
  const top = topOverlay();
  const active = document.activeElement;
  if (top && active instanceof HTMLButtonElement && top.contains(active) && !active.disabled) active.click();
  else top?.querySelector<HTMLButtonElement>(".btn:not(.ghost):not(:disabled)")?.click();
}

type MenuView = "main" | "ilmu" | "kitab" | "controls" | "credits";

export default function GameClient() {
  const mount = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [phase, setPhase] = useState<Phase>("title");
  const [reason, setReason] = useState<LoseReason>(null);
  const [hud, setHud] = useState<HudState>(EMPTY);
  const [failed, setFailed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [win, setWin] = useState<WinResult | null>(null);
  /** the hikayat of the attempt that just ended (win or loss) */
  const [tale, setTaleText] = useState("");
  /** the puteri's whisper on the last win (ghaib.ts) */
  const [whisper, setWhisper] = useState<Whisper | null>(null);
  const [introView, setIntroView] = useState<IntroView | null>(null);
  /** what to do when the cutscene ends: go on into the mission, or back to the title (replay) */
  const introMode = useRef<"mission" | "replay">("mission");
  /** "press any button" splash dismissed; a real gesture first, so fullscreen and the Gamepad API unlock */
  const [started, setStarted] = useState(false);
  const startedRef = useRef(false);
  const [view, setView] = useState<MenuView>("main");
  /** pause menu: open tab, and the map and run numbers read when the game paused */
  const [pauseTab, setPauseTab] = useState(0);
  const [mapState, setMapState] = useState<MapState | null>(null);
  const store = getSaveStore();
  const save = useSyncExternalStore(store.subscribe, store.getSnapshot, () => SERVER_SAVE);
  // the mission picked on the title screen; the ref lets engine callbacks read the current one
  const [level, setLevel] = useState<LevelDef>(LEVELS[0]);
  const levelRef = useRef<LevelDef | null>(null);
  const mission = save.missions[level.missionId];
  const qualityPref = save.settings.quality;
  const touch = useSyncExternalStore(subscribeTouch, touchSnapshot, () => false);
  const portrait = useSyncExternalStore(subscribePortrait, portraitSnapshot, () => false) && touch;

  useEffect(() => {
    if (!mount.current) return;
    let disposed = false;
    let inst: Game | null = null;
    // first load: ?level=<id> or the mission with a saved attempt; a rebuilt engine (quality change) keeps the pick
    const lv = levelRef.current ?? initialLevel(window.location.search, store.get().checkpointMission);
    levelRef.current = lv;
    setLevel(lv);
    const missionId = () => (levelRef.current ?? lv).missionId;
    import("@/game/engine")
      .then(({ Game }) => {
        if (disposed || !mount.current) return;
        inst = new Game(
          mount.current,
          {
            onHud: keepSameHud(setHud),
            onPhase: (p, r) => {
              if (p === "won" && inst) {
                const before = store.get();
                const out = recordWin(before, inst.stats(), missionId());
                store.set(out.data);
                setWin({
                  time: inst.stats().time,
                  rating: out.rating,
                  newBestTime: out.newBestTime,
                  newBestRating: out.newBestRating,
                  points: earnedPoints(out.data) - earnedPoints(before),
                  text: inst.winText(),
                });
              }
              if ((p === "won" || p === "lost") && inst) {
                const text = tellHikayat(inst.chronicle(), levelRef.current ?? lv, inst.stats());
                setTaleText(text);
                // a loss is only kept when the mission has no tale yet, so it never replaces a winning one
                if (p === "won" || !store.get().tales[missionId()]) store.update((d) => setTale(d, missionId(), text));
              }
              if (p === "won" && inst) {
                // Bisikan puteri: her verdict on how this mission was played, added to the save's restu
                const d = store.get();
                const w = judge(inst.ghaibTally(), d.puteri.restu, inst.levelDef.id, d.puteri.judged);
                store.set(recordJudgement(d, w));
                setWhisper(w);
              }
              if (p === "paused" && inst) setMapState(inst.mapState());
              setPhase(p);
              setReason(r);
            },
            onIntro: setIntroView,
            onIntroEnd: () => {
              if (!inst) return;
              setIntroView(null);
              if (introMode.current === "mission") {
                store.update(markIntroSeen);
                setWin(null);
                inst.start("start");
              } else inst.showTitle();
            },
            onPadConfirm: padConfirm,
            onPadNav: moveFocus,
            onPadTab: (d) => setPauseTab((t) => (t + d + PAUSE_TABS.length) % PAUSE_TABS.length),
            onPadAny: () => {
              if (startedRef.current) return false;
              startedRef.current = true;
              setStarted(true);
              return true;
            },
            onAmulet: (id) => store.update((d) => addAmulet(d, id)),
            onExplored: (lvl, packed) => store.update((d) => setExplored(d, lvl, packed)),
            onKitab: (id) => store.update((d) => addKitab(d, id)),
            onPantun: (id) => store.update((d) => addPantun(d, id)),
            onCheckpoint: (cp) => store.update((d) => (cp === "start" ? recordStart(d, missionId()) : withCheckpoint(d, cp))),
          },
          { quality: pickQuality(touch, window.location.search, qualityPref), touch, level: lv },
        );
        window.__keris = inst;
        setGame(inst);
      })
      .catch(() => setFailed(true));
    return () => {
      disposed = true;
      inst?.dispose();
      delete window.__keris;
    };
  }, [touch, qualityPref, store]);

  useEffect(() => {
    game?.setSkills(withAmulet(skillMods(save.skills), save.amulet, save.amulets));
  }, [game, save.skills, save.amulet, save.amulets]);

  // this mission's tangkal is left off the map once it is found
  const charmId = amuletForLevel(level.id)?.id;
  const charmFound = !!charmId && save.amulets.includes(charmId);
  useEffect(() => {
    game?.setAmuletFound(charmFound);
  }, [game, charmFound, level]);

  useEffect(() => {
    game?.setKitab(save.kitab);
  }, [game, save.kitab]);

  useEffect(() => {
    game?.setPantun(save.pantun);
  }, [game, save.pantun]);

  useEffect(() => {
    game?.setRestu(save.puteri.restu);
  }, [game, save.puteri.restu]);

  // the pause map remembers explored ground between attempts
  const explored = save.explored[level.id] ?? null;
  useEffect(() => {
    game?.setExplored(explored);
  }, [game, explored, level]);

  useEffect(() => {
    game?.setLookSettings(save.settings.lookSens, save.settings.invertY);
  }, [game, save.settings.lookSens, save.settings.invertY]);

  // camera shake is off when "Kurangkan gegaran" is on, or the system asks for reduced motion
  useEffect(() => {
    game?.setReduceShake(save.settings.reduceShake || mq("(prefers-reduced-motion: reduce)"));
  }, [game, save.settings.reduceShake]);

  // a rotated phone must not keep playing under the "rotate" prompt
  useEffect(() => {
    if (portrait) game?.pause();
  }, [portrait, game, phase]);

  const dismissSplash = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setStarted(true);
    if (touch) enterFullscreenLandscape();
  };
  const splash = phase === "title" && !started;

  // splash: any key (not a lone modifier or a held repeat). Menu: arrows move focus, Esc backs out of a sub-view.
  useEffect(() => {
    if (phase !== "title") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || ["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
      if (!startedRef.current) {
        e.preventDefault();
        dismissSplash();
        return;
      }
      if (showSettings) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        moveFocus(e.key === "ArrowDown" ? 1 : -1);
      } else if (e.key === "Escape" && view !== "main") setView("main");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // pause menu: Q / E or left / right switch tabs, up / down move through the buttons
  useEffect(() => {
    if (phase !== "paused" || showSettings) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const d = e.code === "KeyQ" || e.key === "ArrowLeft" ? -1 : e.code === "KeyE" || e.key === "ArrowRight" ? 1 : 0;
      if (d) {
        e.preventDefault();
        setPauseTab((t) => (t + d + PAUSE_TABS.length) % PAUSE_TABS.length);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        moveFocus(e.key === "ArrowDown" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, showSettings]);

  const g = () => game;
  /** Pick a mission on the title screen: the engine swaps the map in place. */
  const pickLevel = (l: LevelDef) => {
    levelRef.current = l;
    setLevel(l);
    game?.setLevel(l);
  };
  const begin = (from: Checkpoint = "start", l: LevelDef = level) => {
    if (touch) enterFullscreenLandscape();
    setWin(null);
    if (l !== level) pickLevel(l);
    // the cutscene plays before the very first mission only; "Replay intro" in Settings shows it again
    if (from === "start" && l.intro && shouldShowIntro(store.get())) playIntro("mission");
    else g()?.start(from);
  };
  const playIntro = (mode: "mission" | "replay") => {
    introMode.current = mode;
    setIntroView(null);
    g()?.playIntro(mq("(prefers-reduced-motion: reduce)"));
  };
  const skipIntro = () => g()?.skipIntro();
  // Continue resumes the saved attempt, whichever mission it is on
  const continueLevel = LEVELS.find((l) => l.missionId === save.checkpointMission) ?? null;
  const canContinue = hasProgress(save) && continueLevel !== null;
  const checkpointHere = checkpointFor(save, level.missionId);
  const savedHere = save.checkpointMission === level.missionId && save.checkpoint !== null;
  const settingsBtn = (
    <button className="btn ghost" onClick={() => setShowSettings(true)}>
      Settings
    </button>
  );
  const menuBtn = (
    <button className="btn ghost" onClick={() => g()?.showTitle()}>
      Main menu
    </button>
  );
  const resume = () => {
    if (touch) enterFullscreenLandscape();
    g()?.resume();
  };
  const skillTree = (
    <SkillTree save={save} onLearn={learn} onReset={unlearnAll} />
  );
  const alertCls = hud.alert === "calm" ? "" : hud.alert;

  return (
    <div className={`root${touch ? " touch-ui" : ""}`} onContextMenu={(e) => touch && e.preventDefault()}>
      <div ref={mount} className="stage" />
      {level.wayang && game && <WayangOverlay hud={hud} playing={phase === "playing"} />}
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
              {!!hud.pantun?.disguise && <em className="gold">Menyamar {hud.pantun.disguise}s</em>}
              <em className="tool-chip">
                {TOOLS.find((t) => t.id === hud.tool)?.name} x{hud.ammo[hud.tool]}
              </em>
            </div>
            {hud.semangat !== undefined && (hud.eagle || hud.semangat < 0.999) && (
              <div className={`semangat${hud.eagle ? " on" : ""}`} aria-label={`Semangat ${Math.round(hud.semangat * 100)}%`}>
                <div style={{ width: `${Math.round(hud.semangat * 100)}%` }} />
                <span>Semangat</span>
              </div>
            )}
          </div>
          {hud.eagle && <div className="ghaib-veil" aria-hidden="true" />}
          <Compass north={hud.northDeg} obj={hud.objDeg} />
          <TideBadge t={hud.tide} />
          {hud.combat && (
            <div className={`hp ${hud.incoming ? "incoming" : ""}`} aria-label={`Health ${Math.ceil(hud.hp)} of ${hud.maxHp}`}>
              {Array.from({ length: hud.maxHp }, (_, i) => (
                <div key={i}>
                  <div style={{ width: `${Math.round(Math.min(1, Math.max(0, hud.hp - i)) * 100)}%` }} />
                </div>
              ))}
            </div>
          )}
          {hud.breath !== null && hud.breath < 0.999 && (
            <div className="breath" aria-label={`Breath ${Math.round(hud.breath * 100)}%`}>
              <div style={{ width: `${Math.round(hud.breath * 100)}%` }} />
            </div>
          )}
          {hud.prompt && <div className="prompt">{touch ? hud.prompt.replace(/(^|·\s+)[A-Z]\s\s/g, "$1") : hud.prompt}</div>}
          {hud.toast && <div className="toast">{hud.toast}</div>}
          {hud.talk && <div className="talk">&ldquo;{hud.talk}&rdquo;</div>}
          {hud.pantun?.line && !hud.pantun.choice && <PantunLine line={hud.pantun.line} />}
          {hud.wheel && (
            <div className="wheel" aria-label="Tool wheel">
              {TOOLS.map((t, i) => {
                const a = (i * 2 * Math.PI) / TOOLS.length;
                return (
                  <div
                    key={t.id}
                    className={`wheel-slot${hud.wheel === t.id ? " on" : ""}${hud.ammo[t.id] <= 0 ? " out" : ""}`}
                    style={{ transform: `translate(${Math.sin(a) * 110}px, ${-Math.cos(a) * 110}px)` }}
                  >
                    <kbd>{i + 1}</kbd>
                    <b>{t.name}</b>
                    <span>x{hud.ammo[t.id]}</span>
                  </div>
                );
              })}
              <p className="wheel-desc">{TOOLS.find((t) => t.id === hud.wheel)?.desc}</p>
            </div>
          )}
          <div className="hint">
            WASD move · Shift run · C crouch · Space climb · E / click tikam · R / right-click parry · X roll · Q tool · Tab wheel · F carry body · V Mata Helang · Esc pause
          </div>
        </div>
      )}

      {phase === "intro" && (
        <div className="intro" onPointerDown={skipIntro} role="region" aria-label="Intro cutscene">
          <div className="intro-bar top" />
          <div className="intro-bar bottom" />
          <div className="intro-fade" style={{ opacity: introView?.fade ?? 1 }} />
          <p className="intro-caption" style={{ opacity: introView?.opacity ?? 0 }} aria-live="polite">
            {introView?.text}
          </p>
          <button
            className="btn ghost intro-skip"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={skipIntro}
          >
            Skip
          </button>
          {!touch && <span className="intro-hint">Space, Enter or Esc to skip</span>}
        </div>
      )}

      {phase === "playing" && touch && <TouchControls game={game} hud={hud} />}
      {phase === "playing" && hud.pantun?.choice && <PantunChoice view={hud.pantun.choice} game={game} />}

      {splash && (
        <div className="overlay splash" onPointerDown={dismissSplash} role="button" tabIndex={-1} aria-label="Start">
          <div className="splash-inner">
            <KerisEmblem />
            <h1>Keris</h1>
            <p className="kicker">Malacca, July 1511</p>
            <p className="press">{touch ? "Tap to start" : "Press any button"}</p>
          </div>
        </div>
      )}

      {phase === "title" && started && (
        <div className="overlay title menu-screen">
          <nav className="menu" aria-label="Main menu">
            <div className="brand">
              <KerisEmblem />
              <div>
                <p className="kicker">Malacca, July 1511</p>
                <h1>Keris</h1>
              </div>
            </div>
            {canContinue && (
              <button className="btn" onClick={() => continueLevel && begin(checkpointFor(save, continueLevel.missionId), continueLevel)} disabled={!game}>
                {continueLevel === level ? "Continue" : `Continue: ${continueLevel?.name}`}
              </button>
            )}
            <button className={`btn${canContinue ? " ghost" : ""}`} onClick={() => begin("start")} disabled={!game}>
              New game
            </button>
            <DuaPemainButton disabled={!game} />
            <button className={`btn ghost${view === "ilmu" ? " on" : ""}`} onClick={() => setView(view === "ilmu" ? "main" : "ilmu")}>
              Ilmu
            </button>
            <button className={`btn ghost${view === "kitab" ? " on" : ""}`} onClick={() => setView(view === "kitab" ? "main" : "kitab")}>
              Kitab
            </button>
            {settingsBtn}
            <button className={`btn ghost${view === "controls" ? " on" : ""}`} onClick={() => setView(view === "controls" ? "main" : "controls")}>
              Controls
            </button>
            <button className={`btn ghost${view === "credits" ? " on" : ""}`} onClick={() => setView(view === "credits" ? "main" : "credits")}>
              Credits
            </button>
            <p className="dim small">
              {touch ? "Best in landscape. Fullscreen is requested where your browser allows it." : "Starting captures the mouse."}
            </p>
          </nav>
          <section className="songket menu-pane" aria-live="polite">
            {view === "main" && (
              <>
                <h2>Missions</h2>
                <div className="missions">
                  {LEVELS.map((l) => (
                    <button key={l.id} className={`btn ghost${l === level ? " on" : ""}`} aria-pressed={l === level} onClick={() => pickLevel(l)} disabled={!game}>
                      {l.name}
                      {save.missions[l.missionId]?.completed ? " ✓" : ""}
                    </button>
                  ))}
                </div>
                <h3>{level.name}</h3>
                <p className="story">{level.story}</p>
                {savedHere && (
                  <p className="dim small">{checkpointHere === "target" ? `Checkpoint: ${level.checkpointLabel}` : "Checkpoint: mission start"}</p>
                )}
                <Best m={mission} />
              </>
            )}
            {view === "ilmu" && (
              <>
                <h2>Ilmu</h2>
                {skillTree}
              </>
            )}
            {view === "kitab" && (
              <>
                <h2>Kitab</h2>
                <Kitab save={save} />
              </>
            )}
            {view === "controls" && (
              <>
                <h2>Controls</h2>
                <Controls touch={touch} />
              </>
            )}
            {view === "credits" && (
              <>
                <h2>Credits</h2>
                <p>Design by Taufik Hamid. Code written with Claude Code from the designer&apos;s spec.</p>
                <p>Built with three.js, Next.js and React. Procedural world, no audio.</p>
                <p>Character models and animations by Quaternius (CC0).</p>
                <p>Hang Tuah is a figure of Malay legend. The story here is fiction.</p>
                <p className="dim small">Inspired by the stealth genre. Not affiliated with Ubisoft.</p>
              </>
            )}
            {view !== "main" && (
              <button className="btn ghost back" onClick={() => setView("main")}>
                Back
              </button>
            )}
          </section>
        </div>
      )}

      {phase === "paused" && (
        <PauseMenu
          def={level}
          s={mapState}
          tab={pauseTab}
          setTab={setPauseTab}
          touch={touch}
          controls={<Controls touch={touch} />}
          best={<Best m={mission} />}
          skills={skillTree}
          kitab={<Kitab save={save} />}
          visited={save.kitab}
          charms={{ found: save.amulets, worn: save.amulet, wear: (id) => store.update((d) => wearAmulet(d, id)) }}
          lastTale={save.tales[level.missionId] ? <HikayatScroll text={save.tales[level.missionId]} title="Your last tale" /> : null}
          actions={
            <>
              <button className="btn" onClick={resume}>
                Resume
              </button>
              <button className="btn ghost" onClick={() => begin("start")}>
                Restart
              </button>
              {settingsBtn}
              {menuBtn}
            </>
          }
        />
      )}

      {phase === "won" && (
        <div className="overlay">
          <div className="panel">
            <h2>{(win?.text ?? level.win).title}</h2>
            <p>{(win?.text ?? level.win).body}</p>
            {win && (
              <p className={`best ${win.newBestTime || win.newBestRating ? "new" : ""}`}>
                Time {formatTime(win.time)} · {ratingLabel(win.rating)}
                {(win.newBestTime || win.newBestRating) && " · New best!"}
              </p>
            )}
            {win && win.points > 0 && (
              <p className="best new">
                +{win.points} skill point{win.points === 1 ? "" : "s"}. Learn new Ilmu from the main menu or the pause menu.
              </p>
            )}
            {whisper && (
              <blockquote className={`bisikan ${whisper.mood}`}>
                <span className="small">Bisikan puteri</span>
                <p>&ldquo;{whisper.line}&rdquo;</p>
                {whisper.change && <p className="small">{CHANGE_NOTE[whisper.change]}</p>}
              </blockquote>
            )}
            <Best m={mission} />
            {tale && <HikayatScroll text={tale} />}
            <button className="btn" onClick={() => begin("start")}>
              Play again
            </button>
            {menuBtn}
          </div>
        </div>
      )}

      {phase === "lost" && (
        <div className="overlay lost">
          <div className="panel">
            <h2>{reason === "slain" ? "You were cut down" : reason === "detected" ? "You were seen" : "Mission failed"}</h2>
            <p>{reason === "detected"
              ? "This had to be done unseen, and the alarm is up. Try another route."
              : reason === "slain"
                ? "Parry as his marker flashes white, roll away from a crowd, and fight one at a time. Or better, stay unseen."
                : "The alarm spread through the lanes. Try another route."}</p>
            {checkpointHere === "target" && (
              <button className="btn" onClick={() => begin("target")}>
                Retry from checkpoint
              </button>
            )}
            <button className={`btn${checkpointHere === "target" ? " ghost" : ""}`} onClick={() => begin("start")}>
              {checkpointHere === "target" ? "Restart mission" : "Restart"}
            </button>
            {menuBtn}
            <Best m={mission} />
            {tale && <HikayatScroll text={tale} />}
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsPanel
          store={store}
          save={save}
          canChangeQuality={phase === "title"}
          urlQuality={qualityFromUrl(window.location.search)}
          onReplayIntro={
            phase === "title" && game && level.intro
              ? () => {
                  setShowSettings(false);
                  playIntro("replay");
                }
              : undefined
          }
          onClose={() => setShowSettings(false)}
        />
      )}

      {started && <KapitanHostPanel game={game} phase={phase} />}

      {portrait && phase !== "intro" && (
        <div className="overlay rotate" role="alert">
          <div className="panel">
            <div className="rotate-icon" aria-hidden="true" />
            <h2>Rotate your phone</h2>
            <p>Keris plays in landscape.</p>
          </div>
        </div>
      )}
    </div>
  );
}
