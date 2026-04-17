import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Bookmark, ExternalLink, Grid3x3, Loader2, Share2 } from "lucide-react";

import { GridFeedEntrySkeleton } from "@/components/feed/feed-skeleton";
import { FeedFavicon } from "@/components/grid/feed-favicon";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDisplayPreferences } from "@/components/display-preferences-provider";
import { FeedArticleHoverCard } from "@/components/feed/feed-article-hover-card";
import { FeedItemHoverPreviewPanel } from "@/components/feed/feed-item-hover-preview-panel";
import { ShareModal } from "@/components/share/share-modal";
import { COLUMN_RSS_PLACEHOLDER } from "@/lib/feed-messages";
import { getFeedPreviewParts } from "@/lib/feed-preview";
import { formatPublishedForPreference } from "@/lib/feed-time";
import { normalizeBookmarkLink } from "@/lib/bookmark-utils";
import { buildReaderUrl } from "@/lib/reader-url";
import { isTauriRuntime } from "@/lib/tauri-env";
import { cn } from "@/lib/utils";
import type { AppOutletContext } from "@/types/app-outlet";
import type { FeedItem } from "@/types/feed";
import type { GridColumn } from "@/types/grid";

const FEED_PREVIEW_COUNT = 5;

type ColumnCardProps = {
  column: GridColumn;
  items: FeedItem[];
  loading: boolean;
  error?: string;
  /** Drag handle for grid reorder (grip control). */
  dragHandle?: ReactNode;
  /** When true, card keeps natural height (no grid-row stretch). */
  isDragging?: boolean;
};

function websiteOriginFromFeedUrl(feedUrl: string | undefined): string | null {
  if (!feedUrl?.trim()) return null;
  try {
    return new URL(feedUrl.trim()).origin;
  } catch {
    return null;
  }
}

