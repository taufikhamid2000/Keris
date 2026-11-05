/**
 * Dua pemain, the pendekar's side: hosts a room, broadcasts the Kapitan's view ~5 times a second,
 * and checks every command (one Kapitan per room, rate limit, limits and cooldowns) before the
 * engine acts on it. If the link drops, the game simply carries on alone.
 */
import { KAPITAN, KapitanRules, makeRoomCode, parseCmd, type KapitanCmd, type KapitanWorld } from "./kapitan";
import { RoomLink, type KapitanConfig, type LinkStatus } from "./kapitanNet";

/** The parts of Game the host needs (kept structural so this module stays free of three.js). */
export interface KapitanGame {
  kapitanSnapshot(): KapitanWorld;
  addLantern(x: number, z: number): boolean;
  sendGuard(id: number, x: number, z: number): boolean;
  soundAlarm(): number;
}

export interface HostView {
  code: string;
  status: LinkStatus;
  /** the last thing the Kapitan did, for the pendekar's status chip */
  last: string;
}

const okText: Record<KapitanCmd["k"], string> = {
  lantern: "The Kapitan lit a pelita",
  send: "The Kapitan sent a guard",
  alarm: "The Kapitan beat the kentung",
};

export class HostSession {
  readonly code = makeRoomCode();
  private link: RoomLink;
  private game: KapitanGame | null = null;
  private rules = new KapitanRules();
  private kapitan: string | null = null;
  private kapitanAt = 0;
  private pump: ReturnType<typeof setInterval>;
  private view: HostView;
  private subs = new Set<() => void>();
  private lastT: ReturnType<typeof setTimeout> | null = null;

  constructor(cfg: KapitanConfig) {
    this.view = { code: this.code, status: "connecting", last: "" };
    this.link = new RoomLink(cfg, {
      code: this.code,
      onMessage: (e, p) => this.onMessage(e, p),
      onStatus: (status) => this.set({ status }),
    });
    this.pump = setInterval(() => this.broadcast(), 1000 / KAPITAN.snapHz);
  }

  subscribe = (cb: () => void) => {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  };
  getView = () => this.view;

  setGame(g: KapitanGame | null) {
    this.game = g;
  }

  /** Tell the Kapitan the session is over and leave the room. */
  end() {
    clearInterval(this.pump);
    this.link.send("end", {});
    // give the goodbye a moment on the wire before the socket closes
    setTimeout(() => this.link.close(), 300);
  }

  private set(p: Partial<HostView>) {
    this.view = { ...this.view, ...p };
    this.subs.forEach((cb) => cb());
  }

  private broadcast() {
    const g = this.game;
    if (!g) return;
    const w = g.kapitanSnapshot();
    this.rules.sync(w.epoch);
    this.link.send("snap", { ...w, powers: this.rules.powers(w.t) });
  }

  private note(text: string) {
    if (this.kapitan) this.link.send("note", { to: this.kapitan, text });
  }

  private onMessage(event: string, p: Record<string, unknown>) {
    const from = typeof p.from === "string" && p.from.length <= 40 ? p.from : null;
    if (!from) return;
    const now = Date.now();
    // first Kapitan in wins the seat; another may take it once he has been quiet a while
    if (from !== this.kapitan && (event !== "hello" || (this.kapitan && now - this.kapitanAt < KAPITAN.peerTimeout * 1000))) {
      if (event === "hello" || event === "cmd") this.link.send("note", { to: from, text: "Another Kapitan already holds this room." });
      return;
    }
    if (event === "bye") {
      this.kapitan = null;
      this.kapitanAt = 0;
      return;
    }
    this.kapitan = from;
    this.kapitanAt = now;
    this.link.markPeer();
    if (event !== "cmd") return;
    const g = this.game;
    const c = parseCmd(p.c);
    if (!g || !c) return;
    if (!this.rules.allow(now / 1000)) return this.note("Too many orders at once. Wait a moment.");
    const w = g.kapitanSnapshot();
    this.rules.sync(w.epoch);
    const why = this.rules.check(c, w.t, w.phase);
    if (why) return this.note(why);
    const ok = c.k === "lantern" ? g.addLantern(c.x, c.z) : c.k === "send" ? g.sendGuard(c.id, c.x, c.z) : g.soundAlarm() > 0;
    if (!ok) {
      return this.note(
        c.k === "lantern"
          ? `A pelita cannot go there (inside the map, ${KAPITAN.lanternGap} m from another).`
          : c.k === "send"
            ? "That guard cannot be sent now (down, stunned or already in a fight)."
            : "No guard is free to hear the kentung.",
      );
    }
    this.rules.commit(c, w.t);
    this.set({ last: okText[c.k] });
    if (this.lastT) clearTimeout(this.lastT);
    this.lastT = setTimeout(() => this.set({ last: "" }), 4000);
    this.note(c.k === "lantern" ? "Pelita lit." : c.k === "send" ? "The guard goes to look." : "The kentung sounds. Every guard is on edge.");
    this.broadcast();
  }
}
