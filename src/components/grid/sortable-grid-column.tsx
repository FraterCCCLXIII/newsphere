import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { ColumnCard } from "@/components/grid/column-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGridSortDragKind } from "@/components/grid/grid-sort-drag-context";
import { sortableStackZIndex } from "@/lib/grid-sort-dnd";
import { cn } from "@/lib/utils";
import type { AppOutletContext } from "@/types/app-outlet";
import type { FeedItem } from "@/types/feed";
import type { GridColumn } from "@/types/grid";

/** Match PointerSensor activation; movement beyond this counts as drag, not a click. */
const MOVE_THRESHOLD_PX = 8;
/** Press longer than this is a hold, not a menu click. */
const MAX_HOLD_MS = 450;

type SortableGridColumnProps = {
  column: GridColumn;
  items: FeedItem[];
  loading: boolean;
  error?: string;
};

/** Full-width section label between rows on the home grid; drag via grip to reorder. */
export function SortableGridSectionHeader({ column }: { column: GridColumn }) {
  const gridSortDragKind = useGridSortDragKind();
  const suppressShuffle = gridSortDragKind === "header";
  const { updateColumnTitle, removeColumn, isAggregateView } =
    useOutletContext<AppOutletContext>();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(column.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const skipBlurCommitRef = useRef(false);
  const committingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevIsDragging = useRef(false);
  const suppressMenuOpenAfterDragRef = useRef(false);
  const isDraggingRef = useRef(false);
  const pointerStartRef = useRef<{ t: number; x: number; y: number } | null>(
    null,
  );
  const movedWhileDownRef = useRef(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
    index,
    activeIndex,
  } = useSortable({
    id: column.id,
    disabled: isAggregateView || editing,
  });

  isDraggingRef.current = isDragging;

  useEffect(() => {
    if (isDragging) {
      setMenuOpen(false);
    }
    const wasDragging = prevIsDragging.current;
    if (wasDragging && !isDragging) {
      suppressMenuOpenAfterDragRef.current = true;
      const t = window.setTimeout(() => {
        suppressMenuOpenAfterDragRef.current = false;
      }, 350);
      prevIsDragging.current = isDragging;
      return () => window.clearTimeout(t);
    }
    prevIsDragging.current = isDragging;
  }, [isDragging]);

  const sortableListeners = listeners as {
    onPointerDown?: (e: ReactPointerEvent) => void;
    onKeyDown?: (e: KeyboardEvent) => void;
  };

  const handleGripPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    movedWhileDownRef.current = false;
    pointerStartRef.current = {
      t: Date.now(),
      x: e.clientX,
      y: e.clientY,
    };

    const onMove = (ev: globalThis.PointerEvent) => {
      if (!pointerStartRef.current) return;
      const dx = ev.clientX - pointerStartRef.current.x;
      const dy = ev.clientY - pointerStartRef.current.y;
      if (Math.hypot(dx, dy) > MOVE_THRESHOLD_PX) {
        movedWhileDownRef.current = true;
      }
    };

    const finish = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", finish);
      document.removeEventListener("pointercancel", finish);
      if (!pointerStartRef.current) return;
      const elapsed = Date.now() - pointerStartRef.current.t;
      pointerStartRef.current = null;

      if (
        suppressMenuOpenAfterDragRef.current ||
        isDraggingRef.current ||
        movedWhileDownRef.current ||
        elapsed > MAX_HOLD_MS
      ) {
        return;
      }
      setMenuOpen(true);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", finish);
    document.addEventListener("pointercancel", finish);
  };

  const stackZ = suppressShuffle
    ? undefined
    : sortableStackZIndex(isSorting, isDragging, index, activeIndex);
  const style = {
    transform: suppressShuffle ? undefined : CSS.Transform.toString(transform),
    transition: suppressShuffle ? undefined : transition,
    opacity: isDragging ? 0 : undefined,
    position:
      suppressShuffle || stackZ === undefined
        ? undefined
        : ("relative" as const),
    zIndex: suppressShuffle ? undefined : stackZ,
  };

  useEffect(() => {
    if (!editing) setDraft(column.title);
  }, [column.title, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = async () => {
    if (committingRef.current) return;
    committingRef.current = true;
    try {
      const t = draft.trim();
      if (!t) {
        setDraft(column.title);
        setEditing(false);
        return;
      }
      if (t !== column.title) {
        await updateColumnTitle(column.id, t);
      }
      setEditing(false);
    } finally {
      committingRef.current = false;
    }
  };

  const cancel = () => {
    skipBlurCommitRef.current = true;
    setDraft(column.title);
    setEditing(false);
  };

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  const handleBlur = () => {
    if (skipBlurCommitRef.current) {
      skipBlurCommitRef.current = false;
      return;
    }
    void commit();
  };

  return (
    <div
      ref={setNodeRef}
      data-grid-column-id={column.id}
      style={style}
      className="group relative col-span-full min-h-12 min-w-0 px-2 py-3 text-xl font-semibold text-foreground"
      role="group"
      aria-label={`Section: ${column.title}`}
    >
      {!editing ? (
        <DropdownMenu
          modal={false}
          open={menuOpen}
          onOpenChange={(open) => {
            if (open) {
              return;
            }
            setMenuOpen(false);
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "app-no-drag absolute -left-2.5 top-1/2 z-[1] -translate-y-1/2",
                "touch-none size-8 shrink-0 text-muted-foreground transition-opacity",
                "opacity-0 group-hover:opacity-100",
                isDragging && "opacity-100",
                "hover:bg-accent hover:text-foreground",
                "cursor-grab active:cursor-grabbing",
              )}
              aria-label="Section options"
              aria-haspopup="menu"
              title="Drag to reorder, or quick-click for menu"
              {...attributes}
              onPointerDown={(e) => {
                sortableListeners.onPointerDown?.(e);
                handleGripPointerDown(e);
              }}
              onKeyDown={(e) => {
                sortableListeners.onKeyDown?.(e);
                if (e.defaultPrevented) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (!suppressMenuOpenAfterDragRef.current) {
                    setMenuOpen(true);
                  }
                }
              }}
            >
              <GripVertical className="size-4 shrink-0" aria-hidden />
              <span className="sr-only">Open section menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="app-no-drag w-48"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              onSelect={() => void removeColumn(column.id)}
            >
              <Trash2 className="size-4" aria-hidden />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {editing ? (
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleTitleKeyDown}
          onBlur={handleBlur}
          className="h-auto min-h-0 min-w-0 w-full rounded-none border-0 bg-transparent py-0 pl-2 pr-0 text-xl font-semibold text-foreground shadow-none ring-0 ring-offset-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0 md:text-xl"
          aria-label="Section title"
          autoComplete="off"
        />
      ) : (
        <span
          className="block min-w-0 cursor-text select-text rounded-sm pl-2 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
          tabIndex={0}
          onDoubleClick={() => {
            setDraft(column.title);
            setEditing(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setDraft(column.title);
              setEditing(true);
            }
          }}
        >
          {column.title}
        </span>
      )}
    </div>
  );
}

/** Drag overlay for section headers (boxed card while moving). */
export function GridSectionHeaderDragOverlay({ column }: { column: GridColumn }) {
  return (
    <div className="min-w-0 max-w-full cursor-grabbing touch-none">
      <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
        <p className="text-xl font-semibold text-foreground">{column.title}</p>
      </div>
    </div>
  );
}

/** Visual-only copy for DragOverlay (no sortable listeners). */
export function GridColumnDragOverlay({
  column,
  items,
  loading,
  error,
}: SortableGridColumnProps) {
  const dragHandle = (
    <div
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground"
      aria-hidden
    >
      <GripVertical className="size-4 shrink-0" />
    </div>
  );

  return (
    <div className="min-w-0 max-w-full cursor-grabbing touch-none">
      <ColumnCard
        column={column}
        items={items}
        loading={loading}
        error={error}
        isDragging
        dragHandle={dragHandle}
      />
    </div>
  );
}

export function SortableGridColumn({
  column,
  items,
  loading,
  error,
}: SortableGridColumnProps) {
  const gridSortDragKind = useGridSortDragKind();
  const suppressShuffle = gridSortDragKind === "header";
  const { removeColumn, isAggregateView } = useOutletContext<AppOutletContext>();
  const [menuOpen, setMenuOpen] = useState(false);
  const prevIsDragging = useRef(false);
  const suppressMenuOpenAfterDragRef = useRef(false);
  const isDraggingRef = useRef(false);
  const pointerStartRef = useRef<{ t: number; x: number; y: number } | null>(
    null,
  );
  const movedWhileDownRef = useRef(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
    index,
    activeIndex,
  } = useSortable({ id: column.id, disabled: isAggregateView });

  isDraggingRef.current = isDragging;

  useEffect(() => {
    if (isDragging) {
      setMenuOpen(false);
    }
    const wasDragging = prevIsDragging.current;
    if (wasDragging && !isDragging) {
      suppressMenuOpenAfterDragRef.current = true;
      const t = window.setTimeout(() => {
        suppressMenuOpenAfterDragRef.current = false;
      }, 350);
      prevIsDragging.current = isDragging;
      return () => window.clearTimeout(t);
    }
    prevIsDragging.current = isDragging;
  }, [isDragging]);

  const sortableListeners = listeners as {
    onPointerDown?: (e: ReactPointerEvent) => void;
    onKeyDown?: (e: KeyboardEvent) => void;
  };

  const handleGripPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    movedWhileDownRef.current = false;
    pointerStartRef.current = {
      t: Date.now(),
      x: e.clientX,
      y: e.clientY,
    };

    const onMove = (ev: globalThis.PointerEvent) => {
      if (!pointerStartRef.current) return;
      const dx = ev.clientX - pointerStartRef.current.x;
      const dy = ev.clientY - pointerStartRef.current.y;
      if (Math.hypot(dx, dy) > MOVE_THRESHOLD_PX) {
        movedWhileDownRef.current = true;
      }
    };

    const finish = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", finish);
      document.removeEventListener("pointercancel", finish);
      if (!pointerStartRef.current) return;
      const elapsed = Date.now() - pointerStartRef.current.t;
      pointerStartRef.current = null;

      if (
        suppressMenuOpenAfterDragRef.current ||
        isDraggingRef.current ||
        movedWhileDownRef.current ||
        elapsed > MAX_HOLD_MS
      ) {
        return;
      }
      setMenuOpen(true);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", finish);
    document.addEventListener("pointercancel", finish);
  };

  const stackZ = suppressShuffle
    ? undefined
    : sortableStackZIndex(isSorting, isDragging, index, activeIndex);
  const style = {
    transform: suppressShuffle ? undefined : CSS.Transform.toString(transform),
    transition: suppressShuffle ? undefined : transition,
    opacity: isDragging ? 0 : undefined,
    position:
      suppressShuffle || stackZ === undefined
        ? undefined
        : ("relative" as const),
    zIndex: suppressShuffle ? undefined : stackZ,
  };

  const dragHandle = (
    <DropdownMenu
      modal={false}
      open={menuOpen}
      onOpenChange={(open) => {
        if (open) {
          /* Opening is only via setMenuOpen(true) after a valid quick press; Radix trigger open is ignored. */
          return;
        }
        setMenuOpen(false);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "app-no-drag touch-none size-8 shrink-0 text-muted-foreground hover:bg-accent hover:text-foreground",
            "cursor-grab active:cursor-grabbing",
          )}
          aria-label="Column options"
          aria-haspopup="menu"
          title={
            isAggregateView
              ? "Quick-click for menu (reorder on a single page from the header)"
              : "Drag to reorder, or quick-click for menu"
          }
          {...attributes}
          onPointerDown={(e) => {
            sortableListeners.onPointerDown?.(e);
            handleGripPointerDown(e);
          }}
          onKeyDown={(e) => {
            sortableListeners.onKeyDown?.(e);
            if (e.defaultPrevented) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!suppressMenuOpenAfterDragRef.current) {
                setMenuOpen(true);
              }
            }
          }}
        >
          <GripVertical className="size-4 shrink-0" aria-hidden />
          <span className="sr-only">Open column menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="app-no-drag w-48"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuItem
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          onSelect={() => void removeColumn(column.id)}
        >
          <Trash2 className="size-4" aria-hidden />
          Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div
      ref={setNodeRef}
      data-grid-column-id={column.id}
      data-feed-column
      style={style}
      className={cn(
        "min-w-0",
        isDragging && "pointer-events-none opacity-0",
      )}
    >
      <ColumnCard
        column={column}
        items={items}
        loading={loading}
        error={error}
        isDragging={isDragging}
        dragHandle={dragHandle}
      />
    </div>
  );
}
