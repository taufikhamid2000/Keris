// Hikayat: the game writes your tale. Turns an attempt's chronicle (chronicle.ts) into a short story in the
// cadence of the old Malay hikayat, told in English. Pure data and helpers, no DOM or three.js.
// Wording is picked by a seeded RNG from the attempt, so the same run always reads the same, and the
// tone follows how it went: a ghost run, a bloody one, a messy one, or one that ended in a fall.

import type { ChronEvent, ChronicleData, KillHow } from "./chronicle";
import type { LevelDef } from "./levels";

/** The bits of RunStats the tale needs (kept structural so this module never imports the engine). */
export interface TaleStats {
  time: number;
  alerts: number;
}

type Tone = "ghost" | "shadow" | "messy" | "bloody" | "fallen";

interface Cast {
  /** kill missions: the target; steal missions: the item */
  who: string;
  /** what the pendekar was sent to do, after "to" */
  deed: string;
  /** the place the tale is set */
  region: string;
  /** where he gets away */
  exit: string;
}

const CAST: Record<string, Cast> = {
  harbour: { who: "the Kapitan", deed: "silence the Kapitan of the bridge battery", region: "Bandar Melaka", exit: "the harbour jetty" },
  kampung: { who: "the turncoat clerk", deed: "find the clerk who had sold the battery plans for silver", region: "Kampung Hulu", exit: "the river jetty" },
  plans: { who: "the chest of plans", deed: "take back the battery plans from under the penghulu's hall", region: "Kampung Hulu", exit: "the river jetty" },
  jungle: { who: "the scout captain", deed: "find the captain of the scouts in his jungle camp", region: "the hutan", exit: "the river jetty" },
  ledang: { who: "the golden tepak sireh", deed: "bring the golden tepak sireh out of the soldiers' hands", region: "Gunung Ledang", exit: "the pool below the falls" },
  penjara: { who: "Pak Long Hasan", deed: "free Pak Long Hasan, the old boatwright, from the cells under the fort", region: "the penjara", exit: "the old drain to the river" },
};

CAST.masjid = { who: "the sealed warkah", deed: "carry the penjaga's sealed warkah out of the town to the envoy's boatman", region: "the lanes round the old masjid", exit: "the harbour jetty" };

function castFor(def: LevelDef): Cast {
  const c = CAST[def.id];
  if (c) return c;
  const obj = def.text.objective;
  return { who: def.objective.kind === "steal" ? "the prize" : "the man he sought", deed: obj.charAt(0).toLowerCase() + obj.slice(1), region: def.name, exit: "the way out" };
}

/** Kitab place ids as they sit in a sentence. */
const PLACE_WORDS: Record<string, string> = {
  jeti: "the harbour jetty",
  pelabuhan: "the lanes of Bandar Melaka",
  sungai: "the brown river",
  "kampung-hulu": "Kampung Hulu",
  hutan: "the old hutan",
  kem: "the scouts' camp",
  ledang: "the slopes of Gunung Ledang",
  kolam: "the pool below the falls",
  puncak: "the summit shrine",
  "halaman-penjara": "the yard of the penjara",
  sel: "the dripping cells",
};

PLACE_WORDS.masjid = "the quiet yard of the masjid";
PLACE_WORDS["kolam-masjid"] = "the still pond by the gate";

// ---------------------------------------------------------------- small helpers

function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

