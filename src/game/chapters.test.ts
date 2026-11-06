import { describe, expect, it } from "vitest";
import { CHAPTERS, MISSION_OF, chapterOf, chapterProgress } from "./chapters";
import { LEVELS } from "./levels";

describe("chapters", () => {
  it("has six ordered chapters, only chapter 2 playable", () => {
    expect(CHAPTERS.map((c) => c.order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(CHAPTERS.filter((c) => c.playable).map((c) => c.order)).toEqual([2]);
    expect(CHAPTERS.filter((c) => c.tone === "sensitive").map((c) => c.order)).toEqual([5, 6]);
  });
  it("chapter 2 lists every level in order, with matching mission ids", () => {
    expect(CHAPTERS[1].levels).toEqual(LEVELS.map((l) => l.id));
    for (const l of LEVELS) expect(MISSION_OF[l.id]).toBe(l.missionId);
    expect(chapterOf("kota")?.order).toBe(2);
    expect(chapterOf("nope")).toBeUndefined();
  });
  it("derives progress from the save", () => {
    const s = { missions: { "kampung-hulu": { completed: true }, "kota-batu": { completed: false } } };
    expect(chapterProgress(CHAPTERS[1], { missions: {} })).toEqual({ done: 0, total: 10 });
    expect(chapterProgress(CHAPTERS[1], s).done).toBe(1);
    expect(chapterProgress(CHAPTERS[0], s)).toEqual({ done: 0, total: 0 });
  });
});
