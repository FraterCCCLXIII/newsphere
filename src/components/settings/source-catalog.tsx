import { useCallback, useEffect, useMemo, useState } from "react";
import { CaretDown, Plus } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getCatalogCategories,
  loadCatalogSources,
} from "@/data/catalog-sources";
import { cn } from "@/lib/utils";
import type { CatalogSource } from "@/types/catalog";
import type { GridColumn } from "@/types/grid";

type SourceCatalogProps = {
  columns: GridColumn[];
  onAddFromCatalog: (source: CatalogSource) => Promise<void>;
};

export function SourceCatalog({
  columns,
  onAddFromCatalog,
}: SourceCatalogProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sources, setSources] = useState<CatalogSource[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const list = await loadCatalogSources();
      setSources(list);
    } catch (e) {
      setCatalogError(e instanceof Error ? e.message : String(e));
      setSources([]);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const categories = useMemo(
    () => getCatalogCategories(sources),
    [sources],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sources.filter((s) => {
      if (category !== "All" && s.category !== category) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.url.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    });
  }, [query, category, sources]);

  const existingUrls = useMemo(
    () => new Set(columns.map((c) => c.feedUrl).filter(Boolean)),
    [columns],
  );

  const handlePick = async (source: CatalogSource) => {
    if (existingUrls.has(source.url)) return;
    await onAddFromCatalog(source);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="catalog-search">Search</Label>
          <Input
            id="catalog-search"
            className="app-no-drag"
            placeholder="Filter by name, URL, or category…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="w-full space-y-2 sm:w-56">
          <Label htmlFor="catalog-category">Category</Label>
          <div className="relative">
            <select
              id="catalog-category"
              className={cn(
                "app-no-drag flex h-9 w-full appearance-none rounded-md border border-input bg-background px-3 py-1 pr-9 text-sm shadow-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <CaretDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 opacity-50" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-sm">
        <ScrollArea className="h-[min(55vh,480px)]">
          {catalogLoading ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Loading catalog…
            </p>
          ) : catalogError ? (
            <div className="space-y-3 px-3 py-6 text-center">
              <p className="text-sm text-destructive">{catalogError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="app-no-drag"
                onClick={() => void loadCatalog()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((source) => {
                const added = existingUrls.has(source.url);
                return (
                  <li key={source.id}>
                    <div className="flex items-start gap-2 px-3 py-2.5 sm:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {source.name}
                        </p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {source.url}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {source.category}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={added ? "secondary" : "default"}
                        disabled={added}
                        className="app-no-drag shrink-0 gap-1"
                        onClick={() => void handlePick(source)}
                      >
                        <Plus className="size-3.5" />
                        {added ? "Added" : "Add"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {sources.length} catalog sources.
        Edit{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.7rem]">
          public/catalog-sources.json
        </code>{" "}
        to add or change feeds; refresh the app to pick up changes.
        Feed URLs are typical RSS entry points for a future ingestion phase.
      </p>
    </div>
  );
}
