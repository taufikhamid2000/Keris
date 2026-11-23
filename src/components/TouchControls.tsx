"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Game, HudState } from "@/game/engine";
import type { Lang } from "@/game/i18n";
import { useT } from "./useT";
import { action, actionLabel, ctxFromHud, defend, defendLabel } from "@/game/context";
import { clampToRadius, joystickVector, lookDelta } from "@/game/touch";

const TOOL_SHORT = { knife: "Pisau", stone: "Batu", pepper: "Lada" } as const;

const JOY_R = 56; // px, thumb travel from the stick centre to the edge (run zone)

/** Ask for fullscreen and landscape. Both are best-effort: iPhone Safari allows neither for pages. */
export function enterFullscreenLandscape() {
  try {
    const el = document.documentElement;
    const req = el.requestFullscreen?.bind(el) ?? (el as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen?.bind(el);
    const p = req?.() as Promise<void> | undefined;
    p?.then?.(() => (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.("landscape")?.catch(() => {}))?.catch?.(() => {});
  } catch {
    /* unsupported */
  }
}

interface BtnProps {
  /** a fixed key code, or a resolver called once on press (the same code is released) */
  code: string | (() => string);
  label: string;
  sub?: string;
  cls?: string;
  on?: boolean;
  dim?: boolean;
  game: Game | null;
}

function Btn({ code, label, sub, cls = "", on, dim, game }: BtnProps) {
  const down = useRef<number | null>(null);
  const held = useRef<string | null>(null);
  const release = useCallback(() => {
    if (down.current !== null && held.current) game?.releaseKey(held.current);
    down.current = null;
    held.current = null;
  }, [game]);
  return (
    <button
      type="button"
      className={`tbtn ${cls} ${on ? "on" : ""} ${dim ? "dim" : ""}`}
      data-act={typeof code === "string" ? code : cls}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        down.current = e.pointerId;
        held.current = typeof code === "string" ? code : code();
        game?.pressKey(held.current);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      <b>{label}</b>
      {sub && <i>{sub}</i>}
    </button>
  );
}

const TOOL_HOLD_MS = 400;

/** Tap throws the tool in hand (KeyQ); holding 400 ms switches to the next tool instead. */
function ToolBtn({ game, sub, dim }: { game: Game | null; sub: string; dim: boolean }) {
  const down = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const switched = useRef(false);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const up = (fire: boolean) => {
    if (down.current === null) return;
    down.current = null;
    clear();
    if (fire && !switched.current) {
      game?.pressKey("KeyQ");
      game?.releaseKey("KeyQ");
    }
  };
  useEffect(() => clear, []);
  return (
    <button
      type="button"
      className={`tbtn tool ${dim ? "dim" : ""}`}
      data-act="KeyQ"
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        down.current = e.pointerId;
        switched.current = false;
        clear();
        timer.current = setTimeout(() => {
          timer.current = null;
          switched.current = true;
          game?.pressKey("ToolNext");
          game?.releaseKey("ToolNext");
        }, TOOL_HOLD_MS);
      }}
      onPointerUp={() => up(true)}
      onPointerCancel={() => up(false)}
      onLostPointerCapture={() => up(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <b>{sub}</b>
    </button>
  );
}

export default function TouchControls({ game, hud, lang }: { game: Game | null; hud: HudState; lang: Lang }) {
  const tr = useT(lang);
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const joy = useRef<{ id: number; ox: number; oy: number } | null>(null);
  const lk = useRef<{ id: number; x: number; y: number } | null>(null);

  const setKnob = (dx: number, dy: number, active: boolean) => {
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
    base.current?.classList.toggle("active", active);
  };
  const stopMove = useCallback(() => {
    joy.current = null;
    game?.setTouchMove(0, 0, false);
    setKnob(0, 0, false);
  }, [game]);

  // never leave the player running if the controls unmount or the game changes
  useEffect(() => () => game?.setTouchMove(0, 0, false), [game]);

  const ctx = ctxFromHud(hud);
  return (
    <div className="touch" onContextMenu={(e) => e.preventDefault()}>
      <div
        className="move-zone"
        data-zone="move"
        onPointerDown={(e) => {
          if (joy.current) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture?.(e.pointerId);
          const rect = e.currentTarget.getBoundingClientRect();
          joy.current = { id: e.pointerId, ox: e.clientX, oy: e.clientY };
          if (base.current) {
            base.current.style.left = `${e.clientX - rect.left}px`;
            base.current.style.top = `${e.clientY - rect.top}px`;
          }
          setKnob(0, 0, true);
        }}
        onPointerMove={(e) => {
          const j = joy.current;
          if (!j || j.id !== e.pointerId) return;
          const dx = e.clientX - j.ox;
          const dy = e.clientY - j.oy;
          const v = joystickVector(dx, dy, JOY_R);
          game?.setTouchMove(v.x, v.y, v.run);
          const c = clampToRadius(dx, dy, JOY_R);
          setKnob(c.x, c.y, true);
          base.current?.classList.toggle("run", v.run);
        }}
        onPointerUp={(e) => joy.current?.id === e.pointerId && stopMove()}
        onPointerCancel={(e) => joy.current?.id === e.pointerId && stopMove()}
        onLostPointerCapture={(e) => joy.current?.id === e.pointerId && stopMove()}
      >
        <div className="joy-hint">{tr("touch.move")}</div>
        <div className="joy-base" ref={base}>
          <div className="joy-knob" ref={knob} />
        </div>
      </div>

      <div
        className="look-zone"
        data-zone="look"
        onPointerDown={(e) => {
          if (lk.current) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture?.(e.pointerId);
          lk.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          const l = lk.current;
          if (!l || l.id !== e.pointerId) return;
          const d = lookDelta(e.clientX - l.x, e.clientY - l.y);
          l.x = e.clientX;
          l.y = e.clientY;
          game?.look(d.dx, d.dy);
        }}
        onPointerUp={(e) => {
          if (lk.current?.id === e.pointerId) lk.current = null;
        }}
        onPointerCancel={(e) => {
          if (lk.current?.id === e.pointerId) lk.current = null;
        }}
        onLostPointerCapture={(e) => {
          if (lk.current?.id === e.pointerId) lk.current = null;
        }}
      />

      <button
        type="button"
        className="tbtn pause-btn"
        aria-label={tr("touch.pause")}
        data-act="Pause"
        onPointerDown={(e) => {
          e.preventDefault();
          game?.pause();
        }}
      >
        II
      </button>
      <button
        type="button"
        className={`tbtn eagle-btn ${hud.eagle ? "on" : ""}`}
        aria-label={tr("touch.eagle")}
        data-act="KeyV"
        onPointerDown={(e) => {
          e.preventDefault();
          game?.pressKey("KeyV");
          game?.releaseKey("KeyV");
        }}
      >
        V
      </button>

      <div className="btn-grid">
        <Btn game={game} code={() => action(ctx)} label={tr(actionLabel(ctx))} cls="act" on={ctx.takedownPrompt || ctx.carrying} />
        <Btn game={game} code={() => defend(ctx)} label={tr(defendLabel(ctx))} cls="def" on={hud.incoming} />
        <Btn game={game} code="Space" label={tr("touch.jump")} sub={tr("touch.climb")} cls="jump" />
        <ToolBtn game={game} sub={`${TOOL_SHORT[hud.tool]} x${hud.ammo[hud.tool]}`} dim={hud.ammo[hud.tool] <= 0} />
        <Btn game={game} code="KeyC" label={tr("touch.crouch")} cls="crouch" on={hud.crouched} />
      </div>
    </div>
  );
}
