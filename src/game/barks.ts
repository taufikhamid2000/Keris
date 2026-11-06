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
  penjara: [
    "The damp gets into my bones down here.",
    "Every night the prisoners sing. Every single night.",
    "Keep the keys on your belt. Never on a nail.",
    "That old boatwright still won't talk.",
    "Water drips all night. It will drive me mad.",
    "Rats bigger than cats in these cells.",
    "Lantern oil rationed again. Rationed!",
    "The drain stinks worse than the harbour.",
    "Three days without sun. I forget what day it is.",
    "If one of them gets loose, the captain will have our hides.",
  ],
};

// Masjid: town guards on the streets outside, who keep clear of the compound
IDLE_LEVEL.masjid = [
  "Orders are to leave the masjid yard alone. Fine by me.",
  "Every messenger in the town gets searched tonight.",
  "Watch the lanes and the shore. A letter will go out by boat.",
  "The old caretaker has not come out in days.",
  "It is quiet here at dusk. Too quiet.",
  "Nobody gets past the main street without being looked at.",
];

export const idleLines =(levelId: string) => [...IDLE_ALL, ...(IDLE_LEVEL[levelId] ?? [])];

/** Overhearing range in metres: idle talk is quiet, shouting carries. */
export const BARK_RANGE: Record<BarkKind, number> = { idle: 11, giveup: 14, search: 18, suspicious: 16, stunned: 10, blind: 12, body: 26, alert: 30 };
