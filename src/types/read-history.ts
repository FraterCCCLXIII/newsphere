export type ReadHistoryEntry = {
  id: string;
  title: string;
  link: string;
  /** When the article was last opened in the reader */
  viewedAt: string;
  published?: string;
  sourceFeedTitle?: string;
  sourceColumnId?: string;
};

export type ReadHistoryStore = {
  items: ReadHistoryEntry[];
};
