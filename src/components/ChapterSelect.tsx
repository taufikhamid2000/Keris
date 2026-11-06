"use client";

import { useState, type ReactNode } from "react";
import { CHAPTERS, chapterProgress } from "../game/chapters";

interface Props {
  /** the save's mission records; progress is derived from them */
  missions: Record<string, { completed: boolean }>;
  lang?: "ms" | "en";
  /** the existing mission list, shown inside a playable chapter */
  children: ReactNode;
}

/** The first screen of the mission picker: the six chapters. A playable one opens to its mission list. */
export default function ChapterSelect({ missions, lang = "ms", children }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = CHAPTERS.find((c) => c.id === openId && c.playable);
  const ms = lang === "ms";

  if (open) {
    const p = chapterProgress(open, { missions });
    return (
      <>
        <button className="btn ghost chapter-back" onClick={() => setOpenId(null)}>
          {ms ? "‹ Bab" : "‹ Chapters"}
        </button>
        <h2>
          {open.title[lang]} <span className="dim small">{open.era} · {p.done}/{p.total}</span>
        </h2>
        {children}
      </>
    );
  }

  return (
    <>
      <h2>{ms ? "Bab" : "Chapters"}</h2>
      <div className="chapters">
        {CHAPTERS.map((c) => {
          const p = chapterProgress(c, { missions });
          return (
            <button
              key={c.id}
              className={`chapter-card${c.playable ? "" : " soon"}`}
              disabled={!c.playable}
              onClick={() => setOpenId(c.id)}
            >
              <span className="chapter-era">{c.era}</span>
              <span className="chapter-title">{c.order}. {c.title[lang]}</span>
              <span className="chapter-blurb small">{c.blurb[lang]}</span>
              <span className="chapter-meta small">
                {c.playable ? `${p.done}/${p.total} ✓` : ms ? "Akan datang" : "Coming soon"}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
