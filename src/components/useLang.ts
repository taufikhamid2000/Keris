"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_LANG, type Lang } from "@/game/i18n";
import { getSaveStore } from "@/game/save";

/** The language chosen in Settings, for components that are not handed the save (Tide, Kapitan, the loader). */
export function useLang(): Lang {
  const store = getSaveStore();
  return useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().settings.lang,
    () => DEFAULT_LANG,
  );
}
