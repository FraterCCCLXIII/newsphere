import type { BookmarkEntry } from "@/types/bookmark";

/** Case-insensitive match on title, link, and optional snippet; empty query matches everything. */
export function matchesArticleSearch(
  query: string,
  item: { title: string; link?: string; snippet?: string },
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (item.title.toLowerCase().includes(q)) return true;
  if (item.link?.toLowerCase().includes(q)) return true;
  if (item.snippet?.toLowerCase().includes(q)) return true;
  return false;
}

/** Same as feed search, plus source feed title for bookmarks. */
export function matchesBookmarkSearch(
  query: string,
  b: BookmarkEntry,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (b.title.toLowerCase().includes(q)) return true;
  if (b.link.toLowerCase().includes(q)) return true;
  if (b.sourceFeedTitle?.toLowerCase().includes(q)) return true;
  return false;
}
