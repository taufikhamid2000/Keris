import { describe, expect, it } from "vitest";
import { LEVELS, missionText } from "./levels";
import { EXITS, gateLabel, gatePrompt } from "./worldgraph";
import { INTRO_CAPTIONS, REDUCED_CAPTIONS, captionAt } from "./intro";
import { tideLine, tideName, tideToast, tideAt } from "./tide";

describe("mission text", () => {
  it("every level's LevelDef text is the Malay dictionary text", () => {
    for (const l of LEVELS) {
      expect(l.name, l.id).toBe(missionText("ms", l, "name"));
      expect(l.story, l.id).toBe(missionText("ms", l, "story"));
      expect(l.text.objective, l.id).toBe(missionText("ms", l, "objective"));
      expect(l.win.body, l.id).toBe(missionText("ms", l, "winBody"));
      expect(l.text.take, l.id).toBe(missionText("ms", l, "take"));
    }
  });
  it("English differs from Malay and optional fields are undefined when absent", () => {
    for (const l of LEVELS) {
      expect(missionText("en", l, "story"), l.id).not.toBe(missionText("ms", l, "story"));
      expect(typeof missionText("en", l, "objective"), l.id).toBe("string");
    }
    expect(missionText("en", "ledang", "leap")).toBeUndefined();
    expect(missionText("en", "harbour", "leap")).toBe("Leap down on the Kapitan");
  });
});

describe("gate labels", () => {
  it("every gate has both languages", () => {
    for (const list of Object.values(EXITS)) {
      for (const e of list) {
        expect(gateLabel("ms", e), e.id).toBe(e.label);
        expect(gateLabel("en", e).length, e.id).toBeGreaterThan(0);
      }
    }
    expect(gatePrompt("en", { id: "harbour-masjid", label: "Ke Masjid" })).toBe("Enter: To the Masjid");
    expect(gateLabel("en", { id: "no-such-gate", label: "Pintu" })).toBe("Pintu");
  });
});

describe("intro captions and tide", () => {
  it("captions follow the language", () => {
    expect(INTRO_CAPTIONS[0].text).toBe("Melaka, Julai 1511.");
    expect(REDUCED_CAPTIONS).toHaveLength(INTRO_CAPTIONS.length);
    expect(captionAt(2, false, "en")?.text).toBe("Malacca, July 1511.");
    expect(captionAt(2)?.text).toBe("Melaka, Julai 1511.");
  });
  it("tide text follows the language", () => {
    const r = tideAt(0, 0.75);
    expect(tideName("surut")).toBe("Air surut");
    expect(tideName("surut", "en")).toBe("Low water");
    expect(tideLine(r)).toMatch(/^Pasang surut: /);
    expect(tideLine(r, "en")).toMatch(/^Tide: /);
    expect(tideToast("pasang", "en")).toBe("High water: the river is over its banks.");
  });
});
