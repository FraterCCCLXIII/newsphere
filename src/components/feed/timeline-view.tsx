import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useOutletContext } from "react-router-dom";

import { TimelineFeedEntrySkeleton } from "@/components/feed/feed-skeleton";
import { TimelineFeedRow } from "@/components/feed/timeline-feed-row";
import { GRID_EMPTY_RSS_NOTE } from "@/lib/feed-messages";
import { publishedSortKey } from "@/lib/feed-time";
import { matchesArticleSearch } from "@/lib/search-utils";
import { isTauriRuntime } from "@/lib/tauri-env";
import type { AppOutletContext } from "@/types/app-outlet";
import type { FeedItem } from "@/types/feed";

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

function VirtualizedTimelineList({ rows }: { rows: MergedRow[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 132,
    overscan: 8,
  });

  return (
    <div
      ref={scrollRef}
      className="mt-2 min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-card"
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
              key={`${row.columnId}-${row.item.link ?? row.item.title}-${v.index}`}
              data-index={v.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${v.start}px)` }}
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
    searchQuery,
    feedItemsByColumnId,
    feedLoadingByColumnId,
  } = useOutletContext<AppOutletContext>();

  const query = searchQuery.trim();
  const isSearch = query.length > 0;

  const mergedRows = useMemo(() => {
    const rows: MergedRow[] = [];
    for (const col of columns) {
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
    rows.sort((a, b) => {
      const t =
        publishedSortKey(b.item.published) -
        publishedSortKey(a.item.published);
      if (t !== 0) return t;
      return (
        a.columnId.localeCompare(b.columnId) ||
        (a.item.link || a.item.title).localeCompare(
          b.item.link || b.item.title,
        )
      );
    });
    return rows;
  }, [columns, feedItemsByColumnId]);

  const filteredRows = useMemo(() => {
    if (!isSearch) return mergedRows;
    return mergedRows.filter((row) => matchesStreamSearch(query, row));
  }, [isSearch, mergedRows, query]);

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
          RSS in the desktop app
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          The unified feed loads when you run the Tauri build. In the browser,
          add columns in Settings to prepare your layout.
        </p>
      </div>
    );
  }

  if (isSearch) {
    if (filteredRows.length === 0) {
      return (
        <div className="mx-auto flex max-w-xl flex-col items-center justify-center gap-2 px-4 py-16 text-center">
          <p className="text-sm font-medium text-foreground">No matches</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Nothing in your feeds matches this search. Try different keywords or
            a source name.
          </p>
        </div>
      );
    }
    return (
      <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col px-2 py-4">
        <div className="mb-3 shrink-0 px-2">
          <p className="text-sm font-medium text-foreground">Search results</p>
          <p className="text-xs text-muted-foreground">
            {filteredRows.length}{" "}
            {filteredRows.length === 1 ? "article" : "articles"} in latest
            order
          </p>
        </div>
        <VirtualizedTimelineList rows={filteredRows} />
      </div>
    );
  }

  if (mergedRows.length === 0) {
    if (feedsRefreshing) {
      const n = 8;
      return (
        <div
          className="mx-auto w-full max-w-xl min-w-0 px-2 py-4"
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
    <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col px-2 py-4">
      <header className="shrink-0 border-b border-border bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <h1 className="text-sm font-semibold text-foreground">Latest</h1>
        <p className="text-xs text-muted-foreground">
          All sources, newest first
        </p>
      </header>
      <VirtualizedTimelineList rows={filteredRows} />
    </div>
  );
}
