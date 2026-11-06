// Small lookups for data modules (no React): a dictionary entry with a fallback, and numbered variant lists.
import { DICTS, t, type Lang, type Vars } from "./i18n";

/** The dictionary entry for `key` in `lang` (or Malay), else `fallback`; fills {vars}. */
export function tx(lang: Lang, key: string, fallback: string, vars?: Vars): string {
  return DICTS[lang]?.[key] !== undefined || DICTS.ms[key] !== undefined ? t(lang, key, vars) : fallback;
}

/** Keys `prefix.0`, `prefix.1`, ... that exist in `lang` (Malay when that language has none). */
export function variantKeys(lang: Lang, prefix: string): string[] {
  const dict = DICTS[lang] ?? DICTS.ms;
  const out: string[] = [];
  for (let i = 0; dict[`${prefix}.${i}`] !== undefined; i++) out.push(`${prefix}.${i}`);
  if (out.length || lang === "ms") return out;
  return variantKeys("ms", prefix);
}

/** The numbered variants of `prefix` as text. */
export const variants = (lang: Lang, prefix: string, vars?: Vars): string[] => variantKeys(lang, prefix).map((k) => t(lang, k, vars));
