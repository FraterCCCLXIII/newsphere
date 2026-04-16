import { htmlToPlainText } from "@/lib/html-plain-text";
import type { FeedItem } from "@/types/feed";

/** Avoid repeating the headline when the feed puts the same text in description. */
export function excerptAfterTitle(plain: string, title: string): string | null {
  const p = plain.trim();
  const t = title.trim();
  if (!p) return null;
  const pi = p.toLowerCase();
  const ti = t.toLowerCase();
  if (pi === ti) return null;
  if (pi.startsWith(ti)) {
    const rest = p
      .slice(t.length)
      .replace(/^[\s:–—\-—.…]+/u, "")
      .trim();
    return rest || null;
  }
  return p;
}

function firstImageSrcFromHtml(html: string): string | null {
  const s = html.trim();
  if (!s) return null;
  if (typeof document === "undefined") {
    const m = s.match(/<img[^>]+src=["']([^"']+)["']/i);
    return m?.[1]?.trim() ?? null;
  }
  try {
    const doc = new DOMParser().parseFromString(s, "text/html");
    const img = doc.querySelector("img[src]");
    return img?.getAttribute("src")?.trim() ?? null;
  } catch {
    const m = s.match(/<img[^>]+src=["']([^"']+)["']/i);
    return m?.[1]?.trim() ?? null;
  }
}

function resolveAgainstArticle(articleUrl: string, src: string): string | null {
  const t = src.trim();
  if (!t || t.startsWith("data:")) return null;
  try {
    return new URL(t, articleUrl).href;
  } catch {
    return null;
  }
}

/** Plain excerpt and best thumbnail URL for hover previews (feed media + img in snippet HTML). */
export function getFeedPreviewParts(item: FeedItem): {
  excerpt: string | null;
  imageUrl: string | null;
} {
  const plain = item.snippet?.trim()
    ? htmlToPlainText(item.snippet)
    : "";
  const excerpt = plain ? excerptAfterTitle(plain, item.title) : null;

  let imageUrl: string | null = item.imageUrl?.trim() || null;
  if (!imageUrl && item.snippet?.trim()) {
    const raw = firstImageSrcFromHtml(item.snippet);
    if (raw) {
      imageUrl = item.link
        ? resolveAgainstArticle(item.link, raw)
        : raw;
    }
  }
  return { excerpt, imageUrl };
}
