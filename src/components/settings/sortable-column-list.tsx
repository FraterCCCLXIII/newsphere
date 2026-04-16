import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { GridColumn } from "@/types/grid";

type SortableColumnListProps = {
  columns: GridColumn[];
  onReorder: (columns: GridColumn[]) => void;
  onRemove: (id: string) => void;
};

function SortableRow({
  column,
  onRemove,
}: {
  column: GridColumn;
  onRemove: (id: string) => void;
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
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-card px-2 py-2 shadow-sm",
        isDragging && "z-10 opacity-80 shadow-md",
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
        className="shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(column.id)}
        aria-label={`Remove ${column.title}`}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

export function SortableColumnList({
  columns,
  onReorder,
  onRemove,
}: SortableColumnListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = columns.findIndex((c) => c.id === active.id);
    const newIndex = columns.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(columns, oldIndex, newIndex));
  };

  if (columns.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No columns yet. Add one below.
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={columns.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <ScrollArea className="h-[min(50vh,360px)] pr-3">
          <div className="flex flex-col gap-2">
            {columns.map((column) => (
              <SortableRow
                key={column.id}
                column={column}
                onRemove={onRemove}
              />
            ))}
          </div>
        </ScrollArea>
      </SortableContext>
    </DndContext>
  );
}
