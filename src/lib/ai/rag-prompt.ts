import type { IndexedArticle } from "@/lib/ai/feed-index";
import { APP_DISPLAY_NAME } from "@/lib/app-metadata";

/**
 * Routes and link patterns the assistant may include in markdown so users can
 * navigate the app or open the web (see AiChatMessageBody rendering).
 */
export function buildAssistantCapabilitiesPrompt(): string {
  return `## Tools (you can call these)
You have function tools: **get_current_reader_article** (text open in /reader), **search_feed_cache**, **list_feed_columns**, **list_grid_pages**, **get_bookmarks**, **get_read_history**, **fetch_article_plain_text** (full article body from a URL), **open_in_reader**, **navigate_to** (in-app routes), **web_search** (only if the user enabled it in Settings — otherwise the tool explains it is off). Use tools when the user asks about “this page”, saved items, history, or needs deeper text than snippets. Prefer feeds and local data over web search.

## Links and navigation (markdown)
- **Articles from feeds**: cite with \`[title](exact-reader-url-from-list)\` — reader URLs look like \`/reader?l=...\` and may include \`&c=columnId\` for prev/next in that source.
- **App screens** (relative paths): [Grid](/), [Latest feed](/feed), [Bookmarks](/bookmarks), [History](/history), [Settings → App](/settings/app).
- **External websites**: use absolute URLs, e.g. [Publisher](https://example.com/article) — in ${APP_DISPLAY_NAME}, absolute links open in the system browser.
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

  return `You are a helpful assistant in ${APP_DISPLAY_NAME}. The list below is a quick retrieval pass over feed snippets — use tools when you need the open reader article, full article text, broader cache search, bookmarks, or history. When these excerpts are enough, prefer them and cite accurately.

When you cite an article, use a markdown link: \`[short title](/reader?l=...&c=...)\` where the URL is copied **exactly** from the "Link" line for that article above. Do not invent URLs, placeholders, or the string "reader-url".

Retrieved articles:
${contextBlock}`;
}

export function buildFullSystemPrompt(articles: IndexedArticle[]): string {
  return `${buildRagSystemPrompt(articles)}\n\n${buildAssistantCapabilitiesPrompt()}`;
}