export function FeedEntryRow({
  item,
  isLast,
  columnTitle,
  columnId,
  showSourceLine = false,
}: {
  item: FeedItem;
  isLast: boolean;
  columnTitle: string;
  columnId: string;
  /** In unified search list, show which feed the item came from */
  showSourceLine?: boolean;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const { bookmarks, toggleBookmark } = useOutletContext<AppOutletContext>();
  const { showTimestampsInline, dateFormatStyle } = useDisplayPreferences();

  const bookmarked = useMemo(() => {
    if (!item.link) return false;
    const n = normalizeBookmarkLink(item.link);
    return bookmarks.some((b) => normalizeBookmarkLink(b.link) === n);
  }, [bookmarks, item.link]);

  const publishedLabel = formatPublishedForPreference(
    item.published,
    dateFormatStyle,
  );
  const rowBorder = !isLast ? "border-b border-border" : "";

  const preview = useMemo(() => getFeedPreviewParts(item), [item]);
  const showPreview = Boolean(preview.excerpt || preview.imageUrl);
  const showInlineTimestamp =
    showTimestampsInline && Boolean(publishedLabel);

  const linkClassName =
    "block min-w-0 w-full px-2 py-2 text-left";

  const linkInner = (
    <span className="min-w-0 flex-1">
      <span className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
        {item.title}
      </span>
      {showInlineTimestamp ? (
        <span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">
          {publishedLabel}
        </span>
      ) : null}
      {showSourceLine ? (
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {columnTitle}
        </span>
      ) : null}
    </span>
  );

  if (!item.link) {
    return (
      <li>
        <button
          type="button"
          className={cn(
            "group/row flex w-full cursor-default items-center gap-2 bg-transparent px-2 py-2 text-left transition-colors hover:bg-accent",
            rowBorder,
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
              {item.title}
            </span>
            {showInlineTimestamp ? (
              <span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">
                {publishedLabel}
              </span>
            ) : null}
            {showSourceLine ? (
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {columnTitle}
              </span>
            ) : null}
          </span>
        </button>
      </li>
    );
  }

  return (
    <li>
      <div
        className={cn(
          "group/row flex min-w-0 items-stretch gap-2 transition-colors hover:bg-accent/80",
          rowBorder,
        )}
      >
        <div className="min-w-0 min-h-0 flex-1">
          {showPreview ? (
            <FeedArticleHoverCard
              openDelay={200}
              closeDelay={80}
              panelClassName="border-border"
              trigger={
                <Link
                  to={buildReaderUrl(item.link!, columnId)}
                  className={linkClassName}
                >
                  {linkInner}
                </Link>
              }
            >
              <FeedItemHoverPreviewPanel
                excerpt={preview.excerpt}
                imageUrl={preview.imageUrl}
                dateLabel={publishedLabel}
              />
            </FeedArticleHoverCard>
          ) : (
            <Link
              to={buildReaderUrl(item.link!, columnId)}
              className={linkClassName}
            >
              {linkInner}
            </Link>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0 self-stretch pr-2">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="app-no-drag inline-flex size-8 shrink-0 items-center justify-center text-muted-foreground opacity-0 transition-colors duration-150 ease-out hover:text-foreground group-hover/row:opacity-100"
            title="Open in browser"
            aria-label="Open in browser"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="size-4" aria-hidden />
          </a>
          <button
            type="button"
            className="app-no-drag inline-flex size-8 shrink-0 items-center justify-center text-muted-foreground opacity-0 transition-colors duration-150 ease-out hover:bg-accent hover:text-foreground group-hover/row:opacity-100"
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
              "app-no-drag inline-flex size-8 shrink-0 items-center justify-center text-muted-foreground transition-colors duration-150 ease-out hover:bg-accent hover:text-foreground",
              bookmarked
                ? "opacity-100"
                : "opacity-0 group-hover/row:opacity-100",
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
      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={item.link}
        title={item.title}
      />
    </li>
  );
}

export function ColumnCard({
  column,
  items,
  loading,
  error,
  dragHandle,
  isDragging = false,
}: ColumnCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasUrl = Boolean(column.feedUrl?.trim());
  const showDesktopHint = hasUrl && !isTauriRuntime();
  const websiteHref = websiteOriginFromFeedUrl(column.feedUrl);

  const hasMore = items.length > FEED_PREVIEW_COUNT;
  const visibleItems =
    expanded || !hasMore ? items : items.slice(0, FEED_PREVIEW_COUNT);
  const hiddenCount = items.length - FEED_PREVIEW_COUNT;

  const growMain = isDragging ? "flex-none" : "flex-1";

  return (
    <Card
      className={cn(
        "flex h-auto min-h-[220px] w-full min-w-0 flex-col border-0 shadow-none",
        dragHandle && "group/card",
      )}
    >
      <CardHeader className="px-2 pb-2 pt-6">
        <div
          className={cn(
            "grid items-center gap-x-2 gap-y-1.5",
            dragHandle
              ? "grid-cols-[auto_minmax(0,1fr)_auto_auto]"
              : "grid-cols-[auto_minmax(0,1fr)_auto]",
          )}
        >
          <div className="col-start-1 row-start-1 flex items-center">
            <FeedFavicon feedUrl={column.feedUrl} className="size-5" />
          </div>
          <CardTitle className="col-start-2 row-start-1 min-w-0 pl-2 line-clamp-2 text-base leading-snug">
            {websiteHref ? (
              <a
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground transition-colors hover:text-primary"
              >
                {column.title}
              </a>
            ) : (
              column.title
            )}
          </CardTitle>
          {loading ? (
            <div
              className="col-start-3 row-start-1 flex items-center justify-end self-center"
              role="status"
              aria-label="Loading feed"
            >
              <Loader2
                className="size-4 shrink-0 animate-spin text-muted-foreground"
                aria-hidden
              />
            </div>
          ) : null}
          {dragHandle ? (
            <div
              className={cn(
                "col-start-4 row-start-1 flex items-center justify-end self-center transition-opacity duration-150 ease-out",
                "opacity-0 group-hover/card:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100",
                isDragging && "opacity-100",
              )}
            >
              {dragHandle}
            </div>
          ) : null}
          {!hasUrl ? (
            <CardDescription className="col-start-2 row-start-2 pl-2">
              No feed URL (add in Settings)
            </CardDescription>
          ) : null}
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "flex min-h-0 flex-col px-2 pb-3 pt-0",
          !isDragging && "flex-1",
        )}
      >
        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
            {error}
          </p>
        ) : null}

        {showDesktopHint ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-2 py-6 text-center text-muted-foreground",
              growMain,
            )}
          >
            <Grid3x3 className="size-10 opacity-40" aria-hidden />
            <p className="text-sm">RSS loads in the desktop app</p>
            <p className="max-w-[240px] text-xs leading-relaxed">
              Run <span className="font-mono text-foreground">npm run tauri dev</span>{" "}
              to fetch this feed.
            </p>
          </div>
        ) : !hasUrl ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-2 py-6 text-center text-muted-foreground",
              growMain,
            )}
          >
            <Grid3x3 className="size-10 opacity-40" aria-hidden />
            <p className="text-sm font-medium text-foreground/90">No feed URL</p>
            <p className="max-w-[260px] text-xs leading-relaxed">
              {COLUMN_RSS_PLACEHOLDER}
            </p>
          </div>
        ) : loading && items.length === 0 ? (
          <ul
            className={cn("min-w-0", growMain)}
            aria-busy="true"
            aria-label="Loading feed"
          >
            {Array.from({ length: FEED_PREVIEW_COUNT }).map((_, i) => (
              <GridFeedEntrySkeleton
                key={i}
                isLast={i === FEED_PREVIEW_COUNT - 1}
              />
            ))}
          </ul>
        ) : items.length === 0 ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-2 py-6 text-center text-sm text-muted-foreground",
              growMain,
            )}
          >
            <p>No entries in this feed yet.</p>
          </div>
        ) : (
          <>
            <ul className="min-w-0">
              {visibleItems.map((item, i) => (
                <FeedEntryRow
                  key={`${item.link || item.title}-${i}`}
                  item={item}
                  isLast={i === visibleItems.length - 1}
                  columnTitle={column.title}
                  columnId={column.id}
                />
              ))}
            </ul>
            {hasMore ? (
              <div className="mt-0 border-t border-border pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full justify-start gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded ? (
                    "Show less"
                  ) : (
                    <>
                      <span>View more</span>
                      <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-muted px-2 text-[10px] font-medium tabular-nums text-foreground">
                        {hiddenCount}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
