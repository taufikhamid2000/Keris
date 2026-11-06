// Hikayat: the game writes your tale. Turns an attempt's chronicle (chronicle.ts) into a short story in the
// cadence of the old Malay hikayat, told in Malay (default) or English. Pure data and helpers, no DOM or three.js.
// Wording is picked by a seeded RNG from the attempt, so the same run always reads the same, and the
// tone follows how it went: a ghost run, a bloody one, a messy one, or one that ended in a fall.
// All sentences live in strings/story.ts (hikayat.*); numbered variants (key.0, key.1) are the RNG's choices.
// The tale is an in-world fiction set in Melaka in 1511 (see docs/STORYLINE-DRAFT.md), not history.

import type { ChronEvent, ChronicleData, KillHow } from "./chronicle";
import { t as tr, type Lang, type Vars } from "./i18n";
import { missionText, type LevelDef } from "./levels";
import { tx, variantKeys } from "./tx";

/** The bits of RunStats the tale needs (kept structural so this module never imports the engine). */
export interface TaleStats {
  time: number;
  alerts: number;
}

type Tone = "ghost" | "shadow" | "messy" | "bloody" | "fallen";

interface Cast {
  /** kill missions: the target; steal missions: the item */
  who: string;
  /** what the pendekar was sent to do, after "to" / "untuk" */
  deed: string;
  /** the place the tale is set */
  region: string;
  /** where he gets away */
  exit: string;
}

/** Levels with a cast of their own (hikayat.cast.<id>.*); others fall back to the level's own objective text. */
function castFor(def: LevelDef, lang: Lang): Cast {
  const k = (part: string) => tx(lang, `hikayat.cast.${def.id}.${part}`, "");
  const who = k("who");
  if (who) return { who, deed: k("deed"), region: k("region"), exit: k("exit") };
  const obj = missionText(lang, def, "objective") ?? def.text.objective;
  return {
    who: tr(lang, def.objective.kind === "steal" ? "hikayat.cast.default.who.steal" : "hikayat.cast.default.who.kill"),
    deed: obj.charAt(0).toLowerCase() + obj.slice(1),
    region: missionText(lang, def, "name") ?? def.name,
    exit: tr(lang, "hikayat.cast.default.exit"),
  };
}

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

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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

