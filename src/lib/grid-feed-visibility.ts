import { isTauriRuntime } from "@/lib/tauri-env";
import type { FeedItem } from "@/types/feed";
import type { GridColumn } from "@/types/grid";

/**
 * Whether a feed column should appear on the home grid / merged streams.
 * When `hideBrokenFeeds` is true (default), columns are hidden only if the feed
 * failed **and** there is nothing to show (no cached items). A refresh error
 * with existing cache still keeps the column visible.
 */
export function shouldShowFeedColumn(
  column: GridColumn,
  items: FeedItem[],
  loading: boolean,
  error: string | undefined,
  hideBrokenFeeds: boolean,
): boolean {
  const hasUrl = Boolean(column.feedUrl?.trim());
  if (!hasUrl) return true;
  if (loading) return true;
  if (items.length > 0) return true;
  if (error) {
    if (hideBrokenFeeds) return false;
    return true;
  }
  if (!isTauriRuntime() && hasUrl) return true;
  return items.length > 0;
}
