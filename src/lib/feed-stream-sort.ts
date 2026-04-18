import { publishedSortKey } from "@/lib/feed-time";
import type { FeedItem } from "@/types/feed";
import {
  FEED_STREAM_SORT_MODES,
  type FeedStreamSortMode,
} from "@/types/feed-stream-sort";

export { FEED_STREAM_SORT_MODES };

export function parseFeedStreamSort(
  raw: string | null,
): FeedStreamSortMode | null {
  if (!raw) return null;
  for (const m of FEED_STREAM_SORT_MODES) {
    if (m === raw) return m;
  }
  return null;
}

export const FEED_STREAM_SORT_LABELS: Record<FeedStreamSortMode, string> = {
  newest_first: "Newest first",
  oldest_first: "Oldest first",
  source_a_z: "Source A–Z",
  source_z_a: "Source Z–A",
  balanced: "Balanced mix",
};

/** Short line under the feed header for the active sort. */
export const FEED_STREAM_SORT_DESCRIPTIONS: Record<FeedStreamSortMode, string> =
  {
    newest_first: "All sources, newest first",
    oldest_first: "All sources, oldest first",
    source_a_z: "Sources sorted A–Z; newest first within each",
    source_z_a: "Sources sorted Z–A; newest first within each",
    balanced:
      "Round-robin across sources so one feed does not flood the top",
  };

export type FeedStreamSortRow = {
  item: FeedItem;
  columnTitle: string;
  columnId: string;
};

function stableItemKey(row: FeedStreamSortRow): string {
  return `${row.columnId}\0${row.item.link ?? ""}\0${row.item.title}`;
}

function comparePublishedNewestFirst(a: FeedStreamSortRow, b: FeedStreamSortRow): number {
  const t =
    publishedSortKey(b.item.published) - publishedSortKey(a.item.published);
  if (t !== 0) return t;
  return stableItemKey(a).localeCompare(stableItemKey(b));
}

function comparePublishedOldestFirst(a: FeedStreamSortRow, b: FeedStreamSortRow): number {
  const t =
    publishedSortKey(a.item.published) - publishedSortKey(b.item.published);
  if (t !== 0) return t;
  return stableItemKey(a).localeCompare(stableItemKey(b));
}

function compareSourceThenNewest(
  a: FeedStreamSortRow,
  b: FeedStreamSortRow,
  sourceOrder: "asc" | "desc",
): number {
  const src =
    sourceOrder === "asc"
      ? a.columnTitle.localeCompare(b.columnTitle)
      : b.columnTitle.localeCompare(a.columnTitle);
  if (src !== 0) return src;
  return comparePublishedNewestFirst(a, b);
}

/**
 * Round-robin across sources: each column’s items are newest-first internally,
 * then we take one article per source in rotation so a single high-volume feed
 * does not dominate the top of the list.
 */
function interleaveByColumnOrder(
  rows: FeedStreamSortRow[],
  columnOrderIds: string[],
): FeedStreamSortRow[] {
  const byCol = new Map<string, FeedStreamSortRow[]>();
  for (const row of rows) {
    const list = byCol.get(row.columnId);
    if (list) list.push(row);
    else byCol.set(row.columnId, [row]);
  }
  for (const list of byCol.values()) {
    list.sort(comparePublishedNewestFirst);
  }
  const out: FeedStreamSortRow[] = [];
  let round = 0;
  let added = true;
  while (added) {
    added = false;
    for (const id of columnOrderIds) {
      const list = byCol.get(id);
      if (list && round < list.length) {
        const row = list[round];
        if (row) {
          out.push(row);
          added = true;
        }
      }
    }
    round += 1;
  }
  for (const [id, list] of byCol) {
    if (!columnOrderIds.includes(id)) {
      for (const row of list) {
        out.push(row);
      }
    }
  }
  return out;
}

export function sortFeedStreamRows<T extends FeedStreamSortRow>(
  rows: T[],
  mode: FeedStreamSortMode,
  visibleColumnIdsInOrder: string[],
): T[] {
  const copy = [...rows];
  switch (mode) {
    case "newest_first":
      copy.sort(comparePublishedNewestFirst);
      return copy;
    case "oldest_first":
      copy.sort(comparePublishedOldestFirst);
      return copy;
    case "source_a_z":
      copy.sort((a, b) => compareSourceThenNewest(a, b, "asc"));
      return copy;
    case "source_z_a":
      copy.sort((a, b) => compareSourceThenNewest(a, b, "desc"));
      return copy;
    case "balanced":
      return interleaveByColumnOrder(copy, visibleColumnIdsInOrder) as T[];
    default:
      copy.sort(comparePublishedNewestFirst);
      return copy;
  }
}
