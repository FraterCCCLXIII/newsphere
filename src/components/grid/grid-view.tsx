import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { useDisplayPreferences } from "@/components/display-preferences-provider";
import { FeedEntryRow } from "@/components/grid/column-card";
import { Card, CardContent } from "@/components/ui/card";
import { GridInsertPlusMenu } from "@/components/grid/grid-insert-plus-menu";
import { GridHeaderDropLine } from "@/components/grid/grid-header-drop-line";
import { GridInsertionOverlay } from "@/components/grid/grid-insertion-overlay";
import {
  GridSortDragKindContext,
  type GridSortDragKind,
} from "@/components/grid/grid-sort-drag-context";
import {
  GridColumnDragOverlay,
  GridSectionHeaderDragOverlay,
  SortableGridColumn,
  SortableGridSectionHeader,
} from "@/components/grid/sortable-grid-column";
import { normalizeBookmarkLink } from "@/lib/bookmark-utils";
import { cn } from "@/lib/utils";
import { GRID_EMPTY_RSS_NOTE } from "@/lib/feed-messages";
import { publishedSortKey } from "@/lib/feed-time";
import { mergeVisibleColumnOrder } from "@/lib/grid-reorder";
import { gridSortCollisionDetection } from "@/lib/grid-sort-dnd";
import { rectSortingNoScaleStrategy } from "@/lib/grid-sorting-strategy";
import { isTauriRuntime } from "@/lib/tauri-env";
import { matchesArticleSearch } from "@/lib/search-utils";
import type { AppOutletContext } from "@/types/app-outlet";
import type { FeedItem } from "@/types/feed";
import {
  DEFAULT_LATEST_ROW_TITLE,
  isFeedColumn,
  type GridColumn,
} from "@/types/grid";

/** Matches `.grid-feed` breakpoints in `src/index.css`. */
function gridFeedColumnCount(): 1 | 2 | 3 {
  if (typeof window === "undefined") return 1;
  if (window.matchMedia("(min-width: 1024px)").matches) return 3;
  if (window.matchMedia("(min-width: 640px)").matches) return 2;
  return 1;
}

const LATEST_ROWS_PER_COLUMN = 5;
const LATEST_MAX_ITEMS = 15;

/** Hide column cards that only show an empty feed; keep placeholders and in-flight/error columns. */
function shouldShowColumnCard(
  column: GridColumn,
  items: FeedItem[],
  loading: boolean,
  error: string | undefined,
): boolean {
  const hasUrl = Boolean(column.feedUrl?.trim());
  if (!hasUrl) return true;
  if (loading) return true;
  if (error) return true;
  if (!isTauriRuntime() && hasUrl) return true;
  return items.length > 0;
}

/** Match `.grid-feed` column track width when no feed card exists to measure (headers-only). */
function estimateOneColumnTrackWidth(grid: HTMLElement): number {
  const rect = grid.getBoundingClientRect();
  const style = getComputedStyle(grid);
  const pl = parseFloat(style.paddingLeft) || 0;
  const pr = parseFloat(style.paddingRight) || 0;
  const colGap = parseFloat(style.columnGap || style.gap) || 0;
  const cols = window.matchMedia("(min-width: 1024px)").matches
    ? 3
    : window.matchMedia("(min-width: 640px)").matches
      ? 2
      : 1;
  const inner = rect.width - pl - pr;
  if (cols <= 1) return inner;
  return (inner - colGap * (cols - 1)) / cols;
}

function GridAddDividerRow({
  onAddSectionHeader,
  onOpenAddFeedModal,
}: {
  onAddSectionHeader: () => void;
  onOpenAddFeedModal: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="col-span-full flex items-center gap-3 py-3">
      <div className="h-px min-h-px flex-1 bg-border" aria-hidden />
      <GridInsertPlusMenu
        insertAfterId={null}
        onInsertSectionHeader={() => {
          onAddSectionHeader();
        }}
        onOpenAddFeedModal={() => {
          onOpenAddFeedModal();
        }}
        onOpenChange={setMenuOpen}
        trigger={
          <button
            type="button"
            className={cn(
              "inline-flex min-h-7 min-w-7 shrink-0 items-center justify-center rounded-sm border border-transparent bg-transparent p-0 outline-none ring-offset-background transition-colors",
              "text-muted-foreground hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              menuOpen && "text-accent-foreground",
            )}
            aria-label="Add section header or feed"
            aria-haspopup="menu"
          >
            <Plus className="size-3" strokeWidth={2.25} aria-hidden />
          </button>
        }
      />
      <div className="h-px min-h-px flex-1 bg-border" aria-hidden />
    </div>
  );
}

