import {
  Check,
  ChevronDown,
  Link2,
  Minus,
  Plus,
  Search,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getCatalogCategories,
  loadCatalogSources,
} from "@/data/catalog-sources";
import { cn } from "@/lib/utils";
import type { CatalogSource } from "@/types/catalog";
import type { GridColumn } from "@/types/grid";

function normFeedUrl(u: string): string {
  return u.trim().replace(/\/$/, "");
}

type AddSourceModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogColumns: GridColumn[];
  onAddSource: (source: CatalogSource) => Promise<void>;
  onAddCustomColumn: (title: string, feedUrl?: string) => Promise<void>;
  onRemoveByFeedUrl: (feedUrl: string) => Promise<void>;
};

export function AddSourceModal({
  open,
  onOpenChange,
  catalogColumns,
  onAddSource,
  onAddCustomColumn,
  onRemoveByFeedUrl,
}: AddSourceModalProps) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("All");
  const [sources, setSources] = useState<CatalogSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customFeedUrl, setCustomFeedUrl] = useState("");
  const [customSubmitting, setCustomSubmitting] = useState(false);
  const [removingCustomUrl, setRemovingCustomUrl] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const customTitleRef = useRef<HTMLInputElement>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await loadCatalogSources();
      setSources(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSources([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTopic("All");
      setCustomOpen(false);
      setCustomTitle("");
      setCustomFeedUrl("");
      void loadCatalog();
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [open, loadCatalog]);

  useEffect(() => {
    if (!customOpen || !open) return;
    const t = window.setTimeout(() => customTitleRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [customOpen, open]);

  const categories = useMemo(
    () => getCatalogCategories(sources),
    [sources],
  );

  const filteredSorted = useMemo(() => {
    let list = sources;
    if (topic !== "All") {
      list = list.filter((s) => s.category === topic);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.url.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      const byTopic = a.category.localeCompare(b.category, undefined, {
        sensitivity: "base",
      });
      if (byTopic !== 0) return byTopic;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
  }, [query, sources, topic]);

  const groupedByTopic = useMemo(() => {
    const map = new Map<string, CatalogSource[]>();
    for (const s of filteredSorted) {
      const arr = map.get(s.category) ?? [];
      arr.push(s);
      map.set(s.category, arr);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { sensitivity: "base" }),
    );
  }, [filteredSorted]);

  const existingUrls = useMemo(
    () =>
      new Set(
        catalogColumns
          .map((c) => c.feedUrl)
          .filter((u): u is string => Boolean(u?.trim()))
          .map((u) => normFeedUrl(u)),
      ),
    [catalogColumns],
  );

  const handleCatalogToggle = async (source: CatalogSource) => {
    const key = normFeedUrl(source.url);
    const isAdded = existingUrls.has(key);
    if (isAdded) {
      setRemovingId(source.id);
      try {
        await onRemoveByFeedUrl(source.url);
      } finally {
        setRemovingId(null);
      }
    } else {
      setAddingId(source.id);
      try {
        await onAddSource(source);
      } finally {
        setAddingId(null);
      }
    }
  };

  const customUrlTrimmed = customFeedUrl.trim();
  const customUrlAlreadyAdded =
    customUrlTrimmed.length > 0 &&
    existingUrls.has(normFeedUrl(customUrlTrimmed));

  const handleRemoveCustomByUrl = async () => {
    if (!customUrlTrimmed || !customUrlAlreadyAdded) return;
    setRemovingCustomUrl(true);
    try {
      await onRemoveByFeedUrl(customUrlTrimmed);
    } finally {
      setRemovingCustomUrl(false);
    }
  };

  const handleCustomSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || customSubmitting) return;
    if (customUrlAlreadyAdded) return;
    setCustomSubmitting(true);
    try {
      await onAddCustomColumn(
        customTitle.trim(),
        customUrlTrimmed ? customUrlTrimmed : undefined,
      );
      setCustomTitle("");
      setCustomFeedUrl("");
    } finally {
      setCustomSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "app-no-drag flex h-[min(92vh,640px)] w-full max-w-[min(32rem,calc(100%-1.5rem))] flex-col gap-0 overflow-hidden p-0",
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 pr-14 text-left">
          <DialogTitle>Add source</DialogTitle>
          <DialogDescription>
            Add or remove sources on your current page; close when you are done.
            Click <span className="font-medium text-foreground">Added</span> to
            remove a catalog feed. Use &quot;Add a custom feed&quot; for URLs not
            listed.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 border-b px-6 py-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Catalog</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="add-source-search" className="text-muted-foreground">
                Search
              </Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  ref={searchInputRef}
                  id="add-source-search"
                  type="search"
                  className="app-no-drag h-9 bg-muted/50 pl-8 dark:bg-muted/30"
                  placeholder="Name, URL, or topic…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                  aria-label="Search sources"
                />
              </div>
            </div>
            <div className="w-full space-y-2 sm:w-52">
              <Label htmlFor="add-source-topic" className="text-muted-foreground">
                Topic
              </Label>
              <div className="relative">
                <select
                  id="add-source-topic"
                  className={cn(
                    "app-no-drag flex h-9 w-full appearance-none rounded-md border border-input bg-background px-3 py-1 pr-9 text-sm shadow-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 opacity-50" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-3 pt-2">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {loading ? (
                <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Loading catalog…
                </p>
              ) : error ? (
                <div className="space-y-3 px-3 py-8 text-center">
                  <p className="text-sm text-destructive">{error}</p>
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
              ) : filteredSorted.length === 0 ? (
                <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                  No sources match your search or topic.
                </p>
              ) : (
                <div className="divide-y">
                  {groupedByTopic.map(([categoryName, items]) => (
                    <section key={categoryName}>
                      <div className="sticky top-0 z-[1] border-b bg-muted/80 px-3 py-2 backdrop-blur-sm supports-[backdrop-filter]:bg-muted/60">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {categoryName}
                        </p>
                      </div>
                      <ul>
                        {items.map((source) => {
                          const added = existingUrls.has(
                            normFeedUrl(source.url),
                          );
                          const busyAdd = addingId === source.id;
                          const busyRemove = removingId === source.id;
                          const busy = busyAdd || busyRemove;
                          return (
                            <li
                              key={source.id}
                              className="border-b border-border/60 last:border-b-0"
                            >
                              <div className="flex items-start gap-2 px-3 py-2.5 sm:items-center">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium leading-snug">
                                    {source.name}
                                  </p>
                                  <p className="mt-0.5 break-all font-mono text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                                    {source.url}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={added ? "secondary" : "default"}
                                  disabled={busy}
                                  className={cn(
                                    "app-no-drag shrink-0 gap-1",
                                    added && !busy && "group",
                                  )}
                                  onClick={() => void handleCatalogToggle(source)}
                                  title={
                                    added
                                      ? "Click to remove this feed from the grid"
                                      : "Add this feed to the grid"
                                  }
                                >
                                  {busyAdd ? (
                                    <>
                                      <Plus className="size-3.5 shrink-0" aria-hidden />
                                      Adding…
                                    </>
                                  ) : busyRemove ? (
                                    <>
                                      <Minus className="size-3.5 shrink-0" aria-hidden />
                                      Removing…
                                    </>
                                  ) : added ? (
                                    <span className="inline-flex items-center gap-0.5">
                                      <Check
                                        className="size-3.5 shrink-0 text-primary group-hover:hidden"
                                        aria-hidden
                                      />
                                      <X
                                        className="size-3.5 hidden shrink-0 text-destructive group-hover:inline"
                                        aria-hidden
                                      />
                                      <span className="group-hover:hidden">Added</span>
                                      <span className="hidden text-destructive group-hover:inline">
                                        Remove
                                      </span>
                                    </span>
                                  ) : (
                                    <>
                                      <Plus className="size-3.5 shrink-0" aria-hidden />
                                      Add
                                    </>
                                  )}
                                </Button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
          {!loading && !error ? (
            <p className="mt-2 shrink-0 text-center text-xs text-muted-foreground">
              Showing {filteredSorted.length} of {sources.length} sources · sorted
              by topic
            </p>
          ) : null}
        </div>

        <div className="shrink-0 border-t">
          <Button
            type="button"
            variant="ghost"
            className="app-no-drag h-auto w-full justify-between gap-2 rounded-none px-6 py-2.5 font-normal text-muted-foreground hover:text-foreground"
            onClick={() => setCustomOpen((o) => !o)}
            aria-expanded={customOpen}
            aria-controls="add-custom-panel"
            id="add-custom-trigger"
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <Link2 className="size-4 shrink-0 opacity-80" aria-hidden />
              <span className="truncate text-sm">Add a custom feed</span>
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 opacity-70 transition-transform duration-200",
                customOpen && "rotate-180",
              )}
              aria-hidden
            />
          </Button>
          {customOpen ? (
            <div
              id="add-custom-panel"
              role="region"
              aria-labelledby="add-custom-trigger"
              className="border-t bg-muted/20 px-6 py-3 dark:bg-muted/10"
            >
              <form onSubmit={handleCustomSubmit} className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="add-custom-title"
                      className="text-muted-foreground"
                    >
                      Title
                    </Label>
                    <Input
                      ref={customTitleRef}
                      id="add-custom-title"
                      className="app-no-drag h-9"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Display name"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="add-custom-feed-url"
                      className="text-muted-foreground"
                    >
                      Feed URL (optional)
                    </Label>
                    <Input
                      id="add-custom-feed-url"
                      type="url"
                      className="app-no-drag h-9"
                      value={customFeedUrl}
                      onChange={(e) => setCustomFeedUrl(e.target.value)}
                      placeholder="https://example.com/feed.xml"
                      autoComplete="off"
                    />
                  </div>
                </div>
                {customUrlAlreadyAdded ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      This feed URL is already on your grid.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="app-no-drag shrink-0 gap-1"
                      disabled={removingCustomUrl}
                      onClick={() => void handleRemoveCustomByUrl()}
                    >
                      <Minus className="size-3.5" aria-hidden />
                      {removingCustomUrl ? "Removing…" : "Remove"}
                    </Button>
                  </div>
                ) : null}
                <Button
                  type="submit"
                  size="sm"
                  className="app-no-drag w-full sm:w-auto"
                  disabled={
                    customSubmitting ||
                    removingCustomUrl ||
                    !customTitle.trim() ||
                    customUrlAlreadyAdded
                  }
                >
                  {customSubmitting ? "Adding…" : "Add custom column"}
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
