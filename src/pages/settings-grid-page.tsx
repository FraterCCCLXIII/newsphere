import {
  Info,
  PencilSimple,
  Plus,
  TextH,
  Trash,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { AddSourceModal } from "@/components/layout/add-source-modal";
import { SortableColumnList } from "@/components/settings/sortable-column-list";
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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { CatalogSource } from "@/types/catalog";
import { AGGREGATE_PAGE_ID, DEFAULT_LATEST_ROW_TITLE } from "@/types/grid";
import type { GridPage } from "@/types/grid";
import type { SettingsOutletContext } from "@/types/settings-outlet";

export function SettingsGridPage() {
  const {
    settingsColumns,
    allColumns,
    isAggregateView,
    pages,
    activePageId,
    addColumn,
    addSectionHeader,
    updateColumnTitle,
    removeColumn,
    reorderColumns,
    requestRenamePage,
    removePage,
    refetchFeeds,
    updatePageLatestRow,
  } = useOutletContext<SettingsOutletContext>();

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const settingsPageName = useMemo(() => {
    if (pages.length === 0) return "News";
    if (activePageId === AGGREGATE_PAGE_ID && pages.length > 1) {
      return pages[0]?.name ?? "News";
    }
    const p = pages.find((x) => x.id === activePageId);
    return p?.name ?? pages[0]?.name ?? "News";
  }, [pages, activePageId]);

  const effectivePage = useMemo((): GridPage | null => {
    if (pages.length === 0) return null;
    if (activePageId === AGGREGATE_PAGE_ID && pages.length > 1) {
      return pages[0] ?? null;
    }
    if (pages.some((p) => p.id === activePageId)) {
      return pages.find((p) => p.id === activePageId) ?? null;
    }
    return pages[0] ?? null;
  }, [pages, activePageId]);

  const handleCatalogAdd = async (source: CatalogSource) => {
    await addColumn(source.name, source.url);
  };

  const handleRemoveByFeedUrl = async (feedUrlToRemove: string) => {
    const norm = (u: string) => u.trim().replace(/\/$/, "");
    const target = norm(feedUrlToRemove);
    const col = allColumns.find(
      (c) => c.feedUrl && norm(c.feedUrl) === target,
    );
    if (col) await removeColumn(col.id);
  };

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-10 px-4 py-8 pb-16">
        <section className="space-y-3" aria-labelledby="settings-page-grid-heading">
          <div className="flex min-w-0 items-center gap-1">
            <h2
              id="settings-page-grid-heading"
              className="min-w-0 text-2xl font-semibold tracking-tight"
            >
              {settingsPageName}
            </h2>
            {effectivePage ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => requestRenamePage(effectivePage)}
                aria-label={`Rename ${effectivePage.name}`}
                title="Rename page"
              >
                <PencilSimple className="size-4" aria-hidden />
              </Button>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-1">
                <h3 className="text-sm font-medium">Your grid columns</h3>
                {!isAggregateView ? (
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label="How grid columns work on the home grid"
                      >
                        <Info className="size-4" aria-hidden />
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent className="p-3" align="start">
                      <p className="text-sm text-muted-foreground">
                        Drag the handle to reorder feeds and section headers. On
                        the home grid, section headers appear full width between
                        rows of feed columns (up to three per row).
                      </p>
                    </HoverCardContent>
                  </HoverCard>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 self-start sm:self-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setCatalogOpen(true)}
                >
                  <Plus className="size-4" aria-hidden />
                  Add
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void addSectionHeader("New section")}
                >
                  <TextH className="size-4" aria-hidden />
                  Section header
                </Button>
              </div>
            </div>
            {isAggregateView ? (
              <p className="text-sm text-muted-foreground">
                You are viewing{" "}
                <span className="font-medium text-foreground">All</span> on the
                home grid. The list below edits{" "}
                <span className="font-medium text-foreground">
                  {pages[0]?.name ?? "News"}
                </span>{" "}
                (highlighted in the sidebar). Use the list on the left to switch
                which page&apos;s sources you edit.
              </p>
            ) : null}
            {effectivePage ? (
              <div className="space-y-3 rounded-lg border border-border bg-card/50 p-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Latest row</h3>
                  <p className="text-sm text-muted-foreground">
                    On the home grid, show the most recent articles from this
                    page&apos;s feeds above the main grid: up to fifteen in three
                    cards of five (three columns on large screens, two columns
                    with the third card wrapping on medium, or one combined list
                    on small). Same styling as feed columns but without column
                    headers. Not part of column drag or reorder.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="settings-latest-row-enabled"
                    checked={effectivePage.latestRow?.enabled ?? false}
                    onCheckedChange={(enabled) =>
                      void updatePageLatestRow(effectivePage.id, { enabled })
                    }
                  />
                  <Label
                    htmlFor="settings-latest-row-enabled"
                    className="cursor-pointer text-sm font-normal"
                  >
                    Show latest row
                  </Label>
                </div>
                {effectivePage.latestRow?.enabled ? (
                  <div className="space-y-2">
                    <Label htmlFor="settings-latest-row-title">Title</Label>
                    <Input
                      id="settings-latest-row-title"
                      placeholder={DEFAULT_LATEST_ROW_TITLE}
                      value={effectivePage.latestRow?.title ?? ""}
                      onChange={(e) =>
                        void updatePageLatestRow(effectivePage.id, {
                          title: e.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Only when this page is selected on the home grid (not when
                      &quot;All&quot; is selected).
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
            <SortableColumnList
              columns={settingsColumns}
              onReorder={(next) => void reorderColumns(next)}
              onRemove={(id) => void removeColumn(id)}
              onUpdateTitle={(id, title) => void updateColumnTitle(id, title)}
            />

            {effectivePage ? (
              <div
                className="border-t border-border pt-8"
                aria-labelledby="settings-delete-page-heading"
              >
                <h3
                  id="settings-delete-page-heading"
                  className="text-sm font-medium text-foreground"
                >
                  Delete this page
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Remove{" "}
                  <span className="font-medium text-foreground">
                    {effectivePage.name}
                  </span>{" "}
                  and all of its section headers and feeds from the app.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-1.5 text-muted-foreground hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive"
                  disabled={pages.length <= 1}
                  title={
                    pages.length <= 1
                      ? "Add another page before you can delete this one."
                      : undefined
                  }
                  onClick={() => {
                    if (pages.length <= 1 || !effectivePage) return;
                    setPendingDelete({
                      id: effectivePage.id,
                      name: effectivePage.name,
                    });
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash className="size-4" aria-hidden />
                  Delete page
                </Button>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent className="app-no-drag sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this page?</DialogTitle>
            <DialogDescription>
              {pendingDelete ? (
                <>
                  <span className="font-medium text-foreground">
                    {pendingDelete.name}
                  </span>{" "}
                  and all of its section headers and feeds will be removed. This
                  cannot be undone.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting || !pendingDelete}
              onClick={() => {
                if (!pendingDelete) return;
                const { id } = pendingDelete;
                setDeleting(true);
                void (async () => {
                  try {
                    await removePage(id);
                    await refetchFeeds();
                    setDeleteDialogOpen(false);
                    setPendingDelete(null);
                  } finally {
                    setDeleting(false);
                  }
                })();
              }}
            >
              {deleting ? "Deleting…" : "Delete page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddSourceModal
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        catalogColumns={allColumns}
        onAddSource={handleCatalogAdd}
        onAddCustomColumn={async (t, u) => {
          await addColumn(t, u);
        }}
        onRemoveByFeedUrl={handleRemoveByFeedUrl}
      />
    </>
  );
}
