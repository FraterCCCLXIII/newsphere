import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isTauriRuntime } from "@/lib/tauri-env";
import {
  DEFAULT_LATEST_ROW_TITLE,
  isFeedColumn,
  type GridColumn,
  type GridConfig,
  type GridController,
  type GridPage,
  type LatestRowSettings,
  type LegacyGridConfig,
} from "@/types/grid";
import {
  AGGREGATE_PAGE_ID,
  DEFAULT_FIRST_PAGE_ID,
} from "@/types/grid";
import bundledDefaultGrid from "@/data/default-grid-config.json";

const STORE_FILE = "grid-config.json";
const STORE_KEY = "grid_config";
const LS_KEY = "newsphere-grid-config-v1";
const LS_KEY_LEGACY = "newsfeed-grid-config-v1";

const TAURI_STORE_OPTIONS = { defaults: {}, autoSave: true } as const;

let tauriGridStorePromise: ReturnType<
  typeof import("@tauri-apps/plugin-store").load
> | null = null;

async function getTauriGridStore() {
  if (!tauriGridStorePromise) {
    const { load } = await import("@tauri-apps/plugin-store");
    tauriGridStorePromise = load(STORE_FILE, TAURI_STORE_OPTIONS);
  }
  return tauriGridStorePromise;
}

/** Let React commit and the browser paint before disk work (keeps page switches snappy). */
function yieldToPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/** Serialize disk writes so rapid switches cannot reorder saves. */
let saveTail: Promise<void> = Promise.resolve();

function enqueuePersistToDisk(next: GridConfig): Promise<void> {
  saveTail = saveTail.then(async () => {
    await yieldToPaint();
    await saveConfig(next);
  });
  return saveTail;
}

function normalizeMigratedPages(pages: GridPage[]): GridPage[] {
  return pages.map((p) => {
    if (p.id === "page-all") {
      return {
        ...p,
        id: DEFAULT_FIRST_PAGE_ID,
        name: p.name === "All" ? "News" : p.name,
      };
    }
    return p;
  });
}

function normalizeActivePageId(
  activePageId: string,
  pages: GridPage[],
): string {
  if (activePageId === "page-all") {
    return pages.some((p) => p.id === DEFAULT_FIRST_PAGE_ID)
      ? DEFAULT_FIRST_PAGE_ID
      : pages[0]?.id ?? DEFAULT_FIRST_PAGE_ID;
  }
  if (activePageId === AGGREGATE_PAGE_ID && pages.length <= 1) {
    return pages[0]?.id ?? DEFAULT_FIRST_PAGE_ID;
  }
  if (
    activePageId !== AGGREGATE_PAGE_ID &&
    !pages.some((p) => p.id === activePageId)
  ) {
    return pages[0]?.id ?? DEFAULT_FIRST_PAGE_ID;
  }
  return activePageId;
}

/** Fresh installs / no saved layout: pages, section headers, and feeds from `src/data/default-grid-config.json`. */
function getBundledDefaultGridConfig(): GridConfig {
  return JSON.parse(JSON.stringify(bundledDefaultGrid)) as GridConfig;
}

function migrateGridConfig(raw: unknown): GridConfig {
  if (raw && typeof raw === "object" && raw !== null) {
    const o = raw as Record<string, unknown>;
    if (
      Array.isArray(o.pages) &&
      o.pages.length > 0 &&
      typeof o.activePageId === "string"
    ) {
      let pages = normalizeMigratedPages(o.pages as GridPage[]);
      let activePageId = normalizeActivePageId(o.activePageId, pages);
      return { pages, activePageId };
    }
    const legacy = raw as LegacyGridConfig;
    if (Array.isArray(legacy.columns)) {
      return {
        pages: [
          {
            id: DEFAULT_FIRST_PAGE_ID,
            name: "News",
            columns: legacy.columns,
          },
        ],
        activePageId: DEFAULT_FIRST_PAGE_ID,
      };
    }
  }
  return getBundledDefaultGridConfig();
}

