/** How the unified Latest feed merges and orders articles from all sources. */
export const FEED_STREAM_SORT_MODES = [
  "newest_first",
  "oldest_first",
  "source_a_z",
  "source_z_a",
  "balanced",
] as const;

export type FeedStreamSortMode = (typeof FEED_STREAM_SORT_MODES)[number];
