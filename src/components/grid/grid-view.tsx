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
import { useCallback, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { FeedEntryRow } from "@/components/grid/column-card";
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
import type { GridColumn } from "@/types/grid";

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
  } = useOutletContext<AppOutletContext>();

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

  if (gridRenderEntries.length === 0) {
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
        <SortableContext
          items={gridRenderEntries.map((e) => e.column.id)}
          strategy={rectSortingNoScaleStrategy}
        >
          <div ref={gridWrapRef} className="relative w-full min-w-0">
            <GridHeaderDropLine wrapRef={gridWrapRef} gridRef={gridRef} />
            <div ref={gridRef} className="grid-feed w-full min-w-0">
              {gridRenderEntries.map((entry) =>
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
              )}
            </div>
            <GridInsertionOverlay
              gridRef={gridRef}
              wrapRef={gridWrapRef}
              orderedIds={insertionOrderedIds}
              hidden={activeColumnId !== null}
              onInsertSectionHeader={(afterId) =>
                void insertColumnAfter(afterId, "header", "New section")
              }
              onOpenAddFeedModal={(afterId) => openAddFeedModal(afterId)}
            />
          </div>
        </SortableContext>
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
