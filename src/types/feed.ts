export type FeedItem = {
  title: string;
  link: string;
  published?: string;
  /** Excerpt from feed summary or content (may include HTML). */
  snippet?: string;
};
