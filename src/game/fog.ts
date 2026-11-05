// Map reveal storage: the explored-squares grid packed into a short base64 bitset for the save.
// Pure helpers, no DOM or three.js.

/** One bit per square, base64. */
export function packFog(seen: Uint8Array): string {
  const bytes = new Uint8Array(Math.ceil(seen.length / 8));
  for (let i = 0; i < seen.length; i++) if (seen[i]) bytes[i >> 3] |= 1 << (i & 7);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/** Back to one byte per square; null if the text is not a grid of this size. */
export function unpackFog(text: string, n: number): Uint8Array | null {
  let raw: string;
  try {
    raw = atob(text);
  } catch {
    return null;
  }
  if (raw.length !== Math.ceil(n / 8)) return null;
  const seen = new Uint8Array(n);
  for (let i = 0; i < n; i++) seen[i] = (raw.charCodeAt(i >> 3) >> (i & 7)) & 1;
  return seen;
}

/** Saved maps: level id -> packed grid, a handful of short strings at most. */
export function cleanExplored(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof v !== "object" || v === null || Array.isArray(v)) return out;
  for (const [k, s] of Object.entries(v)) {
    if (Object.keys(out).length >= 32) break;
    if (k.length <= 64 && typeof s === "string" && s.length <= 8192 && /^[A-Za-z0-9+/]*={0,2}$/.test(s)) out[k] = s;
  }
  return out;
}
