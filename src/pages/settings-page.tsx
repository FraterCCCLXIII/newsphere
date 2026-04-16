import { useState } from "react";
import { useOutletContext } from "react-router-dom";

import { SourceCatalog } from "@/components/settings/source-catalog";
import { SortableColumnList } from "@/components/settings/sortable-column-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { CatalogSource } from "@/types/catalog";
import type { AppOutletContext } from "@/types/app-outlet";

export function SettingsPage() {
  const { columns, addColumn, removeColumn, reorderColumns } =
    useOutletContext<AppOutletContext>();

  const [title, setTitle] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await addColumn(title.trim(), feedUrl.trim() || undefined);
      setTitle("");
      setFeedUrl("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCatalogAdd = async (source: CatalogSource) => {
    await addColumn(source.name, source.url);
  };

  return (
    <div className="min-h-0 w-full flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-10 px-4 py-8 pb-16">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your grid columns, pick from the catalog, or add a custom
            feed URL. Changes save automatically.
          </p>
        </div>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">Your grid columns</h3>
          <p className="text-sm text-muted-foreground">
            Drag the handle to reorder. Remove columns you do not need. On the
            home grid, up to three sources appear per row; additional sources
            continue on the next row.
          </p>
          <SortableColumnList
            columns={columns}
            onReorder={(next) => void reorderColumns(next)}
            onRemove={(id) => void removeColumn(id)}
          />
        </section>

        <Separator />

        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-medium">Add from catalog</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Search and filter the list, then add a source to your grid.
            </p>
          </div>
          <SourceCatalog
            columns={columns}
            onAddFromCatalog={handleCatalogAdd}
          />
        </section>

        <Separator />

        <section>
          <h3 className="mb-3 text-sm font-medium">Custom column</h3>
          <form onSubmit={handleManualAdd} className="max-w-md space-y-3">
            <div className="space-y-2">
              <Label htmlFor="manual-title">Title</Label>
              <Input
                id="manual-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Display name"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-feed">Feed URL (optional)</Label>
              <Input
                id="manual-feed"
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                placeholder="https://example.com/feed.xml"
                type="url"
                autoComplete="off"
              />
            </div>
            <Button type="submit" disabled={submitting || !title.trim()}>
              Add custom column
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
