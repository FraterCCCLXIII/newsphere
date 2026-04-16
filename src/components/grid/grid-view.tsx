import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useCallback, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { FeedEntryRow } from "@/components/grid/column-card";
import {
  GridColumnDragOverlay,
  SortableGridColumn,
} from "@/components/grid/sortable-grid-column";
import { GRID_EMPTY_RSS_NOTE } from "@/lib/feed-messages";
import { publishedSortKey } from "@/lib/feed-time";
import { mergeVisibleColumnOrder } from "@/lib/grid-reorder";
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

export function GridView() {
  const {
    columns,
    reorderColumns,
    searchQuery,
    feedItemsByColumnId,
    feedLoadingByColumnId,
    feedErrorByColumnId,
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

  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [activeColumnWidth, setActiveColumnWidth] = useState<number | null>(
    null,
  );

  const handleGridDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = visibleColumns.findIndex((c) => c.id === active.id);
      const newIndex = visibleColumns.findIndex((c) => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const newVisibleOrder = arrayMove(visibleColumns, oldIndex, newIndex);
      const merged = mergeVisibleColumnOrder(
        columns,
        visibleColumns,
        newVisibleOrder,
      );
      void reorderColumns(merged);
    },
    [columns, visibleColumns, reorderColumns],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveColumnId(id);
    setActiveColumnWidth(null);
    requestAnimationFrame(() => {
      const escaped =
        typeof CSS !== "undefined" && "escape" in CSS
          ? CSS.escape(id)
          : id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const el = document.querySelector(`[data-grid-column-id="${escaped}"]`);
      if (el instanceof HTMLElement) {
        setActiveColumnWidth(el.getBoundingClientRect().width);
      }
    });
  }, []);

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

  if (columns.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
        <p className="text-lg font-medium text-foreground">No columns yet</p>
        <p className="max-w-md text-sm">
          Open <span className="font-medium text-foreground">Settings</span>{" "}
          to add sources and arrange your grid.
        </p>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          {GRID_EMPTY_RSS_NOTE}
        </p>
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

  if (visibleColumns.length === 0) {
    return (
      <div className="flex min-h-[35vh] flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm font-medium text-foreground">No articles to show</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Feeds are empty or still loading. Add sources in Settings if you have
          not already.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={visibleColumns.map((c) => c.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid-feed w-full min-w-0">
          {visibleColumns.map((column) => (
            <SortableGridColumn
              key={column.id}
              column={column}
              items={filteredByColumnId[column.id] ?? []}
              loading={feedLoadingByColumnId[column.id] ?? false}
              error={feedErrorByColumnId[column.id]}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeColumn ? (
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
