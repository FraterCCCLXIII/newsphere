import DOMPurify from "dompurify";
import type { Config } from "dompurify";
import { Readability } from "@mozilla/readability";

import { estimateLikelyTruncated } from "@/lib/article-truncation";

export type ExtractedArticle = {
  title: string | null;
  contentHtml: string;
  /** Author / byline when detected */
  byline: string | null;
  /** Publication or site name when detected */
  siteName: string | null;
  /** Heuristic: page may be paywalled, teaser-only, or poorly extracted */
  likelyTruncated: boolean;
};

let purifySingleton: ReturnType<typeof DOMPurify> | null = null;

function getReaderPurify(): ReturnType<typeof DOMPurify> {
  if (purifySingleton) return purifySingleton;
  if (typeof window === "undefined") {
    throw new Error("Reader sanitization requires a browser environment");
  }
  const purify = DOMPurify(window);
  purify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node instanceof HTMLAnchorElement) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
  purifySingleton = purify;
  return purify;
}

const READER_SANITIZE_CONFIG: Config = {
  FORBID_TAGS: ["style", "iframe", "object", "embed", "form"],
  FORBID_ATTR: ["style"],
  ADD_ATTR: ["target", "rel"],
  ALLOWED_URI_REGEXP:
    /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
};

/** Extract main article HTML with Readability (Mozilla). */
export function extractArticleFromHtml(
  html: string,
  pageUrl: string,
): ExtractedArticle | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const base = doc.createElement("base");
  base.setAttribute("href", pageUrl);
  if (doc.head) {
    doc.head.insertBefore(base, doc.head.firstChild);
  }
  const reader = new Readability(doc);
  const article = reader.parse();
  if (!article?.content?.trim()) {
    return null;
  }
  const likelyTruncated = estimateLikelyTruncated(doc, article);
  return {
    title: article.title ?? null,
    contentHtml: article.content,
    byline: article.byline?.trim() ? article.byline.trim() : null,
    siteName: article.siteName?.trim() ? article.siteName.trim() : null,
    likelyTruncated,
  };
}

export function sanitizeReaderHtml(html: string): string {
  return getReaderPurify().sanitize(html, READER_SANITIZE_CONFIG);
}
