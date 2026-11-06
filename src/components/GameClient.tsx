"use client";

import ChapterSelect from "./ChapterSelect";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Game, HudState, IntroView, LoseReason, MapState, Phase } from "@/game/engine";
import { TOOLS, toolName } from "@/game/tools";
import { isTouchDevice, pickQuality, qualityFromUrl } from "@/game/touch";
import { LEVELS, initialLevel, missionText, type LevelDef } from "@/game/levels";
import {
  checkpointFor,
  defaultSave,
  formatTime,
  getSaveStore,
  hasProgress,
  markIntroSeen,
  shouldShowIntro,
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
import { useT } from "./useT";
import { trMsg } from "@/game/hudMsg";
import type { Lang } from "@/game/i18n";
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
import { changeNote, judge, recordJudgement, type Whisper } from "@/game/ghaib";

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

// [key label, description key]; a label without the "hud." prefix is a literal key name
const CONTROLS: [string, string][] = [
  ["W A S D", "hud.ctl.move"],
  ["Shift", "hud.ctl.run"],
  ["C / Ctrl", "hud.ctl.crouch"],
  ["Space", "hud.ctl.jump"],
  ["hud.ctl.k.look", "hud.ctl.look"],
  ["hud.ctl.k.stab", "hud.ctl.stab"],
  ["hud.ctl.k.parry", "hud.ctl.parry"],
  ["X", "hud.ctl.roll"],
  ["Q", "hud.ctl.tool"],
  ["hud.ctl.k.wheel", "hud.ctl.wheel"],
  ["F", "hud.ctl.carry"],
  ["hud.ctl.k.horse", "hud.ctl.horse"],
  ["hud.ctl.k.sampan", "hud.ctl.sampan"],
  ["hud.ctl.k.swim", "hud.ctl.swim"],
  ["V", "hud.ctl.eagle"],
  ["Esc", "hud.ctl.pause"],
  ["hud.ctl.k.pad", "hud.ctl.pad"],
];

const TOUCH_CONTROLS: [string, string][] = [
  ["hud.tctl.k.move", "hud.tctl.move"],
  ["hud.tctl.k.look", "hud.tctl.look"],
  ["hud.tctl.k.jump", "hud.tctl.jump"],
  ["C", "hud.tctl.crouch"],
  ["E", "hud.tctl.stab"],
  ["R", "hud.tctl.parry"],
  ["X", "hud.ctl.roll"],
  ["Q", "hud.tctl.tool"],
  ["hud.tctl.k.tool", "hud.tctl.toolNext"],
  ["F", "hud.ctl.carry"],
  ["hud.ctl.k.horse", "hud.tctl.horse"],
  ["hud.ctl.k.sampan", "hud.tctl.sampan"],
  ["hud.ctl.k.swim", "hud.tctl.swim"],
  ["V", "hud.ctl.eagle"],
  ["II", "hud.ctl.pause"],
];

function Compass({ north, obj, lang }: { north: number; obj: number | null; lang: Lang }) {
  const t = useT(lang);
  const marks = [t("hud.compass.n"), t("hud.compass.e"), t("hud.compass.s"), t("hud.compass.w")];
  return (
    <div className="compass" aria-label={t("hud.compass.aria")}>
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

/** "*** Hantu": stars and the rating's name in the chosen language */
function rate(t: (k: string) => string, r: number | null): string {
  if (r === null) return "-";
  const n = Math.max(1, Math.min(3, Math.round(r)));
  return `${"*".repeat(n)} ${t(`hud.rating.${n}`)}`;
}

function Best({ m, lang, className = "" }: { m: MissionStats | undefined; lang: Lang; className?: string }) {
  const t = useT(lang);
  if (!m || (m.bestTime === null && m.bestRating === null)) return null;
  return <p className={`best ${className}`}>{t("hud.best", { time: formatTime(m.bestTime), rating: rate(t, m.bestRating) })}</p>;
}

function Controls({ touch, lang }: { touch: boolean; lang: Lang }) {
  const t = useT(lang);
  return (
    <table className="controls">
      <tbody>
        {(touch ? TOUCH_CONTROLS : CONTROLS).map(([k, d]) => (
          <tr key={k}>
            <td>
              <kbd>{k.startsWith("hud.") ? t(k) : k}</kbd>
            </td>
            <td>{t(d)}</td>
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
                const text = tellHikayat(inst.chronicle(), levelRef.current ?? lv, inst.stats(), store.get().settings.lang);
                setTaleText(text);
                // a loss is only kept when the mission has no tale yet, so it never replaces a winning one
                if (p === "won" || !store.get().tales[missionId()]) store.update((d) => setTale(d, missionId(), text));
              }
              if (p === "won" && inst) {
                // Bisikan puteri: her verdict on how this mission was played, added to the save's restu
                const d = store.get();
                const w = judge(inst.ghaibTally(), d.puteri.restu, inst.levelDef.id, d.puteri.judged, d.settings.lang);
                store.set(recordJudgement(d, w));
                setWhisper(w);
              }
              if (p === "paused" && inst) setMapState(inst.mapState());
              setPhase(p);
              setReason(r);
            },
            // a gate carried the player to another map: the engine already swapped it, so only adopt it here (no title, no list)
            onTravel: (def: LevelDef) => {
              levelRef.current = def; // before onCheckpoint("start"), so missionId() is the new one
              setLevel(def);
              inst?.setExplored(store.get().explored[def.id] ?? null); // the swap leaves the fog empty
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
    game?.setLang(save.settings.lang);
  }, [game, save.settings.lang]);

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
  // maps the player has been to (a mission record or explored ground); gates show only these by name
  const knownMaps = useMemo(() => {
    const out: Record<string, string> = {};
    for (const l of LEVELS) if (save.missions[l.missionId] || save.explored[l.id]) out[l.id] = missionText(save.settings.lang, l, "name") ?? l.name;
    return out;
  }, [save.missions, save.explored, save.settings.lang]);
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
  const lang = save.settings.lang;
  const t = useT(lang);
  const settingsBtn = (
    <button className="btn ghost" onClick={() => setShowSettings(true)}>
      {t("pause.settings")}
    </button>
  );
  const menuBtn = (
    <button className="btn ghost" onClick={() => g()?.showTitle()}>
      {t("pause.mainMenu")}
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
      {/* gate travel: the screen dips to black while the next map loads (HudState.fade, cast until engine types merge) */}
      {(hud.fade ?? 0) > 0 && <div className="intro-fade" style={{ opacity: hud.fade }} />}
      {level.wayang && game && <WayangOverlay hud={hud} playing={phase === "playing"} lang={lang} />}
      {failed && (
        <div className="overlay">
          <div className="panel">
            <h2>{t("hud.webgl.title")}</h2>
            <p>{t("hud.webgl.body")}</p>
          </div>
        </div>
      )}

      {phase === "playing" && (
        <div className="hud">
          <div className="topleft">
            <div className="objective">
              <span className="label">{t("hud.objective")}</span>
              {hud.objective}
            </div>
            <div className={`meter ${alertCls}`}>
              <div className="meter-fill" style={{ width: `${Math.round(hud.meter * 100)}%` }} />
              <span>{t(`hud.alert.${hud.alert}`)}</span>
            </div>
            <div className="chips">
              {hud.hidden && <em>{t("hud.chip.hidden")}</em>}
              {hud.crouched && <em>{t("hud.chip.crouched")}</em>}
              {hud.eagle && <em className="gold">{t("hud.chip.eagle")}</em>}
              {!!hud.pantun?.disguise && <em className="gold">{t("hud.chip.disguise", { s: hud.pantun.disguise })}</em>}
              <em className="tool-chip">
                {toolName(lang, hud.tool)} x{hud.ammo[hud.tool]}
              </em>
            </div>
            {hud.semangat !== undefined && (hud.eagle || hud.semangat < 0.999) && (
              <div className={`semangat${hud.eagle ? " on" : ""}`} aria-label={t("hud.semangat.aria", { pct: Math.round(hud.semangat * 100) })}>
                <div style={{ width: `${Math.round(hud.semangat * 100)}%` }} />
                <span>{t("hud.semangat")}</span>
              </div>
            )}
          </div>
          {hud.eagle && <div className="ghaib-veil" aria-hidden="true" />}
          <Compass north={hud.northDeg} obj={hud.objDeg} lang={lang} />
          <TideBadge t={hud.tide} />
          {hud.combat && (
            <div className={`hp ${hud.incoming ? "incoming" : ""}`} aria-label={t("hud.hp.aria", { hp: Math.ceil(hud.hp), max: hud.maxHp })}>
              {Array.from({ length: hud.maxHp }, (_, i) => (
                <div key={i}>
                  <div style={{ width: `${Math.round(Math.min(1, Math.max(0, hud.hp - i)) * 100)}%` }} />
                </div>
              ))}
            </div>
          )}
          {hud.breath !== null && hud.breath < 0.999 && (
            <div className="breath" aria-label={t("hud.breath.aria", { pct: Math.round(hud.breath * 100) })}>
              <div style={{ width: `${Math.round(hud.breath * 100)}%` }} />
            </div>
          )}
          {hud.prompt && <div className="prompt">{touch ? trMsg(lang, hud.prompt).replace(/(^|·\s+)[A-Z]\s\s/g, "$1") : trMsg(lang, hud.prompt)}</div>}
          {hud.toast && <div className="toast">{trMsg(lang, hud.toast)}</div>}
          {hud.talk && <div className="talk">&ldquo;{hud.talk}&rdquo;</div>}
          {hud.pantun?.line && !hud.pantun.choice && <PantunLine line={hud.pantun.line} lang={lang} />}
          {hud.wheel && (
            <div className="wheel" aria-label={t("hud.wheel.aria")}>
              {TOOLS.map((tool, i) => {
                const a = (i * 2 * Math.PI) / TOOLS.length;
                return (
                  <div
                    key={tool.id}
                    className={`wheel-slot${hud.wheel === tool.id ? " on" : ""}${hud.ammo[tool.id] <= 0 ? " out" : ""}`}
                    style={{ transform: `translate(${Math.sin(a) * 110}px, ${-Math.cos(a) * 110}px)` }}
                  >
                    <kbd>{i + 1}</kbd>
                    <b>{toolName(lang, tool.id)}</b>
                    <span>x{hud.ammo[tool.id]}</span>
                  </div>
                );
              })}
              <p className="wheel-desc">{t(`play.tool.${hud.wheel}.desc`)}</p>
            </div>
          )}
          <div className="hint">{t("hud.hint")}</div>
        </div>
      )}

      {phase === "intro" && (
        <div className="intro" onPointerDown={skipIntro} role="region" aria-label={t("hud.intro.aria")}>
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
            {t("hud.intro.skip")}
          </button>
          {!touch && <span className="intro-hint">{t("hud.intro.hint")}</span>}
        </div>
      )}

      {phase === "playing" && touch && <TouchControls game={game} hud={hud} lang={lang} />}
      {phase === "playing" && hud.pantun?.choice && <PantunChoice view={hud.pantun.choice} game={game} lang={lang} />}

      {splash && (
        <div className="overlay splash" onPointerDown={dismissSplash} role="button" tabIndex={-1} aria-label={t("title.splash.aria")}>
          <div className="splash-inner">
            <KerisEmblem />
            <h1>Keris</h1>
            <p className="kicker">{t("title.kicker")}</p>
            <p className="press">{touch ? t("title.splash.touch") : t("title.splash.key")}</p>
          </div>
        </div>
      )}

      {phase === "title" && started && (
        <div className="overlay title menu-screen">
          <nav className="menu" aria-label={t("title.menu.aria")}>
            <div className="brand">
              <KerisEmblem />
              <div>
                <p className="kicker">{t("title.kicker")}</p>
                <h1>Keris</h1>
              </div>
            </div>
            {canContinue && (
              <button className="btn" onClick={() => continueLevel && begin(checkpointFor(save, continueLevel.missionId), continueLevel)} disabled={!game}>
                {continueLevel === level ? t("title.continue") : t("title.continueNamed", { name: continueLevel ? (missionText(lang, continueLevel, "name") ?? continueLevel.name) : "" })}
              </button>
            )}
            <button className={`btn${canContinue ? " ghost" : ""}`} onClick={() => begin("start")} disabled={!game}>
              {t("title.newGame")}
            </button>
            <DuaPemainButton disabled={!game} />
            <button className={`btn ghost${view === "ilmu" ? " on" : ""}`} onClick={() => setView(view === "ilmu" ? "main" : "ilmu")}>
              {t("title.ilmu")}
            </button>
            <button className={`btn ghost${view === "kitab" ? " on" : ""}`} onClick={() => setView(view === "kitab" ? "main" : "kitab")}>
              {t("title.kitab")}
            </button>
            {settingsBtn}
            <button className={`btn ghost${view === "controls" ? " on" : ""}`} onClick={() => setView(view === "controls" ? "main" : "controls")}>
              {t("title.controls")}
            </button>
            <button className={`btn ghost${view === "credits" ? " on" : ""}`} onClick={() => setView(view === "credits" ? "main" : "credits")}>
              {t("title.credits")}
            </button>
            <p className="dim small">
              {touch ? t("title.hint.touch") : t("title.hint.mouse")}
            </p>
          </nav>
          <section className="songket menu-pane" aria-live="polite">
            {view === "main" && (
              <>
                <ChapterSelect missions={save.missions} lang={save.settings.lang}>
                <div className="missions">
                  {LEVELS.map((l) => (
                    <button key={l.id} className={`btn ghost${l === level ? " on" : ""}`} aria-pressed={l === level} onClick={() => pickLevel(l)} disabled={!game}>
                      {missionText(lang, l, "name") ?? l.name}
                      {save.missions[l.missionId]?.completed ? " ✓" : ""}
                    </button>
                  ))}
                </div>
                </ChapterSelect>
                <h3>{missionText(lang, level, "name") ?? level.name}</h3>
                <p className="story">{missionText(lang, level, "story") ?? level.story}</p>
                {savedHere && (
                  <p className="dim small">{checkpointHere === "target" ? t("title.checkpoint", { label: missionText(lang, level, "checkpoint") ?? level.checkpointLabel }) : t("title.checkpointStart")}</p>
                )}
                <Best m={mission} lang={lang} />
              </>
            )}
            {view === "ilmu" && (
              <>
                <h2>{t("title.ilmu")}</h2>
                {skillTree}
              </>
            )}
            {view === "kitab" && (
              <>
                <h2>{t("title.kitab")}</h2>
                <Kitab save={save} lang={lang} />
              </>
            )}
            {view === "controls" && (
              <>
                <h2>{t("title.controls")}</h2>
                <Controls touch={touch} lang={lang} />
              </>
            )}
            {view === "credits" && (
              <>
                <h2>{t("title.credits")}</h2>
                <p>{t("title.credits.1")}</p>
                <p>{t("title.credits.2")}</p>
                <p>{t("title.credits.3")}</p>
                <p>{t("title.credits.4")}</p>
                <p className="dim small">{t("title.credits.5")}</p>
              </>
            )}
            {view !== "main" && (
              <button className="btn ghost back" onClick={() => setView("main")}>
                {t("common.back")}
              </button>
            )}
          </section>
        </div>
      )}

      {phase === "paused" && (
        <PauseMenu
          lang={save.settings.lang}
          def={level}
          s={mapState}
          tab={pauseTab}
          setTab={setPauseTab}
          touch={touch}
          controls={<Controls touch={touch} lang={lang} />}
          best={<Best m={mission} lang={lang} />}
          skills={skillTree}
          kitab={<Kitab save={save} lang={lang} />}
          visited={save.kitab}
          known={knownMaps}
          places={save.kitab}
          charms={{ found: save.amulets, worn: save.amulet, wear: (id) => store.update((d) => wearAmulet(d, id)) }}
          lastTale={save.tales[level.missionId] ? <HikayatScroll text={save.tales[level.missionId]} title={t("menu.hikayat.last")} lang={save.settings.lang} /> : null}
          actions={
            <>
              <button className="btn" onClick={resume}>
                {t("pause.resume")}
              </button>
              <button className="btn ghost" onClick={() => begin("start")}>
                {t("pause.restart")}
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
            <h2>{win?.text?.title ?? missionText(lang, level, "winTitle") ?? level.win.title}</h2>
            <p>{win?.text?.body ?? missionText(lang, level, "winBody") ?? level.win.body}</p>
            {win && (
              <p className={`best ${win.newBestTime || win.newBestRating ? "new" : ""}`}>
                {t("hud.win.time", { time: formatTime(win.time), rating: rate(t, win.rating) })}
                {(win.newBestTime || win.newBestRating) && ` · ${t("hud.win.newBest")}`}
              </p>
            )}
            {win && win.points > 0 && (
              <p className="best new">
                {t(win.points === 1 ? "hud.win.points.one" : "hud.win.points.many", { n: win.points })}
              </p>
            )}
            {whisper && (
              <blockquote className={`bisikan ${whisper.mood}`}>
                <span className="small">{t("hud.win.whisper")}</span>
                <p>&ldquo;{whisper.line}&rdquo;</p>
                {whisper.change && <p className="small">{changeNote(lang, whisper.change)}</p>}
              </blockquote>
            )}
            <Best m={mission} lang={lang} />
            {tale && <HikayatScroll text={tale} lang={save.settings.lang} />}
            <button className="btn" onClick={() => begin("start")}>
              {t("hud.win.again")}
            </button>
            {menuBtn}
          </div>
        </div>
      )}

      {phase === "lost" && (
        <div className="overlay lost">
          <div className="panel">
            <h2>{t(`hud.lose.${reason === "slain" ? "slain" : reason === "detected" ? "detected" : "failed"}.title`)}</h2>
            <p>{t(`hud.lose.${reason === "slain" ? "slain" : reason === "detected" ? "detected" : "failed"}.body`)}</p>
            {checkpointHere === "target" && (
              <button className="btn" onClick={() => begin("target")}>
                {t("hud.lose.retry")}
              </button>
            )}
            <button className={`btn${checkpointHere === "target" ? " ghost" : ""}`} onClick={() => begin("start")}>
              {checkpointHere === "target" ? t("hud.lose.restartMission") : t("hud.lose.restart")}
            </button>
            {menuBtn}
            <Best m={mission} lang={lang} />
            {tale && <HikayatScroll text={tale} lang={save.settings.lang} />}
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
            <h2>{t("hud.rotate.title")}</h2>
            <p>{t("hud.rotate.body")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
