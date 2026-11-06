"use client";

import { memo } from "react";
import { AMULETS } from "@/game/amulets";
import { CHARM_LORE, CHARM_META, MISSION_LORE, PLACES } from "@/game/kitab";
import type { KitabKind, Sumber } from "@/game/kitab";
import { LEVELS } from "@/game/levels";
import { ghaibPages } from "@/game/ghaib";
import type { SaveData } from "@/game/save";
import { pantunPages } from "@/game/pantun";

interface Page {
  key: string;
  open: boolean;
  title: string;
  text: string;
  hint: string;
  kind?: KitabKind;
  sumber?: Sumber[];
}

// One local map so the labels can be swapped for t() later.
const KIND_LABEL: Record<KitabKind, string> = { fakta: "Fakta", legenda: "Legenda", rekaan: "Rekaan" };
const KIND_NOTE: Record<KitabKind, string> = { fakta: "Sejarah yang disahkan sumber", legenda: "Cerita lisan, bukan sejarah terjamin", rekaan: "Rekaan untuk permainan" };
const SUMBER_LABEL = "Sumber";

function Section({ name, sub, pages }: { name: string; sub: string; pages: Page[] }) {
  const n = pages.filter((p) => p.open).length;
  return (
    <div className="kitab-sec">
      <h3>
        {name}{" "}
        <span className="dim small">
          {sub} · {n} of {pages.length}
        </span>
      </h3>
      <ul>
        {pages.map((p) => (
          <li key={p.key} className={`page${p.open ? "" : " missing"}`}>
            <b>{p.open ? p.title : "Not written yet"}</b>
            {p.open && p.kind && (
              <span className={`kind kind-${p.kind}`} title={KIND_NOTE[p.kind]}>
                {KIND_LABEL[p.kind]}
              </span>
            )}
            <span className="small">{p.open ? p.text : p.hint}</span>
            {p.open && p.sumber && p.sumber.length > 0 && (
              <span className="small sumber">
                {SUMBER_LABEL}:{" "}
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

/** The journal: places reached, tangkal found and missions completed, each with a page of its own. */
export default memo(function Kitab({ save }: { save: SaveData }) {
  const places: Page[] = PLACES.map((p) => ({ key: p.id, open: save.kitab.includes(p.id), title: p.title, text: p.text, hint: p.hint, kind: p.kind, sumber: p.sumber }));
  const charms: Page[] = AMULETS.map((a) => {
    const level = LEVELS.find((l) => l.id === a.level);
    return { key: a.id, open: save.amulets.includes(a.id), title: a.name, text: CHARM_LORE[a.id] ?? a.desc, kind: CHARM_META[a.id]?.kind, sumber: CHARM_META[a.id]?.sumber, hint: `Hidden on ${level?.name ?? "a mission"}` };
  });
  const tales: Page[] = LEVELS.map((l) => {
    const lore = MISSION_LORE[l.id];
    return { key: l.id, open: !!save.missions[l.missionId]?.completed, title: lore?.title ?? l.name, text: lore?.text ?? l.win.body, kind: lore?.kind, sumber: lore?.sumber, hint: `Complete ${l.name}` };
  });
  const pantun: Page[] = pantunPages(save.pantun);
  const ghaib: Page[] = ghaibPages(save);
  const all = [...places, ...charms, ...tales, ...pantun, ...ghaib];
  return (
    <div className="kitab">
      <p className="points">
        <b>{all.filter((p) => p.open).length}</b> of {all.length} pages written
      </p>
      <Section name="Tempat" sub="Places reached" pages={places} />
      <Section name="Tangkal" sub="Amulets found" pages={charms} />
      <Section name="Hikayat" sub="Missions completed" pages={tales} />
      <Section name="Pantun" sub="Passwords overheard" pages={pantun} />
      <Section name="Ghaib" sub="The unseen" pages={ghaib} />
    </div>
  );
});
