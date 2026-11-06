// Guard chatter: short lines shown as subtitles when the player is close enough to overhear.
// Pure data, no DOM or three.js. The guards are Portuguese soldiers; a few words stay in Portuguese.

export type BarkKind = "idle" | "suspicious" | "alert" | "search" | "giveup" | "body" | "blind" | "stunned";

/** Higher wins when two lines want the subtitle at once. */
export const BARK_PRIORITY: Record<BarkKind, number> = { idle: 0, giveup: 1, search: 2, suspicious: 3, stunned: 4, blind: 4, body: 5, alert: 6 };

export const BARKS: Record<Exclude<BarkKind, "idle">, string[]> = {
  suspicious: ["Quem está aí?", "Did you hear that?", "Something moved over there.", "Who goes there? Show yourself.", "Hm. Probably a monkey.", "I'll take a look."],
  alert: ["Ali! There!", "Alarme! Intruder!", "There he is! Take him!", "To arms! To arms!", "A Malay with a blade! Here!"],
  search: ["He was right here.", "Spread out. He can't have gone far.", "Check the shadows.", "Look under the houses.", "Where did he go?"],
  giveup: ["Nothing. Back to the post.", "Only the wind.", "My eyes are playing tricks again.", "Whoever it was, he's gone.", "Nada. Back to work."],
  body: ["Deus! A man down here!", "He's dead. Sound the alarm!", "Someone has been killing our men!"],
  blind: ["My eyes! Pepper!", "I can't see!", "Ai, it burns!"],
  stunned: ["Ugh, my head...", "What hit me?"],
};

/** Overheard on patrol: general grumbling, then lines for where the mission is. */
const IDLE_ALL = [
  "This heat will kill me before any Malay does.",
  "Three months at sea for this.",
  "My boots have not been dry since Goa.",
  "They say the sultan's men can climb like cats.",
  "Keep your eyes on the roofs. That's where they come from.",
  "When do we get relieved?",
  "Santa Maria, the mosquitoes.",
  "I miss bread. Real bread.",
];
const IDLE_LEVEL: Record<string, string[]> = {
  harbour: ["The Kapitan wants the guns turned on the town by morning.", "Watch the jetty. Sampans come and go all night.", "The fleet sails in when the battery is ready."],
  kampung: ["That clerk pays well and talks too much.", "The penghulu's hall gives me a bad feeling.", "Who walks around under houses? Malays, that's who."],
  plans: ["Something was hidden under the hall, they say.", "Guard the hall. Nobody goes underneath.", "If the plans go missing, it's our heads."],
  jungle: ["These trails all look the same.", "Stay on the path. The jungle eats men.", "Something's watching us from the trees.", "The captain's map had better be right."],
  ledang: ["They say a princess lives on this mountain.", "Mist again. I can't see my own hand.", "Who leaves gold on a mountain top?", "Mind the ledges. Long way down."],
};

export const idleLines = (levelId: string) => [...IDLE_ALL, ...(IDLE_LEVEL[levelId] ?? [])];

/** Overhearing range in metres: idle talk is quiet, shouting carries. */
export const BARK_RANGE: Record<BarkKind, number> = { idle: 11, giveup: 14, search: 18, suspicious: 16, stunned: 10, blind: 12, body: 26, alert: 30 };

// ---------------------------------------------------------------- Gua Lanun: pirates, not soldiers
/** Levels guarded by someone other than Portuguese soldiers: their own chatter replaces the shared lines. */
const OWN_BARKS: Record<string, Record<"idle", string[]> & Partial<Record<Exclude<BarkKind, "idle">, string[]>>> = {
  gualanun: {
    idle: [
      "Aduh, the damp gets into my bones.",
      "Count the casks again, lah.",
      "The chief says we sail on the next tide.",
      "Keep the torch away from the powder, bodoh.",
      "Cold in here, hot outside. Who chose this cave?",
      "Tuan Laut will skin us if one cask is missing.",
      "All I smell is fish and smoke.",
      "My arm still aches from that last prahu.",
      "Hush. Even the water listens in here.",
      "Nobody finds Gua Lanun. Nobody.",
      "Pahang silver is heavy, but not heavy enough.",
    ],
    suspicious: ["Siapa tu?", "Eh, who's there?", "Did the water move?", "Something stepped on a stone.", "Tikus again, I hope.", "Show yourself, lah."],
    alert: ["Musuh! Intruder!", "Ambush! Swords out!", "Lanun, awas!", "Don't let him reach the water!", "Orang asing! Here!"],
    search: ["He's still in the cave!", "Check behind the crates, lah.", "Torches high! Look in the corners.", "Spread out, cari dia.", "He can't swim past the dock."],
    giveup: ["Nothing. Back to your posts.", "Only the cave echoing.", "Hantu laut, maybe. Back to work.", "Aiyo, my eyes. Nothing there.", "Tak ada apa-apa."],
    body: ["Mati! A man dead here!", "Tuan! Someone has killed Rahim!", "He's cold. Sound the conch!"],
    blind: ["Mata aku! Pepper!", "I can't see, aduh!", "It burns!"],
    stunned: ["Aduh, my head...", "Apa tu?"],
  },
};

/** The lines a guard of this level can say for a kind of bark. */
export const barkLines = (levelId: string, kind: BarkKind): string[] => {
  const own = OWN_BARKS[levelId];
  if (own) return (kind === "idle" ? own.idle : own[kind]) ?? BARKS[kind as Exclude<BarkKind, "idle">];
  return kind === "idle" ? idleLines(levelId) : BARKS[kind];
};