/** Tell the tale of one attempt: 5 to 10 sentences, one paragraph, in `lang` (default Malay). */
export function tellHikayat(log: ChronicleData, def: LevelDef, stats: TaleStats, lang: Lang = "ms"): string {
  const r = rng(log.seed ^ hash(def.id));
  /** one dictionary entry */
  const S = (key: string, vars?: Vars) => tr(lang, key, vars);
  /** one of the numbered variants of `prefix`, by the seeded RNG */
  const pk = (prefix: string, vars?: Vars) => {
    const keys = variantKeys(lang, prefix);
    return tr(lang, keys[Math.floor(r() * keys.length)], vars);
  };
  const num = (n: number) => tx(lang, `hikayat.num.${n}`, String(n));
  const times = (n: number) => (n >= 1 && n <= 3 ? S(`hikayat.times.${n}`) : S("hikayat.times.n", { n: num(n) }));
  /** "a", "a and b", "a, b and c" */
  const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} ${S("hikayat.and")} ${xs[xs.length - 1]}`);
  const lowerable = new RegExp(`^(${S("hikayat.lowerable")})\\b`);

  const t = tally(log.events);
  const tone = toneOf(t, stats);
  const c = castFor(def, lang);
  const steal = def.objective.kind === "steal";
  const won = !!t.end?.won;
  const Who = cap(c.who);
  const killed = t.kills.silent + t.kills.air + t.kills.counter + t.kills.cut;

  /** body sentences, with a priority (lower is dropped first when the tale runs long) */
  const body: { p: number; s: string }[] = [];
  const say = (p: number, s: string) => body.push({ p, s });

  // ---- opening (always)
  const dusk = S(`hikayat.dusk.${def.id === "ledang" ? "ledang" : def.id === "jungle" ? "jungle" : "default"}`);
  const opening =
    t.from === "target"
      ? pk(`hikayat.open.target.${steal ? "steal" : "kill"}`, { who: c.who, exit: c.exit })
      : pk("hikayat.open.start", { deed: c.deed, dusk, region: c.region });

  // ---- the road taken
  const words = t.places.map((id) => tx(lang, `hikayat.place.${id}`, "")).filter((w) => w !== "");
  if (words.length >= 2) {
    const mid = words.slice(1, -1).slice(0, 2);
    const first = words[0];
    const last = words[words.length - 1];
    say(5, mid.length ? pk("hikayat.road.mid", { first, mid: list(mid), last }) : pk("hikayat.road.nomid", { first, last }));
  } else if (words.length === 1) {
    say(5, pk("hikayat.road.one", { place: words[0] }));
  }

  // ---- water and mounts
  const travel: string[] = [];
  if (t.swims) travel.push(t.dives ? pk("hikayat.travel.dive", { times: times(t.dives) }) : pk("hikayat.travel.swim"));
  if (t.boat) travel.push(pk("hikayat.travel.boat"));
  if (t.horse) travel.push(pk("hikayat.travel.horse"));
  if (travel.length) say(3, `${cap(list(travel))}.`);

  // ---- hiding
  if (t.hides || t.hidBodies) {
    const a = t.hides ? pk("hikayat.hide.a", { times: times(t.hides) }) : "";
    const b = t.hidBodies ? `${a ? S("hikayat.hide.join") : ""}${t.hidBodies === 1 ? S("hikayat.hide.body.1") : S("hikayat.hide.body.n", { n: num(t.hidBodies) })}` : "";
    say(2, `${cap(a + b)}.`);
  }

  // ---- tools
  const tools: string[] = [];
  if (t.stones) {
    const one = t.stones === 1;
    const n = num(t.stones);
    tools.push(t.stoneHeard ? (one ? S("hikayat.tool.stone.heard1") : S("hikayat.tool.stone.heardN", { n })) : one ? S("hikayat.tool.stone.quiet1") : S("hikayat.tool.stone.quietN", { n }));
  }
  if (t.pepper) {
    tools.push(t.blinded ? S("hikayat.tool.pepper.hit", { men: t.blinded === 1 ? S("hikayat.men.1") : S("hikayat.men.n", { n: num(t.blinded) }) }) : S("hikayat.tool.pepper.miss"));
  }
  if (t.knives) {
    const what =
      t.knifeHits === t.knives
        ? t.knives === 1
          ? S("hikayat.tool.knife.all1")
          : S("hikayat.tool.knife.allN", { n: num(t.knives) })
        : S("hikayat.tool.knife.some", { h: num(t.knifeHits), n: num(t.knives) });
    tools.push(t.knifeHits ? S("hikayat.tool.knife.hit", { what }) : S("hikayat.tool.knife.miss"));
  }
  if (tools.length) say(1, `${cap(list(tools))}.`);

  // ---- the fallen (merged by how they died)
  if (killed) {
    const parts: string[] = [];
    const k = t.kills;
    if (k.silent) parts.push(k.silent === 1 ? pk("hikayat.kill.silent1") : pk("hikayat.kill.silentN", { n: num(k.silent) }));
    if (k.air) parts.push(k.air === 1 ? pk("hikayat.kill.air1") : S("hikayat.kill.airN", { times: times(k.air) }));
    if (k.counter) parts.push(k.counter === 1 ? S("hikayat.kill.counter1") : S("hikayat.kill.counterN", { n: num(k.counter) }));
    if (k.cut) parts.push(k.cut === 1 ? pk("hikayat.kill.cut1") : pk("hikayat.kill.cutN", { n: num(k.cut) }));
    const lead = parts.length > 1 && killed >= 3 ? S("hikayat.kill.lead") : "";
    say(6, lead ? `${lead}${list(parts)}.` : `${cap(list(parts))}.`);
  } else if (won || tone !== "fallen") {
    say(6, steal || t.target || t.from === "target" ? pk("hikayat.nokill.task") : pk("hikayat.nokill.none"));
  }

  // ---- seen
  if (t.spotted) {
    const body2 = t.bodiesFound ? (t.bodiesFound === 1 ? S("hikayat.seen.body1") : S("hikayat.seen.bodyN", { times: times(t.bodiesFound) })) : "";
    const tgt = t.targetSpotted && !steal ? S("hikayat.seen.target", { Who }) : "";
    say(7, pk("hikayat.seen.v", { times: times(t.spotted), alarm: t.spotted === 1 ? S("hikayat.seen.alarm1") : S("hikayat.seen.alarmN"), body: body2 }) + tgt);
  }

  // ---- blood and steel
  if (t.nearDeath || t.wounds || t.parries) {
    const parts: string[] = [];
    if (t.parries) parts.push(t.parries === 1 ? S("hikayat.fight.parry1") : S("hikayat.fight.parryN", { n: num(t.parries) }));
    if (t.nearDeath) parts.push(won ? S("hikayat.fight.near.won") : S("hikayat.fight.near.lost"));
    else if (t.wounds) parts.push(t.wounds === 1 ? S("hikayat.fight.wound1") : S("hikayat.fight.woundN", { n: num(t.wounds) }));
    say(4, `${cap(list(parts))}.`);
  }

  // ---- the tangkal
  if (t.charm) say(2, pk("hikayat.charm", { charm: t.charm }));

  // ---- the deed
  if (t.from === "start" && (t.objectiveT !== null || t.target)) {
    const quick = t.objectiveT !== null && t.objectiveT < 120 ? pk("hikayat.quick") : "";
    if (steal) {
      say(8, stats.alerts > 0
        ? S("hikayat.deed.steal.alert", { Who, quick })
        : pk("hikayat.deed.steal.quiet", { Who, who: c.who, region: c.region, quick }));
    } else {
      const how = t.target?.how ?? "silent";
      say(8, how === "air"
        ? S("hikayat.deed.kill.air", { who: c.who, quick })
        : how === "silent"
          ? pk("hikayat.deed.kill.silent", { Who, who: c.who, quick })
          : S("hikayat.deed.kill.open", { Who, quick }));
    }
  }

  // ---- how it went (tone)
  const toneSay = () => say(won ? 4 : 8, pk(`hikayat.tone.${tone}`, { region: c.region }));

  if (won) toneSay();

  // ---- the end of it
  const mins = Math.max(1, Math.round(stats.time / 60));
  if (won) {
    const pace = stats.time < 180 ? S("hikayat.pace.0") : stats.time < 480 ? S("hikayat.pace.1") : S("hikayat.pace.2", { n: num(mins) });
    say(9, pk("hikayat.end.won", { exit: c.exit, pace }));
  } else {
    const where = words.length ? words[words.length - 1] : c.region;
    say(9, t.end?.reason === "slain"
      ? pk("hikayat.end.slain", { where })
      : t.end?.reason === "detected"
        ? S("hikayat.end.detected", { where })
        : S("hikayat.end.other", { where }));
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
    if (prevCon || r() > 0.45 || !lowerable.test(s)) {
      prevCon = false;
      continue;
    }
    const w = pool.splice(Math.floor(r() * pool.length), 1)[0];
    mids[i] = `${w} ${s.charAt(0).toLowerCase()}${s.slice(1)}`;
    prevCon = true;
  }

  const closing = pk(won ? "hikayat.closing.won" : "hikayat.closing.lost");
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
