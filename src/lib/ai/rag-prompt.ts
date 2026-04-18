import type { IndexedArticle } from "@/lib/ai/feed-index";

/**
 * Routes and link patterns the assistant may include in markdown so users can
 * navigate the app or open the web (see AiChatMessageBody rendering).
 */
export function buildAssistantCapabilitiesPrompt(): string {
  return `## Links and navigation (markdown)
- **Articles from feeds**: cite with \`[title](exact-reader-url-from-list)\` — reader URLs look like \`/reader?l=...\` and may include \`&c=columnId\` for prev/next in that source.
- **App screens** (relative paths): [Grid](/), [Latest feed](/feed), [Bookmarks](/bookmarks), [History](/history), [Settings → App](/settings/app).
- **External websites**: use absolute URLs, e.g. [Publisher](https://example.com/article) — opens in the system browser in the desktop app.
Prefer feed-backed reader links when the topic is in the user’s articles; use external links for general web references.`;
}

export function buildRagSystemPrompt(articles: IndexedArticle[]): string {
  const lines = articles.map((a, i) => {
    return `[${i + 1}] ${a.title}\n   Source: ${a.columnTitle}\n   Link (use exactly this in markdown links): ${a.readerLink}\n   Excerpt: ${a.text.slice(0, 600)}`;
  });
  const contextBlock =
    lines.length > 0
      ? lines.join("\n\n")
      : "(No matching articles were found in the user’s feeds. Say so clearly.)";

  return `You are a helpful assistant inside a news reader app. Answer using ONLY the articles listed below when they are relevant. If nothing matches, say you could not find articles in the feeds about that.

When you cite an article, use a markdown link with the exact Link URL from the list, like [Article title](reader-url). Use relative paths as given (e.g. /reader?...).

Retrieved articles:
${contextBlock}`;
}

export function buildFullSystemPrompt(articles: IndexedArticle[]): string {
  return `${buildRagSystemPrompt(articles)}\n\n${buildAssistantCapabilitiesPrompt()}`;
}
