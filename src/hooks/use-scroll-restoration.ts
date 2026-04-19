import { useEffect, useLayoutEffect, useRef } from "react";

const STORAGE_PREFIX = "newsphere-scroll-";

function storageKeyForScroll(storageKey: string) {
  return `${STORAGE_PREFIX}${storageKey}`;
}

/** Synchronously read a saved `scrollTop` (same key as {@link useScrollRestoration}). */
export function readStoredScrollTop(storageKey: string): number {
  if (typeof window === "undefined") return 0;
  const raw = sessionStorage.getItem(storageKeyForScroll(storageKey));
  if (raw == null) return 0;
  const y = Number.parseFloat(raw);
  return Number.isFinite(y) && y >= 0 ? y : 0;
}

/**
 * Persist `scrollTop` in `sessionStorage` so browser back / in-app navigation
 * returns to the same scroll position (feed list, grid, etc.).
 */
export function useScrollRestoration(
  storageKey: string,
  options?: { enabled?: boolean },
) {
  const ref = useRef<HTMLDivElement>(null);
  const enabled = options?.enabled ?? true;
  const key = storageKeyForScroll(storageKey);
  /**
   * Virtual lists (TanStack Virtual) can briefly set scrollTop to 0 after mount before
   * restoration applies. If we persist that 0, we wipe the saved position.
   * While true, skip persisting scrollTop === 0 when storage still holds a positive value.
   */
  const ignoreZeroPersistRef = useRef(false);

  useLayoutEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const raw = sessionStorage.getItem(key);
    if (raw == null) {
      ignoreZeroPersistRef.current = false;
      return;
    }
    const y = Number.parseFloat(raw);
    if (!Number.isFinite(y) || y < 0) {
      ignoreZeroPersistRef.current = false;
      return;
    }

    ignoreZeroPersistRef.current = y > 0;

    const apply = () => {
      const el = ref.current;
      if (el) el.scrollTop = y;
    };
    apply();
    const id = requestAnimationFrame(() => {
      apply();
      requestAnimationFrame(() => {
        apply();
        const el = ref.current;
        if (el && el.scrollTop > 0) ignoreZeroPersistRef.current = false;
      });
    });
    return () => cancelAnimationFrame(id);
  }, [key, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const readStoredPositive = (): number | null => {
      try {
        const raw = sessionStorage.getItem(key);
        if (raw == null) return null;
        const v = Number.parseFloat(raw);
        return Number.isFinite(v) && v > 0 ? v : null;
      } catch {
        return null;
      }
    };

    let debounce: number;
    const persist = () => {
      try {
        const top = el.scrollTop;
        if (
          ignoreZeroPersistRef.current &&
          top === 0 &&
          readStoredPositive() != null
        ) {
          return;
        }
        sessionStorage.setItem(key, String(top));
      } catch {
        /* ignore quota / private mode */
      }
    };

    const onScroll = () => {
      if (el.scrollTop > 0) ignoreZeroPersistRef.current = false;
      window.clearTimeout(debounce);
      debounce = window.setTimeout(persist, 120);
    };

    el.addEventListener("scroll", onScroll, { passive: true });

    const clearIgnoreTimer = window.setTimeout(() => {
      ignoreZeroPersistRef.current = false;
    }, 600);

    return () => {
      window.clearTimeout(clearIgnoreTimer);
      window.clearTimeout(debounce);
      persist();
      el.removeEventListener("scroll", onScroll);
    };
  }, [key, enabled]);

  return ref;
}
