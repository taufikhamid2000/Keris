// Guard chatter: short lines shown as subtitles when the player is close enough to overhear.
// Pure data, no DOM or three.js. The guards are Portuguese soldiers; a few words stay in Portuguese.
// The lines live in strings/story.ts (bark.*), so they follow the player's language.

import type { Lang } from "./i18n";
import { variants } from "./tx";

export type BarkKind = "idle" | "suspicious" | "alert" | "search" | "giveup" | "body" | "blind" | "stunned";

/** Higher wins when two lines want the subtitle at once. */
export const BARK_PRIORITY: Record<BarkKind, number> = { idle: 0, giveup: 1, search: 2, suspicious: 3, stunned: 4, blind: 4, body: 5, alert: 6 };

/** Levels with their own patrol talk (bark.idle.<level>), added to the shared lines. */
const IDLE_LEVELS = ["harbour", "kampung", "plans", "jungle", "ledang", "penjara", "masjid", "kota"];

/** Overheard on patrol: general grumbling, then lines for where the mission is. */
export const idleLines = (levelId: string, lang: Lang = "ms") => [
  ...variants(lang, "bark.idle.all"),
  ...(IDLE_LEVELS.includes(levelId) ? variants(lang, `bark.idle.${levelId}`) : []),
];

/** Overhearing range in metres: idle talk is quiet, shouting carries. */
export const BARK_RANGE: Record<BarkKind, number> = { idle: 11, giveup: 14, search: 18, suspicious: 16, stunned: 10, blind: 12, body: 26, alert: 30 };

/** Levels guarded by someone other than Portuguese soldiers: their own chatter replaces the shared lines (bark.own.<level>.<kind>). */
const OWN_LEVELS = ["gualanun"];

/** The lines a guard of this level can say for a kind of bark. */
export const barkLines = (levelId: string, kind: BarkKind, lang: Lang = "ms"): string[] => {
  if (OWN_LEVELS.includes(levelId)) {
    const own = variants(lang, `bark.own.${levelId}.${kind}`);
    if (own.length) return own;
  }
  return kind === "idle" ? idleLines(levelId, lang) : variants(lang, `bark.${kind}`);
};
