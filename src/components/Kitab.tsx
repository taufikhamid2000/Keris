"use client";

import { memo } from "react";
import { AMULETS } from "@/game/amulets";
import { charmLore, CHARM_META, missionLore, PLACES, placeText } from "@/game/kitab";
import type { KitabKind, Sumber } from "@/game/kitab";
import { LEVELS, missionText } from "@/game/levels";
import { ghaibPages } from "@/game/ghaib";
import type { SaveData } from "@/game/save";
import { pantunPages } from "@/game/pantun";
import type { Lang } from "@/game/i18n";
import { useT } from "./useT";

interface Page {
  key: string;
  open: boolean;
  title: string;
  text: string;
  hint: string;
  kind?: KitabKind;
  sumber?: Sumber[];
}

type T = ReturnType<typeof useT>;

function Section({ id, pages, t }: { id: string; pages: Page[]; t: T }) {
  const n = pages.filter((p) => p.open).length;
  return (
    <div className="kitab-sec">
      <h3>
        {t(`kitab.sec.${id}.name`)}{" "}
        <span className="dim small">
          {t(`kitab.sec.${id}.sub`)} · {t("kitab.count", { n, total: pages.length })}
        </span>
      </h3>
      <ul>
        {pages.map((p) => (
          <li key={p.key} className={`page${p.open ? "" : " missing"}`}>
            <b>{p.open ? p.title : t("kitab.notWritten")}</b>
            {p.open && p.kind && (
              <span className={`kind kind-${p.kind}`} title={t(`kitab.kindNote.${p.kind}`)}>
                {t(`kitab.kind.${p.kind}`)}
              </span>
            )}
            <span className="small">{p.open ? p.text : p.hint}</span>
            {p.open && p.sumber && p.sumber.length > 0 && (
              <span className="small sumber">
                {t("kitab.sumber")}:{" "}
                {p.sumber.map((r, i) => (
                  <span key={i}>
                    {i > 0 && "; "}
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noreferrer noopener">
                        {r.label}
                      </a>
                    ) : (
                      r.label
                    )}
                  </span>
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The journal: places reached, tangkal found and missions completed, each with a page of its own. `lang` defaults to Malay. */
export default memo(function Kitab({ save, lang = "ms" }: { save: SaveData; lang?: Lang }) {
  const t = useT(lang);
  const places: Page[] = PLACES.map((p) => ({ key: p.id, open: save.kitab.includes(p.id), ...placeText(lang, p), kind: p.kind, sumber: p.sumber }));
  const charms: Page[] = AMULETS.map((a) => {
    const level = LEVELS.find((l) => l.id === a.level);
    return {
      key: a.id,
      open: save.amulets.includes(a.id),
      title: a.name,
      text: charmLore(lang, a.id) ?? t(`amulet.${a.id}.desc`),
      kind: CHARM_META[a.id]?.kind,
      sumber: CHARM_META[a.id]?.sumber,
      hint: level ? t("kitab.hint.charm", { level: missionText(lang, level, "name") ?? level.name }) : t("kitab.hint.charmAny"),
    };
  });
  const tales: Page[] = LEVELS.map((l) => {
    const lore = missionLore(lang, l.id);
    const name = missionText(lang, l, "name") ?? l.name;
    return { key: l.id, open: !!save.missions[l.missionId]?.completed, title: lore?.title ?? name, text: lore?.text ?? missionText(lang, l, "winBody") ?? l.win.body, kind: lore?.kind, sumber: lore?.sumber, hint: t("kitab.hint.mission", { level: name }) };
  });
  const pantun: Page[] = pantunPages(save.pantun, lang);
  const ghaib: Page[] = ghaibPages(save, lang);
  const all = [...places, ...charms, ...tales, ...pantun, ...ghaib];
  return (
    <div className="kitab">
      <p className="points">
        <b>{all.filter((p) => p.open).length}</b> {t("kitab.pagesOf", { total: all.length })}
      </p>
      <Section id="places" pages={places} t={t} />
      <Section id="charms" pages={charms} t={t} />
      <Section id="tales" pages={tales} t={t} />
      <Section id="pantun" pages={pantun} t={t} />
      <Section id="ghaib" pages={ghaib} t={t} />
    </div>
  );
});
