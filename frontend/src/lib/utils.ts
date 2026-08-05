/** Shared presentation + parsing helpers. */

/** Tiny className combiner (conditional classes without extra deps). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
export const formatPrice = (value: number) => usd.format(value);

const num = new Intl.NumberFormat("en-US");
export const formatNumber = (value: number) => num.format(value);

/**
 * Normalise any Sketchfab URL (model page, 3d-models slug, or embed URL)
 * into a privacy-enhanced embed URL with showroom-friendly viewer params.
 */
export function toSketchfabEmbed(url: string): string | null {
  if (!url) return null;
  let uid: string | null = null;
  try {
    const parsed = new URL(url);
    const uidMatch = parsed.pathname.match(/([a-f0-9]{32})/i);
    if (parsed.hostname.includes("sketchfab.com") && uidMatch) uid = uidMatch[1];
    if (parsed.pathname.includes("/embed") && uidMatch) uid = uidMatch[1];
  } catch {
    return null;
  }
  if (!uid) return null;
  return `https://sketchfab.com/models/${uid}/embed?autostart=1&ui_theme=dark&ui_infos=0&ui_controls=1&ui_watermark=0&dnt=1`;
}

/** Deterministic id <-> slug safe route param parsing. */
export function parseId(param: string): number | null {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
}