async function loadConfig(): Promise<GridConfig> {
  if (isTauriRuntime()) {
    const store = await getTauriGridStore();
    const value = await store.get<unknown>(STORE_KEY);
    return migrateGridConfig(value);
  }

  try {
    const raw =
      localStorage.getItem(LS_KEY) ?? localStorage.getItem(LS_KEY_LEGACY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      return migrateGridConfig(parsed);
    }
  } catch {
    /* ignore */
  }
  return migrateGridConfig(null);
}

async function saveConfig(config: GridConfig): Promise<void> {
  if (isTauriRuntime()) {
    const store = await getTauriGridStore();
    await store.set(STORE_KEY, config);
    await store.save();
    return;
  }
  localStorage.setItem(LS_KEY, JSON.stringify(config));
  try {
    localStorage.removeItem(LS_KEY_LEGACY);
  } catch {
    /* ignore */
  }
}

export function useGridConfig(): GridController {
  const [pages, setPages] = useState<GridPage[]>([]);
  const [activePageId, setActivePageId] = useState(DEFAULT_FIRST_PAGE_ID);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const pagesRef = useRef<GridPage[]>([]);
  const activePageIdRef = useRef(activePageId);
  const mutationTargetPageIdRef = useRef(DEFAULT_FIRST_PAGE_ID);

  pagesRef.current = pages;
  activePageIdRef.current = activePageId;

  const isAggregateView =
    activePageId === AGGREGATE_PAGE_ID && pages.length > 1;

  useEffect(() => {
    mutationTargetPageIdRef.current =
      activePageId === AGGREGATE_PAGE_ID && pages.length > 1
        ? pages[0]!.id
        : activePageId === AGGREGATE_PAGE_ID && pages.length <= 1
          ? pages[0]?.id ?? DEFAULT_FIRST_PAGE_ID
          : activePageId;
  }, [pages, activePageId]);

  const columns = useMemo(() => {
    const raw =
      activePageId === AGGREGATE_PAGE_ID && pages.length > 1
        ? pages.flatMap((p) => p.columns)
        : (pages.find((x) => x.id === activePageId)?.columns ?? []);
    return raw.filter(isFeedColumn);
  }, [pages, activePageId]);

  const settingsColumns = useMemo(() => {
    if (activePageId === AGGREGATE_PAGE_ID && pages.length > 1) {
      return pages[0]?.columns ?? [];
    }
    const p = pages.find((x) => x.id === activePageId);
    return p?.columns ?? [];
  }, [pages, activePageId]);

  const allColumns = useMemo(
    () => pages.flatMap((p) => p.columns).filter(isFeedColumn),
    [pages],
  );

  const gridLayoutColumns = useMemo(() => {
    if (activePageId === AGGREGATE_PAGE_ID && pages.length > 1) {
      return pages.flatMap((p) => p.columns);
    }
    const p = pages.find((x) => x.id === activePageId);
    return p?.columns ?? [];
  }, [pages, activePageId]);

  useEffect(() => {
    let cancelled = false;
    void loadConfig().then((config) => {
      if (!cancelled) {
        pagesRef.current = config.pages;
        activePageIdRef.current = config.activePageId;
        setPages(config.pages);
        setActivePageId(config.activePageId);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const applyGridState = useCallback((next: GridConfig) => {
    pagesRef.current = next.pages;
    activePageIdRef.current = next.activePageId;
    setPages(next.pages);
    setActivePageId(next.activePageId);
  }, []);

  const persistConfig = useCallback(
    async (next: GridConfig) => {
      applyGridState(next);
      await enqueuePersistToDisk(next);
    },
    [applyGridState],
  );

  const updatePageColumns = useCallback(
    async (pageId: string, nextColumns: GridColumn[]) => {
      const nextPages = pagesRef.current.map((p) =>
        p.id === pageId ? { ...p, columns: nextColumns } : p,
      );
      await persistConfig({
        pages: nextPages,
        activePageId: activePageIdRef.current,
      });
    },
    [persistConfig],
  );

  const setActivePage = useCallback(
    async (pageId: string) => {
      if (pageId === AGGREGATE_PAGE_ID) {
        if (pagesRef.current.length <= 1) return;
        const next: GridConfig = {
          pages: pagesRef.current,
          activePageId: AGGREGATE_PAGE_ID,
        };
        // startTransition marks the re-render as non-urgent so the current
        // page stays interactive while React prepares the new view.
        startTransition(() => {
          applyGridState(next);
        });
        void enqueuePersistToDisk(next);
        return;
      }
      if (!pagesRef.current.some((p) => p.id === pageId)) return;
      const next: GridConfig = {
        pages: pagesRef.current,
        activePageId: pageId,
      };
      startTransition(() => {
        applyGridState(next);
      });
      void enqueuePersistToDisk(next);
    },
    [applyGridState],
  );

  const addPage = useCallback(
    async (name: string) => {
      const trimmed = name.trim() || "Untitled";
      const id = crypto.randomUUID();
      const newPage: GridPage = { id, name: trimmed, columns: [] };
      const nextPages = [...pagesRef.current, newPage];
      await persistConfig({
        pages: nextPages,
        activePageId: id,
      });
    },
    [persistConfig],
  );

  const addColumn = useCallback(
    async (title: string, feedUrl?: string) => {
      const pid = mutationTargetPageIdRef.current;
      const page = pagesRef.current.find((p) => p.id === pid);
      const prev = page?.columns ?? [];
      const col: GridColumn = {
        id: crypto.randomUUID(),
        title: title.trim() || "Untitled",
        kind: "feed",
        feedUrl: feedUrl?.trim() || undefined,
      };
      await updatePageColumns(pid, [...prev, col]);
    },
    [updatePageColumns],
  );

  const addSectionHeader = useCallback(
    async (title: string) => {
      const pid = mutationTargetPageIdRef.current;
      const page = pagesRef.current.find((p) => p.id === pid);
      const prev = page?.columns ?? [];
      const col: GridColumn = {
        id: crypto.randomUUID(),
        title: title.trim() || "Section",
        kind: "header",
      };
      await updatePageColumns(pid, [...prev, col]);
    },
    [updatePageColumns],
  );

  const insertColumnAfter = useCallback(
    async (
      afterColumnId: string | null,
      kind: "feed" | "header",
      title: string,
      feedUrl?: string,
    ) => {
      const newCol: GridColumn =
        kind === "header"
          ? {
              id: crypto.randomUUID(),
              title: title.trim() || "Section",
              kind: "header",
            }
          : {
              id: crypto.randomUUID(),
              title: title.trim() || "Untitled",
              kind: "feed",
              feedUrl: feedUrl?.trim() || undefined,
            };

      const findPlacement = (
        columnId: string,
      ): { pageId: string; index: number } | null => {
        for (const p of pagesRef.current) {
          const i = p.columns.findIndex((c) => c.id === columnId);
          if (i !== -1) return { pageId: p.id, index: i };
        }
        return null;
      };

      const pagesSnapshot = pagesRef.current;

      if (afterColumnId === null) {
        const flat = pagesSnapshot.flatMap((p) => p.columns);
        if (flat.length === 0) {
          const pid = mutationTargetPageIdRef.current;
          await updatePageColumns(pid, [newCol]);
          return;
        }
        const firstId = flat[0]!.id;
        const place = findPlacement(firstId);
        if (!place) return;
        const page = pagesSnapshot.find((p) => p.id === place.pageId)!;
        const next = [
          ...page.columns.slice(0, place.index),
          newCol,
          ...page.columns.slice(place.index),
        ];
        await updatePageColumns(place.pageId, next);
        return;
      }

      const place = findPlacement(afterColumnId);
      if (!place) return;
      const page = pagesSnapshot.find((p) => p.id === place.pageId)!;
      const insertIdx = place.index + 1;
      const next = [
        ...page.columns.slice(0, insertIdx),
        newCol,
        ...page.columns.slice(insertIdx),
      ];
      await updatePageColumns(place.pageId, next);
    },
    [updatePageColumns],
  );

  const updateColumnTitle = useCallback(
    async (columnId: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      const owner = pagesRef.current.find((p) =>
        p.columns.some((c) => c.id === columnId),
      );
      if (!owner) return;
      const nextCols = owner.columns.map((c) =>
        c.id === columnId ? { ...c, title: trimmed } : c,
      );
      await updatePageColumns(owner.id, nextCols);
    },
    [updatePageColumns],
  );

  const removeColumn = useCallback(
    async (id: string) => {
      const owner = pagesRef.current.find((p) =>
        p.columns.some((c) => c.id === id),
      );
      if (!owner) return;
      await updatePageColumns(
        owner.id,
        owner.columns.filter((c) => c.id !== id),
      );
    },
    [updatePageColumns],
  );

  const reorderColumns = useCallback(
    async (ordered: GridColumn[]) => {
      const pid = mutationTargetPageIdRef.current;
      await updatePageColumns(pid, ordered);
    },
    [updatePageColumns],
  );

  const reorderPages = useCallback(
    async (ordered: GridPage[]) => {
      await persistConfig({
        pages: ordered,
        activePageId: activePageIdRef.current,
      });
    },
    [persistConfig],
  );

  const renamePage = useCallback(
    async (pageId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (!pagesRef.current.some((p) => p.id === pageId)) return;
      const nextPages = pagesRef.current.map((p) =>
        p.id === pageId ? { ...p, name: trimmed } : p,
      );
      await persistConfig({
        pages: nextPages,
        activePageId: activePageIdRef.current,
      });
    },
    [persistConfig],
  );

  const removePage = useCallback(
    async (pageId: string) => {
      const snapshot = pagesRef.current;
      if (snapshot.length <= 1) return;
      const idx = snapshot.findIndex((p) => p.id === pageId);
      if (idx === -1) return;

      const nextPages = snapshot.filter((p) => p.id !== pageId);
      let nextActive = activePageIdRef.current;

      if (nextActive === AGGREGATE_PAGE_ID) {
        if (nextPages.length <= 1) {
          nextActive = nextPages[0]!.id;
        }
      } else if (nextActive === pageId) {
        nextActive =
          nextPages[Math.max(0, idx - 1)]?.id ?? nextPages[0]!.id;
      }

      nextActive = normalizeActivePageId(nextActive, nextPages);

      await persistConfig({
        pages: nextPages,
        activePageId: nextActive,
      });
    },
    [persistConfig],
  );

  const updatePageLatestRow = useCallback(
    async (pageId: string, partial: Partial<LatestRowSettings>) => {
      if (!pagesRef.current.some((p) => p.id === pageId)) return;
      const nextPages = pagesRef.current.map((p) => {
        if (p.id !== pageId) return p;
        const prev = p.latestRow ?? { enabled: false };
        const merged: LatestRowSettings = { ...prev, ...partial };
        if (merged.enabled && !merged.title?.trim()) {
          merged.title = DEFAULT_LATEST_ROW_TITLE;
        }
        return { ...p, latestRow: merged };
      });
      await persistConfig({
        pages: nextPages,
        activePageId: activePageIdRef.current,
      });
    },
    [persistConfig],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const config = await loadConfig();
      applyGridState(config);
    } finally {
      setRefreshing(false);
    }
  }, [applyGridState]);

  const resetLayoutToDefaults = useCallback(async () => {
    await persistConfig(getBundledDefaultGridConfig());
  }, [persistConfig]);

  return useMemo(
    () => ({
      columns,
      settingsColumns,
      allColumns,
      gridLayoutColumns,
      isAggregateView,
      pages,
      activePageId,
      ready,
      refreshing,
      refresh,
      resetLayoutToDefaults,
      setActivePage,
      addPage,
      addColumn,
      addSectionHeader,
      insertColumnAfter,
      updateColumnTitle,
      removeColumn,
      reorderColumns,
      reorderPages,
      renamePage,
      removePage,
      updatePageLatestRow,
    }),
    [
      columns,
      settingsColumns,
      allColumns,
      gridLayoutColumns,
      isAggregateView,
      pages,
      activePageId,
      ready,
      refreshing,
      refresh,
      resetLayoutToDefaults,
      setActivePage,
      addPage,
      addColumn,
      addSectionHeader,
      insertColumnAfter,
      updateColumnTitle,
      removeColumn,
      reorderColumns,
      reorderPages,
      renamePage,
      removePage,
      updatePageLatestRow,
    ],
  );
}
