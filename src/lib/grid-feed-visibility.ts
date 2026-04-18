import { isTauriRuntime } from "@/lib/tauri-env";
import type { FeedItem } from "@/types/feed";
import type { GridColumn } from "@/types/grid";

/**
 * Whether a feed column should appear on the home grid / merged streams.
 * When `hideBrokenFeeds` is true (default), columns with a completed fetch error are hidden.
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
  if (error) {
    if (hideBrokenFeeds) return false;
    return true;
  }
  if (!isTauriRuntime() && hasUrl) return true;
  return items.length > 0;
}
