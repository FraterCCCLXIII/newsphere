import { ChevronDown, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AGGREGATE_PAGE_ID } from "@/types/grid";
import type { GridPage } from "@/types/grid";

type PageSwitcherProps = {
  pages: GridPage[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage: (name: string) => Promise<void>;
};

export function PageSwitcher({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
}: PageSwitcherProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const showAggregate = pages.length > 1;

  const activeLabel = useMemo(() => {
    if (activePageId === AGGREGATE_PAGE_ID && showAggregate) return "All";
    const p = pages.find((x) => x.id === activePageId);
    return p?.name ?? "News";
  }, [pages, activePageId, showAggregate]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await onAddPage(newPageName);
      setNewPageName("");
      setAddOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "app-no-drag h-8 max-w-[min(12rem,calc(100%-10rem))] shrink gap-1 px-2 text-sm font-medium text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground",
            )}
            aria-label={`Current page: ${activeLabel}. Open page menu`}
            aria-haspopup="menu"
          >
            <span className="truncate">{activeLabel}</span>
            <ChevronDown className="size-4 shrink-0 opacity-70" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="app-no-drag w-56"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {showAggregate ? (
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => {
                void onSelectPage(AGGREGATE_PAGE_ID);
              }}
            >
              <span
                className={cn(
                  "truncate",
                  activePageId === AGGREGATE_PAGE_ID &&
                    "font-medium text-foreground",
                )}
              >
                All
              </span>
            </DropdownMenuItem>
          ) : null}
          {pages.map((p) => (
            <DropdownMenuItem
              key={p.id}
              className="cursor-pointer"
              onSelect={() => {
                void onSelectPage(p.id);
              }}
            >
              <span
                className={cn(
                  "truncate",
                  p.id === activePageId && "font-medium text-foreground",
                )}
              >
                {p.name}
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => {
              setAddOpen(true);
            }}
          >
            <Plus className="mr-2 size-4 shrink-0 text-muted-foreground" />
            Add New Page
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="app-no-drag sm:max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Add new page</DialogTitle>
              <DialogDescription>
                Create a separate layout of sources. You can switch pages from
                the menu next to the app name.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-2">
              <Label htmlFor="new-page-name">Page name</Label>
              <Input
                id="new-page-name"
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                placeholder="e.g. Tech, Morning reads"
                autoComplete="off"
                autoFocus
                disabled={submitting}
                aria-describedby="new-page-name-hint"
              />
              <p id="new-page-name-hint" className="sr-only">
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
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create page"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
