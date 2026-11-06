// Pantun passwords: pure data and helpers, no DOM or three.js (pantunGates.ts draws and runs them in the engine).
// A pantun is a Malay quatrain: two lines of pembayang (imagery), two of maksud (meaning), rhymed a-b-a-b.
// The Portuguese pay Malay hired men to keep a few gates; each "penjaga pintu" speaks the first couplet of
// tonight's pantun and lets through whoever answers with the second. Pairs of hired men rehearse the
// passwords in quiet corners, and a player standing close enough overhears one. All verses here are original.

import type { SaveData } from "./save";
import { t, type Lang } from "./i18n";

export interface PantunDef {
  id: string;
  /** Kitab page title (Malay; pantunTitle gives it in the player's language) */
  title: string;
  /** pembayang (lines 0, 1) then maksud (lines 2, 3) */
  lines: [string, string, string, string];
  /** English gloss, line by line (shown only in English; the Malay verse needs none) */
  gloss: [string, string, string, string];
}

export const PANTUN: PantunDef[] = [
  {
    id: "bangau",
    title: t("ms", "pantun.title.bangau"),
    lines: ["Burung bangau terbang ke hulu,", "Hinggap sebentar di dahan jati;", "Kalau tuan kawan dahulu,", "Pintu dibuka sepenuh hati."],
    gloss: ["The egret flies upriver,", "it rests a while on a teak bough;", "if you are a friend of old,", "the gate opens with a full heart."],
  },
  {
    id: "kolek",
    title: t("ms", "pantun.title.kolek"),
    lines: ["Perahu kolek di Kuala Linggi,", "Sarat bermuat buah delima;", "Hajat hamba bukan tinggi,", "Sekadar lalu, harap diterima."],
    gloss: ["A kolek boat at Kuala Linggi,", "laden deep with pomegranates;", "my wish is nothing lofty,", "only to pass, if I may be let through."],
  },
  {
    id: "rusa",
    title: t("ms", "pantun.title.rusa"),
    lines: ["Anak rusa di tepi kali,", "Minum air di bawah titi;", "Sekali kenal seribu kali,", "Tiada perlu tuan menanti."],
    gloss: ["A fawn beside the stream,", "drinking under the footbridge;", "known once is known a thousand times,", "there is no need for you to wait."],
  },
  {
    id: "pelita",
    title: t("ms", "pantun.title.pelita"),
    lines: ["Pelita dipasang di anjung rumah,", "Cahaya jatuh ke atas tangga;", "Tuan datang membawa amanah,", "Lalulah tuan, kami berjaga."],
    gloss: ["A lamp is lit on the porch of the house,", "its light falls on the stair;", "you come bearing a trust,", "pass on, sir, we keep the watch."],
  },
  {
    id: "nelayan",
    title: t("ms", "pantun.title.nelayan"),
    lines: ["Nelayan pulang di waktu petang,", "Jala dijemur di tepi pantai;", "Kawan dikenal tatkala datang,", "Pintu terbuka, jalan pun damai."],
    gloss: ["The fisherman comes home in the evening,", "his net hung to dry on the shore;", "a friend is known the moment he comes,", "the gate is open and the road at peace."],
  },
  {
    id: "kabus",
    title: t("ms", "pantun.title.kabus"),
    lines: ["Kabus turun di Gunung Ledang,", "Embun menitis di daun keladi;", "Hati yang lurus langkah pun tenang,", "Jalan terbuka bagi yang sudi."],
    gloss: ["Mist comes down on Gunung Ledang,", "dew drips from the yam leaf;", "an honest heart walks calmly,", "the way is open to one who is willing."],
  },
];

export const pantunById = (id: string) => PANTUN.find((p) => p.id === id) ?? null;

/** A gate kept by a hired man. x, z on the ground; yaw is the way he faces when nobody is near. */
export interface SentryDef {
  id: string;
  /** where, for the toast and the prompt (Malay; sentryWhere gives it in the player's language) */
  where: string;
  x: number;
  z: number;
  yaw: number;
}

/** Chokepoints on the shared world map (see levels.ts): the bridge, the kampung's north gate, the hutan trail, the first stair. */
export const SENTRIES: SentryDef[] = [
  // south end of the guarded bridge, clear of the river-bank patrol at z = 33.5
  { id: "jambatan", where: t("ms", "pantun.sentry.jambatan"), x: 9.4, z: 35.2, yaw: Math.PI },
  // kampung side of the main gate in the north fence (gate x = 0, fence z = 112)
  { id: "pagar", where: t("ms", "pantun.sentry.pagar"), x: 2.6, z: 110.4, yaw: Math.PI },
  // beside the old trail where it leaves the hutan for the mountain
  { id: "denai", where: t("ms", "pantun.sentry.denai"), x: -23.3, z: 161.5, yaw: 0 },
  // at the foot of the first stair up Gunung Ledang
  { id: "tangga", where: t("ms", "pantun.sentry.tangga"), x: -6.2, z: 176.2, yaw: Math.PI },
];

/** Two hired men rehearsing one pantun, side by side across x, facing each other. */
export interface RehearsalDef {
  pantun: string;
  /** Kitab hint while the page is missing (Malay; see pantunPages) */
  where: string;
  x: number;
  z: number;
}

