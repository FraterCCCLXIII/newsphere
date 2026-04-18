/** Strip tags for plain-text snippets (feed summaries may contain HTML). */
export function stripHtml(html: string): string {
  if (!html.trim()) return "";
  if (typeof document !== "undefined") {
    const t = document.createElement("template");
    t.innerHTML = html;
    return (t.content.textContent ?? "").replace(/\s+/g, " ").trim();
  }
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
