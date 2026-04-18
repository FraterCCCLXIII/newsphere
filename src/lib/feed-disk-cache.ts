import { isTauriRuntime } from "@/lib/tauri-env";
import type { FeedItem } from "@/types/feed";

const STORE_FILE = "feed-cache.json";
const STORE_KEY = "feed_cache_data";

let feedCacheStorePromise: ReturnType<
  typeof import("@tauri-apps/plugin-store").load
> | null = null;

let saveTail: Promise<void> = Promise.resolve();

function enqueuePersist(task: () => Promise<void>): Promise<void> {
  saveTail = saveTail.then(task);
  return saveTail;
}

async function getFeedCacheStore() {
  if (!feedCacheStorePromise) {
    const { load } = await import("@tauri-apps/plugin-store");
    feedCacheStorePromise = load(STORE_FILE, {
      defaults: {},
      autoSave: false,
    });
  }
  return feedCacheStorePromise;
}

/** Cached items older than this are considered stale and will be refreshed in the background. */
export const FEED_CACHE_STALENESS_MS = 5 * 60 * 1000; // 5 minutes

export type FeedCacheEntry = {
  url: string;
  items: FeedItem[];
  fetchedAt: number; // unix ms
};

export type FeedCacheStore = Record<string, FeedCacheEntry>;

export function isFeedCacheStale(
  entry: FeedCacheEntry,
  stalenessMs = FEED_CACHE_STALENESS_MS,
): boolean {
  return Date.now() - entry.fetchedAt > stalenessMs;
}

export async function loadFeedDiskCache(): Promise<FeedCacheStore> {
  if (!isTauriRuntime()) return {};
  try {
    const store = await getFeedCacheStore();
    const value = await store.get<FeedCacheStore>(STORE_KEY);
    return value ?? {};
  } catch {
    return {};
  }
}

export async function saveFeedDiskCacheEntry(
  columnId: string,
  entry: FeedCacheEntry,
): Promise<void> {
  if (!isTauriRuntime()) return;
  await enqueuePersist(async () => {
    try {
      const store = await getFeedCacheStore();
      const existing = (await store.get<FeedCacheStore>(STORE_KEY)) ?? {};
      existing[columnId] = entry;
      await store.set(STORE_KEY, existing);
      await store.save();
    } catch {
      /* ignore — cache write failures are non-fatal */
    }
  });
}

export async function pruneFeedDiskCache(
  validColumnIds: Set<string>,
): Promise<void> {
  if (!isTauriRuntime()) return;
  await enqueuePersist(async () => {
    try {
      const store = await getFeedCacheStore();
      const existing = (await store.get<FeedCacheStore>(STORE_KEY)) ?? {};
      let changed = false;
      for (const key of Object.keys(existing)) {
        if (!validColumnIds.has(key)) {
          delete existing[key];
          changed = true;
        }
      }
      if (changed) {
        await store.set(STORE_KEY, existing);
        await store.save();
      }
    } catch {
      /* ignore */
    }
  });
}
