import { describe, expect, it } from "vitest";
import { CHARM_META, KITAB_KINDS, MISSION_LORE, PLACES } from "./kitab";

describe("kitab source labels", () => {
  const entries = [
    ...PLACES.map((p) => ({ id: p.id, kind: p.kind, sumber: p.sumber })),
    ...Object.entries(MISSION_LORE).map(([id, l]) => ({ id, kind: l.kind, sumber: l.sumber })),
    ...Object.entries(CHARM_META).map(([id, m]) => ({ id, kind: m.kind, sumber: m.sumber })),
  ];
  it("gives every entry a valid kind", () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) expect(KITAB_KINDS, e.id).toContain(e.kind);
  });
  it("gives every cited source a label", () => {
    for (const e of entries) for (const s of e.sumber ?? []) expect(s.label.trim(), e.id).not.toBe("");
  });
});
