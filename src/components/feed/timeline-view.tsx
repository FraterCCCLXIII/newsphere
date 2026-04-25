import { useCallback, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowsDownUp, CaretDown } from "@phosphor-icons/react";
import { useOutletContext } from "react-router-dom";

import { useDisplayPreferences } from "@/components/display-preferences-provider";
import {
  readStoredScrollTop,
  useScrollRestoration,
} from "@/hooks/use-scroll-restoration";
import { TimelineFeedEntrySkeleton } from "@/components/feed/feed-skeleton";
import { TimelineFeedRow } from "@/components/feed/timeline-feed-row";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_DISPLAY_NAME } from "@/lib/app-metadata";
import { GRID_EMPTY_RSS_NOTE } from "@/lib/feed-messages";
import { getFeedPreviewParts } from "@/lib/feed-preview";
import {
  FEED_STREAM_SORT_DESCRIPTIONS,
  FEED_STREAM_SORT_LABELS,
  FEED_STREAM_SORT_MODES,
  sortFeedStreamRows,
} from "@/lib/feed-stream-sort";
import { shouldShowFeedColumn } from "@/lib/grid-feed-visibility";
import { matchesArticleSearch } from "@/lib/search-utils";
import { safeHttpHref } from "@/lib/safe-url";
import { cn } from "@/lib/utils";
import { isTauriRuntime } from "@/lib/tauri-env";
import type { AppOutletContext } from "@/types/app-outlet";
import type { FeedItem } from "@/types/feed";
import type { FeedStreamSortMode } from "@/types/feed-stream-sort";

type MergedRow = {
  item: FeedItem;
  columnTitle: string;
  columnId: string;
  feedUrl?: string;
};

function matchesStreamSearch(query: string, row: MergedRow): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (matchesArticleSearch(query, row.item)) return true;
  if (row.columnTitle.toLowerCase().includes(q)) return true;
  return false;
}

/** Heuristic height so the virtualizer’s total size is closer to measured rows (less jumpiness). */
function estimateTimelineRowHeight(
  row: MergedRow,
  showFeedPreviewImages: boolean,
): number {
  const safe =
    row.item.link != null && row.item.link !== ""
      ? safeHttpHref(row.item.link)
      : null;
  if (!safe) return 112;
  const { excerpt, imageUrl } = getFeedPreviewParts(row.item);
  const hasImage = showFeedPreviewImages && Boolean(imageUrl);
  if (!excerpt && !hasImage) return 142;
  if (hasImage && excerpt) return 320;
  if (hasImage) return 280;
  return 232;
}

function stableRowKey(row: MergedRow): string {
  return `${row.columnId}\0${row.item.link ?? ""}\0${row.item.title}`;
}

