import { describe, expect, it } from "vitest";
import { barkLines, idleLines, type BarkKind } from "./barks";
import { killHowFromToast, type ChronEvent } from "./chronicle";
import { DICTS, LANGS, type Lang } from "./i18n";
import { charmLore, missionLore, placeText, PLACES } from "./kitab";
import { tellHikayat } from "./hikayat";
import { LEVELS } from "./levels";
import { ghaibPages, judge } from "./ghaib";
import { defaultSave } from "./save";
import { pantunPages } from "./pantun";
import { AMULETS, amuletDesc } from "./amulets";
import { SKILLS, skillDesc } from "./skills";
import { variantKeys } from "./tx";

const KINDS: BarkKind[] = ["idle", "suspicious", "alert", "search", "giveup", "body", "blind", "stunned"];

describe("story strings", () => {
  it("numbered variants have the same count in both languages", () => {
    const count = (d: Record<string, string>) => {
      const m: Record<string, number> = {};
      for (const k of Object.keys(d)) {
        const mm = /^(.*)\.(\d+)$/.exec(k);
        if (mm) m[mm[1]] = (m[mm[1]] ?? 0) + 1;
      }
      return m;
    };
    expect(count(DICTS.en)).toEqual(count(DICTS.ms));
  });

  it("every guard has chatter for every kind, in both languages", () => {
    for (const lang of LANGS) {
      for (const lv of LEVELS) for (const k of KINDS) expect(barkLines(lv.id, k, lang).length, `${lv.id} ${k} ${lang}`).toBeGreaterThan(0);
      expect(idleLines("kota", lang).length).toBeGreaterThan(idleLines("harbour", lang).length - 5);
    }
    expect(barkLines("harbour", "alert", "ms")).not.toEqual(barkLines("harbour", "alert", "en"));
    expect(variantKeys("en", "bark.nothing")).toEqual([]);
  });

  it("every place, tangkal, mission and skill has wording in both languages", () => {
    for (const lang of LANGS as readonly Lang[]) {
      for (const p of PLACES) {
        const x = placeText(lang, p);
        expect(x.title && x.hint && x.text, `${p.id} ${lang}`).toBeTruthy();
        expect(DICTS[lang][`kitab.place.${p.id}.text`], `${p.id} ${lang}`).toBeDefined();
      }
      for (const a of AMULETS) {
        expect(charmLore(lang, a.id), a.id).toBeTruthy();
        expect(amuletDesc(lang, a.id), a.id).toBeTruthy();
      }
      for (const l of LEVELS) expect(missionLore(lang, l.id), l.id).toBeTruthy();
      for (const s of SKILLS) expect(skillDesc(lang, s.id), s.id).toBeTruthy();
    }
    // English and Malay differ, so a missing entry cannot hide behind the fallback
    const jeti = PLACES.find((p) => p.id === "jeti")!;
    expect(placeText("en", jeti).text).not.toEqual(placeText("ms", jeti).text);
  });

  it("pantun and ghaib pages follow the language", () => {
    expect(pantunPages([], "en")[0].title).not.toEqual(pantunPages([], "ms")[0].title);
    const ms = pantunPages(["bangau"], "ms")[0].text;
    expect(ms).not.toContain("(");
    expect(pantunPages(["bangau"], "en")[0].text).toContain("(");
    const save = defaultSave();
    expect(ghaibPages(save, "ms")[1].text).not.toContain("{standing}");
    expect(ghaibPages(save, "en")[1].text).not.toContain("{standing}");
    const tally = { kills: 0, spared: 0, alerts: 0 };
    expect(judge(tally, 0, "harbour", 0, "ms").line).not.toEqual(judge(tally, 0, "harbour", 0, "en").line);
  });
});

describe("hikayat", () => {
  const events = (levelId: string): ChronEvent[] => [
    { t: 0, k: "start", from: "start" },
    { t: 3, k: "place", id: levelId === "gualanun" ? "gua-lorong" : "jeti" },
    { t: 9, k: "place", id: levelId === "gualanun" ? "gua-lanun" : "pelabuhan" },
    { t: 14, k: "place", id: "sungai" },
    { t: 20, k: "swim" },
    { t: 21, k: "dive" },
    { t: 25, k: "hide" },
    { t: 30, k: "kill", how: "silent", target: false, cover: false },
    { t: 32, k: "kill", how: "air", target: false, cover: false },
    { t: 34, k: "kill", how: "cut", target: false, cover: false },
    { t: 40, k: "tool", tool: "stone", hit: 2 },
    { t: 41, k: "tool", tool: "pepper", hit: 1 },
    { t: 42, k: "tool", tool: "knife", hit: 1 },
    { t: 50, k: "spotted", body: true, target: false },
    { t: 55, k: "parry" },
    { t: 56, k: "wounded" },
    { t: 60, k: "charm", name: "Tangkal Harimau" },
    { t: 90, k: "kill", how: "silent", target: true, cover: false },
    { t: 91, k: "objective" },
    { t: 120, k: "end", won: true, reason: null },
  ];

  it("tells a whole tale, in both languages, for every mission", () => {
    for (const lang of LANGS) {
      for (const lv of LEVELS) {
        for (const seed of [1, 7, 12345]) {
          const log = { levelId: lv.id, seed, guards: 8, events: events(lv.id) };
          const text = tellHikayat(log, lv, { time: 200, alerts: 1 }, lang);
          expect(text.length, `${lv.id} ${lang}`).toBeGreaterThan(200);
          expect(text, `${lv.id} ${lang}`).not.toMatch(/\{\w+\}|hikayat\.|undefined/);
          expect(text).toBe(tellHikayat(log, lv, { time: 200, alerts: 1 }, lang));
        }
      }
    }
  });

  it("tells a lost attempt and defaults to Malay", () => {
    const lv = LEVELS[0];
    const log = { levelId: lv.id, seed: 3, guards: 8, events: [{ t: 0, k: "start" as const, from: "start" as const }, { t: 30, k: "end" as const, won: false, reason: "slain" }] };
    const ms = tellHikayat(log, lv, { time: 30, alerts: 2 });
    expect(ms).toBe(tellHikayat(log, lv, { time: 30, alerts: 2 }, "ms"));
    expect(ms).not.toEqual(tellHikayat(log, lv, { time: 30, alerts: 2 }, "en"));
    expect(ms).toMatch(/pendekar/);
  });
});

describe("chronicle kill kinds", () => {
  it("reads the takedown from English or Malay toast text", () => {
    expect(killHowFromToast("Air takedown!")).toBe("air");
    expect(killHowFromToast("Silent takedown")).toBe("silent");
    expect(killHowFromToast("Counter kill")).toBe("counter");
    expect(killHowFromToast("Senyap!")).toBe("silent");
    expect(killHowFromToast("Cut down")).toBe("cut");
  });
});
