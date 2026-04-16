import { Heading, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { AddSourceModal } from "@/components/layout/add-source-modal";
import { SettingsPagesNav } from "@/components/settings/settings-pages-nav";
import { SortableColumnList } from "@/components/settings/sortable-column-list";
import { Button } from "@/components/ui/button";
import type { CatalogSource } from "@/types/catalog";
import type { AppOutletContext } from "@/types/app-outlet";
import { AGGREGATE_PAGE_ID } from "@/types/grid";

export function SettingsPage() {
  const {
    settingsColumns,
    allColumns,
    isAggregateView,
    pages,
    activePageId,
    setActivePage,
    addPage,
    addColumn,
    addSectionHeader,
    updateColumnTitle,
    removeColumn,
    reorderColumns,
    reorderPages,
    renamePage,
  } = useOutletContext<AppOutletContext>();

  const [catalogOpen, setCatalogOpen] = useState(false);

  const settingsPageName = useMemo(() => {
    if (pages.length === 0) return "News";
    if (activePageId === AGGREGATE_PAGE_ID && pages.length > 1) {
      return pages[0]?.name ?? "News";
    }
    const p = pages.find((x) => x.id === activePageId);
    return p?.name ?? pages[0]?.name ?? "News";
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
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col md:flex-row">
      <SettingsPagesNav
        pages={pages}
        activePageId={activePageId}
        onSelectPage={(pageId) => {
          void setActivePage(pageId);
        }}
        onAddPage={addPage}
        onReorderPages={reorderPages}
        onRenamePage={renamePage}
      />
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-10 px-4 py-8 pb-16">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {settingsPageName}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Arrange feeds in a grid, add section headers between groups in
              this list, and add sources from the catalog. Changes save
              automatically.
            </p>
          </div>

          <section className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-medium">Your grid columns</h3>
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
                  <Heading className="size-4" aria-hidden />
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
                (highlighted in the left column). Use the sidebar to switch which
                page&apos;s sources you edit.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Drag the handle to reorder feeds and section headers. On the home
                grid, section headers appear full width between rows of feed
                columns (up to three per row).
              </p>
            )}
            <SortableColumnList
              columns={settingsColumns}
              onReorder={(next) => void reorderColumns(next)}
              onRemove={(id) => void removeColumn(id)}
              onUpdateTitle={(id, title) => void updateColumnTitle(id, title)}
            />
          </section>
        </div>
      </div>

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
    </div>
  );
}
