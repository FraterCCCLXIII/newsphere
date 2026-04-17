import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { normalizeBookmarkLink } from "@/lib/bookmark-utils";
import { isTauriRuntime } from "@/lib/tauri-env";
import type { ReadHistoryEntry, ReadHistoryStore } from "@/types/read-history";

const STORE_FILE = "read-history.json";
const STORE_KEY = "read_history_data";
const LS_KEY = "newsphere-read-history-v1";
const MAX_ITEMS = 500;

async function loadReadHistory(): Promise<ReadHistoryEntry[]> {
  if (isTauriRuntime()) {
    const { load } = await import("@tauri-apps/plugin-store");
    const store = await load(STORE_FILE, {
      defaults: {},
      autoSave: true,
    });
    const value = await store.get<ReadHistoryStore>(STORE_KEY);
    if (value && Array.isArray(value.items)) {
      return value.items;
    }
    return [];
  }

  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ReadHistoryStore;
      if (parsed && Array.isArray(parsed.items)) {
        return parsed.items;
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

async function saveReadHistory(items: ReadHistoryEntry[]): Promise<void> {
  const payload: ReadHistoryStore = { items };
  if (isTauriRuntime()) {
    const { load } = await import("@tauri-apps/plugin-store");
    const store = await load(STORE_FILE, {
      defaults: {},
      autoSave: true,
    });
    await store.set(STORE_KEY, payload);
    await store.save();
    return;
  }
  localStorage.setItem(LS_KEY, JSON.stringify(payload));
}

function trimHistory(items: ReadHistoryEntry[]): ReadHistoryEntry[] {
  if (items.length <= MAX_ITEMS) return items;
  const sorted = [...items].sort(
    (a, b) =>
      new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime(),
  );
  return sorted.slice(0, MAX_ITEMS);
}

export type ReadHistoryController = {
  readHistory: ReadHistoryEntry[];
  ready: boolean;
  recordArticleView: (entry: {
    title: string;
    link: string;
    published?: string;
    sourceFeedTitle?: string;
    sourceColumnId?: string;
  }) => Promise<void>;
  removeReadHistoryEntry: (id: string) => Promise<void>;
};

export function useReadHistory(): ReadHistoryController {
  const [readHistory, setReadHistory] = useState<ReadHistoryEntry[]>([]);
  const [ready, setReady] = useState(false);
  const itemsRef = useRef<ReadHistoryEntry[]>([]);

  useEffect(() => {
    itemsRef.current = readHistory;
  }, [readHistory]);

  useEffect(() => {
    let cancelled = false;
    void loadReadHistory().then((items) => {
      if (!cancelled) {
        itemsRef.current = items;
        setReadHistory(items);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: ReadHistoryEntry[]) => {
    const trimmed = trimHistory(next);
    itemsRef.current = trimmed;
    setReadHistory(trimmed);
    await saveReadHistory(trimmed);
  }, []);

  const recordArticleView = useCallback(
    async (entry: {
      title: string;
      link: string;
      published?: string;
      sourceFeedTitle?: string;
      sourceColumnId?: string;
    }) => {
      const link = normalizeBookmarkLink(entry.link);
      if (!link.trim()) return;

      const prev = itemsRef.current.filter(
        (h) => normalizeBookmarkLink(h.link) !== link,
      );
      const row: ReadHistoryEntry = {
        id: crypto.randomUUID(),
        title: entry.title.trim() || "Untitled",
        link,
        viewedAt: new Date().toISOString(),
        published: entry.published,
        sourceFeedTitle: entry.sourceFeedTitle,
        sourceColumnId: entry.sourceColumnId,
      };
      await persist([row, ...prev]);
    },
    [persist],
  );

  const removeReadHistoryEntry = useCallback(
    async (id: string) => {
      await persist(itemsRef.current.filter((h) => h.id !== id));
    },
    [persist],
  );

  return useMemo(
    () => ({
      readHistory,
      ready,
      recordArticleView,
      removeReadHistoryEntry,
    }),
    [readHistory, ready, recordArticleView, removeReadHistoryEntry],
  );
}
