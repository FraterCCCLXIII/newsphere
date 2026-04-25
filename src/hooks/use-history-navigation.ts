import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { shouldIgnoreShortcutTarget } from "@/lib/keyboard-shortcut-target";
import { isMac } from "@/lib/platform";

type NavCaps = {
  canGoBack: boolean;
  canGoForward: boolean;
};

/** React Router’s browser history stores `idx` on `window.history.state`. */
function getRouterHistoryIdx(): number | null {
  const s = window.history.state;
  if (
    s &&
    typeof s === "object" &&
    "idx" in s &&
    typeof (s as { idx: unknown }).idx === "number"
  ) {
    return (s as { idx: number }).idx;
  }
  return null;
}

function readNavigationApiCaps(): NavCaps | null {
  const w = window as Window & {
    navigation?: {
      canGoBack?: boolean;
      canGoForward?: boolean;
    };
  };
  if (typeof w.navigation?.canGoBack === "boolean") {
    return {
      canGoBack: w.navigation.canGoBack,
      canGoForward: Boolean(w.navigation.canGoForward),
    };
  }
  return null;
}

function applyIdxCaps(
  idx: number,
  maxIdx: number,
  setCaps: Dispatch<SetStateAction<NavCaps>>,
) {
  setCaps({
    canGoBack: idx > 0,
    canGoForward: idx < maxIdx,
  });
}

/**
 * Browser-style back / forward using React Router’s session history.
 *
 * - Tracks `history.state.idx` (React Router) plus the furthest `idx` seen on
 *   push so “forward” matches a normal tab after going back.
 * - Falls back to the Navigation API, then `history.length`, when `idx` is missing.
 * - Re-syncs after each route change to avoid stale button state.
 * - Keyboard: ⌘ [ / ⌘ ] on macOS, Alt+← / Alt+→ elsewhere (only when the target can
 *   navigate, so we do not send the user past the SPA root).
 */
export function useHistoryNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const maxIdxRef = useRef<number | null>(null);
  const capsRef = useRef<NavCaps>({
    canGoBack: false,
    canGoForward: false,
  });

  const [caps, setCaps] = useState<NavCaps>(() => {
    const idx = getRouterHistoryIdx();
    if (idx !== null) {
      maxIdxRef.current = idx;
      const initial = { canGoBack: idx > 0, canGoForward: false };
      capsRef.current = initial;
      return initial;
    }
    const fallback =
      readNavigationApiCaps() ?? {
        canGoBack: window.history.length > 1,
        canGoForward: false,
      };
    capsRef.current = fallback;
    return fallback;
  });

  capsRef.current = caps;

  const syncFromHistory = useCallback(() => {
    const idx = getRouterHistoryIdx();
    if (idx === null) {
      const nav = readNavigationApiCaps();
      if (nav) {
        setCaps(nav);
      } else {
        setCaps({
          canGoBack: window.history.length > 1,
          canGoForward: false,
        });
      }
      return;
    }

    if (maxIdxRef.current === null) {
      maxIdxRef.current = idx;
    }

    const maxIdx = maxIdxRef.current;
    applyIdxCaps(idx, maxIdx, setCaps);
  }, []);

  useEffect(() => {
    const hr = window.history;
    const origPush = hr.pushState.bind(hr);
    const origReplace = hr.replaceState.bind(hr);

    hr.pushState = (...args: Parameters<History["pushState"]>) => {
      const ret = origPush(...args);
      const idx = getRouterHistoryIdx();
      if (idx !== null) {
        maxIdxRef.current = idx;
      }
      syncFromHistory();
      return ret;
    };

    hr.replaceState = (...args: Parameters<History["replaceState"]>) => {
      const ret = origReplace(...args);
      syncFromHistory();
      return ret;
    };

    syncFromHistory();

    window.addEventListener("popstate", syncFromHistory);

    return () => {
      hr.pushState = origPush;
      hr.replaceState = origReplace;
      window.removeEventListener("popstate", syncFromHistory);
    };
  }, [syncFromHistory]);

  useEffect(() => {
    syncFromHistory();
  }, [location.key, location.pathname, location.search, syncFromHistory]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat) return;
      if (shouldIgnoreShortcutTarget(e.target)) return;

      const mac = isMac();
      if (mac) {
        if (e.metaKey && (e.key === "[" || e.key === "]")) {
          if (e.key === "[" && !capsRef.current.canGoBack) return;
          if (e.key === "]" && !capsRef.current.canGoForward) return;
          e.preventDefault();
          navigate(e.key === "[" ? -1 : 1);
        }
        return;
      }

      if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        if (e.key === "ArrowLeft" && !capsRef.current.canGoBack) return;
        if (e.key === "ArrowRight" && !capsRef.current.canGoForward) return;
        e.preventDefault();
        navigate(e.key === "ArrowLeft" ? -1 : 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const goForward = useCallback(() => {
    navigate(1);
  }, [navigate]);

  return { goBack, goForward, ...caps };
}
