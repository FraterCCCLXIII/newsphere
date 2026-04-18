import { normalizeArticleUrl } from "@/lib/safe-url";

export function normalizeBookmarkLink(url: string): string {
  return normalizeArticleUrl(url);
}
