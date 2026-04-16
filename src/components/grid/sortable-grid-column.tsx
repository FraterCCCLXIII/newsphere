import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { ColumnCard } from "@/components/grid/column-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : undefined,
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
