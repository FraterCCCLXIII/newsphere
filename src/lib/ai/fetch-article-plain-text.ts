import {
  extractArticleFromHtml,
  sanitizeReaderHtml,
} from "@/lib/article-extract";
import { fetchArticleHtmlString } from "@/lib/fetch-article-html";
import { stripHtml } from "@/lib/ai/strip-html";
import { parseSafeHttpUrl } from "@/lib/safe-url";

const DEFAULT_MAX_CHARS = 80_000;

export type FetchArticlePlainTextResult =
  | {
      ok: true;
      url: string;
      title: string | null;
      byline: string | null;
      siteName: string | null;
      likelyTruncated: boolean;
      text: string;
    }
  | { ok: false; url: string; error: string };

/** Fetch HTML, extract with Readability, return plain text (for AI tools). */
export async function fetchArticlePlainText(
  url: string,
  maxChars = DEFAULT_MAX_CHARS,
): Promise<FetchArticlePlainTextResult> {
  const safe = parseSafeHttpUrl(url);
  if (!safe) {
    return { ok: false, url, error: "Invalid or non-http(s) URL" };
  }
  const href = safe.href;
  try {
    const raw = await fetchArticleHtmlString(href);
    const extracted = extractArticleFromHtml(raw, href);
    if (!extracted?.contentHtml?.trim()) {
      return {
        ok: false,
        url: href,
        error: "Could not extract article body from this page",
      };
    }
    const html = sanitizeReaderHtml(extracted.contentHtml);
    let text = stripHtml(html);
    text = text.replace(/\s+/g, " ").trim();
    if (text.length > maxChars) {
      text = `${text.slice(0, maxChars)}…`;
    }
    return {
      ok: true,
      url: href,
      title: extracted.title,
      byline: extracted.byline,
      siteName: extracted.siteName,
      likelyTruncated: extracted.likelyTruncated,
      text,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, url: href, error: msg };
  }
}
