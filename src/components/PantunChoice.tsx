"use client";

import type { Game } from "@/game/engine";
import type { PantunHud } from "@/game/pantun";

/**
 * The pantun password at a gate: the sentry's couplet and four possible answers. Keys 1-4, W / S or the
 * arrows and E / Space (gamepad d-pad and A) answer through the engine; a tap or an unlocked mouse clicks here.
 */
export function PantunChoice({ view, game }: { view: NonNullable<PantunHud["choice"]>; game: Game | null }) {
  return (
    <div className="pantun-choice" role="dialog" aria-label="Answer the pantun">
      <p className="pantun-where">Penjaga pintu at {view.where}</p>
      <blockquote className="pantun-ask">
        {view.lines.map((l, i) => (
          <span key={i}>
            {l}
            <i>{view.gloss[i]}</i>
          </span>
        ))}
      </blockquote>
      <ol className="pantun-opts">
        {view.options.map((o, i) => (
          <li key={i}>
            <button
              className={`pantun-opt${view.sel === i ? " on" : ""}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => game?.pantunPick(i)}
            >
              <kbd>{i + 1}</kbd>
              <span>
                {o.lines[0]}
                <br />
                {o.lines[1]}
                <i>
                  {o.gloss[0]} {o.gloss[1]}
                </i>
              </span>
              {view.known === i && <em className="pantun-known">Overheard</em>}
            </button>
          </li>
        ))}
      </ol>
      <p className="pantun-help dim small">1-4 or W / S and E to answer · X to step back</p>
    </div>
  );
}

/** An overheard pantun line or a sentry's call, under the guard chatter. */
export function PantunLine({ line }: { line: NonNullable<PantunHud["line"]> }) {
  return (
    <div className="pantun-line">
      <b>{line.who}:</b> &ldquo;{line.text}&rdquo;
      <i>{line.gloss}</i>
    </div>
  );
}
