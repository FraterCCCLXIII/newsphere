import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  ArrowSquareOut,
  BookmarkSimple,
  ShareNetwork,
} from "@phosphor-icons/react";

import { useDisplayPreferences } from "@/components/display-preferences-provider";
import { ExternalBrowserLink } from "@/components/layout/external-browser-link";
import { FeedFavicon } from "@/components/grid/feed-favicon";
import { ShareModal } from "@/components/share/share-modal";
import { normalizeBookmarkLink } from "@/lib/bookmark-utils";
import { getFeedPreviewParts } from "@/lib/feed-preview";
import { formatPublishedForPreference } from "@/lib/feed-time";
import { buildReaderUrl } from "@/lib/reader-url";
import { safeHttpHref } from "@/lib/safe-url";
import { cn } from "@/lib/utils";
import type { AppOutletContext } from "@/types/app-outlet";
import type { FeedItem } from "@/types/feed";

function FeedInlinePreviewImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  if (failed) return null;
  return (
    <img
      src={src}
      alt=""
      className="mt-2 max-h-44 w-full rounded-md border border-border object-cover"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

type TimelineFeedRowProps = {
  item: FeedItem;
  columnTitle: string;
  columnId: string;
  feedUrl?: string;
  isLast: boolean;
  /** Use `div` when rows are inside a virtual list (no `ul`/`li` tree). */
  rowElement?: "li" | "div";
};

export function TimelineFeedRow({
  item,
  columnTitle,
  columnId,
  feedUrl,
  isLast,
  rowElement = "li",
}: TimelineFeedRowProps) {
  const Row = rowElement === "div" ? "div" : "li";
  const rowRole = rowElement === "div" ? { role: "listitem" as const } : {};
  const [shareOpen, setShareOpen] = useState(false);
  const { bookmarks, toggleBookmark } = useOutletContext<AppOutletContext>();
  const { dateFormatStyle, showFeedPreviewImages } = useDisplayPreferences();

  const bookmarked = useMemo(() => {
    if (!item.link) return false;
    const n = normalizeBookmarkLink(item.link);
    return bookmarks.some((b) => normalizeBookmarkLink(b.link) === n);
  }, [bookmarks, item.link]);

  const safeLink = useMemo(
    () => (item.link ? safeHttpHref(item.link) : null),
    [item.link],
  );

  const publishedLabel = formatPublishedForPreference(
    item.published,
    dateFormatStyle,
  );
  const showInlineTimestamp = Boolean(publishedLabel);
  const rowBorder = !isLast ? "border-b border-border" : "";

  const preview = useMemo(() => getFeedPreviewParts(item), [item]);
  const previewImageUrl =
    showFeedPreviewImages && preview.imageUrl ? preview.imageUrl : null;

  if (!safeLink) {
    return (
      <Row className={cn("px-4 py-3", rowBorder)} {...rowRole}>
        <div className="flex gap-3">
          <FeedFavicon feedUrl={feedUrl} className="mt-0.5 size-9" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug text-foreground">
              {item.title}
            </p>
            {preview.excerpt ? (
              <p className="mt-1 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                {preview.excerpt}
              </p>
            ) : null}
            {previewImageUrl ? (
              <FeedInlinePreviewImage src={previewImageUrl} />
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">{columnTitle}</p>
            {showInlineTimestamp ? (
              <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                {publishedLabel}
              </p>
            ) : null}
          </div>
        </div>
      </Row>
    );
  }

  const readerUrl = buildReaderUrl(safeLink, columnId);

  return (
    <Row
      className={cn("px-4 py-3 transition-colors hover:bg-accent/40", rowBorder)}
      {...rowRole}
    >
      <div className="flex gap-3">
        <FeedFavicon feedUrl={feedUrl} className="mt-1 size-9 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="text-sm font-semibold text-foreground">
              {columnTitle}
            </span>
            {showInlineTimestamp ? (
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
            {preview.excerpt ? (
              <p className="mt-1 line-clamp-4 text-sm font-normal leading-relaxed text-muted-foreground">
                {preview.excerpt}
              </p>
            ) : null}
            {previewImageUrl ? (
              <FeedInlinePreviewImage src={previewImageUrl} />
            ) : null}
          </Link>
          <div className="mt-2 flex items-center gap-0.5 text-muted-foreground">
            <span onClick={(e) => e.stopPropagation()} className="inline-flex">
              <ExternalBrowserLink
                href={safeLink}
                className="app-no-drag inline-flex size-8 items-center justify-center rounded-full hover:bg-accent hover:text-foreground"
                title="Open in browser"
                aria-label="Open in browser"
              >
                <ArrowSquareOut className="size-4" aria-hidden />
              </ExternalBrowserLink>
            </span>
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
              <ShareNetwork className="size-4" aria-hidden />
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
                  link: safeLink,
                  published: item.published,
                  sourceFeedTitle: columnTitle,
                  sourceColumnId: columnId,
                });
              }}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
              title={bookmarked ? "Remove bookmark" : "Bookmark"}
            >
              <BookmarkSimple
                weight={bookmarked ? "fill" : "regular"}
                className={cn(
                  "size-4",
                  bookmarked &&
                    "text-muted-foreground/55 dark:text-muted-foreground",
                )}
                aria-hidden
              />
            </button>
          </div>
        </div>
      </div>
      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={safeLink}
        title={item.title}
      />
    </Row>
  );
}
