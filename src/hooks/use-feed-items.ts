import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isTauriRuntime } from "@/lib/tauri-env";
import type { FeedItem } from "@/types/feed";
import type { GridColumn } from "@/types/grid";

function columnFeedKey(columns: GridColumn[]): string {
  return columns
    .map((c) => `${c.id}:${c.feedUrl ?? ""}`)
    .sort()
    .join("|");
}

export function useFeedItems(columns: GridColumn[]) {
  const columnsRef = useRef(columns);
  columnsRef.current = columns;

  const [itemsByColumnId, setItemsByColumnId] = useState<
    Record<string, FeedItem[]>
  >({});
  const [loadingByColumnId, setLoadingByColumnId] = useState<
    Record<string, boolean>
  >({});
  const [errorByColumnId, setErrorByColumnId] = useState<
    Record<string, string>
  >({});

  const refetchFeeds = useCallback(async () => {
    if (!isTauriRuntime()) {
      return;
    }

    const cols = columnsRef.current;
    const withUrl = cols.filter((c) => c.feedUrl?.trim());

    const loading: Record<string, boolean> = {};
    for (const c of withUrl) {
      loading[c.id] = true;
    }
    setLoadingByColumnId((prev) => {
      const next = { ...prev };
      for (const col of cols) {
        if (!col.feedUrl?.trim()) {
          delete next[col.id];
        }
      }
      Object.assign(next, loading);
      return next;
    });

    const results = await Promise.all(
      withUrl.map(async (col) => {
        const url = col.feedUrl!.trim();
        try {
          const items = await invoke<FeedItem[]>("fetch_feed", { url });
          return {
            id: col.id,
            ok: true as const,
            items,
            err: "" as string,
          };
        } catch (e) {
          return {
            id: col.id,
            ok: false as const,
            items: [] as FeedItem[],
            err: e instanceof Error ? e.message : String(e),
          };
        }
      }),
    );

    setItemsByColumnId((prev) => {
      const next = { ...prev };
      for (const col of cols) {
        if (!col.feedUrl?.trim()) {
          delete next[col.id];
        }
      }
      for (const r of results) {
        next[r.id] = r.items;
      }
      return next;
    });

    setErrorByColumnId((prev) => {
      const next = { ...prev };
      for (const col of cols) {
        if (!col.feedUrl?.trim()) {
          delete next[col.id];
        }
      }
      for (const r of results) {
        if (r.ok) {
          delete next[r.id];
        } else {
          next[r.id] = r.err;
        }
      }
      return next;
    });

    setLoadingByColumnId((prev) => {
      const next = { ...prev };
      for (const c of withUrl) {
        next[c.id] = false;
      }
      return next;
    });
  }, []);

  const key = columnFeedKey(columns);

  useEffect(() => {
    void refetchFeeds();
  }, [key, refetchFeeds]);

  const feedsRefreshing = useMemo(
    () => Object.values(loadingByColumnId).some(Boolean),
    [loadingByColumnId],
  );

  return {
    feedItemsByColumnId: itemsByColumnId,
    feedLoadingByColumnId: loadingByColumnId,
    feedErrorByColumnId: errorByColumnId,
    refetchFeeds,
    feedsRefreshing,
  };
}
