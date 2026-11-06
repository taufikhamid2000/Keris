"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Game, Phase } from "@/game/engine";
import { kapitanConfig, type LinkStatus } from "@/game/kapitanNet";
import { HostSession, type HostView } from "@/game/kapitanHost";
import css from "./kapitan.module.css";
import { useT } from "./useT";
import { useLang } from "./useLang";

/** Dua pemain, the pendekar's side: the title-screen button, the room card and the status chip. Hidden without Supabase config. */
const CFG = kapitanConfig();

interface Store {
  session: HostSession | null;
  view: HostView | null;
  open: boolean;
}
const NONE: Store = { session: null, view: null, open: false };
// one session per tab, shared by the button and the panel
let store: Store = NONE;
let offSession: (() => void) | null = null;
const subs = new Set<() => void>();
const subscribe = (cb: () => void) => {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
};
const getStore = () => store;
const set = (p: Partial<Store>) => {
  store = { ...store, ...p };
  subs.forEach((cb) => cb());
};

function host() {
  if (!CFG) return;
  if (!store.session) {
    const s = new HostSession(CFG);
    offSession = s.subscribe(() => set({ view: s.getView() }));
    set({ session: s, view: s.getView(), open: true });
  } else set({ open: true });
}
function endSession() {
  store.session?.end();
  offSession?.();
  offSession = null;
  set({ session: null, view: null, open: false });
}

/** Dictionary key of each link status, as the pendekar sees it */
export const STATUS_KEY: Record<LinkStatus, string> = {
  connecting: "kapitan.host.status.connecting",
  waiting: "kapitan.host.status.waiting",
  connected: "kapitan.host.status.connected",
  lost: "kapitan.host.status.lost",
  closed: "kapitan.host.status.closed",
};

/** "Dua pemain" on the title menu: hosts a room, or shows its card again. */
export function DuaPemainButton({ disabled = false }: { disabled?: boolean }) {
  const t = useT(useLang());
  const s = useSyncExternalStore(subscribe, getStore, () => NONE);
  if (!CFG) return null;
  return (
    <button className={`btn ghost${s.open ? " on" : ""}`} onClick={() => (s.open ? set({ open: false }) : host())} disabled={disabled}>
      {t("kapitan.title")}
    </button>
  );
}

/** The room card (title screen) and the small connection chip (in play and on menus). */
export function KapitanHostPanel({ game, phase }: { game: Game | null; phase: Phase }) {
  const t = useT(useLang());
  const s = useSyncExternalStore(subscribe, getStore, () => NONE);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    s.session?.setGame(game);
    return () => s.session?.setGame(null);
  }, [s.session, game]);
  if (!CFG || !s.session || !s.view) return null;
  const v = s.view;
  const link = `${window.location.origin}/kapitan?room=${v.code}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* no clipboard: the link is selectable */
    }
  };
  if (s.open && phase === "title") {
    return (
      <div className={css.card} role="dialog" aria-label={t("kapitan.title")}>
        <h3>{t("kapitan.title")}</h3>
        <p>{t("kapitan.host.desc")}</p>
        <p className="small dim">{t("kapitan.host.link")}</p>
        <div className={css.code}>{v.code}</div>
        <span className={css.link}>{link}</span>
        <p className={css.status}>
          <i className={`${css.dot} ${css[v.status]}`} /> {t(STATUS_KEY[v.status])}
        </p>
        <div className={css.row}>
          <button className="btn ghost sm" onClick={copy}>
            {copied ? t("kapitan.host.copied") : t("kapitan.host.copy")}
          </button>
          <button className="btn ghost sm" onClick={() => set({ open: false })}>
            {t("kapitan.host.hide")}
          </button>
          <button className="btn danger sm" onClick={endSession}>
            {t("kapitan.host.end")}
          </button>
        </div>
      </div>
    );
  }
  const menu = phase !== "playing" && phase !== "intro";
  if (phase === "intro") return null;
  return (
    <div className={`${css.chip}${menu ? ` ${css.menu}` : ""}`} aria-live="polite">
      <i className={`${css.dot} ${css[v.status]}`} />
      <span>
        {t("kapitan.host.chip", { code: v.code, status: t(STATUS_KEY[v.status]) })}
        {phase === "playing" && v.last ? ` · ${v.last}` : ""}
      </span>
      {menu && (
        <button className="btn danger sm" onClick={endSession}>
          {t("kapitan.host.endShort")}
        </button>
      )}
    </div>
  );
}
