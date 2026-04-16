/**
 * Best-effort HTML → plain text for feed snippets (DOMParser, no script execution).
 */
export function htmlToPlainText(html: string): string {
  const s = html.trim();
  if (!s) return "";
  if (typeof document === "undefined") {
    return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  try {
    const doc = new DOMParser().parseFromString(s, "text/html");
    const text = doc.body.textContent ?? "";
    return text.replace(/\s+/g, " ").trim();
  } catch {
    return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
}
