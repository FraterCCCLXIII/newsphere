import MiniSearch from "minisearch";

import { buildReaderUrl } from "@/lib/reader-url";
import { stripHtml } from "@/lib/ai/strip-html";
import type { FeedItem } from "@/types/feed";
import type { GridColumn } from "@/types/grid";

export type IndexedArticle = {
  id: string;
  title: string;
  text: string;
  readerLink: string;
  columnTitle: string;
};

export function buildIndexedArticles(
  feedItemsByColumnId: Record<string, FeedItem[]>,
  columns: GridColumn[],
): IndexedArticle[] {
  const colById = new Map(columns.map((c) => [c.id, c]));
  const out: IndexedArticle[] = [];
  let docSeq = 0;

  for (const [colId, items] of Object.entries(feedItemsByColumnId)) {
    const col = colById.get(colId);
    const columnTitle = col?.title ?? "Feed";
    items.forEach((item, i) => {
      const snippet = stripHtml(item.snippet ?? "");
      const text = [item.title, snippet, columnTitle].filter(Boolean).join(" ");
      const id = `feed:${colId}:${i}:${docSeq++}`;
      out.push({
        id,
        title: item.title,
        text,
        readerLink: buildReaderUrl(item.link, colId),
        columnTitle,
      });
    });
  }

  return out;
}

export type FeedSearchBundle = {
  index: MiniSearch<IndexedArticle> | null;
  byId: Map<string, IndexedArticle>;
};

export function buildFeedSearchBundle(docs: IndexedArticle[]): FeedSearchBundle {
  if (docs.length === 0) {
    return { index: null, byId: new Map() };
  }
  const byId = new Map(docs.map((d) => [d.id, d]));
  const mini = new MiniSearch({
    fields: ["title", "text"],
    storeFields: [
      "id",
      "title",
      "text",
      "readerLink",
      "columnTitle",
    ],
    idField: "id",
  });
  mini.addAll(
    docs.map((d) => ({
      id: d.id,
      title: d.title,
      text: d.text,
      readerLink: d.readerLink,
      columnTitle: d.columnTitle,
    })),
  );
  return { index: mini, byId };
}

export function retrieveArticles(
  bundle: FeedSearchBundle,
  query: string,
  k: number,
): IndexedArticle[] {
  const q = query.trim();
  const { index, byId } = bundle;
  if (!index || !q) return [];
  const results = index.search(q, { fuzzy: 0.2, prefix: true });
  const out: IndexedArticle[] = [];
  for (const r of results) {
    const id = String(r.id);
    const d = byId.get(id);
    if (d) out.push(d);
    if (out.length >= k) break;
  }
  return out;
}