export const REHEARSALS: RehearsalDef[] = [
  { pantun: "bangau", where: t("ms", "pantun.where.bangau"), x: -13.5, z: -12.5 },
  { pantun: "kolek", where: t("ms", "pantun.where.kolek"), x: 24.5, z: 12.5 },
  { pantun: "rusa", where: t("ms", "pantun.where.rusa"), x: -7, z: 87 },
  { pantun: "pelita", where: t("ms", "pantun.where.pelita"), x: 25, z: 78 },
  { pantun: "nelayan", where: t("ms", "pantun.where.nelayan"), x: 6, z: 158 },
  { pantun: "kabus", where: t("ms", "pantun.where.kabus"), x: -12, z: 175.8 },
];

export const PANTUN_TUNE = {
  /** reach to answer a sentry (E) */
  askR: 2.6,
  /** the sentry calls out at this range */
  greetR: 6,
  /** a rehearsal starts within hearR and is lost beyond keepR */
  hearR: 10,
  keepR: 14,
  /** seconds per overheard line */
  lineT: 3.4,
  /** right answer: seconds disguised, guards within disguiseR of that gate see you this much slower */
  disguiseT: 20,
  disguiseR: 40,
  disguiseMul: 0.35,
  /** wrong answer: guards within shoutR turn to look, with their meter at least shoutMeter */
  shoutR: 24,
  shoutMeter: 0.7,
} as const;

/** Lines the sentries say (Malay; the English gloss is shown under it only when the player reads English). */
export const SENTRY_LINES = {
  greet: { text: "Berhenti! Siapa di situ? Jawab pantun hamba.", gloss: "Halt! Who goes there? Answer my pantun." },
  pass: { text: "Silakan lalu, saudara.", gloss: "Go on through, brother." },
  shout: { text: "Pengintip! Pengawal, ke mari!", gloss: "A spy! Guards, over here!" },
  again: { text: "Itu dia! Tangkap pengintip itu!", gloss: "That's him! Seize that spy!" },
} as const;

// ---------------------------------------------------------------- seeded draws

/** mulberry32: a small seeded generator, 0..1 */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(list: readonly T[], r: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The pantun each sentry asks for on this attempt (index matches SENTRIES), all different. */
export function gateDraw(seed: number): string[] {
  const ids = shuffle(
    PANTUN.map((p) => p.id),
    rng(seed),
  );
  return SENTRIES.map((_, i) => ids[i % ids.length]);
}

export interface PantunOption {
  lines: [string, string];
  gloss: [string, string];
}

/** Four second couplets for a pantun: its own maksud and three others', shuffled. */
export function choicesFor(id: string, seed: number): { options: PantunOption[]; correct: number } {
  const r = rng(seed ^ 0x5bd1e995);
  const own = pantunById(id) ?? PANTUN[0];
  const others = shuffle(
    PANTUN.filter((p) => p.id !== own.id),
    r,
  ).slice(0, 3);
  const order = shuffle([own, ...others], r);
  return {
    options: order.map((p) => ({ lines: [p.lines[2], p.lines[3]], gloss: [p.gloss[2], p.gloss[3]] })),
    correct: order.indexOf(own),
  };
}

// ---------------------------------------------------------------- HUD views

export interface PantunChoiceView {
  where: string;
  /** the sentry's couplet */
  lines: [string, string];
  gloss: [string, string];
  options: PantunOption[];
  /** highlighted option */
  sel: number;
  /** the right option, when the player has overheard this pantun (else null) */
  known: number | null;
}

export interface PantunLineView {
  who: string;
  text: string;
  gloss: string;
}

export interface PantunHud {
  choice: PantunChoiceView | null;
  line: PantunLineView | null;
  /** seconds of disguise left (0 when none) */
  disguise: number;
}

// ---------------------------------------------------------------- save and Kitab

const ids = new Set(PANTUN.map((p) => p.id));

/** Overheard pantun ids, once each, in list order. */
export function cleanPantun(v: unknown): string[] {
  const got = new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && ids.has(x)) : []);
  return PANTUN.filter((p) => got.has(p.id)).map((p) => p.id);
}

/** A pantun overheard (or answered rightly). */
export function addPantun(d: SaveData, id: string): SaveData {
  const known = d.pantun ?? [];
  return known.includes(id) ? d : { ...d, pantun: cleanPantun([...known, id]) };
}

/** A pantun's title in one language. */
export const pantunTitle = (lang: Lang, id: string) => t(lang, `pantun.title.${id}`);

/** Where a sentry stands, in one language (`where` is the Malay text a SentryDef carries). */
export function sentryWhere(lang: Lang, where: string): string {
  const s = SENTRIES.find((x) => x.where === where);
  return s ? t(lang, `pantun.sentry.${s.id}`) : where;
}

/** Kitab pages, one per pantun. The English gloss goes with the verse only in English. */
export function pantunPages(known: readonly string[] | undefined, lang: Lang = "ms") {
  return PANTUN.map((p) => {
    const spot = REHEARSALS.find((r) => r.pantun === p.id);
    return {
      key: `pantun-${p.id}`,
      open: !!known?.includes(p.id),
      title: pantunTitle(lang, p.id),
      text: lang === "en" ? `${p.lines.join(" ")} (${p.gloss.join(" ")})` : p.lines.join(" "),
      hint: spot ? t(lang, "pantun.hint.heard", { where: t(lang, `pantun.where.${p.id}`) }) : t(lang, "pantun.hint.somewhere"),
    };
  });
}
