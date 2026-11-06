"use client";

import { useState } from "react";
import { useT } from "./useT";
import { LANGS, type Lang } from "@/game/i18n";
import { LOOK_SENS_MAX, LOOK_SENS_MIN, hasProgress, updateSettings, type QualityPref, type SaveData, type SaveStore } from "@/game/save";

interface Props {
  store: SaveStore;
  save: SaveData;
  /** quality can only be swapped while no mission is running (it rebuilds the renderer) */
  canChangeQuality: boolean;
  /** ?quality=low|high in the URL: wins over the saved value for this session */
  urlQuality: string | null;
  onClose: () => void;
  /** offered from the title screen only: plays the intro cutscene again without changing the save */
  onReplayIntro?: () => void;
}

export default function SettingsPanel({ store, save, canChangeQuality, urlQuality, onClose, onReplayIntro }: Props) {
  const s = save.settings;
  const t = useT(s.lang);
  const [confirming, setConfirming] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const set = (patch: Partial<typeof s>) => store.update((d) => updateSettings(d, patch));

  return (
    <div className="overlay settings" role="dialog" aria-label={t("settings.title")}>
      <div className="panel">
        <h2>{t("settings.title")}</h2>

        <label className="row">
          <span>{t("lang.label")}</span>
          <select value={s.lang} onChange={(e) => set({ lang: e.target.value as Lang })} aria-label={t("lang.label")}>
            {LANGS.map((l) => (
              <option key={l} value={l}>
                {t(`lang.${l}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="row">
          <span>{t("settings.quality")}</span>
          <select
            value={s.quality}
            disabled={!canChangeQuality || !!urlQuality}
            onChange={(e) => set({ quality: e.target.value as QualityPref })}
            aria-label={t("settings.quality")}
          >
            <option value="auto">{t("settings.quality.auto")}</option>
            <option value="low">{t("settings.quality.low")}</option>
            <option value="high">{t("settings.quality.high")}</option>
          </select>
        </label>
        {urlQuality && <p className="dim small">{t("settings.quality.url", { q: urlQuality })}</p>}
        {!urlQuality && !canChangeQuality && <p className="dim small">{t("settings.quality.titleOnly")}</p>}

        <label className="row">
          <span>{t("settings.lookSens", { x: s.lookSens.toFixed(1) })}</span>
          <input
            type="range"
            min={LOOK_SENS_MIN}
            max={LOOK_SENS_MAX}
            step={0.1}
            value={s.lookSens}
            onChange={(e) => set({ lookSens: Number(e.target.value) })}
            aria-label={t("settings.lookSens.aria")}
          />
        </label>
        <label className="row">
          <span>{t("settings.invertY")}</span>
          <input type="checkbox" checked={s.invertY} onChange={(e) => set({ invertY: e.target.checked })} aria-label={t("settings.invertY")} />
        </label>

        <label className="row">
          <span>{t("settings.reduceShake")}</span>
          <input type="checkbox" checked={s.reduceShake} onChange={(e) => set({ reduceShake: e.target.checked })} aria-label={t("settings.reduceShake.aria")} />
        </label>

        {onReplayIntro && (
          <button className="btn ghost" onClick={onReplayIntro}>
            {t("settings.replayIntro")}
          </button>
        )}

        <details className="codebox">
          <summary>{t("settings.backup")}</summary>
          <textarea value={code} onChange={(e) => setCode(e.target.value)} rows={3} placeholder={t("settings.saveCode")} aria-label={t("settings.saveCode")} spellCheck={false} />
          <div>
            <button className="btn ghost sm" onClick={() => (setCode(store.exportCode()), setMsg(t("settings.codeReady")))}>
              {t("settings.export")}
            </button>
            <button className="btn ghost sm" onClick={() => setMsg(store.importFrom(code) ? t("settings.imported") : t("settings.codeInvalid"))}>
              {t("settings.import")}
            </button>
          </div>
        </details>
        {msg && (
          <p className="small" role="status">
            {msg}
          </p>
        )}

        {confirming ? (
          <div className="confirm" role="alertdialog" aria-label={t("settings.confirm.aria")}>
            <p>{t("settings.confirm.text")}</p>
            <button
              className="btn danger"
              onClick={() => {
                store.reset();
                setConfirming(false);
                setMsg(t("settings.resetDone"));
              }}
            >
              {t("settings.confirm.yes")}
            </button>
            <button className="btn ghost" onClick={() => setConfirming(false)}>
              {t("common.cancel")}
            </button>
          </div>
        ) : (
          <button className="btn ghost" onClick={() => setConfirming(true)} disabled={!hasProgress(save) && Object.keys(save.missions).length === 0}>
            {t("settings.reset")}
          </button>
        )}
        <p className="dim small">{t("settings.savedNote")}</p>
        <button className="btn" onClick={onClose}>
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}
