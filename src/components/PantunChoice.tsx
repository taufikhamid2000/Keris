"use client";

import type { Game } from "@/game/engine";
import type { Lang } from "@/game/i18n";
import type { PantunHud } from "@/game/pantun";
import { sentryWhere } from "@/game/pantun";
import { useT } from "./useT";

/**
 * The pantun password at a gate: the sentry's couplet and four possible answers. Keys 1-4, W / S or the
 * arrows and E / Space (gamepad d-pad and A) answer through the engine; a tap or an unlocked mouse clicks here.
 * The verses are Malay; the English gloss under them shows only when `lang` is "en" (default "ms").
 */
export function PantunChoice({ view, game, lang = "ms" }: { view: NonNullable<PantunHud["choice"]>; game: Game | null; lang?: Lang }) {
  const t = useT(lang);
  const gloss = lang === "en";
  return (
    <div className="pantun-choice" role="dialog" aria-label={t("pantun.ui.aria")}>
      <p className="pantun-where">{t("pantun.ui.where", { where: sentryWhere(lang, view.where) })}</p>
      <blockquote className="pantun-ask">
        {view.lines.map((l, i) => (
          <span key={i}>
            {l}
            {gloss && <i>{view.gloss[i]}</i>}
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
                {gloss && (
                  <i>
                    {o.gloss[0]} {o.gloss[1]}
                  </i>
                )}
              </span>
              {view.known === i && <em className="pantun-known">{t("pantun.ui.known")}</em>}
            </button>
          </li>
        ))}
      </ol>
      <p className="pantun-help dim small">{t("pantun.ui.help")}</p>
    </div>
  );
}

/** An overheard pantun line or a sentry's call, under the guard chatter. The English gloss shows only when `lang` is "en". */
export function PantunLine({ line, lang = "ms" }: { line: NonNullable<PantunHud["line"]>; lang?: Lang }) {
  return (
    <div className="pantun-line">
      <b>{line.who}:</b> &ldquo;{line.text}&rdquo;
      {lang === "en" && <i>{line.gloss}</i>}
    </div>
  );
}
