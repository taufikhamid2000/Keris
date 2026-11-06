"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MapState } from "@/game/engine";
import { PLACES, placeCentre, placeOnLevel } from "@/game/kitab";
import type { LevelDef } from "@/game/levels";
import { MapView } from "./PauseMenu";
import { gateText, mapExits } from "./MapSide";

const MIN = 1;
const MAX = 6;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * The pause-menu map: fits the whole level to the frame (no scrollbar), with +/- buttons, mouse wheel and pinch zoom,
 * drag to pan when zoomed in, and gold names for the Kitab places the player has reached.
 * Fills its parent's height; the parent needs a definite height (the pause tab panel has one).
 */
export default function PetaMap({ def, s, visited = [], known = {} }: { def: LevelDef; s: MapState | null; visited?: string[]; known?: Record<string, string> }) {
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [centre, setCentre] = useState<{ x: number; y: number } | null>(null);
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef(0);
  const view = useRef({ wheel: (e: WheelEvent) => void e });

  const b = def.bounds;
  const pad = 6;
  const vx = -b.maxX - pad;
  const vy = -b.maxZ - pad;
  const vw = b.maxX - b.minX + pad * 2;
  const vh = b.maxZ - b.minZ + pad * 2;
  const mid = { x: vx + vw / 2, y: vy + vh / 2 };

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const c = zoom <= MIN ? mid : centre ?? mid;
  const w = vw / zoom;
  const h = vh / zoom;
  // map units per screen pixel (the svg letterboxes, so the looser axis rules)
  const upp = size.w > 0 && size.h > 0 ? Math.max(w / size.w, h / size.h) : Math.max(vw, vh) / 600;
  // the window is at least as large as the viewBox; keep the whole map reachable but never lose it off-screen
  const cx = clamp(c.x, vx, vx + vw);
  const cy = clamp(c.y, vy, vy + vh);

  const zoomTo = (z: number) => {
    const nz = clamp(z, MIN, MAX);
    setZoom(nz);
    if (nz === MIN) setCentre(null);
    else setCentre({ x: cx, y: cy });
  };

  // the wheel zooms about the cursor: the map point under it stays put (handler is refreshed after every render)
  useEffect(() => {
    view.current.wheel = (e: WheelEvent) => {
      const el = frame.current;
      const nz = clamp(zoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2), MIN, MAX);
      if (!el || nz === zoom) return;
      const r = el.getBoundingClientRect();
      const ox = e.clientX - r.left - r.width / 2;
      const oy = e.clientY - r.top - r.height / 2;
      const nupp = (upp * zoom) / nz;
      setZoom(nz);
      if (nz === MIN) setCentre(null);
      else setCentre({ x: cx + ox * upp - ox * nupp, y: cy + oy * upp - oy * nupp });
    };
  });

  // wheel needs a non-passive listener to stop the page scrolling under it
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const on = (e: WheelEvent) => {
      e.preventDefault();
      view.current.wheel(e);
    };
    el.addEventListener("wheel", on, { passive: false });
    return () => el.removeEventListener("wheel", on);
  }, []);

  const dist = () => {
    const [p, q] = [...ptrs.current.values()];
    return Math.hypot(p.x - q.x, p.y - q.y);
  };

  const labels = useMemo(() => {
    const out: { text: string; x: number; z: number }[] = [];
    for (const p of PLACES) {
      if (!visited.includes(p.id) || !placeOnLevel(p, def.id)) continue;
      const at = placeCentre(p, b);
      if (at) out.push({ text: p.title, ...at });
    }
    return out;
  }, [visited, b, def.id]);

  const gates = mapExits(s).map((e) => ({ id: e.id, x: e.x, z: e.z, text: gateText(e, known) }));

  return (
    <div
      ref={frame}
      className={`peta${zoom > 1 ? " zoomed" : ""}`}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest(".peta-zoom")) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ptrs.current.size === 2) pinch.current = dist();
      }}
      onPointerMove={(e) => {
        const p = ptrs.current.get(e.pointerId);
        if (!p) return;
        const dx = e.clientX - p.x;
        const dy = e.clientY - p.y;
        ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ptrs.current.size >= 2) {
          const d = dist();
          if (pinch.current > 0 && d > 0) zoomTo(zoom * (d / pinch.current));
          pinch.current = d;
        } else if (zoom > 1) {
          setCentre({ x: clamp(cx - dx * upp, vx, vx + vw), y: clamp(cy - dy * upp, vy, vy + vh) });
        }
      }}
      onPointerUp={(e) => {
        ptrs.current.delete(e.pointerId);
        pinch.current = 0;
      }}
      onPointerCancel={(e) => {
        ptrs.current.delete(e.pointerId);
        pinch.current = 0;
      }}
    >
      <MapView def={def} s={s} view={{ x: cx - w / 2, y: cy - h / 2, w, h }} labels={labels} gates={gates} labelSize={11 * upp} />
      <div className="peta-zoom" role="group" aria-label="Map zoom">
        <button type="button" aria-label="Zoom in" disabled={zoom >= MAX} onClick={() => zoomTo(zoom * 1.5)}>
          +
        </button>
        <button type="button" aria-label="Zoom out" disabled={zoom <= MIN} onClick={() => zoomTo(zoom / 1.5)}>
          &minus;
        </button>
        <button type="button" aria-label="Fit whole map" disabled={zoom === MIN} onClick={() => zoomTo(MIN)}>
          Fit
        </button>
      </div>
    </div>
  );
}
