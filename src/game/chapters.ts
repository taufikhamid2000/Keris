// The six chapters of the Malaysian-history game. Data only: no three, no React.
// Progress is derived from the save's mission records, never stored.

export type Lang2 = { ms: string; en: string };

export interface ChapterDef {
  id: string;
  order: number;
  /** display era, e.g. "1511" */
  era: string;
  title: Lang2;
  blurb: Lang2;
  /** level ids in mission-list order */
  levels: string[];
  playable: boolean;
  /** "sensitive" chapters get stricter content rules later */
  tone?: "calm" | "sensitive";
}

/** level id -> missionId (the key in save.missions). Kept here so this file needs no level code; a test checks it against LEVELS. */
export const MISSION_OF: Record<string, string> = {
  harbour: "malacca-1511",
  kampung: "kampung-hulu",
  plans: "kampung-plans",
  jungle: "hutan-camp",
  ledang: "gunung-ledang",
  wayang: "wayang-kulit",
  penjara: "penjara-kota",
  gualanun: "gua-lanun",
  masjid: "masjid-warkah",
  kota: "kota-batu",
};

export const CHAPTERS: ChapterDef[] = [
  {
    id: "prasejarah",
    order: 1,
    era: "c. 9000 SM",
    title: { ms: "Prasejarah", en: "Prehistory" },
    blurb: {
      ms: "Menjelajah gua dan mengenali kehidupan manusia awal, termasuk Manusia Perak dari Lenggong.",
      en: "Explore a cave and learn how early people lived, including Perak Man of Lenggong.",
    },
    levels: [],
    playable: false,
    tone: "calm",
  },
  {
    id: "melaka-1511",
    order: 2,
    era: "1511",
    title: { ms: "Melaka 1511", en: "Melaka 1511" },
    blurb: {
      ms: "Misi senyap di Melaka sekitar kejatuhannya kepada Portugis pada tahun 1511.",
      en: "Stealth missions in Melaka around its fall to the Portuguese in 1511.",
    },
    levels: ["harbour", "kampung", "plans", "jungle", "ledang", "wayang", "penjara", "gualanun", "masjid", "kota"],
    playable: true,
    tone: "calm",
  },
  {
    id: "merdeka",
    order: 3,
    era: "1957",
    title: { ms: "Jalan ke Merdeka", en: "The Road to Merdeka" },
    blurb: {
      ms: "Menyusuri rundingan dan dokumen yang membawa kepada kemerdekaan Tanah Melayu pada 31 Ogos 1957.",
      en: "Follow the talks and documents that led to Malaya's independence on 31 August 1957.",
    },
    levels: [],
    playable: false,
    tone: "calm",
  },
  {
    id: "malaysia-1963",
    order: 4,
    era: "1963",
    title: { ms: "Malaysia 1963", en: "Malaysia 1963" },
    blurb: {
      ms: "Mendengar pandangan rakyat Tanah Melayu, Sabah dan Sarawak tentang pembentukan Malaysia.",
      en: "Hear the views of people in Malaya, Sabah and Sarawak on the formation of Malaysia.",
    },
    levels: [],
    playable: false,
    tone: "calm",
  },
  {
    id: "1969",
    order: 5,
    era: "1969",
    title: { ms: "1969", en: "1969" },
    blurb: {
      ms: "Bacaan dan renungan tentang peristiwa 1969 dan Rukun Negara. Tiada permainan ganas.",
      en: "Reading and reflection on the events of 1969 and the Rukun Negara. No playable violence.",
    },
    levels: [],
    playable: false,
    tone: "sensitive",
  },
  {
    id: "2020",
    order: 6,
    era: "2020",
    title: { ms: "2020", en: "2020" },
    blurb: {
      ms: "Garis masa ringkas dan neutral tentang perubahan politik 2020, berdasarkan rekod awam.",
      en: "A short, neutral timeline of the 2020 political change, based on the public record.",
    },
    levels: [],
    playable: false,
    tone: "sensitive",
  },
];

/** The chapter that holds this level id, if any. */
export function chapterOf(levelId: string): ChapterDef | undefined {
  return CHAPTERS.find((c) => c.levels.includes(levelId));
}

/** Missions completed out of the chapter's total, worked out from the save. */
export function chapterProgress(
  chapter: ChapterDef,
  save: { missions: Record<string, { completed: boolean }> },
): { done: number; total: number } {
  const done = chapter.levels.filter((id) => save.missions[MISSION_OF[id] ?? id]?.completed).length;
  return { done, total: chapter.levels.length };
}
