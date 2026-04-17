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
import { GripVertical, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AGGREGATE_PAGE_ID } from "@/types/grid";
import type { GridPage } from "@/types/grid";

function effectiveSettingsPageId(
  activePageId: string,
  pages: GridPage[],
): string | null {
  if (pages.length === 0) return null;
  if (activePageId === AGGREGATE_PAGE_ID && pages.length > 1) {
    return pages[0]?.id ?? null;
  }
  if (pages.some((p) => p.id === activePageId)) {
    return activePageId;
  }
  return pages[0]?.id ?? null;
}

type SortablePageRowProps = {
  page: GridPage;
  isActive: boolean;
  onSelect: () => void;
  onRename: () => void;
};

function SortablePageRow({
  page,
  isActive,
  onSelect,
  onRename,
}: SortablePageRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex min-w-0 items-center gap-0.5 rounded-md",
        isDragging && "z-10 opacity-80",
      )}
    >
      <button
        type="button"
        className="touch-none rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label={`Drag to reorder ${page.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4 shrink-0" aria-hidden />
      </button>
      <Button
        type="button"
        variant={isActive ? "secondary" : "ghost"}
        size="sm"
        className={cn(
          "h-9 min-w-0 flex-1 justify-start px-2 font-normal",
          isActive && "font-medium text-foreground",
        )}
        onClick={onSelect}
      >
        <span className="truncate">{page.name}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          onRename();
        }}
        aria-label={`Rename ${page.name}`}
      >
        <Pencil className="size-4" aria-hidden />
      </Button>
    </div>
  );
}

type SettingsPagesNavProps = {
  pages: GridPage[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage: (name: string) => Promise<void>;
  onReorderPages: (pages: GridPage[]) => Promise<void>;
  onRequestRenamePage: (page: GridPage) => void;
};

export function SettingsPagesNav({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onReorderPages,
  onRequestRenamePage,
}: SettingsPagesNavProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedId = useMemo(
    () => effectiveSettingsPageId(activePageId, pages),
    [activePageId, pages],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pages.findIndex((p) => p.id === active.id);
    const newIndex = pages.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    void onReorderPages(arrayMove(pages, oldIndex, newIndex));
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const name = newPageName.trim();
    if (!name) return;
    setSubmitting(true);
    try {
      await onAddPage(name);
      setNewPageName("");
      setAddOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <aside className="flex min-h-0 shrink-0 flex-col border-b border-border bg-muted/20 max-md:max-h-[min(42vh,20rem)] md:w-56 md:border-b-0 md:border-r">
        <div className="border-b border-border px-3 py-3">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Settings
          </h2>
        </div>

        <nav
          className="shrink-0 space-y-0.5 border-b border-border px-2 py-2"
          aria-label="Settings sections"
        >
          <NavLink
            to="/settings/app"
            className={({ isActive }) =>
              cn(
                "app-no-drag flex w-full rounded-md px-2 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )
            }
          >
            App
          </NavLink>
          <NavLink
            to="/settings/about"
            className={({ isActive }) =>
              cn(
                "app-no-drag flex w-full rounded-md px-2 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )
            }
          >
            About
          </NavLink>
        </nav>

        <ScrollArea className="min-h-0 flex-1">
          <div className="min-w-0">
            <h3
              id="settings-pages-heading"
              className="px-3 pb-1 pt-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Pages
            </h3>
            {pages.length === 0 ? (
              <p className="px-3 pb-2 text-xs text-muted-foreground">
                No pages yet.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={pages.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <nav
                    className="space-y-0.5 p-2"
                    aria-labelledby="settings-pages-heading"
                    aria-label="Grid pages"
                  >
                    {pages.map((p) => (
                      <SortablePageRow
                        key={p.id}
                        page={p}
                        isActive={selectedId === p.id}
                        onSelect={() => {
                          void onSelectPage(p.id);
                        }}
                        onRename={() => onRequestRenamePage(p)}
                      />
                    ))}
                  </nav>
                </SortableContext>
              </DndContext>
            )}
            <div className="p-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="size-4 shrink-0" aria-hidden />
                Add page
              </Button>
            </div>
          </div>
        </ScrollArea>
      </aside>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="app-no-drag sm:max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Add new page</DialogTitle>
              <DialogDescription>
                Create a separate layout of sources. You can switch pages from
                the header or this sidebar.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-2">
              <Label htmlFor="settings-new-page-name">Page name</Label>
              <Input
                id="settings-new-page-name"
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                placeholder="e.g. Tech, Morning reads"
                autoComplete="off"
                autoFocus
                disabled={submitting}
                aria-describedby="settings-new-page-name-hint"
              />
              <p id="settings-new-page-name-hint" className="sr-only">
                Name for the new page of feed columns
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !newPageName.trim()}>
                {submitting ? "Creating…" : "Create page"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
