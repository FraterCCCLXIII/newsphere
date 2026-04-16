import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Bookmark, ExternalLink, Share2 } from "lucide-react";

import { FeedFavicon } from "@/components/grid/feed-favicon";
import { ShareModal } from "@/components/share/share-modal";
import { normalizeBookmarkLink } from "@/lib/bookmark-utils";
import { formatPublishedDateTime } from "@/lib/feed-time";
import { htmlToPlainText } from "@/lib/html-plain-text";
import { buildReaderUrl } from "@/lib/reader-url";
import { cn } from "@/lib/utils";
import type { AppOutletContext } from "@/types/app-outlet";
import type { FeedItem } from "@/types/feed";

/** Avoid repeating the headline when the feed puts the same text in description. */
function excerptAfterTitle(plain: string, title: string): string | null {
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

type TimelineFeedRowProps = {
  item: FeedItem;
  columnTitle: string;
  columnId: string;
  feedUrl?: string;
  isLast: boolean;
};

export function TimelineFeedRow({
  item,
  columnTitle,
  columnId,
  feedUrl,
  isLast,
}: TimelineFeedRowProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const { bookmarks, toggleBookmark } = useOutletContext<AppOutletContext>();

  const bookmarked = useMemo(() => {
    if (!item.link) return false;
    const n = normalizeBookmarkLink(item.link);
    return bookmarks.some((b) => normalizeBookmarkLink(b.link) === n);
  }, [bookmarks, item.link]);

  const publishedLabel = formatPublishedDateTime(item.published);
  const rowBorder = !isLast ? "border-b border-border" : "";

  const excerpt = useMemo(() => {
    if (!item.snippet?.trim()) return null;
    const plain = htmlToPlainText(item.snippet);
    return excerptAfterTitle(plain, item.title);
  }, [item.snippet, item.title]);

  if (!item.link) {
    return (
      <li className={cn("px-4 py-3", rowBorder)}>
        <div className="flex gap-3">
          <FeedFavicon feedUrl={feedUrl} className="mt-0.5 size-9" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug text-foreground">
              {item.title}
            </p>
            {excerpt ? (
              <p className="mt-1 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                {excerpt}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">{columnTitle}</p>
            {publishedLabel ? (
              <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                {publishedLabel}
              </p>
            ) : null}
          </div>
        </div>
      </li>
    );
  }

  const readerUrl = buildReaderUrl(item.link, columnId);

  return (
    <li className={cn("px-4 py-3 transition-colors hover:bg-accent/40", rowBorder)}>
      <div className="flex gap-3">
        <FeedFavicon feedUrl={feedUrl} className="mt-1 size-9 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="text-sm font-semibold text-foreground">
              {columnTitle}
            </span>
            {publishedLabel ? (
              <span className="text-xs tabular-nums text-muted-foreground">
                · {publishedLabel}
              </span>
            ) : null}
          </div>
          <Link
            to={readerUrl}
            className="group/art mt-1 block min-w-0 text-left"
          >
            <span className="line-clamp-3 text-[0.9375rem] font-medium leading-snug text-foreground">
              {item.title}
            </span>
            {excerpt ? (
              <p className="mt-1 line-clamp-4 text-sm font-normal leading-relaxed text-muted-foreground">
                {excerpt}
              </p>
            ) : null}
          </Link>
          <div className="mt-2 flex items-center gap-0.5 text-muted-foreground">
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="app-no-drag inline-flex size-8 items-center justify-center rounded-full hover:bg-accent hover:text-foreground"
              title="Open in browser"
              aria-label="Open in browser"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="size-4" aria-hidden />
            </a>
            <button
              type="button"
              className="app-no-drag inline-flex size-8 items-center justify-center rounded-full hover:bg-accent hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                setShareOpen(true);
              }}
              aria-label="Share"
              title="Share"
            >
              <Share2 className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              className={cn(
                "app-no-drag inline-flex size-8 items-center justify-center rounded-full hover:bg-accent hover:text-foreground",
                bookmarked && "text-foreground",
              )}
              onClick={(e) => {
                e.preventDefault();
                void toggleBookmark({
                  title: item.title,
                  link: item.link!,
                  published: item.published,
                  sourceFeedTitle: columnTitle,
                  sourceColumnId: columnId,
                });
              }}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
              title={bookmarked ? "Remove bookmark" : "Bookmark"}
            >
              <Bookmark
                className={cn(
                  "size-4",
                  bookmarked &&
                    "fill-current text-muted-foreground/55 dark:text-muted-foreground",
                )}
                strokeWidth={bookmarked ? 0 : 2}
                aria-hidden
              />
            </button>
          </div>
        </div>
      </div>
      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={item.link}
        title={item.title}
      />
    </li>
  );
}
