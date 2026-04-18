import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { normalizeBookmarkLink } from "@/lib/bookmark-utils";
import { isTauriRuntime } from "@/lib/tauri-env";
import type { BookmarkEntry, BookmarksStore } from "@/types/bookmark";

const STORE_FILE = "bookmarks.json";
const STORE_KEY = "bookmarks_data";
const LS_KEY = "newsphere-bookmarks-v1";
const LS_KEY_LEGACY = "newsfeed-bookmarks-v1";

const TAURI_BOOKMARK_OPTIONS = { defaults: {}, autoSave: true } as const;

let bookmarksStorePromise: ReturnType<
  typeof import("@tauri-apps/plugin-store").load
> | null = null;

let bookmarkSaveTail: Promise<void> = Promise.resolve();

function enqueueBookmarkPersist(task: () => Promise<void>): Promise<void> {
  bookmarkSaveTail = bookmarkSaveTail.then(task);
  return bookmarkSaveTail;
}

async function getBookmarksStore() {
  if (!bookmarksStorePromise) {
    const { load } = await import("@tauri-apps/plugin-store");
    bookmarksStorePromise = load(STORE_FILE, TAURI_BOOKMARK_OPTIONS);
  }
  return bookmarksStorePromise;
}

async function loadBookmarks(): Promise<BookmarkEntry[]> {
  if (isTauriRuntime()) {
    const store = await getBookmarksStore();
    const value = await store.get<BookmarksStore>(STORE_KEY);
    if (value && Array.isArray(value.items)) {
      return value.items;
    }
    return [];
  }

  try {
    const raw =
      localStorage.getItem(LS_KEY) ?? localStorage.getItem(LS_KEY_LEGACY);
    if (raw) {
      const parsed = JSON.parse(raw) as BookmarksStore;
      if (parsed && Array.isArray(parsed.items)) {
        return parsed.items;
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

async function saveBookmarks(items: BookmarkEntry[]): Promise<void> {
  const payload: BookmarksStore = { items };
  if (isTauriRuntime()) {
    await enqueueBookmarkPersist(async () => {
      const store = await getBookmarksStore();
      await store.set(STORE_KEY, payload);
      await store.save();
    });
    return;
  }
  localStorage.setItem(LS_KEY, JSON.stringify(payload));
  try {
    localStorage.removeItem(LS_KEY_LEGACY);
  } catch {
    /* ignore */
  }
}

export type BookmarksController = {
  bookmarks: BookmarkEntry[];
  ready: boolean;
  isBookmarked: (link: string) => boolean;
  addBookmark: (entry: {
    title: string;
    link: string;
    published?: string;
    sourceFeedTitle?: string;
    sourceColumnId?: string;
  }) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
  removeBookmarkByLink: (link: string) => Promise<void>;
  toggleBookmark: (entry: {
    title: string;
    link: string;
    published?: string;
    sourceFeedTitle?: string;
    sourceColumnId?: string;
  }) => Promise<void>;
};

export function useBookmarks(): BookmarksController {
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [ready, setReady] = useState(false);
  const bookmarksRef = useRef<BookmarkEntry[]>([]);

  useEffect(() => {
    bookmarksRef.current = bookmarks;
  }, [bookmarks]);

  useEffect(() => {
    let cancelled = false;
    void loadBookmarks().then((items) => {
      if (!cancelled) {
        bookmarksRef.current = items;
        setBookmarks(items);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: BookmarkEntry[]) => {
    bookmarksRef.current = next;
    setBookmarks(next);
    await saveBookmarks(next);
  }, []);

  const isBookmarked = useCallback((link: string) => {
    const n = normalizeBookmarkLink(link);
    return bookmarksRef.current.some(
      (b) => normalizeBookmarkLink(b.link) === n,
    );
  }, []);

  const addBookmark = useCallback(
    async (entry: {
      title: string;
      link: string;
      published?: string;
      sourceFeedTitle?: string;
      sourceColumnId?: string;
    }) => {
      const prev = bookmarksRef.current;
      const link = normalizeBookmarkLink(entry.link);
      if (prev.some((b) => normalizeBookmarkLink(b.link) === link)) {
        return;
      }
      const row: BookmarkEntry = {
        id: crypto.randomUUID(),
        title: entry.title.trim() || "Untitled",
        link,
        published: entry.published,
        sourceFeedTitle: entry.sourceFeedTitle,
        sourceColumnId: entry.sourceColumnId,
        savedAt: new Date().toISOString(),
      };
      await persist([...prev, row]);
    },
    [persist],
  );

  const removeBookmark = useCallback(
    async (id: string) => {
      await persist(bookmarksRef.current.filter((b) => b.id !== id));
    },
    [persist],
  );

  const removeBookmarkByLink = useCallback(
    async (link: string) => {
      const n = normalizeBookmarkLink(link);
      await persist(
        bookmarksRef.current.filter(
          (b) => normalizeBookmarkLink(b.link) !== n,
        ),
      );
    },
    [persist],
  );

  const toggleBookmark = useCallback(
    async (entry: {
      title: string;
      link: string;
      published?: string;
      sourceFeedTitle?: string;
      sourceColumnId?: string;
    }) => {
      const n = normalizeBookmarkLink(entry.link);
      if (
        bookmarksRef.current.some(
          (b) => normalizeBookmarkLink(b.link) === n,
        )
      ) {
        await removeBookmarkByLink(entry.link);
      } else {
        await addBookmark(entry);
      }
    },
    [addBookmark, removeBookmarkByLink],
  );

  return useMemo(
    () => ({
      bookmarks,
      ready,
      isBookmarked,
      addBookmark,
      removeBookmark,
      removeBookmarkByLink,
      toggleBookmark,
    }),
    [
      bookmarks,
      ready,
      isBookmarked,
      addBookmark,
      removeBookmark,
      removeBookmarkByLink,
      toggleBookmark,
    ],
  );
}