const NUMS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const num = (n: number) => NUMS[n] ?? String(n);
const times = (n: number) => (n === 1 ? "once" : n === 2 ? "twice" : n === 3 ? "thrice" : `${num(n)} times`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "a", "a and b", "a, b and c" */
function list(xs: string[]): string {
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

/** Words that may lose their capital after a connective ("Maka he..."); names keep theirs. */
const LOWERABLE = /^(He|His|Him|The|There|Twice|Thrice|Once|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Many|A|An|At|In|On|By|When|Not|Where|Down|Up|Into|From|Only|Even|Before|After|With|Below|Above|Some|No|None|So|Of|All|Each|Under|Over|Long|Every)\b/;

// ---------------------------------------------------------------- the tale

interface Tally {
  from: "start" | "target";
  places: string[];
  kills: Record<KillHow, number>;
  target: ChronEvent & { k: "kill" } | null;
  covered: number;
  stones: number;
  stoneHeard: number;
  pepper: number;
  blinded: number;
  knives: number;
  knifeHits: number;
  spotted: number;
  bodiesFound: number;
  targetSpotted: boolean;
  hides: number;
  hidBodies: number;
  swims: number;
  dives: number;
  horse: boolean;
  boat: boolean;
  wounds: number;
  nearDeath: number;
  parries: number;
  charm: string | null;
  objectiveT: number | null;
  end: (ChronEvent & { k: "end" }) | null;
}

function tally(events: ChronEvent[]): Tally {
  const t: Tally = {
    from: "start", places: [], kills: { silent: 0, air: 0, counter: 0, cut: 0 }, target: null, covered: 0,
    stones: 0, stoneHeard: 0, pepper: 0, blinded: 0, knives: 0, knifeHits: 0, spotted: 0, bodiesFound: 0, targetSpotted: false,
    hides: 0, hidBodies: 0, swims: 0, dives: 0, horse: false, boat: false, wounds: 0, nearDeath: 0, parries: 0, charm: null, objectiveT: null, end: null,
  };
  for (const e of events) {
    switch (e.k) {
      case "start": t.from = e.from; break;
      case "place": if (!t.places.includes(e.id)) t.places.push(e.id); break;
      case "kill":
        if (e.target) t.target = e;
        else t.kills[e.how]++;
        if (e.cover) t.covered++;
        break;
      case "tool":
        if (e.tool === "stone") { t.stones++; t.stoneHeard += e.hit; }
        else if (e.tool === "pepper") { t.pepper++; t.blinded += e.hit; }
        else { t.knives++; t.knifeHits += e.hit; }
        break;
      case "spotted":
        t.spotted++;
        if (e.body) t.bodiesFound++;
        if (e.target) t.targetSpotted = true;
        break;
      case "hide": t.hides++; break;
      case "hideBody": t.hidBodies++; break;
      case "swim": t.swims++; break;
      case "dive": t.dives++; break;
      case "horse": t.horse = true; break;
      case "boat": t.boat = true; break;
      case "wounded": t.wounds++; break;
      case "nearDeath": t.nearDeath++; break;
      case "parry": t.parries++; break;
      case "charm": t.charm = e.name; break;
      case "objective": t.objectiveT = e.t; break;
      case "end": t.end = e; break;
    }
  }
  return t;
}

function toneOf(t: Tally, s: TaleStats): Tone {
  if (t.end && !t.end.won) return "fallen";
  const killed = t.kills.silent + t.kills.air + t.kills.counter + t.kills.cut;
  const fought = t.kills.counter + t.kills.cut;
  if (fought >= 3 || (killed >= 6 && fought >= 1)) return "bloody";
  if (s.alerts >= 3 || t.nearDeath > 0 || t.wounds >= 2) return "messy";
  return s.alerts === 0 ? "ghost" : "shadow";
}

/** Tell the tale of one attempt: 5 to 10 sentences, one paragraph. */
export function tellHikayat(log: ChronicleData, def: LevelDef, stats: TaleStats): string {
  const r = rng(log.seed ^ hash(def.id));
  const pick = <T,>(xs: T[]): T => xs[Math.floor(r() * xs.length)];
  const t = tally(log.events);
  const tone = toneOf(t, stats);
  const c = castFor(def);
  const steal = def.objective.kind === "steal";
  const won = !!t.end?.won;
  const Who = cap(c.who);
  const killed = t.kills.silent + t.kills.air + t.kills.counter + t.kills.cut;

  /** body sentences, with a priority (lower is dropped first when the tale runs long) */
  const body: { p: number; s: string }[] = [];
  const say = (p: number, s: string) => body.push({ p, s });

  // ---- opening (always)
  const dusk = def.id === "ledang" ? "when the mist lay thick on the mountain" : def.id === "jungle" ? "when the hutan was loud with insects" : "when the lamps were lit along the lanes";
  const opening =
    t.from === "target"
      ? pick([
          `Adapun ${c.who} was already ${steal ? "in his hands" : "dead"}, and there remained to the pendekar only the road to ${c.exit}.`,
          `Sebermula, the work was half done: ${c.who} ${steal ? "was taken" : "lay still"}, and the pendekar had yet to reach ${c.exit} alive.`,
        ])
      : pick([
          `Sebermula, in the days when the Portuguese ships lay in the roads off Melaka, a pendekar was sent to ${c.deed}.`,
          `Alkisah, it is told that ${dusk}, the pendekar went out into ${c.region} to ${c.deed}.`,
          `Adapun the pendekar, having taken his charge from the elder, set out ${dusk} to ${c.deed}.`,
        ]);

  // ---- the road taken
  const words = t.places.map((id) => PLACE_WORDS[id]).filter((w): w is string => !!w);
  if (words.length >= 2) {
    const mid = words.slice(1, -1).slice(0, 2);
    const first = words[0];
    const last = words[words.length - 1];
    say(5, mid.length
      ? pick([`From ${first} he went by way of ${list(mid)}, and came at last to ${last}.`, `His road ran from ${first} through ${list(mid)} to ${last}, and he kept to the dark the whole way.`])
      : pick([`From ${first} he went on to ${last}, keeping to the shadows of the eaves.`, `He left ${first} behind him and went on to ${last}.`]));
  } else if (words.length === 1) {
    say(5, pick([`He kept to ${words[0]} the whole night through.`, `All that he did, he did in ${words[0]}.`]));
  }

  // ---- water and mounts
  const travel: string[] = [];
  if (t.swims) travel.push(t.dives ? pick([`into the water he went like a buaya, and ${times(t.dives)} he slipped under and held his breath while the soldiers looked about`, `he took to the water, and went under ${times(t.dives)} where no eye could follow`]) : pick(["he swam where no soldier would wade", "he crossed the water as the buaya crosses it, with only his eyes above"]));
  if (t.boat) travel.push(pick(["he took a sampan and slid along the water, and his paddle made no splash", "a sampan carried him a while, low on the water"]));
  if (t.horse) travel.push(pick(["he took a horse and rode it hard, so that the hooves were heard from far off", "he rode a while on a stolen horse, and the road went by fast beneath him"]));
  if (travel.length) say(3, `${cap(list(travel))}.`);

  // ---- hiding
  if (t.hides || t.hidBodies) {
    const a = t.hides ? pick([`${cap(times(t.hides))} he folded himself into the hay and the bushes, and the soldiers walked by close enough to touch`, `${cap(times(t.hides))} he went to ground in the hay and the leaves and waited for the boots to pass`]) : "";
    const b = t.hidBodies ? `${a ? ", and " : ""}${t.hidBodies === 1 ? "one of the dead he dragged into cover, that no one should find him" : `${num(t.hidBodies)} of the dead he dragged into cover, that no one should find them`}` : "";
    say(2, `${cap(a + b)}.`);
  }

  // ---- tools
  const tools: string[] = [];
  if (t.stones) tools.push(t.stoneHeard ? (t.stones === 1 ? "one stone tossed into the dark turned a soldier's head the wrong way" : `${num(t.stones)} stones he threw into the dark, and the soldiers went to look at nothing`) : `${t.stones === 1 ? "a stone" : `${num(t.stones)} stones`} he threw that no one heard`);
  if (t.pepper) tools.push(t.blinded ? `with serbuk lada he blinded ${t.blinded === 1 ? "a man" : `${num(t.blinded)} men`}, who wept and clawed at their eyes` : "a handful of pepper he gave to the wind, and it blinded nobody");
  if (t.knives) tools.push(t.knifeHits ? `${t.knifeHits === t.knives ? (t.knives === 1 ? "his one throwing knife" : `all ${num(t.knives)} of his throwing knives`) : `${num(t.knifeHits)} of his ${num(t.knives)} throwing knives`} struck home, and the struck men reeled` : `his throwing knives clattered off into the dark`);
  if (tools.length) say(1, `${cap(list(tools))}.`);

  // ---- the fallen (merged by how they died)
  if (killed) {
    const parts: string[] = [];
    const k = t.kills;
    if (k.silent) parts.push(k.silent === 1 ? pick(["one guard he took from behind, and the man made no sound", "a single guard died with the keris in his back before he knew he was not alone"]) : pick([`${num(k.silent)} guards fell before him without a sound`, `${num(k.silent)} men he took from behind, one by one, and not one of them cried out`]));
    if (k.air) parts.push(k.air === 1 ? pick(["one he took from above, dropping on him as the helang drops on a chick", "one never thought to look up, and the pendekar came down on him from the eaves"]) : `${times(k.air)} he dropped from on high like the helang, and each time a man did not rise`);
    if (k.counter) parts.push(k.counter === 1 ? "one who staggered under his blade he finished where he stood" : `${num(k.counter)} who reeled from his blade he finished before they could steady themselves`);
    if (k.cut) parts.push(k.cut === 1 ? pick(["one he cut down face to face", "one stood against him in the open, and was cut down"]) : pick([`${num(k.cut)} he cut down blade to blade, for all to see`, `${num(k.cut)} stood against him in the open, and the ground was red with them`]));
    const lead = parts.length > 1 && killed >= 3 ? "Many were the soldiers who met him: " : "";
    say(6, lead ? `${lead}${list(parts)}.` : `${cap(list(parts))}.`);
  } else if (won || tone !== "fallen") {
    say(6, steal || t.target || t.from === "target" ? pick(["His keris tasted no blood that night save what the task required.", "Not one soldier's blood did he spill that he did not have to."]) : pick(["His keris never once left its sheath.", "Not a single soldier did he harm, and his keris stayed in its sheath."]));
  }

  // ---- seen
  if (t.spotted) {
    const body2 = t.bodiesFound ? `, and ${t.bodiesFound === 1 ? "once it was a body he had left that was found" : `${times(t.bodiesFound)} it was the bodies he had left that gave him away`}` : "";
    const tgt = t.targetSpotted && !steal ? ` ${Who} himself saw him and called for his men.` : "";
    say(7, pick([`But ${times(t.spotted)} the cry went up and the soldiers came running${body2}.`, `Yet he was seen ${times(t.spotted)}, and ${t.spotted === 1 ? "the alarm" : "each time the alarm"} ran from post to post${body2}.`]) + tgt);
  }

  // ---- blood and steel
  if (t.nearDeath || t.wounds || t.parries) {
    const parts: string[] = [];
    if (t.parries) parts.push(t.parries === 1 ? "one blow he turned aside on the keris" : `${num(t.parries)} blows he turned aside on the keris`);
    if (t.nearDeath) parts.push(won ? "once his own blood ran so freely that the tale nearly ended there, but he did not fall" : "his blood ran freely");
    else if (t.wounds) parts.push(t.wounds === 1 ? "he took one cut and paid it no mind" : `he took ${num(t.wounds)} cuts and paid them no mind`);
    say(4, `${cap(list(parts))}.`);
  }

  // ---- the tangkal
  if (t.charm) say(2, pick([`And hidden in the straw he found the ${t.charm}, and wore it after.`, `There too he came upon the ${t.charm}, tucked away where only a pendekar would look.`]));

  // ---- the deed
  if (t.from === "start" && (t.objectiveT !== null || t.target)) {
    const quick = t.objectiveT !== null && t.objectiveT < 120 ? pick([", before the watch had even changed", ", and the night was still young"]) : "";
    if (steal) {
      say(8, stats.alerts > 0
        ? `${Who} he found where it was hidden and took it up, though the hunt was loud around him${quick}.`
        : pick([`${Who} he found where it was hidden, and took it up, and no hand stopped him${quick}.`, `He laid his hand on ${c.who} at last, and no one in all ${c.region} knew it was gone${quick}.`]));
    } else {
      const how = t.target?.how ?? "silent";
      say(8, how === "air"
        ? `From above he fell upon ${c.who}, as the helang falls upon its prey, and it was done in a breath${quick}.`
        : how === "silent"
          ? pick([`${Who} he found at last, and came at him from behind, and the keris went in once, and ${c.who} spoke no more${quick}.`, `Then he stood behind ${c.who}, close as a shadow, and struck once${quick}.`])
          : `${Who} would not die quietly; they crossed blades in the open, and at the last the keris found him${quick}.`);
    }
  }

  // ---- how it went (tone)
  const toneLine: Record<Tone, string[]> = {
    ghost: ["No soldier saw so much as his shadow; to them he was only a wind moving in the atap.", "The soldiers would swear by morning that nobody had come at all."],
    shadow: ["Seen he was, but only for a moment, and moments pass.", "A glimpse they had of him, no more, and a glimpse is not a name."],
    messy: [`It was not a quiet night; all ${c.region} heard of it by morning.`, "It was a loud and ragged business, and the soldiers did not sleep again that night."],
    bloody: ["The soldiers would speak of that night in whispers for a long time after.", "Red was the keris that night, and the ships in the roads heard the count by dawn."],
    fallen: ["Who he was, the soldiers never learned.", "The lamps burned late that night in the soldiers' quarters."],
  };
  const toneSay = () => say(won ? 4 : 8, pick(toneLine[tone]));

  if (won) toneSay();

  // ---- the end of it
  const mins = Math.max(1, Math.round(stats.time / 60));
  if (won) {
    const pace = stats.time < 180 ? "quicker than a quid of sireh is chewed" : stats.time < 480 ? "in the time it takes rice to cook" : `and ${num(mins)} minutes had passed since he set out`;
    say(9, pick([`Hatta, he went down to ${c.exit} and was gone, ${pace}.`, `Maka he came to ${c.exit} and slipped away into the dark, ${pace}.`]));
  } else {
    const where = words.length ? words[words.length - 1] : c.region;
    say(9, t.end?.reason === "slain"
      ? pick([`Maka there in ${where} the pendekar fell at last, and the soldiers stood over him and wondered who he had been.`, `Hatta, in ${where} the blades closed around him, and there the pendekar fell.`])
      : t.end?.reason === "detected"
        ? `Maka the alarm went up in ${where}, and what had to be done unseen could not be done that night.`
        : `Maka in ${where} the work came undone, and the pendekar had to leave it for another night.`);
  }

  if (!won) toneSay();

  // keep it to 10 sentences with the opening and closing: drop the least important first
  while (body.length > 8) {
    let lo = 0;
    for (let i = 1; i < body.length; i++) if (body[i].p < body[lo].p) lo = i;
    body.splice(lo, 1);
  }

  // connectives: a few, never twice in a row, so the cadence stays light
  const pool = ["Maka", "Maka", "Syahadan,", "Hatta,"].filter((w) => !body.some((b) => b.s.startsWith(w.replace(",", ""))));
  const mids = body.map((b) => b.s);
  let prevCon = true;
  for (let i = 0; i < mids.length - 1 && pool.length; i++) {
    const s = mids[i];
    if (prevCon || r() > 0.45 || !LOWERABLE.test(s)) {
      prevCon = false;
      continue;
    }
    const w = pool.splice(Math.floor(r() * pool.length), 1)[0];
    mids[i] = `${w} ${s.charAt(0).toLowerCase()}${s.slice(1)}`;
    prevCon = true;
  }

  const closing = pick(
    won
      ? ["Demikianlah the tale, as the one who owns it told it; and God knows best.", "Thus it is told, and thus it was; wallahualam.", "So ends this part of the hikayat of the pendekar, as the tellers tell it."]
      : ["So the tale breaks off here; but tales in Melaka are told more than once.", "Thus it is told, though the tellers say it ended otherwise the next time; wallahualam."],
  );
  return [opening, ...mids, closing].join(" ");
}

// ---------------------------------------------------------------- the save keeps the last tale per mission

export const TALE_MAX = 2400;

/** Last tale per mission id: short strings only, at most a few dozen missions. */
export function cleanTales(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof v !== "object" || v === null || Array.isArray(v)) return out;
  for (const [k, s] of Object.entries(v as Record<string, unknown>)) {
    if (Object.keys(out).length >= 32) break;
    if (k.length <= 64 && typeof s === "string" && s.length > 0) out[k] = s.slice(0, TALE_MAX);
  }
  return out;
}
