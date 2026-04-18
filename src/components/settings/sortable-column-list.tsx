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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { isFeedColumn, type GridColumn } from "@/types/grid";

function cssEscapeSelector(s: string): string {
  return typeof CSS !== "undefined" && "escape" in CSS
    ? (CSS as { escape: (s: string) => string }).escape(s)
    : s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** One column width for the settings grid (gap-2 = 8px; breakpoints match Tailwind sm/lg). */
function estimateOneColumnWidth(gridEl: HTMLElement): number {
  const w = gridEl.getBoundingClientRect().width;
  const cols =
    window.matchMedia("(min-width: 1024px)").matches
      ? 3
      : window.matchMedia("(min-width: 640px)").matches
        ? 2
        : 1;
  const gapPx = 8;
  return Math.max(120, (w - gapPx * (cols - 1)) / cols);
}

type SortableColumnListProps = {
  columns: GridColumn[];
  onReorder: (columns: GridColumn[]) => void;
  onRemove: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void | Promise<void>;
};

function SortableFeedRow({
  column,
  onRemove,
  onEditTitle,
}: {
  column: GridColumn;
  onRemove: (id: string) => void;
  onEditTitle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      data-sortable-column-id={column.id}
      style={style}
      className={cn(
        "flex min-h-[4.5rem] min-w-0 items-center gap-2 rounded-lg border bg-card px-2 py-2 shadow-sm",
        isDragging && "z-10",
      )}
    >
      <button
        type="button"
        className="touch-none rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{column.title}</p>
        {column.feedUrl ? (
          <p className="truncate font-mono text-xs text-muted-foreground">
            {column.feedUrl}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={onEditTitle}
        aria-label={`Rename ${column.title}`}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(column.id)}
        aria-label={`Remove ${column.title}`}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function SortableHeaderRow({
  column,
  onRemove,
  onEditTitle,
}: {
  column: GridColumn;
  onRemove: (id: string) => void;
  onEditTitle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      data-sortable-column-id={column.id}
      style={style}
      className={cn(
        "col-span-full flex min-h-11 min-w-0 items-center gap-2 rounded-md border border-border/80 bg-card px-2 py-2.5 shadow-sm",
        isDragging && "z-10",
      )}
    >
      <button
        type="button"
        className="touch-none rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Drag to reorder section header"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold tracking-tight text-foreground">
          {column.title}
        </p>
        <p className="text-xs text-muted-foreground">
          Full-width label between rows on the home grid
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={onEditTitle}
        aria-label={`Rename section ${column.title}`}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(column.id)}
        aria-label={`Remove section header ${column.title}`}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

/** Visual-only copy for DragOverlay (no sortable / no interactive actions). */
function ColumnListFeedOverlay({ column }: { column: GridColumn }) {
  return (
    <div className="flex min-h-[4.5rem] min-w-0 items-center gap-2 px-2 py-2">
      <div
        className="touch-none rounded p-1 text-muted-foreground"
        aria-hidden
      >
        <GripVertical className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{column.title}</p>
        {column.feedUrl ? (
          <p className="truncate font-mono text-xs text-muted-foreground">
            {column.feedUrl}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-0.5 opacity-50" aria-hidden>
        <span className="inline-flex size-9 items-center justify-center rounded-md">
          <Pencil className="size-4" />
        </span>
        <span className="inline-flex size-9 items-center justify-center rounded-md">
          <Trash2 className="size-4" />
        </span>
      </div>
    </div>
  );
}

/** Same footprint as a feed tile so the header can move in the grid without spanning full width. */
function ColumnListHeaderCompactOverlay({ column }: { column: GridColumn }) {
  return (
    <div className="flex min-h-[4.5rem] min-w-0 items-center gap-2 px-2 py-2">
      <div
        className="touch-none rounded p-1 text-muted-foreground"
        aria-hidden
      >
        <GripVertical className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{column.title}</p>
        <p className="truncate text-xs text-muted-foreground">Section header</p>
      </div>
      <div className="flex shrink-0 gap-0.5 opacity-50" aria-hidden>
        <span className="inline-flex size-9 items-center justify-center rounded-md">
          <Pencil className="size-4" />
        </span>
        <span className="inline-flex size-9 items-center justify-center rounded-md">
          <Trash2 className="size-4" />
        </span>
      </div>
    </div>
  );
}

export function SortableColumnList({
  columns,
  onReorder,
  onRemove,
  onUpdateTitle,
}: SortableColumnListProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeItemWidth, setActiveItemWidth] = useState<number | null>(null);

  const activeDragColumn = activeDragId
    ? columns.find((c) => c.id === activeDragId)
    : undefined;

  const clearDragUi = useCallback(() => {
    setActiveDragId(null);
    setActiveItemWidth(null);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveDragId(id);
    setActiveItemWidth(null);
    requestAnimationFrame(() => {
      const col = columns.find((c) => c.id === id);
      if (!col) return;

      if (isFeedColumn(col)) {
        const el = document.querySelector(
          `[data-sortable-column-id="${cssEscapeSelector(id)}"]`,
        );
        if (el instanceof HTMLElement) {
          setActiveItemWidth(el.getBoundingClientRect().width);
        }
        return;
      }

      const firstFeed = columns.find(isFeedColumn);
      if (firstFeed) {
        const feedEl = document.querySelector(
          `[data-sortable-column-id="${cssEscapeSelector(firstFeed.id)}"]`,
        );
        if (feedEl instanceof HTMLElement) {
          setActiveItemWidth(feedEl.getBoundingClientRect().width);
          return;
        }
      }

      const headerEl = document.querySelector(
        `[data-sortable-column-id="${cssEscapeSelector(id)}"]`,
      );
      const grid = headerEl?.closest("[data-sortable-column-grid]");
      if (grid instanceof HTMLElement) {
        setActiveItemWidth(estimateOneColumnWidth(grid));
      }
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    clearDragUi();
    if (!over || active.id === over.id) return;

    const oldIndex = columns.findIndex((c) => c.id === active.id);
    const newIndex = columns.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(columns, oldIndex, newIndex));
  };

  const handleDragCancel = () => {
    clearDragUi();
  };

  const openEdit = (column: GridColumn) => {
    setEditId(column.id);
    setEditValue(column.title);
    setEditOpen(true);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId || editSubmitting) return;
    const t = editValue.trim();
    if (!t) return;
    setEditSubmitting(true);
    try {
      await onUpdateTitle(editId, t);
      setEditOpen(false);
      setEditId(null);
      setEditValue("");
    } finally {
      setEditSubmitting(false);
    }
  };

  if (columns.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No columns yet. Use <span className="font-medium text-foreground">Add</span>{" "}
        for feeds or add a section header to group sources in this list.
      </p>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={columns.map((c) => c.id)}
          strategy={rectSortingStrategy}
        >
          <div
            className="grid grid-cols-1 items-start gap-2 sm:grid-cols-2 lg:grid-cols-3"
            data-sortable-column-grid
          >
            {columns.map((column) =>
              isFeedColumn(column) ? (
                <SortableFeedRow
                  key={column.id}
                  column={column}
                  onRemove={onRemove}
                  onEditTitle={() => openEdit(column)}
                />
              ) : (
                <SortableHeaderRow
                  key={column.id}
                  column={column}
                  onRemove={onRemove}
                  onEditTitle={() => openEdit(column)}
                />
              ),
            )}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {activeDragColumn && isFeedColumn(activeDragColumn) ? (
            <div
              className="min-w-0 max-w-full cursor-grabbing touch-none overflow-hidden rounded-lg border border-border bg-card shadow-lg"
              style={activeItemWidth ? { width: activeItemWidth } : undefined}
            >
              <ColumnListFeedOverlay column={activeDragColumn} />
            </div>
          ) : activeDragColumn?.kind === "header" ? (
            <div
              className="min-w-0 max-w-full cursor-grabbing touch-none overflow-hidden rounded-lg border border-border bg-card shadow-lg"
              style={activeItemWidth ? { width: activeItemWidth } : undefined}
            >
              <ColumnListHeaderCompactOverlay column={activeDragColumn} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditId(null);
            setEditValue("");
          }
          setEditOpen(open);
        }}
      >
        <DialogContent className="app-no-drag sm:max-w-md">
          <form onSubmit={submitEdit}>
            <DialogHeader>
              <DialogTitle>Rename</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2 py-2">
              <Label htmlFor="column-rename">Label</Label>
              <Input
                id="column-rename"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="Name"
                autoComplete="off"
                autoFocus
                disabled={editSubmitting}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={editSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editSubmitting || !editValue.trim()}
              >
                {editSubmitting ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
