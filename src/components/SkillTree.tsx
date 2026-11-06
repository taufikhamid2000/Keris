"use client";

import { memo } from "react";
import type { SaveData } from "@/game/save";
import { BRANCHES, GHOST_POINTS, MISSION_POINTS, SKILLS, freePoints, skillStatus } from "@/game/skills";
import { useT } from "./useT";

/** Memoized: it only changes with the save, not with the HUD updates that re-render the game screen. */
export default memo(function SkillTree({ save, onLearn, onReset }: { save: SaveData; onLearn: (id: string) => void; onReset: () => void }) {
  const t = useT(save.settings.lang);
  const free = freePoints(save);
  const cost = (n: number) => t(n === 1 ? "skills.cost.one" : "skills.cost.other", { n });
  return (
    <div className="skilltree">
      <p className="points">
        <b>{free}</b> {t(free === 1 ? "skills.points.one" : "skills.points.other")}
        <span className="dim small">
          {" "}
          · {t("skills.earn", { m: MISSION_POINTS, g: GHOST_POINTS })}
        </span>
      </p>
      <div className="ilmu">
        {BRANCHES.map((b) => (
          <div key={b.id} className="branch">
            <h3>
              {b.name} <span className="dim small">{t(`skills.branch.${b.id}`)}</span>
            </h3>
            <p className="dim small known">{t("skills.known", { what: t(`skills.known.${b.id}`) })}</p>
            <ul>
              {SKILLS.filter((k) => k.branch === b.id).map((k) => {
                const st = skillStatus(save, k.id);
                return (
                  <li key={k.id} className={`skill ${st}`}>
                    <b>{k.name}</b>
                    <span className="small">{k.desc}</span>
                    {st === "learned" ? (
                      <span className="small gold">✓ {t("skills.learned")}</span>
                    ) : (
                      <button className="btn ghost sm" disabled={st !== "open"} onClick={() => onLearn(k.id)}>
                        {st === "open" ? t("skills.learn", { cost: cost(k.cost) }) : st === "short" ? t("skills.short", { cost: cost(k.cost) }) : t("skills.locked")}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      {save.skills.length > 0 && (
        <button className="btn ghost sm" onClick={onReset}>
          {t("skills.reset")}
        </button>
      )}
    </div>
  );
});
