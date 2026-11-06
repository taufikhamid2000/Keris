"use client";

import { memo } from "react";
import type { SaveData } from "@/game/save";
import { BRANCHES, GHOST_POINTS, MISSION_POINTS, SKILLS, freePoints, skillStatus, type BranchId } from "@/game/skills";

/** The moves every pendekar knows from the start; the upgrades below build on them. */
const KNOWN: Record<BranchId, string> = {
  bayang: "Crouch, hide in hay and bushes, carry bodies, dive",
  silat: "Tikam, heavy strike, parry, roll",
  helang: "Mata Helang, throwing knives, leap takedowns",
};

const STATUS_TEXT = { learned: "Learned", open: "Learn", short: "Need points", locked: "Learn the one above first" } as const;

/** Memoized: it only changes with the save, not with the HUD updates that re-render the game screen. */
export default memo(function SkillTree({ save, onLearn, onReset }: { save: SaveData; onLearn: (id: string) => void; onReset: () => void }) {
  const free = freePoints(save);
  return (
    <div className="skilltree">
      <p className="points">
        <b>{free}</b> skill point{free === 1 ? "" : "s"}
        <span className="dim small">
          {" "}
          · {MISSION_POINTS} for each mission completed, {GHOST_POINTS} more for a Ghost rating on it
        </span>
      </p>
      <div className="ilmu">
        {BRANCHES.map((b) => (
          <div key={b.id} className="branch">
            <h3>
              {b.name} <span className="dim small">{b.sub}</span>
            </h3>
            <p className="dim small known">Known: {KNOWN[b.id]}</p>
            <ul>
              {SKILLS.filter((k) => k.branch === b.id).map((k) => {
                const st = skillStatus(save, k.id);
                return (
                  <li key={k.id} className={`skill ${st}`}>
                    <b>{k.name}</b>
                    <span className="small">{k.desc}</span>
                    {st === "learned" ? (
                      <span className="small gold">✓ {STATUS_TEXT.learned}</span>
                    ) : (
                      <button className="btn ghost sm" disabled={st !== "open"} onClick={() => onLearn(k.id)}>
                        {st === "open" ? `${STATUS_TEXT.open} · ${k.cost} pt${k.cost === 1 ? "" : "s"}` : st === "short" ? `${k.cost} pt${k.cost === 1 ? "" : "s"} · ${STATUS_TEXT.short}` : STATUS_TEXT.locked}
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
          Unlearn all (points back)
        </button>
      )}
    </div>
  );
});
