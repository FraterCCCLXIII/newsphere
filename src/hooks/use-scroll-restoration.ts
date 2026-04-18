import { useEffect, useLayoutEffect, useRef } from "react";

const STORAGE_PREFIX = "newsphere-scroll-";

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
  const key = `${STORAGE_PREFIX}${storageKey}`;

  useLayoutEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const raw = sessionStorage.getItem(key);
    if (raw == null) return;
    const y = Number.parseFloat(raw);
    if (!Number.isFinite(y) || y < 0) return;

    const apply = () => {
      const el = ref.current;
      if (el) el.scrollTop = y;
    };
    apply();
    const id = requestAnimationFrame(() => {
      apply();
      requestAnimationFrame(apply);
    });
    return () => cancelAnimationFrame(id);
  }, [key, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    let debounce: number;
    const persist = () => {
      try {
        sessionStorage.setItem(key, String(el.scrollTop));
      } catch {
        /* ignore quota / private mode */
      }
    };

    const onScroll = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(persist, 120);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(debounce);
      persist();
      el.removeEventListener("scroll", onScroll);
    };
  }, [key, enabled]);

  return ref;
}
