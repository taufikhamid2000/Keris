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

  "common.close": "Tutup",
  "common.cancel": "Batal",

  "settings.title": "Tetapan",
  "settings.quality": "Kualiti",
  "settings.quality.auto": "Auto (telefon rendah, desktop tinggi)",
  "settings.quality.low": "Rendah",
  "settings.quality.high": "Tinggi",
  "settings.quality.url": "?quality={q} dalam bar alamat menggantikan tetapan ini buat sementara waktu.",
  "settings.quality.titleOnly": "Tukar kualiti dari skrin tajuk.",
  "settings.lookSens": "Kepekaan pandangan {x}x",
  "settings.lookSens.aria": "Kepekaan pandangan",
  "settings.invertY": "Songsangkan pandangan menegak",
  "settings.reduceShake": "Kurangkan gegaran",
  "settings.reduceShake.aria": "Kurangkan gegaran kamera",
  "settings.replayIntro": "Main semula pengenalan",
  "settings.backup": "Sandarkan atau pindahkan simpanan",
  "settings.saveCode": "Kod simpanan",
  "settings.export": "Eksport",
  "settings.import": "Import",
  "settings.codeReady": "Kod sedia untuk disalin.",
  "settings.imported": "Berjaya diimport.",
  "settings.codeInvalid": "Kod itu tidak sah.",
  "settings.confirm.aria": "Sahkan tetapan semula",
  "settings.confirm.text": "Padam pusat semak dan masa terbaik anda? Tetapan dikekalkan.",
  "settings.confirm.yes": "Ya, tetapkan semula",
  "settings.resetDone": "Kemajuan telah ditetapkan semula.",
  "settings.reset": "Tetapkan semula kemajuan",
  "settings.savedNote": "Disimpan dalam pelayar ini sahaja. Memadam data laman akan menghapuskannya.",

  "pause.menu.aria": "Menu jeda",
  "pause.title": "Jeda",
  "pause.resume": "Sambung",
  "pause.restart": "Mula semula",
  "pause.settings": "Tetapan",
  "pause.mainMenu": "Menu utama",
  "pause.tab.peta": "Peta",
  "pause.tab.peta.sub": "Lokasi",
  "pause.tab.kelengkapan": "Kelengkapan",
  "pause.tab.kelengkapan.sub": "Bekalan",
  "pause.tab.ilmu": "Ilmu",
  "pause.tab.ilmu.sub": "Kemahiran",
  "pause.tab.kitab": "Kitab",
  "pause.tab.kitab.sub": "Catatan",
  "pause.tab.hikayat": "Hikayat",
  "pause.tab.hikayat.sub": "Misi",

  "title.menu.aria": "Menu utama",
  "title.continue": "Teruskan",
  "title.continueNamed": "Teruskan: {name}",
  "title.newGame": "Permainan baharu",
  "title.ilmu": "Ilmu",
  "title.kitab": "Kitab",
  "title.controls": "Kawalan",
  "title.credits": "Penghargaan",
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

import * as hud from "./strings/hud";
import * as menus from "./strings/menus";
import * as story from "./strings/story";
import * as missions from "./strings/missions";

const AREAS = [hud, menus, story, missions];
/** Core dictionaries plus one file per area under strings/ (so parallel edits never collide). */
export const DICTS: Record<Lang, Record<string, string>> = {
  ms: Object.assign({}, MS, ...AREAS.map((a) => a.ms)),
  en: Object.assign({}, EN, ...AREAS.map((a) => a.en)),
};

export type Vars = Record<string, string | number>;

/** Look up `key` in `lang`, falling back to Malay, then to the key itself; fills {name} placeholders. */
export function t(lang: Lang, key: string, vars?: Vars): string {
  const raw = DICTS[lang]?.[key] ?? DICTS.ms[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
