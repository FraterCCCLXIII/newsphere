import { duckDuckGoInstantAnswer } from "@/lib/ai/duckduckgo-search";
import { fetchArticlePlainText } from "@/lib/ai/fetch-article-plain-text";
import { stripHtml } from "@/lib/ai/strip-html";
import { buildReaderUrl } from "@/lib/reader-url";
import { safeHttpHref } from "@/lib/safe-url";
import type { BookmarkEntry } from "@/types/bookmark";
import type { FeedItem } from "@/types/feed";
import type { GridColumn, GridPage } from "@/types/grid";
import { isFeedColumn } from "@/types/grid";
import type { ReadHistoryEntry } from "@/types/read-history";

const MAX_TOOL_JSON = 24_000;

function truncate(s: string): string {
  if (s.length <= MAX_TOOL_JSON) return s;
  return `${s.slice(0, MAX_TOOL_JSON)}…[truncated]`;
}

function json(obj: unknown): string {
  return truncate(JSON.stringify(obj, null, 2));
}

export type AgentToolNavigate = (path: string) => void;

export type AgentToolContext = {
  feedItemsByColumnId: Record<string, FeedItem[]>;
  columns: GridColumn[];
  pages: GridPage[];
  bookmarks: BookmarkEntry[];
  readHistory: ReadHistoryEntry[];
  pathname: string;
  search: string;
  navigate: AgentToolNavigate;
  webSearchEnabled: boolean;
};

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function findItemsForColumns(
  ctx: AgentToolContext,
  columnId?: string,
): { columnId: string; items: FeedItem[] }[] {
  const feedCols = ctx.columns.filter(isFeedColumn);
  const ids = columnId
    ? feedCols.filter((c) => c.id === columnId).map((c) => c.id)
    : feedCols.map((c) => c.id);
  return ids.map((id) => ({
    columnId: id,
    items: ctx.feedItemsByColumnId[id] ?? [],
  }));
}

function linksRoughlyEqual(a: string, b: string): boolean {
  try {
    const u1 = new URL(a);
    const u2 = new URL(b);
    return u1.href === u2.href;
  } catch {
    return a.trim() === b.trim();
  }
}

