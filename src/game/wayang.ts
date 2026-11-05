// Wayang kulit: one mission told again by the dalang as a shadow play. Plain data and helpers, no three.js, so the
// UI can import it too. The look itself (ink silhouettes on a lit kelir) is in wayangLook.ts, used by the engine only.
import type { Vec2 } from "./logic";

/** A mission played as a shadow play: the blencong (oil lamps behind the kelir) and how far each one throws light. */
export interface WayangDef {
  lamps: Vec2[];
  /** metres from a blencong within which the player's shadow lands on the screen */
  r: number;
}

/** In the lamp's light, guards see further and quicker: range and rate multipliers at full closeness. */
export const SHADOW = { range: 0.5, rate: 1.4 };

/** How far the player's shadow is "on the screen": 0 out of every lamp's light, up to 1 right under a blencong. */
export function shadowOnScreen(w: WayangDef | undefined, p: Vec2, hidden: boolean): number {
  if (!w || hidden) return 0;
  let k = 0;
  for (const l of w.lamps) k = Math.max(k, 1 - Math.hypot(p.x - l.x, p.z - l.z) / w.r);
  return Math.max(0, Math.min(1, k));
}

/** Guard vision while the player's shadow is on the screen (k from shadowOnScreen): a longer reach and a faster meter. */
export function shadowVision<V extends { range: number; halfAngle: number }>(vis: V, k: number): V & { rate: number } {
  if (k <= 0) return { ...vis, rate: 1 };
  return { ...vis, range: vis.range * (1 + SHADOW.range * k), rate: 1 + SHADOW.rate * k };
}

/** The nearest blencong to a point (null without lamps). */
export function nearestLamp(w: WayangDef | undefined, p: Vec2): Vec2 | null {
  if (!w?.lamps.length) return null;
  return w.lamps.reduce((a, b) => (Math.hypot(b.x - p.x, b.z - p.z) < Math.hypot(a.x - p.x, a.z - p.z) ? b : a));
}

export type DalangCue = "begin" | "resume" | "checkpoint" | "spotted" | "body" | "kill" | "shadow" | "escape";

/** What the dalang says, by cue. Each list is said in turn, so a line does not come back until the others have. */
const LINES: Record<DalangCue, string[]> = {
  begin: [
    "The blencong is lit, the gamelan wakes. Listen: this is the Hikayat of the night the battery fell silent.",
    "Hear me, children of the kampung. Behind this kelir walks a Pendekar with a keris and no name.",
  ],
  resume: ["The dalang lifts the puppet again where he left it. The Kapitan already lies still; now the Pendekar must get away."],
  checkpoint: [
    "The gong sounds once. The Kapitan is cut from the tale, and his shadow leaves the screen.",
    "So falls the Kapitan, as a puppet falls when the dalang lets go of the rods.",
  ],
  spotted: [
    "Ah! A shadow too large for the kelir. The guards have seen him.",
    "The kendang beats faster. Someone has seen what moves behind the screen.",
    "Too close to the lamp, Pendekar. Your shadow told them where you stood.",
  ],
  body: ["A body on the screen, and a guard who will not stay silent about it."],
  kill: [
    "Another puppet laid down on the banana trunk. The tale grows darker.",
    "The dalang sighs. That one had a mother in Goa, they say.",
    "Blood on the kelir is hard to wash off, little ones.",
    "The audience goes quiet. This Pendekar does not spare many.",
  ],
  shadow: [
    "Careful. Near the blencong, a small man throws a giant's shadow.",
    "The lamp is close. The whole kampung can see your shape on the screen.",
  ],
  escape: ["Now to the jetty, quick as the kancil, before the lamp burns low."],
};

/** The tale's three endings, chosen by how it was played. */
export const ENDINGS = {
  ghost: {
    title: "The tale of the shadow no one saw",
    body:
      "\"And not one guard saw him,\" says the dalang, \"not on the screen, not in the lanes.\" He lays the Pendekar down beside the " +
      "Kapitan and blows out the blencong. The children argue all the way home whether he was ever there at all.",
  },
  merciful: {
    title: "The tale of the Pendekar who was seen",
    body:
      "\"They saw him, and still he spared them,\" says the dalang. The gamelan slows; the Kapitan alone is laid down. The old men " +
      "nod: a keris that knows when to stay in its sheath is the sharper blade.",
  },
  bloody: {
    title: "The tale the dalang would rather not tell",
    body:
      "The screen is crowded with fallen puppets when the gong sounds. \"The battery was silenced,\" the dalang says at last, " +
      "\"and so was half the harbour.\" No one asks for this Hikayat again.",
  },
} as const;

/** More kills than this (the target aside) make the bloody tale. */
export const BLOODY_KILLS = 3;

/** Which ending a finished run earns: unseen and sparing is the ghost tale, many kills the bloody one, else merciful. */
export function endingFor(kills: number, alerts: number): keyof typeof ENDINGS {
  if (kills >= BLOODY_KILLS) return "bloody";
  return alerts === 0 ? "ghost" : "merciful";
}

/**
 * The dalang: narration lines in the subtitle style, and a count of the Pendekar's kills for the ending.
 * Silent (and harmless to call) on any mission that is not a shadow play.
 */
export class Dalang {
  private on = false;
  private kills = 0;
  private turn: Partial<Record<DalangCue, number>> = {};
  private text = "";
  private t = 0;
  /** seconds before another "shadow on the screen" warning */
  private shadowCd = 0;
  private wasLit = false;
  /** the line to say once the current one is done (the run for the jetty, after the checkpoint) */
  private next: DalangCue | null = null;

  /** A new attempt: from the beginning, or from the checkpoint with the target already down. */
  begin(active: boolean, fromCheckpoint: boolean) {
    this.on = active;
    this.kills = 0;
    this.text = "";
    this.t = 0;
    this.shadowCd = 8;
    this.wasLit = false;
    this.next = null;
    if (active) this.cue(fromCheckpoint ? "resume" : "begin");
  }

  cue(kind: DalangCue) {
    if (!this.on) return;
    if (kind === "kill") this.kills++;
    if (kind === "checkpoint") this.next = "escape";
    const list = LINES[kind];
    const i = this.turn[kind] ?? 0;
    this.turn[kind] = i + 1;
    const line = list[i % list.length];
    // a kill line waits for a louder line (spotted, checkpoint) that is still being said
    if (kind === "kill" && this.t > 1.5) return;
    this.text = line;
    this.t = 3 + line.length * 0.045;
  }

  /** Once a frame: time the line out, and warn the first time a while that the player's shadow is on the screen. */
  tick(dt: number, shadow: number) {
    if (!this.on) return;
    this.t = Math.max(0, this.t - dt);
    this.shadowCd = Math.max(0, this.shadowCd - dt);
    if (this.t <= 0 && this.next) {
      const n = this.next;
      this.next = null;
      this.cue(n);
    }
    const lit = shadow > 0.35;
    if (lit && !this.wasLit && this.shadowCd <= 0 && this.t <= 0) {
      this.cue("shadow");
      this.shadowCd = 30;
    }
    this.wasLit = lit;
  }

  /** The line being said now ("" when he is quiet). */
  get line(): string {
    return this.on && this.t > 0 ? this.text : "";
  }

  /** The win screen's title and body for this run, or null when this is not a shadow play. */
  ending(alerts: number): { title: string; body: string } | null {
    return this.on ? ENDINGS[endingFor(this.kills, alerts)] : null;
  }
}
