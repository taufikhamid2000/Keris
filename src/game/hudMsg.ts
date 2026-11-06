// HUD messages as keys. The engine has no language; it puts "§key" or "§key|{json vars}" in HudState.prompt and
// .toast, and the React side translates them. Anything without the "§" (level text, barks, pantun lines) is
// already final text and passes through untouched. Pure: no React, no three.
import { t, type Lang, type Vars } from "./i18n";

const MARK = "§";

/** Build a HUD message from a dictionary key and optional {placeholder} values. */
export function hudMsg(key: string, vars?: Vars): string {
  return vars ? `${MARK}${key}|${JSON.stringify(vars)}` : `${MARK}${key}`;
}

/** The dictionary key of a HUD message, or null when it is plain text. */
export function hudMsgKey(raw: string): string | null {
  if (!raw.startsWith(MARK)) return null;
  const i = raw.indexOf("|");
  return i < 0 ? raw.slice(1) : raw.slice(1, i);
}

/** Translate a HUD message (or pass plain text through). */
export function trMsg(lang: Lang, raw: string): string {
  const key = hudMsgKey(raw);
  if (key === null) return raw;
  const i = raw.indexOf("|");
  let vars: Vars | undefined;
  if (i >= 0) {
    try {
      vars = JSON.parse(raw.slice(i + 1)) as Vars;
    } catch {
      vars = undefined;
    }
  }
  return t(lang, key, vars);
}
