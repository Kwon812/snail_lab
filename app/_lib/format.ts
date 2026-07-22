/* Small formatting helpers shared by the public page queries. */

const TONES: { a: string; b: string }[] = [
  { a: "#f2933f", b: "#cf4500" },
  { a: "#f7b25a", b: "#b8420f" },
  { a: "#ef8a4c", b: "#9a3a0a" },
  { a: "#f6a55b", b: "#c04310" },
];

/** Deterministic warm tone from a slug, so cards look consistent per item. */
export function toneFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

/** ISO timestamp → "YYYY.MM.DD" (empty string when null). */
export function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Normalize a slug coming from a route param for DB lookup.
 * Decodes percent-encoding (some runtimes hand params still-encoded) and
 * normalizes Hangul to NFC so it matches the stored slug.
 */
export function normalizeSlug(raw: string): string {
  let s = raw;
  try {
    s = decodeURIComponent(raw); // no-op if already decoded; only throws on malformed %
  } catch {
    /* keep raw */
  }
  return s.normalize("NFC");
}
