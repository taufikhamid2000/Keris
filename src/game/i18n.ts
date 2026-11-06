/** Language framework: plain dictionaries keyed by dotted ids. No React, no three. */
export type Lang = "ms" | "en";

export const LANGS: readonly Lang[] = ["ms", "en"];
export const DEFAULT_LANG: Lang = "ms";

export const isLang = (v: unknown): v is Lang => v === "ms" || v === "en";

/** Malay is the source of truth: every key must exist here and in EN (i18n.test.ts checks). */
export const MS = {
  "lang.label": "Bahasa / Language",
  "lang.ms": "Bahasa Melayu",
  "lang.en": "English",

  "common.close": "Close",
  "common.cancel": "Cancel",

  "settings.title": "Settings",
  "settings.quality": "Quality",
  "settings.quality.auto": "Auto (phones low, desktop high)",
  "settings.quality.low": "Low",
  "settings.quality.high": "High",
  "settings.quality.url": "?quality={q} in the address bar overrides this for now.",
  "settings.quality.titleOnly": "Change quality from the title screen.",
  "settings.lookSens": "Look sensitivity {x}x",
  "settings.lookSens.aria": "Look sensitivity",
  "settings.invertY": "Invert vertical look",
  "settings.reduceShake": "Kurangkan gegaran (reduce shake)",
  "settings.reduceShake.aria": "Kurangkan gegaran (reduce camera shake)",
  "settings.replayIntro": "Replay intro",
  "settings.backup": "Back up or move your save",
  "settings.saveCode": "Save code",
  "settings.export": "Export",
  "settings.import": "Import",
  "settings.codeReady": "Code ready to copy.",
  "settings.imported": "Imported.",
  "settings.codeInvalid": "That code is not valid.",
  "settings.confirm.aria": "Confirm reset",
  "settings.confirm.text": "Erase your checkpoint and best times? Settings are kept.",
  "settings.confirm.yes": "Yes, reset",
  "settings.resetDone": "Progress reset.",
  "settings.reset": "Reset progress",
  "settings.savedNote": "Saved in this browser only. Clearing site data erases it.",

  "pause.menu.aria": "Pause menu",
  "pause.title": "Berhenti",
  "pause.resume": "Resume",
  "pause.restart": "Restart",
  "pause.settings": "Settings",
  "pause.mainMenu": "Main menu",
  "pause.tab.peta": "Peta",
  "pause.tab.peta.sub": "Map",
  "pause.tab.kelengkapan": "Kelengkapan",
  "pause.tab.kelengkapan.sub": "Gear",
  "pause.tab.ilmu": "Ilmu",
  "pause.tab.ilmu.sub": "Skills",
  "pause.tab.kitab": "Kitab",
  "pause.tab.kitab.sub": "Journal",
  "pause.tab.hikayat": "Hikayat",
  "pause.tab.hikayat.sub": "Mission",

  "title.menu.aria": "Main menu",
  "title.continue": "Continue",
  "title.continueNamed": "Continue: {name}",
  "title.newGame": "New game",
  "title.ilmu": "Ilmu",
  "title.kitab": "Kitab",
  "title.controls": "Controls",
  "title.credits": "Credits",
} as const;

export type MsgKey = keyof typeof MS;

export const EN: Record<MsgKey, string> = {
  "lang.label": "Bahasa / Language",
  "lang.ms": "Bahasa Melayu",
  "lang.en": "English",

  "common.close": "Close",
  "common.cancel": "Cancel",

  "settings.title": "Settings",
  "settings.quality": "Quality",
  "settings.quality.auto": "Auto (phones low, desktop high)",
  "settings.quality.low": "Low",
  "settings.quality.high": "High",
  "settings.quality.url": "?quality={q} in the address bar overrides this for now.",
  "settings.quality.titleOnly": "Change quality from the title screen.",
  "settings.lookSens": "Look sensitivity {x}x",
  "settings.lookSens.aria": "Look sensitivity",
  "settings.invertY": "Invert vertical look",
  "settings.reduceShake": "Reduce shake",
  "settings.reduceShake.aria": "Reduce camera shake",
  "settings.replayIntro": "Replay intro",
  "settings.backup": "Back up or move your save",
  "settings.saveCode": "Save code",
  "settings.export": "Export",
  "settings.import": "Import",
  "settings.codeReady": "Code ready to copy.",
  "settings.imported": "Imported.",
  "settings.codeInvalid": "That code is not valid.",
  "settings.confirm.aria": "Confirm reset",
  "settings.confirm.text": "Erase your checkpoint and best times? Settings are kept.",
  "settings.confirm.yes": "Yes, reset",
  "settings.resetDone": "Progress reset.",
  "settings.reset": "Reset progress",
  "settings.savedNote": "Saved in this browser only. Clearing site data erases it.",

  "pause.menu.aria": "Pause menu",
  "pause.title": "Paused",
  "pause.resume": "Resume",
  "pause.restart": "Restart",
  "pause.settings": "Settings",
  "pause.mainMenu": "Main menu",
  "pause.tab.peta": "Map",
  "pause.tab.peta.sub": "Peta",
  "pause.tab.kelengkapan": "Gear",
  "pause.tab.kelengkapan.sub": "Kelengkapan",
  "pause.tab.ilmu": "Skills",
  "pause.tab.ilmu.sub": "Ilmu",
  "pause.tab.kitab": "Journal",
  "pause.tab.kitab.sub": "Kitab",
  "pause.tab.hikayat": "Mission",
  "pause.tab.hikayat.sub": "Hikayat",

  "title.menu.aria": "Main menu",
  "title.continue": "Continue",
  "title.continueNamed": "Continue: {name}",
  "title.newGame": "New game",
  "title.ilmu": "Ilmu",
  "title.kitab": "Kitab",
  "title.controls": "Controls",
  "title.credits": "Credits",
};

export const DICTS: Record<Lang, Record<string, string>> = { ms: MS, en: EN };

export type Vars = Record<string, string | number>;

/** Look up `key` in `lang`, falling back to Malay, then to the key itself; fills {name} placeholders. */
export function t(lang: Lang, key: string, vars?: Vars): string {
  const raw = DICTS[lang]?.[key] ?? (MS as Record<string, string>)[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
