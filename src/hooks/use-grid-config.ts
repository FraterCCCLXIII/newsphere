import { useCallback, useEffect, useRef, useState } from "react";

import { isTauriRuntime } from "@/lib/tauri-env";
import type { GridColumn, GridConfig, GridController } from "@/types/grid";

const STORE_FILE = "grid-config.json";
const STORE_KEY = "grid_config";
const LS_KEY = "newsphere-grid-config-v1";
const LS_KEY_LEGACY = "newsfeed-grid-config-v1";

async function loadConfig(): Promise<GridConfig> {
  if (isTauriRuntime()) {
    const { load } = await import("@tauri-apps/plugin-store");
    const store = await load(STORE_FILE, {
      defaults: {},
      autoSave: true,
    });
    const value = await store.get<GridConfig>(STORE_KEY);
    if (value && Array.isArray(value.columns)) {
      return { columns: value.columns };
    }
    return { columns: [] };
  }

  try {
    const raw =
      localStorage.getItem(LS_KEY) ?? localStorage.getItem(LS_KEY_LEGACY);
    if (raw) {
      const parsed = JSON.parse(raw) as GridConfig;
      if (parsed && Array.isArray(parsed.columns)) {
        return { columns: parsed.columns };
      }
    }
  } catch {
    /* ignore */
  }
  return { columns: [] };
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
  const [columns, setColumns] = useState<GridColumn[]>([]);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  /** Latest columns for add/remove without stale closure races. */
  const columnsRef = useRef<GridColumn[]>([]);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  useEffect(() => {
    let cancelled = false;
    void loadConfig().then((config) => {
      if (!cancelled) {
        columnsRef.current = config.columns;
        setColumns(config.columns);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: GridColumn[]) => {
    columnsRef.current = next;
    setColumns(next);
    await saveConfig({ columns: next });
  }, []);

  const addColumn = useCallback(
    async (title: string, feedUrl?: string) => {
      const prev = columnsRef.current;
      const col: GridColumn = {
        id: crypto.randomUUID(),
        title: title.trim() || "Untitled",
        feedUrl: feedUrl?.trim() || undefined,
      };
      await persist([...prev, col]);
    },
    [persist],
  );

  const removeColumn = useCallback(
    async (id: string) => {
      await persist(columnsRef.current.filter((c) => c.id !== id));
    },
    [persist],
  );

  const reorderColumns = useCallback(
    async (ordered: GridColumn[]) => {
      await persist(ordered);
    },
    [persist],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const config = await loadConfig();
      columnsRef.current = config.columns;
      setColumns(config.columns);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return {
    columns,
    ready,
    refreshing,
    refresh,
    addColumn,
    removeColumn,
    reorderColumns,
  };
}
