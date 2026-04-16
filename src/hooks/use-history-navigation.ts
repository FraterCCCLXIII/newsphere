import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useNavigate } from "react-router-dom";

type NavCaps = {
  canGoBack: boolean;
  canGoForward: boolean;
};

/** React Router browser history stores `idx` on `window.history.state` (see remix history). */
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
 * Browser-style back / forward using React Router.
 *
 * Prefers `history.state.idx` (BrowserRouter / Remix history). Tracks the
 * stack tip by wrapping `history.pushState` so we do not rely on
 * `useNavigationType`. Falls back to the Navigation API, then a minimal
 * heuristic. Avoids fragile coupling to RR’s action type in effects (which was a
 * likely source of render issues).
 */
export function useHistoryNavigation() {
  const navigate = useNavigate();
  const maxIdxRef = useRef<number | null>(null);
  const [caps, setCaps] = useState<NavCaps>(() => {
    const idx = getRouterHistoryIdx();
    if (idx !== null) {
      return { canGoBack: idx > 0, canGoForward: false };
    }
    return (
      readNavigationApiCaps() ?? {
        canGoBack: window.history.length > 1,
        canGoForward: false,
      }
    );
  });

  useEffect(() => {
    const hr = window.history;
    const origPush = hr.pushState.bind(hr);
    const origReplace = hr.replaceState.bind(hr);

    const syncFromHistory = () => {
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
    };

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
  }, []);

  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const goForward = useCallback(() => {
    navigate(1);
  }, [navigate]);

  return { goBack, goForward, ...caps };
}
