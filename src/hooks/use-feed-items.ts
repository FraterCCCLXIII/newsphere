import { invoke } from "@tauri-apps/api/core";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  isFeedCacheStale,
  loadFeedDiskCache,
  pruneFeedDiskCache,
  saveFeedDiskCacheEntry,
  type FeedCacheStore,
} from "@/lib/feed-disk-cache";
import { isTauriRuntime } from "@/lib/tauri-env";
import type { FeedItem } from "@/types/feed";
import type { GridColumn } from "@/types/grid";

const FETCH_CONCURRENCY = 2;

/** Stable while switching pages; changes when feeds are added/removed or URLs change. */
function columnFeedKey(columns: GridColumn[]): string {
  return columns
    .map((c) => `${c.id}:${c.feedUrl ?? ""}`)
    .sort()
    .join("|");
}

/**
 * Run `tasks` with at most `concurrency` running at once.
 * A new task starts as soon as any slot finishes — keeps throughput high
 * without firing all network requests simultaneously.
 */
async function runWithConcurrency(
  tasks: (() => Promise<void>)[],
  concurrency: number,
): Promise<void> {
  if (tasks.length === 0) return;
  let idx = 0;
  // Each worker pulls the next task synchronously (no yield before idx++),
  // so there is no race between workers in JS's single-threaded event loop.
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      await tasks[i]();
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, worker),
  );
}

