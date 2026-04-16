export type BookmarkEntry = {
  id: string;
  title: string;
  link: string;
  published?: string;
  sourceFeedTitle?: string;
  sourceColumnId?: string;
  savedAt: string;
};

export type BookmarksStore = {
  items: BookmarkEntry[];
};
