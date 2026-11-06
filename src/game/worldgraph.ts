// The connected world: walkable gates that carry the player from one map to the next.
// Data only, no three.js. Gate positions live here (not in each map file) so maps stay independent.
import type { Rect } from "./levels";
import { DICTS, t, type Lang } from "./i18n";

export interface ExitDef {
  id: string;
  /** trigger footprint on the map the gate stands in */
  at: Rect;
  /** level id this gate leads to */
  to: string;
  /** where the player appears on the other side, facing rotY (into that map) */
  arrive: { x: number; z: number; rotY: number };
  /** shown in the prompt and on the Peta map, in Malay; use gateLabel(lang, exit) for the language-aware text (strings/missions.ts, gate.<id>) */
  label: string;
}

/** Gates per level id. Filled in by the world-graph package; every link has a return gate. */
export const EXITS: Record<string, ExitDef[]> = {
  harbour: [
    // the bridge's south end; the kampung's return gate stands at its north end
    { id: "harbour-kampung", at: { x: 12, z: 34.2, w: 3, d: 1.2 }, to: "kampung", arrive: { x: 1.5, z: 52.6, rotY: 0 }, label: "Ke Kampung Hulu" },
    // the quiet alley gate in the north-west corner
    { id: "harbour-masjid", at: { x: -31.5, z: 28.9, w: 2.4, d: 3.6 }, to: "masjid", arrive: { x: -26.6, z: 31.6, rotY: Math.PI / 2 }, label: "Ke Masjid" },
    // the cellar stair behind the south-west houses
    { id: "harbour-penjara", at: { x: -30.5, z: -15, w: 2.5, d: 2.5 }, to: "penjara", arrive: { x: -96.5, z: -17.25, rotY: Math.PI / 2 }, label: "Ke Penjara" },
  ],
  kampung: [
    { id: "kampung-harbour", at: { x: 12, z: 48.3, w: 3, d: 1.2 }, to: "harbour", arrive: { x: 12, z: 30.4, rotY: Math.PI }, label: "Ke Pelabuhan" },
    // the north-east gate in the old north fence
    { id: "kampung-jungle", at: { x: 31, z: 110.8, w: 3.4, d: 1.2 }, to: "jungle", arrive: { x: 31, z: 117, rotY: 0 }, label: "Ke Hutan" },
  ],
  jungle: [
    { id: "jungle-kampung", at: { x: 31, z: 113.2, w: 3.4, d: 1.2 }, to: "kampung", arrive: { x: 29.4, z: 106.8, rotY: Math.PI }, label: "Ke Kampung Hulu" },
    // the old trail south-west to the foot of the mountain
    { id: "jungle-ledang", at: { x: -25, z: 161.5, w: 3.4, d: 1.2 }, to: "ledang", arrive: { x: -25, z: 168.9, rotY: 0 }, label: "Ke Gunung Ledang" },
    // the east edge of the hutan, the long road to the fortress
    { id: "jungle-kota", at: { x: 31.8, z: 152, w: 2.4, d: 3 }, to: "kota", arrive: { x: 7.2, z: 301.6, rotY: Math.PI / 2 }, label: "Ke Kota Batu" },
  ],
  ledang: [
    { id: "ledang-jungle", at: { x: -25, z: 165, w: 3.4, d: 1.2 }, to: "jungle", arrive: { x: -25, z: 157.7, rotY: Math.PI }, label: "Ke Hutan" },
    // the cave mouth at the mountain's east foot
    { id: "ledang-gualanun", at: { x: 30.6, z: 174, w: 3.4, d: 1.4 }, to: "gualanun", arrive: { x: 63.8, z: 9.2, rotY: 0 }, label: "Gua Lanun" },
  ],
  gualanun: [
    // the start glade at the cleft's mouth
    { id: "gualanun-ledang", at: { x: 68, z: 6.9, w: 2, d: 2 }, to: "ledang", arrive: { x: 30.6, z: 170, rotY: -Math.PI / 2 }, label: "Ke Gunung Ledang" },
  ],
  masjid: [
    { id: "masjid-harbour", at: { x: -31.5, z: 28.9, w: 2.4, d: 3.6 }, to: "harbour", arrive: { x: -29.4, z: 23.8, rotY: Math.PI }, label: "Ke Pelabuhan" },
  ],
  penjara: [
    // the yard's west end, by the start
    { id: "penjara-harbour", at: { x: -101.25, z: -17.2, w: 2.5, d: 2.2 }, to: "harbour", arrive: { x: -26, z: -10.8, rotY: Math.PI / 2 }, label: "Ke Pelabuhan" },
  ],
  kota: [
    // the beach below the sea wall, east of the jetty
    { id: "kota-jungle", at: { x: 0, z: 301.6, w: 7, d: 2.4 }, to: "jungle", arrive: { x: 27.4, z: 152, rotY: -Math.PI / 2 }, label: "Ke Hutan" },
  ],
};

export function exitsOf(levelId: string): ExitDef[] {
  return EXITS[levelId] ?? [];
}

/** The gate whose footprint contains (x, z), if any. */
export function exitAt(levelId: string, x: number, z: number): ExitDef | null {
  for (const e of exitsOf(levelId)) {
    if (Math.abs(x - e.at.x) <= e.at.w / 2 && Math.abs(z - e.at.z) <= e.at.d / 2) return e;
  }
  return null;
}

/** The gate's label in `lang` (falls back to the Malay label for gates without a dictionary entry). */
export function gateLabel(lang: Lang, e: Pick<ExitDef, "id" | "label">): string {
  const key = `gate.${e.id}`;
  return key in DICTS.ms ? t(lang, key) : e.label;
}

/** The "Masuk: <label>" prompt shown when standing in a gate. */
export function gatePrompt(lang: Lang, e: Pick<ExitDef, "id" | "label">): string {
  return t(lang, "gate.enter", { label: gateLabel(lang, e) });
}