export function GridView() {
  const {
    columns,
    gridLayoutColumns,
    reorderColumns,
    searchQuery,
    feedItemsByColumnId,
    feedLoadingByColumnId,
    feedErrorByColumnId,
    insertColumnAfter,
    openAddFeedModal,
    pages,
    activePageId,
    isAggregateView,
  } = useOutletContext<AppOutletContext>();

  const { showGridInsertionLines } = useDisplayPreferences();

  const activePage = useMemo(() => {
    if (isAggregateView) return null;
    return pages.find((p) => p.id === activePageId) ?? null;
  }, [pages, activePageId, isAggregateView]);

  const showLatestRow = useMemo(() => {
    if (isAggregateView || !activePage?.latestRow?.enabled) return false;
    return columns.some((c) => isFeedColumn(c));
  }, [activePage, columns, isAggregateView]);

  const latestRowHeading = useMemo(() => {
    const t = activePage?.latestRow?.title?.trim();
    return t || DEFAULT_LATEST_ROW_TITLE;
  }, [activePage?.latestRow?.title]);

  const [latestLayoutColumnCount, setLatestLayoutColumnCount] = useState<
    1 | 2 | 3
  >(() => gridFeedColumnCount());

  useEffect(() => {
    const read = () => setLatestLayoutColumnCount(gridFeedColumnCount());
    read();
    const mqLg = window.matchMedia("(min-width: 1024px)");
    const mqSm = window.matchMedia("(min-width: 640px)");
    mqLg.addEventListener("change", read);
    mqSm.addEventListener("change", read);
    return () => {
      mqLg.removeEventListener("change", read);
      mqSm.removeEventListener("change", read);
    };
  }, []);

  type LatestRow = {
    item: FeedItem;
    columnTitle: string;
    columnId: string;
  };

  const latestFlatRows = useMemo((): LatestRow[] => {
    if (!showLatestRow) return [];
    const rows: LatestRow[] = [];
    for (const col of columns) {
      if (!isFeedColumn(col)) continue;
      const items = feedItemsByColumnId[col.id] ?? [];
      for (const item of items) {
        rows.push({
          item,
          columnTitle: col.title,
          columnId: col.id,
        });
      }
    }
    rows.sort(
      (a, b) =>
        publishedSortKey(b.item.published) -
        publishedSortKey(a.item.published),
    );
    const seen = new Set<string>();
    const out: LatestRow[] = [];
    for (const r of rows) {
      const linkKey = normalizeBookmarkLink(r.item.link ?? "");
      const key =
        linkKey ||
        `title:${r.item.title ?? ""}|col:${r.columnId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
      if (out.length >= LATEST_MAX_ITEMS) break;
    }
    return out;
  }, [columns, feedItemsByColumnId, showLatestRow]);

  /**
   * Always up to three cards × five rows (15 items) in wide mode; only CSS columns
   * change (2 vs 3). Two-column layout wraps the third card—does not drop it.
   * 1 col: one combined list (15 max).
   */
  const latestDisplay = useMemo(() => {
    if (!showLatestRow || latestFlatRows.length === 0) return null;
    const n = latestLayoutColumnCount;
    if (n === 1) {
      return {
        kind: "combined" as const,
        rows: latestFlatRows.slice(0, LATEST_MAX_ITEMS),
      };
    }
    const limited = latestFlatRows.slice(0, LATEST_MAX_ITEMS);
    const chunks: LatestRow[][] = [];
    for (let i = 0; i < limited.length; i += LATEST_ROWS_PER_COLUMN) {
      chunks.push(limited.slice(i, i + LATEST_ROWS_PER_COLUMN));
    }
    return {
      kind: "wide" as const,
      columnCount: n as 2 | 3,
      chunks,
    };
  }, [latestFlatRows, latestLayoutColumnCount, showLatestRow]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const query = searchQuery.trim();
  const isSearch = query.length > 0;

  const searchRows = useMemo(() => {
    if (!isSearch) return [];
    const rows: {
      item: FeedItem;
      columnTitle: string;
      columnId: string;
    }[] = [];
    for (const col of columns) {
      const items = feedItemsByColumnId[col.id] ?? [];
      for (const item of items) {
        if (matchesArticleSearch(query, item)) {
          rows.push({
            item,
            columnTitle: col.title,
            columnId: col.id,
          });
        }
      }
    }
    rows.sort(
      (a, b) =>
        publishedSortKey(b.item.published) - publishedSortKey(a.item.published),
    );
    return rows;
  }, [columns, feedItemsByColumnId, isSearch, query]);

  const filteredByColumnId = useMemo(() => {
    const out: Record<string, FeedItem[]> = {};
    for (const col of columns) {
      const items = feedItemsByColumnId[col.id] ?? [];
      out[col.id] = items.filter((item) =>
        matchesArticleSearch(searchQuery, item),
      );
    }
    return out;
  }, [columns, feedItemsByColumnId, searchQuery]);

  const visibleColumns = useMemo(() => {
    return columns.filter((col) => {
      const items = feedItemsByColumnId[col.id] ?? [];
      const loading = feedLoadingByColumnId[col.id] ?? false;
      const error = feedErrorByColumnId[col.id];
      return shouldShowColumnCard(col, items, loading, error);
    });
  }, [columns, feedItemsByColumnId, feedLoadingByColumnId, feedErrorByColumnId]);

  /** Layout order for the grid: section headers (full width) + visible feed columns in sequence. */
  const gridRenderEntries = useMemo(() => {
    const out: { kind: "header" | "feed"; column: GridColumn }[] = [];
    for (const col of gridLayoutColumns) {
      if (col.kind === "header") {
        out.push({ kind: "header", column: col });
      } else if (visibleColumns.some((v) => v.id === col.id)) {
        out.push({ kind: "feed", column: col });
      }
    }
    return out;
  }, [gridLayoutColumns, visibleColumns]);

  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [activeColumnWidth, setActiveColumnWidth] = useState<number | null>(
    null,
  );

  const gridWrapRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleGridDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const visibleLayout = gridRenderEntries.map((e) => e.column);
      const oldIndex = visibleLayout.findIndex((c) => c.id === active.id);
      const newIndex = visibleLayout.findIndex((c) => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const newVisibleOrder = arrayMove(visibleLayout, oldIndex, newIndex);
      const merged = mergeVisibleColumnOrder(
        gridLayoutColumns,
        visibleLayout,
        newVisibleOrder,
      );
      void reorderColumns(merged);
    },
    [gridLayoutColumns, gridRenderEntries, reorderColumns],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      setActiveColumnId(id);
      setActiveColumnWidth(null);
      requestAnimationFrame(() => {
        const entry = gridRenderEntries.find((e) => e.column.id === id);
        const escaped =
          typeof CSS !== "undefined" && "escape" in CSS
            ? CSS.escape(id)
            : id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        const activeEl = document.querySelector(
          `[data-grid-column-id="${escaped}"]`,
        );

        let width: number | undefined;

        if (entry?.kind === "header") {
          const grid =
            gridRef.current ??
            document.querySelector<HTMLElement>(".grid-feed");
          const feedEl = grid?.querySelector<HTMLElement>("[data-feed-column]");
          if (feedEl) {
            width = feedEl.getBoundingClientRect().width;
          } else if (grid) {
            width = estimateOneColumnTrackWidth(grid);
          }
        } else if (activeEl instanceof HTMLElement) {
          width = activeEl.getBoundingClientRect().width;
        }

        if (width !== undefined && width > 0) {
          setActiveColumnWidth(Math.round(width));
        }
      });
    },
    [gridRenderEntries],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveColumnId(null);
      setActiveColumnWidth(null);
      handleGridDragEnd(event);
    },
    [handleGridDragEnd],
  );

  const handleDragCancel = useCallback(() => {
    setActiveColumnId(null);
    setActiveColumnWidth(null);
  }, []);

  const activeColumn = useMemo(
    () =>
      activeColumnId
        ? visibleColumns.find((c) => c.id === activeColumnId)
        : undefined,
    [activeColumnId, visibleColumns],
  );

  const activeGridEntry = useMemo(() => {
    if (!activeColumnId) return undefined;
    return gridRenderEntries.find((e) => e.column.id === activeColumnId);
  }, [activeColumnId, gridRenderEntries]);

  const gridSortDragKind: GridSortDragKind = useMemo(() => {
    if (!activeColumnId) return null;
    const entry = gridRenderEntries.find((e) => e.column.id === activeColumnId);
    if (!entry) return null;
    return entry.kind === "header" ? "header" : "feed";
  }, [activeColumnId, gridRenderEntries]);

  const insertionOrderedIds = useMemo(
    () => gridRenderEntries.map((e) => e.column.id),
    [gridRenderEntries],
  );

  if (
    columns.length === 0 &&
    !gridLayoutColumns.some((c) => c.kind === "header")
  ) {
    return (
      <div className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-4 px-4 pb-8 text-center text-muted-foreground">
        <div className="flex min-w-0 max-w-lg flex-col gap-3">
          <p className="text-lg font-medium text-foreground">No columns yet</p>
          <p className="text-sm">
            Open <span className="font-medium text-foreground">Settings</span>{" "}
            to add sources and arrange your grid, or use the control below.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {GRID_EMPTY_RSS_NOTE}
          </p>
        </div>
        <div className="w-full max-w-md">
          <GridAddDividerRow
            onAddSectionHeader={() =>
              void insertColumnAfter(null, "header", "New section")
            }
            onOpenAddFeedModal={() => openAddFeedModal(null)}
          />
        </div>
      </div>
    );
  }

  if (isSearch) {
    return (
      <div className="w-full min-w-0 px-4 py-4">
        {searchRows.length === 0 ? (
          <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No matches</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Nothing in your feeds matches this search. Try different
              keywords.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-medium text-foreground">
                Search results
              </p>
              <p className="text-xs text-muted-foreground">
                {searchRows.length}{" "}
                {searchRows.length === 1 ? "article" : "articles"}
              </p>
            </div>
            <ul className="min-w-0">
              {searchRows.map((row, i) => (
                <FeedEntryRow
                  key={`${row.columnId}-${row.item.link ?? row.item.title}-${i}`}
                  item={row.item}
                  isLast={i === searchRows.length - 1}
                  columnTitle={row.columnTitle}
                  columnId={row.columnId}
                  showSourceLine
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (gridRenderEntries.length === 0 && !showLatestRow) {
    return (
      <div className="flex min-h-[35vh] w-full flex-col items-center justify-center gap-4 px-4 pb-8 text-center">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">No articles to show</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Feeds are empty or still loading. Add sources in Settings if you have
            not already.
          </p>
        </div>
        <div className="w-full max-w-md">
          <GridAddDividerRow
            onAddSectionHeader={() =>
              void insertColumnAfter(null, "header", "New section")
            }
            onOpenAddFeedModal={() => openAddFeedModal(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={gridSortCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <GridSortDragKindContext.Provider value={gridSortDragKind}>
        <div ref={gridWrapRef} className="relative w-full min-w-0">
          <GridHeaderDropLine wrapRef={gridWrapRef} gridRef={gridRef} />
          {showLatestRow ? (
            <div className="px-4 pb-4 pt-4">
              <h2 className="mb-3 pl-4 text-xl font-semibold tracking-tight text-foreground">
                {latestRowHeading}
              </h2>
              {latestFlatRows.length === 0 ? (
                <p className="pl-4 text-sm text-muted-foreground">
                  No recent articles yet.
                </p>
              ) : latestDisplay?.kind === "combined" ? (
                <Card className="flex h-auto min-w-0 w-full flex-col border-0 shadow-none">
                  <CardContent className="flex min-h-0 flex-1 flex-col px-2 pb-3 pt-0">
                    <ul className="min-w-0">
                      {latestDisplay.rows.map((row, i) => (
                        <FeedEntryRow
                          key={`${row.columnId}-${row.item.link ?? row.item.title}-${i}`}
                          item={row.item}
                          isLast={i === latestDisplay.rows.length - 1}
                          columnTitle={row.columnTitle}
                          columnId={row.columnId}
                          showSourceLine
                        />
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ) : latestDisplay?.kind === "wide" ? (
                <div
                  className={cn(
                    "grid gap-4",
                    latestDisplay.columnCount === 3
                      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                      : "grid-cols-1 sm:grid-cols-2",
                  )}
                >
                  {latestDisplay.chunks.map((chunk, colIdx) => (
                    <Card
                      key={`latest-col-${colIdx}`}
                      className="flex h-auto min-h-[220px] w-full min-w-0 flex-col border-0 shadow-none"
                    >
                      <CardContent className="flex min-h-0 flex-1 flex-col px-2 pb-3 pt-0">
                        <ul className="min-w-0">
                          {chunk.map((row, i) => (
                            <FeedEntryRow
                              key={`${row.columnId}-${row.item.link ?? row.item.title}-${i}`}
                              item={row.item}
                              isLast={i === chunk.length - 1}
                              columnTitle={row.columnTitle}
                              columnId={row.columnId}
                              showSourceLine
                            />
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <SortableContext
            items={gridRenderEntries.map((e) => e.column.id)}
            strategy={rectSortingNoScaleStrategy}
          >
            <div ref={gridRef} className="relative z-0 grid-feed w-full min-w-0">
              {gridRenderEntries.length === 0 ? (
                <div className="col-span-full flex min-h-[24vh] flex-col items-center justify-center gap-2 px-2 py-8 text-center">
                  <p className="text-sm font-medium text-foreground">
                    No articles in the grid
                  </p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Feeds may be empty or hidden here. Add sources in Settings or
                    use the control below.
                  </p>
                  <div className="mt-2 w-full max-w-md">
                    <GridAddDividerRow
                      onAddSectionHeader={() =>
                        void insertColumnAfter(null, "header", "New section")
                      }
                      onOpenAddFeedModal={() => openAddFeedModal(null)}
                    />
                  </div>
                </div>
              ) : (
                gridRenderEntries.map((entry) =>
                  entry.kind === "header" ? (
                    <SortableGridSectionHeader
                      key={entry.column.id}
                      column={entry.column}
                    />
                  ) : (
                    <SortableGridColumn
                      key={entry.column.id}
                      column={entry.column}
                      items={filteredByColumnId[entry.column.id] ?? []}
                      loading={feedLoadingByColumnId[entry.column.id] ?? false}
                      error={feedErrorByColumnId[entry.column.id]}
                    />
                  ),
                )
              )}
              <GridInsertionOverlay
                gridRef={gridRef}
                orderedIds={insertionOrderedIds}
                hidden={
                  activeColumnId !== null || !showGridInsertionLines
                }
                onInsertSectionHeader={(afterId) =>
                  void insertColumnAfter(afterId, "header", "New section")
                }
                onOpenAddFeedModal={(afterId) => openAddFeedModal(afterId)}
              />
            </div>
          </SortableContext>
        </div>
      </GridSortDragKindContext.Provider>
      <DragOverlay>
        {activeGridEntry?.kind === "header" ? (
          <div
            className="min-w-0 max-w-full"
            style={activeColumnWidth ? { width: activeColumnWidth } : undefined}
          >
            <GridSectionHeaderDragOverlay column={activeGridEntry.column} />
          </div>
        ) : activeColumn ? (
          <div
            className="min-w-0 max-w-full rounded-xl border border-border bg-card shadow-lg"
            style={activeColumnWidth ? { width: activeColumnWidth } : undefined}
          >
            <GridColumnDragOverlay
              column={activeColumn}
              items={filteredByColumnId[activeColumn.id] ?? []}
              loading={feedLoadingByColumnId[activeColumn.id] ?? false}
              error={feedErrorByColumnId[activeColumn.id]}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
