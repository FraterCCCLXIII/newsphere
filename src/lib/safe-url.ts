/**
 * Http(s) URL validation and normalization for untrusted feed / navigation input.
 */

/** Returns a URL only for absolute http(s) links. */
export function parseSafeHttpUrl(raw: string): URL | null {
  const s = raw.trim();
  if (!s) return null;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (!u.hostname) return null;
  return u;
}

/** Canonical href for safe http(s) URLs, or null. */
export function safeHttpHref(raw: string): string | null {
  const u = parseSafeHttpUrl(raw);
  return u ? u.href : null;
}

/** Strip tracking params, fragment, lowercase host — for bookmarks / history dedupe. */
export function normalizeArticleUrl(raw: string): string {
  const u = parseSafeHttpUrl(raw);
  if (!u) return raw.trim();

  u.hash = "";
  u.hostname = u.hostname.toLowerCase();

  const params = new URLSearchParams(u.search);
  for (const key of [...params.keys()]) {
    const lower = key.toLowerCase();
    if (
      lower === "fbclid" ||
      lower === "gclid" ||
      lower === "igshid" ||
      lower.startsWith("utm_") ||
      lower.startsWith("mc_")
    ) {
      params.delete(key);
    }
  }
  const q = params.toString();
  u.search = q ? `?${q}` : "";

  return u.href;
}
