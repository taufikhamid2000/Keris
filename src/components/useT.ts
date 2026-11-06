"use client";

import { useCallback } from "react";
import { t, type Lang, type Vars } from "@/game/i18n";

/** `const t = useT(save.settings.lang)`; then `t("pause.resume")` or `t("title.continueNamed", { name })`. */
export function useT(lang: Lang) {
  return useCallback((key: string, vars?: Vars) => t(lang, key, vars), [lang]);
}
