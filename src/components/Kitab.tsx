"use client";

import { AMULETS } from "@/game/amulets";
import { CHARM_LORE, MISSION_LORE, PLACES } from "@/game/kitab";
import { LEVELS } from "@/game/levels";
import type { SaveData } from "@/game/save";
import { pantunPages } from "@/game/pantun";

interface Page {
  key: string;
  open: boolean;
  title: string;
  text: string;
  hint: string;
}

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
            <span className="small">{p.open ? p.text : p.hint}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The journal: places reached, tangkal found and missions completed, each with a page of its own. */
export default function Kitab({ save }: { save: SaveData }) {
  const places: Page[] = PLACES.map((p) => ({ key: p.id, open: save.kitab.includes(p.id), title: p.title, text: p.text, hint: p.hint }));
  const charms: Page[] = AMULETS.map((a) => {
    const level = LEVELS.find((l) => l.id === a.level);
    return { key: a.id, open: save.amulets.includes(a.id), title: a.name, text: CHARM_LORE[a.id] ?? a.desc, hint: `Hidden on ${level?.name ?? "a mission"}` };
  });
  const tales: Page[] = LEVELS.map((l) => {
    const lore = MISSION_LORE[l.id];
    return { key: l.id, open: !!save.missions[l.missionId]?.completed, title: lore?.title ?? l.name, text: lore?.text ?? l.win.body, hint: `Complete ${l.name}` };
  });
  const pantun: Page[] = pantunPages(save.pantun);
  const all = [...places, ...charms, ...tales, ...pantun];
  return (
    <div className="kitab">
      <p className="points">
        <b>{all.filter((p) => p.open).length}</b> of {all.length} pages written
      </p>
      <Section name="Tempat" sub="Places reached" pages={places} />
      <Section name="Tangkal" sub="Amulets found" pages={charms} />
      <Section name="Hikayat" sub="Missions completed" pages={tales} />
      <Section name="Pantun" sub="Passwords overheard" pages={pantun} />
    </div>
  );
}