export function useFeedItems(allFeedColumns: GridColumn[]) {
  const columnsRef = useRef(allFeedColumns);
  columnsRef.current = allFeedColumns;

  const itemsRef = useRef<Record<string, FeedItem[]>>({});
  const diskCacheRef = useRef<FeedCacheStore>({});
  /** Feed URL we last successfully fetched per column (for new-column / URL-change detection). */
  const lastFetchedFeedUrlByColumnIdRef = useRef<Record<string, string>>({});

  /**
   * False until the disk cache has been read on startup (Tauri only).
   * The key effect waits for this before scheduling any network fetches,
   * so the UI always sees cached content before any loading spinners.
   */
  const [diskCacheReady, setDiskCacheReady] = useState<boolean>(
    () => !isTauriRuntime(),
  );

  const [itemsByColumnId, setItemsByColumnId] = useState<
    Record<string, FeedItem[]>
  >({});
  const [loadingByColumnId, setLoadingByColumnId] = useState<
    Record<string, boolean>
  >({});
  const [errorByColumnId, setErrorByColumnId] = useState<
    Record<string, string>
  >({});

  itemsRef.current = itemsByColumnId;

  /**
   * Fetch a single column and immediately update its slice of state and disk cache.
   * This is called concurrently by `runFetchForColumns` — each column updates
   * independently as it resolves instead of waiting for all to finish.
   */
  const fetchSingleColumn = useCallback(
    async (col: GridColumn): Promise<void> => {
      const url = col.feedUrl!.trim();
      try {
        const items = await invoke<FeedItem[]>("fetch_feed", { url });
        lastFetchedFeedUrlByColumnIdRef.current[col.id] = url;
        const entry = { url, items, fetchedAt: Date.now() };
        diskCacheRef.current[col.id] = entry;
        void saveFeedDiskCacheEntry(col.id, entry);

        // Defer heavy list commits to the next frame so pointer events / window drag stay responsive.
        requestAnimationFrame(() => {
          startTransition(() => {
            setItemsByColumnId((prev) => ({ ...prev, [col.id]: items }));
            setErrorByColumnId((prev) => {
              const next = { ...prev };
              delete next[col.id];
              return next;
            });
            setLoadingByColumnId((prev) => ({ ...prev, [col.id]: false }));
          });
        });
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        requestAnimationFrame(() => {
          startTransition(() => {
            setErrorByColumnId((prev) => ({ ...prev, [col.id]: err }));
            setLoadingByColumnId((prev) => ({ ...prev, [col.id]: false }));
          });
        });
      }
    },
    [],
  );

  const runFetchForColumns = useCallback(
    async (colsToFetch: GridColumn[], fullSync: boolean) => {
      if (!isTauriRuntime()) return;

      const allCols = columnsRef.current;
      const withUrl = colsToFetch.filter((c) => c.feedUrl?.trim());

      if (withUrl.length === 0 && !fullSync) return;

      // On a full sync (manual refresh), remove state for URL-less columns.
      if (fullSync) {
        startTransition(() => {
          setItemsByColumnId((prev) => {
            const next = { ...prev };
            for (const col of allCols) {
              if (!col.feedUrl?.trim()) delete next[col.id];
            }
            return next;
          });
          setErrorByColumnId((prev) => {
            const next = { ...prev };
            for (const col of allCols) {
              if (!col.feedUrl?.trim()) delete next[col.id];
            }
            return next;
          });
          setLoadingByColumnId((prev) => {
            const next = { ...prev };
            for (const col of allCols) {
              if (!col.feedUrl?.trim()) delete next[col.id];
            }
            return next;
          });
        });
      }

      if (withUrl.length === 0) return;

      setLoadingByColumnId((prev) => {
        const next = { ...prev };
        for (const c of withUrl) next[c.id] = true;
        return next;
      });

      await runWithConcurrency(
        withUrl.map((col) => () => fetchSingleColumn(col)),
        FETCH_CONCURRENCY,
      );
    },
    [fetchSingleColumn],
  );

  /** Manual refresh: bypass staleness and reload every feed. */
  const refetchFeeds = useCallback(async () => {
    await runFetchForColumns(columnsRef.current, true);
  }, [runFetchForColumns]);

  // ─── One-time startup: load disk cache, seed UI, then let the key effect decide what to fetch ───

  useEffect(() => {
    if (!isTauriRuntime()) return;

    void (async () => {
      const cache = await loadFeedDiskCache();
      diskCacheRef.current = cache;

      const cols = columnsRef.current;
      const ids = new Set(cols.map((c) => c.id));

      // Remove orphaned column IDs from disk (fire-and-forget).
      void pruneFeedDiskCache(ids);

      // Seed state with any cached items whose URL still matches the column.
      const seeded: Record<string, FeedItem[]> = {};
      for (const col of cols) {
        const entry = cache[col.id];
        if (entry && entry.url === col.feedUrl?.trim() && entry.items.length > 0) {
          seeded[col.id] = entry.items;
          // Mark as "last fetched" so the key effect knows the URL is already satisfied.
          lastFetchedFeedUrlByColumnIdRef.current[col.id] = entry.url;
        }
      }

      // Batch both state updates into one render so the UI never flickers.
      startTransition(() => {
        if (Object.keys(seeded).length > 0) {
          setItemsByColumnId(seeded);
        }
        // Setting diskCacheReady triggers the key effect to run and schedule
        // background refreshes for stale / missing feeds.
        setDiskCacheReady(true);
      });
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally runs once on mount

  // ─── Column key effect: prune stale state and schedule network fetches ───

  const key = columnFeedKey(allFeedColumns);

  useEffect(() => {
    // Wait for disk cache to be loaded so we never show spinners before cached content.
    if (!diskCacheReady) return;

    const cols = columnsRef.current;
    const ids = new Set(cols.map((c) => c.id));

    // Clean up tracking refs for removed columns.
    for (const k of Object.keys(lastFetchedFeedUrlByColumnIdRef.current)) {
      if (!ids.has(k)) delete lastFetchedFeedUrlByColumnIdRef.current[k];
    }

    // Prune state for removed columns.
    const prevItems = itemsRef.current;
    const pruned: Record<string, FeedItem[]> = {};
    for (const [k, v] of Object.entries(prevItems)) {
      if (ids.has(k)) pruned[k] = v;
    }

    startTransition(() => {
      setItemsByColumnId(pruned);
      setErrorByColumnId((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          if (!ids.has(k)) delete next[k];
        }
        return next;
      });
      setLoadingByColumnId((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          if (!ids.has(k)) delete next[k];
        }
        return next;
      });
    });

    // Determine which columns actually need a network fetch:
    // 1. URL changed since last successful fetch (or never fetched) — always fetch.
    // 2. No items in state — always fetch (first launch or no cache match).
    // 3. Items exist but disk cache entry is stale — background refresh.
    // Columns with fresh cache are skipped entirely.
    const toFetch = cols
      .filter((c) => {
        const url = c.feedUrl?.trim();
        if (!url) return false;
        const last = lastFetchedFeedUrlByColumnIdRef.current[c.id];
        if (last !== url) return true; // URL changed / first fetch
        if (!Object.prototype.hasOwnProperty.call(pruned, c.id)) return true; // no items
        const cacheEntry = diskCacheRef.current[c.id];
        if (!cacheEntry) return true;
        return isFeedCacheStale(cacheEntry); // re-fetch only when stale
      })
      // Prioritize: columns with no cache at all first, stale-cached columns after.
      .sort((a, b) => {
        const aHasCache = Boolean(diskCacheRef.current[a.id]);
        const bHasCache = Boolean(diskCacheRef.current[b.id]);
        if (aHasCache === bHasCache) return 0;
        return aHasCache ? 1 : -1;
      });

    if (toFetch.length > 0) {
      void runFetchForColumns(toFetch, false);
    }
  }, [key, diskCacheReady, runFetchForColumns]);

  const feedsRefreshing = useMemo(
    () => Object.values(loadingByColumnId).some(Boolean),
    [loadingByColumnId],
  );

  return useMemo(
    () => ({
      feedItemsByColumnId: itemsByColumnId,
      feedLoadingByColumnId: loadingByColumnId,
      feedErrorByColumnId: errorByColumnId,
      refetchFeeds,
      feedsRefreshing,
    }),
    [itemsByColumnId, loadingByColumnId, errorByColumnId, refetchFeeds],
  );
}
