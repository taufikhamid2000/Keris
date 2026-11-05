/**
 * Dua pemain transport: a minimal Phoenix-channel client for Supabase Realtime broadcast
 * (the realtime-js wire protocol, vsn 1.0.0) over the project's public websocket. Broadcast only:
 * no tables, no database writes. Config comes from NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY; without both the feature is hidden (kapitanConfig() is null).
 */
import { KAPITAN } from "./kapitan";

export interface KapitanConfig {
  url: string;
  key: string;
}

/** The Supabase project to talk through, or null when two-player mode is not set up on this deploy. */
export function kapitanConfig(): KapitanConfig | null {
  // literal reads, so Next inlines them into the client bundle
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !/^https?:\/\//.test(url)) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

/**
 * connecting: no channel yet. waiting: in the room, the other player has not shown up.
 * connected: the other player was heard from recently. lost: they (or the socket) went quiet. closed: ended.
 */
export type LinkStatus = "connecting" | "waiting" | "connected" | "lost" | "closed";

export interface RoomLinkOpts {
  code: string;
  onMessage: (event: string, payload: Record<string, unknown>) => void;
  onStatus: (s: LinkStatus) => void;
}

const HEARTBEAT_MS = 25_000;

/** One broadcast channel per room ("keris-ABCD"); reconnects on its own until close(). */
export class RoomLink {
  private ws: WebSocket | null = null;
  private ref = 0;
  private joinRef = "";
  private joined = false;
  private closed = false;
  private lastPeer = 0;
  private status: LinkStatus = "connecting";
  private hb: ReturnType<typeof setInterval> | null = null;
  private watch: ReturnType<typeof setInterval>;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private retryMs = 1000;
  private readonly topic: string;

  constructor(
    private cfg: KapitanConfig,
    private opts: RoomLinkOpts,
  ) {
    this.topic = `realtime:keris-${opts.code}`;
    this.connect();
    this.watch = setInterval(() => this.refresh(), 1000);
  }

  /** The other player was heard from (the caller decides which messages count). */
  markPeer() {
    this.lastPeer = Date.now();
    this.refresh();
  }

  /** Broadcast to the room; false when not in the channel right now (the message is dropped). */
  send(event: string, payload: Record<string, unknown>): boolean {
    if (!this.joined || !this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.push(this.topic, "broadcast", { type: "broadcast", event, payload }, this.joinRef);
    return true;
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.watch);
    if (this.hb) clearInterval(this.hb);
    if (this.retry) clearTimeout(this.retry);
    const ws = this.ws;
    this.ws = null;
    this.joined = false;
    try {
      if (ws && ws.readyState === WebSocket.OPEN) this.pushOn(ws, this.topic, "phx_leave", {}, this.joinRef);
      ws?.close();
    } catch {
      /* already gone */
    }
    this.setStatus("closed");
  }

  private connect() {
    if (this.closed) return;
    const base = this.cfg.url.replace(/^http/, "ws");
    let ws: WebSocket;
    try {
      ws = new WebSocket(`${base}/realtime/v1/websocket?apikey=${encodeURIComponent(this.cfg.key)}&vsn=1.0.0`);
    } catch {
      this.scheduleRetry();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.retryMs = 1000;
      this.joinRef = String(++this.ref);
      this.pushOn(
        ws,
        this.topic,
        "phx_join",
        { config: { broadcast: { self: false, ack: false }, presence: { key: "" }, postgres_changes: [], private: false }, access_token: this.cfg.key },
        this.joinRef,
      );
      if (this.hb) clearInterval(this.hb);
      this.hb = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) this.pushOn(ws, "phoenix", "heartbeat", {});
      }, HEARTBEAT_MS);
    };
    ws.onmessage = (e) => this.receive(e.data);
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.joined = false;
      if (this.hb) clearInterval(this.hb);
      this.hb = null;
      this.refresh();
      this.scheduleRetry();
    };
    ws.onerror = () => {
      /* onclose follows */
    };
  }

  private scheduleRetry() {
    if (this.closed || this.retry) return;
    this.retry = setTimeout(() => {
      this.retry = null;
      this.connect();
    }, this.retryMs);
    this.retryMs = Math.min(10_000, this.retryMs * 2);
  }

  private receive(data: unknown) {
    if (typeof data !== "string" || data.length > 64_000) return;
    let m: { topic?: string; event?: string; payload?: Record<string, unknown>; ref?: string | null };
    try {
      m = JSON.parse(data);
    } catch {
      return;
    }
    if (!m || m.topic !== this.topic) return;
    const p = m.payload ?? {};
    if (m.event === "phx_reply" && m.ref === this.joinRef) {
      if (p.status === "ok") {
        this.joined = true;
        this.refresh();
      } else this.ws?.close();
    } else if (m.event === "phx_error" || m.event === "phx_close") {
      // the server dropped the channel: start over on a fresh socket
      this.joined = false;
      this.ws?.close();
    } else if (m.event === "broadcast" && typeof p.event === "string" && p.payload && typeof p.payload === "object") {
      this.opts.onMessage(p.event, p.payload as Record<string, unknown>);
    }
  }

  private push(topic: string, event: string, payload: unknown, joinRef?: string) {
    if (this.ws) this.pushOn(this.ws, topic, event, payload, joinRef);
  }

  private pushOn(ws: WebSocket, topic: string, event: string, payload: unknown, joinRef?: string) {
    try {
      ws.send(JSON.stringify({ topic, event, payload, ref: String(++this.ref), ...(joinRef ? { join_ref: joinRef } : {}) }));
    } catch {
      /* socket closing; onclose reconnects */
    }
  }

  private refresh() {
    if (this.closed) return;
    const fresh = this.lastPeer > 0 && Date.now() - this.lastPeer < KAPITAN.peerTimeout * 1000;
    const s: LinkStatus = !this.joined ? (this.lastPeer ? "lost" : "connecting") : fresh ? "connected" : this.lastPeer ? "lost" : "waiting";
    this.setStatus(s);
  }

  private setStatus(s: LinkStatus) {
    if (s === this.status) return;
    this.status = s;
    this.opts.onStatus(s);
  }
}

/** A short random id for one browser tab in a room. */
export const peerId = () => Math.random().toString(36).slice(2, 10);
