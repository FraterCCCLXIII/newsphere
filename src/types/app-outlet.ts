import type { BookmarkEntry } from "@/types/bookmark";
import type { FeedItem } from "@/types/feed";
import type { GridController } from "@/types/grid";

export type AppOutletContext = GridController & {
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
};