function FeedStreamSortHeader({
  title,
  subtitle,
  sortMode,
  onSortChange,
  className,
}: {
  title: string;
  subtitle?: string;
  sortMode: FeedStreamSortMode;
  onSortChange: (mode: FeedStreamSortMode) => void;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "shrink-0 bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        subtitle != null && subtitle !== "" && "border-b border-border",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <h1 className="min-w-0 truncate text-sm font-semibold text-foreground">
            {title}
          </h1>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="app-no-drag h-8 shrink-0 gap-1.5 px-2 text-xs font-normal"
                aria-label="Sort feed"
              >
                <ArrowsDownUp className="size-3.5 shrink-0 opacity-70" aria-hidden />
                <span className="max-w-[9rem] truncate">
                  {FEED_STREAM_SORT_LABELS[sortMode]}
                </span>
                <CaretDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[12rem]">
              <DropdownMenuRadioGroup
                value={sortMode}
                onValueChange={(v) => {
                  const next = v as FeedStreamSortMode;
                  if (FEED_STREAM_SORT_MODES.includes(next)) onSortChange(next);
                }}
              >
                {FEED_STREAM_SORT_MODES.map((mode) => (
                  <DropdownMenuRadioItem key={mode} value={mode}>
                    <span className="min-w-0 flex-1">{FEED_STREAM_SORT_LABELS[mode]}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {subtitle != null && subtitle !== "" && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </header>
  );
}

function VirtualizedTimelineList({
  rows,
  showFeedPreviewImages,
  scrollStorageKey,
}: {
  rows: MergedRow[];
  showFeedPreviewImages: boolean;
  scrollStorageKey: string;
}) {
  const scrollRef = useScrollRestoration(scrollStorageKey);
  const estimateSize = useCallback(
    (index: number) => {
      const row = rows[index];
      return row
        ? estimateTimelineRowHeight(row, showFeedPreviewImages)
        : 152;
    },
    [rows, showFeedPreviewImages],
  );
  const getItemKey = useCallback(
    (index: number) => {
      const row = rows[index];
      return row != null ? stableRowKey(row) : String(index);
    },
    [rows],
  );
  /** Virtualizer calls `scrollTo` on mount before offset observers run; without this, `top` can be NaN and wipe restored scroll. */
  const initialOffset = useCallback(
    () => readStoredScrollTop(scrollStorageKey),
    [scrollStorageKey],
  );
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    overscan: 14,
    getItemKey,
    initialOffset,
  });

  return (
    <div
      ref={scrollRef}
      className="mt-2 min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-card [overflow-anchor:none]"
      role="list"
    >
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((v) => {
          const row = rows[v.index];
          if (!row) return null;
          const isLast = v.index === rows.length - 1;
          return (
            <div
              key={stableRowKey(row)}
              data-index={v.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full"
              style={{
                transform: `translate3d(0, ${v.start}px, 0)`,
                backfaceVisibility: "hidden",
              }}
            >
              <TimelineFeedRow
                rowElement="div"
                item={row.item}
                columnTitle={row.columnTitle}
                columnId={row.columnId}
                feedUrl={row.feedUrl}
                isLast={isLast}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TimelineView() {
  const {
    columns,
    pages,
    activePageId,
    isAggregateView,
    searchQuery,
    feedItemsByColumnId,
    feedLoadingByColumnId,
    feedErrorByColumnId,
  } = useOutletContext<AppOutletContext>();

  const latestTitle = useMemo(() => {
    if (isAggregateView) return "All";
    const p = pages.find((x) => x.id === activePageId);
    return p?.name ?? "Latest";
  }, [isAggregateView, pages, activePageId]);

  const {
    hideBrokenFeeds,
    feedStreamSort,
    setFeedStreamSort,
    showFeedPreviewImages,
  } = useDisplayPreferences();

  const visibleColumns = useMemo(() => {
    return columns.filter((col) => {
      const items = feedItemsByColumnId[col.id] ?? [];
      const loading = feedLoadingByColumnId[col.id] ?? false;
      const error = feedErrorByColumnId[col.id];
      return shouldShowFeedColumn(
        col,
        items,
        loading,
        error,
        hideBrokenFeeds,
      );
    });
  }, [
    columns,
    feedItemsByColumnId,
    feedLoadingByColumnId,
    feedErrorByColumnId,
    hideBrokenFeeds,
  ]);

  const query = searchQuery.trim();
  const isSearch = query.length > 0;

  const mergedRows = useMemo(() => {
    const rows: MergedRow[] = [];
    for (const col of visibleColumns) {
      const items = feedItemsByColumnId[col.id] ?? [];
      for (const item of items) {
        rows.push({
          item,
          columnTitle: col.title,
          columnId: col.id,
          feedUrl: col.feedUrl?.trim() || undefined,
        });
      }
    }
    return rows;
  }, [visibleColumns, feedItemsByColumnId]);

  const columnIdsInOrder = useMemo(
    () => visibleColumns.map((c) => c.id),
    [visibleColumns],
  );

  const sortedRows = useMemo(
    () =>
      sortFeedStreamRows(mergedRows, feedStreamSort, columnIdsInOrder),
    [mergedRows, feedStreamSort, columnIdsInOrder],
  );

  const filteredRows = useMemo(() => {
    if (!isSearch) return sortedRows;
    return sortedRows.filter((row) => matchesStreamSearch(query, row));
  }, [isSearch, sortedRows, query]);

  const feedsRefreshing = useMemo(
    () => Object.values(feedLoadingByColumnId).some(Boolean),
    [feedLoadingByColumnId],
  );

  const hasAnyFeedUrl = columns.some((c) => c.feedUrl?.trim());
  const showDesktopHint =
    !isTauriRuntime() &&
    hasAnyFeedUrl &&
    mergedRows.length === 0 &&
    !feedsRefreshing;

  if (columns.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
        <p className="text-lg font-medium text-foreground">No columns yet</p>
        <p className="max-w-md text-sm">
          Open <span className="font-medium text-foreground">Settings</span>{" "}
          to add sources. Your latest articles will appear here in one list.
        </p>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          {GRID_EMPTY_RSS_NOTE}
        </p>
      </div>
    );
  }

  if (showDesktopHint) {
    return (
      <div className="flex min-h-[35vh] flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm font-medium text-foreground">
          RSS in {APP_DISPLAY_NAME}
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          The unified feed loads in the {APP_DISPLAY_NAME} desktop app. In the
          browser, add columns in Settings to prepare your layout.
        </p>
      </div>
    );
  }

  if (isSearch) {
    if (filteredRows.length === 0) {
      return (
        <div className="flex w-full max-w-xl flex-col items-center justify-center gap-2 px-4 py-16 text-center">
          <p className="text-sm font-medium text-foreground">No matches</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Nothing in your feeds matches this search. Try different keywords or
            a source name.
          </p>
        </div>
      );
    }
    return (
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col px-2 py-4">
        <FeedStreamSortHeader
          title="Search results"
          subtitle={`${filteredRows.length} ${
            filteredRows.length === 1 ? "article" : "articles"
          } · ${FEED_STREAM_SORT_DESCRIPTIONS[feedStreamSort]}`}
          sortMode={feedStreamSort}
          onSortChange={setFeedStreamSort}
          className="mb-2 rounded-lg border border-border"
        />
        <VirtualizedTimelineList
          rows={filteredRows}
          showFeedPreviewImages={showFeedPreviewImages}
          scrollStorageKey={`feed-stream-search-${activePageId}`}
        />
      </div>
    );
  }

  if (mergedRows.length === 0) {
    if (feedsRefreshing) {
      const n = 8;
      return (
        <div
          className="w-full min-w-0 px-2 py-4"
          aria-busy="true"
          aria-label="Loading feeds"
        >
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <ul className="min-w-0">
              {Array.from({ length: n }).map((_, i) => (
                <TimelineFeedEntrySkeleton key={i} isLast={i === n - 1} />
              ))}
            </ul>
          </div>
        </div>
      );
    }
    if (hasAnyFeedUrl) {
      return (
        <div className="flex min-h-[35vh] flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-sm font-medium text-foreground">No articles yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Feeds are empty or still loading. If a source failed, check the grid
            view for errors.
          </p>
        </div>
      );
    }
    return (
      <div className="flex min-h-[35vh] flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm font-medium text-foreground">No feed URLs</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Add RSS URLs in Settings so articles can load here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col px-2 py-4">
      <FeedStreamSortHeader
        title={latestTitle}
        sortMode={feedStreamSort}
        onSortChange={setFeedStreamSort}
      />
      <VirtualizedTimelineList
        rows={filteredRows}
        showFeedPreviewImages={showFeedPreviewImages}
        scrollStorageKey={`feed-stream-${activePageId}-${feedStreamSort}`}
      />
    </div>
  );
}
