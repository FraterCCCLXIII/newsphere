import type { BookmarkEntry } from "@/types/bookmark";
import type { ReadHistoryEntry } from "@/types/read-history";
import type { FeedItem } from "@/types/feed";
import type { GridController } from "@/types/grid";

export type AppOutletContext = GridController & {
  /** Opens the catalog / custom feed modal; new feed is inserted after this column, or before the first when `null` (empty grid). */
  openAddFeedModal: (afterColumnId: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  feedItemsByColumnId: Record<string, FeedItem[]>;
  feedLoadingByColumnId: Record<string, boolean>;
  feedErrorByColumnId: Record<string, string>;
  refetchFeeds: () => Promise<void>;
  feedsRefreshing: boolean;
  bookmarks: BookmarkEntry[];
  toggleBookmark: (entry: {
    title: string;
    link: string;
    published?: string;
    sourceFeedTitle?: string;
    sourceColumnId?: string;
  }) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
  readHistory: ReadHistoryEntry[];
  recordArticleView: (entry: {
    title: string;
    link: string;
    published?: string;
    sourceFeedTitle?: string;
    sourceColumnId?: string;
  }) => Promise<void>;
  removeReadHistoryEntry: (id: string) => Promise<void>;
};
