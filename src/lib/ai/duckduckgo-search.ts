/**
 * Lightweight web search via DuckDuckGo Instant Answer API (no API key).
 * Results are best-effort; may fail from browser CORS on some networks.
 */
export async function duckDuckGoInstantAnswer(
  query: string,
): Promise<{ heading?: string; abstract?: string; url?: string } | null> {
  const q = query.trim();
  if (!q) return null;
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
  try {
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      Heading?: string;
      Abstract?: string;
      AbstractURL?: string;
      Answer?: string;
    };
    const heading = json.Heading?.trim();
    const abstract = json.Abstract?.trim() || json.Answer?.trim();
    const abstractUrl = json.AbstractURL?.trim();
    if (!heading && !abstract) return null;
    return {
      heading: heading || undefined,
      abstract: abstract || undefined,
      url: abstractUrl || undefined,
    };
  } catch {
    return null;
  }
}
