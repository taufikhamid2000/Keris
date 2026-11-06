import { describe, expect, it } from "vitest";
import { DICTS, EN, MS, t } from "./i18n";

describe("i18n", () => {
  it("EN and MS have exactly the same keys", () => {
    expect(Object.keys(EN).sort()).toEqual(Object.keys(MS).sort());
  });
  it("no empty strings", () => {
    for (const d of [MS, EN]) for (const v of Object.values(d)) expect(v.length).toBeGreaterThan(0);
  });
  it("EN and MS use the same placeholders", () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const k of Object.keys(MS)) expect(ph(DICTS.en[k])).toEqual(ph(DICTS.ms[k]));
  });
  it("interpolates {vars}, leaving unknown ones alone", () => {
    expect(t("en", "title.continueNamed", { name: "Melaka" })).toBe("Continue: Melaka");
    expect(t("ms", "settings.lookSens", { x: "1.5" })).toBe("Look sensitivity 1.5x");
    expect(t("en", "title.continueNamed")).toBe("Continue: {name}");
    expect(t("en", "title.continueNamed", {})).toBe("Continue: {name}");
  });
  it("falls back to Malay, then to the key", () => {
    const saved = DICTS.en["pause.title"];
    delete DICTS.en["pause.title"];
    try {
      expect(t("en", "pause.title")).toBe("Berhenti");
    } finally {
      DICTS.en["pause.title"] = saved;
    }
    expect(t("en", "no.such.key")).toBe("no.such.key");
    expect(t("ms", "no.such.{x}", { x: 1 })).toBe("no.such.1");
  });
});