export async function executeAgentTool(
  name: string,
  argumentsJson: string,
  ctx: AgentToolContext,
): Promise<string> {
  const args = parseArgs(argumentsJson);

  switch (name) {
    case "get_current_reader_article": {
      if (ctx.pathname !== "/reader") {
        return json({
          in_reader: false,
          message: "The app is not on the reader page.",
        });
      }
      const params = new URLSearchParams(
        ctx.search.startsWith("?") ? ctx.search.slice(1) : ctx.search,
      );
      const l = params.get("l");
      const c = params.get("c") ?? undefined;
      const safe = l ? safeHttpHref(l) : null;
      if (!safe) {
        return json({
          in_reader: true,
          error: "No valid article URL in the reader address bar.",
        });
      }
      let feedTitle: string | null = null;
      let itemTitle: string | null = null;
      if (c) {
        const col = ctx.columns.find((x) => x.id === c);
        feedTitle = col?.title ?? null;
        const items = ctx.feedItemsByColumnId[c] ?? [];
        const found = items.find((it) => linksRoughlyEqual(it.link, safe));
        if (found) itemTitle = found.title;
      }
      const body = await fetchArticlePlainText(safe);
      if (!body.ok) {
        return json({
          in_reader: true,
          url: safe,
          column_id: c ?? null,
          feed_title: feedTitle,
          item_title: itemTitle,
          error: body.error,
        });
      }
      return json({
        in_reader: true,
        url: body.url,
        column_id: c ?? null,
        feed_title: feedTitle,
        item_title: body.title ?? itemTitle,
        byline: body.byline,
        site_name: body.siteName,
        likely_truncated: body.likelyTruncated,
        text: body.text,
      });
    }

    case "search_feed_cache": {
      const query = String(args.query ?? "")
        .trim()
        .toLowerCase();
      const columnId =
        typeof args.column_id === "string" ? args.column_id.trim() : undefined;
      let limit = Number(args.limit);
      if (!Number.isFinite(limit) || limit < 1) limit = 15;
      limit = Math.min(40, Math.floor(limit));

      const groups = findItemsForColumns(ctx, columnId);
      const out: {
        column_id: string;
        column_title: string;
        title: string;
        link: string;
        snippet: string;
        reader_url: string;
      }[] = [];

      if (!query) {
        for (const g of groups) {
          const title =
            ctx.columns.find((c) => c.id === g.columnId)?.title ?? "Feed";
          for (const item of g.items) {
            out.push({
              column_id: g.columnId,
              column_title: title,
              title: item.title,
              link: item.link,
              snippet: stripHtml(item.snippet ?? "").slice(0, 240),
              reader_url: buildReaderUrl(item.link, g.columnId),
            });
            if (out.length >= limit) break;
          }
          if (out.length >= limit) break;
        }
        return json({ query: "", items: out });
      }

      for (const g of groups) {
        const colTitle =
          ctx.columns.find((c) => c.id === g.columnId)?.title ?? "Feed";
        for (const item of g.items) {
          const hay = `${item.title} ${stripHtml(item.snippet ?? "")}`.toLowerCase();
          if (hay.includes(query)) {
            out.push({
              column_id: g.columnId,
              column_title: colTitle,
              title: item.title,
              link: item.link,
              snippet: stripHtml(item.snippet ?? "").slice(0, 240),
              reader_url: buildReaderUrl(item.link, g.columnId),
            });
            if (out.length >= limit) break;
          }
        }
        if (out.length >= limit) break;
      }
      return json({ query, items: out });
    }

    case "list_feed_columns": {
      const feeds = ctx.columns.filter(isFeedColumn).map((c) => ({
        id: c.id,
        title: c.title,
        kind: c.kind ?? "feed",
        feed_url: c.feedUrl ?? null,
      }));
      return json({ columns: feeds });
    }

    case "list_grid_pages": {
      const pages = ctx.pages.map((p) => ({ id: p.id, name: p.name }));
      return json({ pages });
    }

    case "get_bookmarks": {
      const query = String(args.query ?? "")
        .trim()
        .toLowerCase();
      let limit = Number(args.limit);
      if (!Number.isFinite(limit) || limit < 1) limit = 20;
      limit = Math.min(50, Math.floor(limit));
      let list = [...ctx.bookmarks];
      if (query) {
        list = list.filter((b) => {
          const hay = `${b.title} ${b.link}`.toLowerCase();
          return hay.includes(query);
        });
      }
      list.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
      list = list.slice(0, limit);
      return json({
        bookmarks: list.map((b) => ({
          id: b.id,
          title: b.title,
          link: b.link,
          saved_at: b.savedAt,
          source: b.sourceFeedTitle ?? null,
          column_id: b.sourceColumnId ?? null,
        })),
      });
    }

    case "get_read_history": {
      const query = String(args.query ?? "")
        .trim()
        .toLowerCase();
      let limit = Number(args.limit);
      if (!Number.isFinite(limit) || limit < 1) limit = 20;
      limit = Math.min(50, Math.floor(limit));
      let list = [...ctx.readHistory];
      if (query) {
        list = list.filter((h) => {
          const hay = `${h.title} ${h.link}`.toLowerCase();
          return hay.includes(query);
        });
      }
      list.sort((a, b) => b.viewedAt.localeCompare(a.viewedAt));
      list = list.slice(0, limit);
      return json({
        history: list.map((h) => ({
          id: h.id,
          title: h.title,
          link: h.link,
          viewed_at: h.viewedAt,
          source: h.sourceFeedTitle ?? null,
          column_id: h.sourceColumnId ?? null,
        })),
      });
    }

    case "fetch_article_plain_text": {
      const url = String(args.url ?? "").trim();
      if (!url) return json({ error: "Missing url" });
      const result = await fetchArticlePlainText(url);
      if (!result.ok) {
        return json({ url: result.url, error: result.error });
      }
      return json({
        url: result.url,
        title: result.title,
        byline: result.byline,
        site_name: result.siteName,
        likely_truncated: result.likelyTruncated,
        text: result.text,
      });
    }

    case "open_in_reader": {
      const articleUrl = String(args.article_url ?? "").trim();
      const col =
        typeof args.column_id === "string" ? args.column_id.trim() : undefined;
      const safe = safeHttpHref(articleUrl);
      if (!safe) {
        return json({ ok: false, error: "Invalid article URL" });
      }
      const path = buildReaderUrl(safe, col);
      ctx.navigate(path);
      return json({ ok: true, navigated_to: path });
    }

    case "navigate_to": {
      const path = String(args.path ?? "").trim();
      if (!path.startsWith("/") || path.startsWith("//")) {
        return json({ ok: false, error: "Path must be a single-app path starting with /" });
      }
      if (/[\s<>]/.test(path.split("?")[0] ?? "")) {
        return json({ ok: false, error: "Invalid path" });
      }
      ctx.navigate(path);
      return json({ ok: true, navigated_to: path });
    }

    case "web_search": {
      if (!ctx.webSearchEnabled) {
        return json({
          enabled: false,
          message:
            "Web search is disabled. Enable “Web search” in Settings → App → AI tools.",
        });
      }
      const query = String(args.query ?? "").trim();
      if (!query) return json({ error: "Empty query" });
      const instant = await duckDuckGoInstantAnswer(query);
      if (!instant) {
        return json({
          query,
          message:
            "No instant answer returned (network or CORS). Try feed search or open an article.",
        });
      }
      return json({ query, result: instant });
    }

    default:
      return json({ error: `Unknown tool: ${name}` });
  }
}
