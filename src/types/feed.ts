export type FeedItem = {
  title: string;
  link: string;
  published?: string;
  /** Excerpt from feed summary or content (may include HTML). */
  snippet?: string;
  /** Thumbnail from Media RSS or enclosure when available (desktop fetch). */
  imageUrl?: string;
};
