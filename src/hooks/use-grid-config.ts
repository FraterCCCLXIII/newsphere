import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isTauriRuntime } from "@/lib/tauri-env";
import type {
  GridColumn,
  GridConfig,
  GridController,
  GridPage,
  LegacyGridConfig,
} from "@/types/grid";
import {
  AGGREGATE_PAGE_ID,
  DEFAULT_FIRST_PAGE_ID,
} from "@/types/grid";

const STORE_FILE = "grid-config.json";
const STORE_KEY = "grid_config";
const LS_KEY = "newsphere-grid-config-v1";
const LS_KEY_LEGACY = "newsfeed-grid-config-v1";

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
  return {
    pages: [{ id: DEFAULT_FIRST_PAGE_ID, name: "News", columns: [] }],
    activePageId: DEFAULT_FIRST_PAGE_ID,
  };
}

async function loadConfig(): Promise<GridConfig> {
  if (isTauriRuntime()) {
    const { load } = await import("@tauri-apps/plugin-store");
    const store = await load(STORE_FILE, {
      defaults: {},
      autoSave: true,
    });
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
    const { load } = await import("@tauri-apps/plugin-store");
    const store = await load(STORE_FILE, {
      defaults: {},
      autoSave: true,
    });
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

  useEffect(() => {
    activePageIdRef.current = activePageId;
  }, [activePageId]);

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

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
    if (activePageId === AGGREGATE_PAGE_ID && pages.length > 1) {
      return pages.flatMap((p) => p.columns);
    }
    const p = pages.find((x) => x.id === activePageId);
    return p?.columns ?? [];
  }, [pages, activePageId]);

  const settingsColumns = useMemo(() => {
    if (activePageId === AGGREGATE_PAGE_ID && pages.length > 1) {
      return pages[0]?.columns ?? [];
    }
    const p = pages.find((x) => x.id === activePageId);
    return p?.columns ?? [];
  }, [pages, activePageId]);

  const allColumns = useMemo(
    () => pages.flatMap((p) => p.columns),
    [pages],
  );

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

  const persistConfig = useCallback(async (next: GridConfig) => {
    pagesRef.current = next.pages;
    activePageIdRef.current = next.activePageId;
    setPages(next.pages);
    setActivePageId(next.activePageId);
    await saveConfig(next);
  }, []);

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
        await persistConfig({
          pages: pagesRef.current,
          activePageId: AGGREGATE_PAGE_ID,
        });
        return;
      }
      if (!pagesRef.current.some((p) => p.id === pageId)) return;
      await persistConfig({
        pages: pagesRef.current,
        activePageId: pageId,
      });
    },
    [persistConfig],
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
        feedUrl: feedUrl?.trim() || undefined,
      };
      await updatePageColumns(pid, [...prev, col]);
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

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const config = await loadConfig();
      await persistConfig(config);
    } finally {
      setRefreshing(false);
    }
  }, [persistConfig]);

  return {
    columns,
    settingsColumns,
    allColumns,
    isAggregateView,
    pages,
    activePageId,
    ready,
    refreshing,
    refresh,
    setActivePage,
    addPage,
    addColumn,
    removeColumn,
    reorderColumns,
  };
}
