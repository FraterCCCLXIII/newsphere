import { useEffect, useState } from "react";

import {
  extractArticleFromHtml,
  sanitizeReaderHtml,
} from "@/lib/article-extract";
import { fetchArticleHtmlString } from "@/lib/fetch-article-html";

export type ReaderBodyState =
  | { kind: "loading" }
  | {
      kind: "article";
      html: string;
      title: string | null;
      byline: string | null;
      siteName: string | null;
      /** Heuristic: content may be teaser-only or paywalled */
      likelyTruncated: boolean;
    }
  | { kind: "iframe"; hint?: string };

export function useReaderArticle(url: string | null): ReaderBodyState {
  const [state, setState] = useState<ReaderBodyState>(() =>
    url ? { kind: "loading" } : { kind: "iframe" },
  );

  useEffect(() => {
    if (!url) {
      setState({ kind: "iframe", hint: undefined });
      return;
    }

    let cancelled = false;
    setState({ kind: "loading" });

    void (async () => {
      try {
        const raw = await fetchArticleHtmlString(url);
        if (cancelled) return;
        const extracted = extractArticleFromHtml(raw, url);
        if (cancelled) return;
        if (extracted?.contentHtml?.trim()) {
          const safe = sanitizeReaderHtml(extracted.contentHtml);
          if (cancelled) return;
          setState({
            kind: "article",
            html: safe,
            title: extracted.title,
            byline: extracted.byline,
            siteName: extracted.siteName,
            likelyTruncated: extracted.likelyTruncated,
          });
          return;
        }
        setState({
          kind: "iframe",
          hint: "This page could not be simplified for reading.",
        });
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Failed to load";
        setState({
          kind: "iframe",
          hint:
            msg.includes("NetworkError") || msg.includes("Failed to fetch")
              ? "Could not fetch this page (often due to browser security). Open in the desktop app for full reader mode, or use Open in browser."
              : `Could not load article (${msg}). Showing embedded page if available.`,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}
