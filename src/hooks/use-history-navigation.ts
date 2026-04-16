import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type NavCaps = {
  canGoBack: boolean;
  canGoForward: boolean;
};

function readCaps(): NavCaps {
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
  return {
    canGoBack: window.history.length > 1,
    canGoForward: false,
  };
}

/**
 * Browser-style back / forward using React Router, with Navigation API when
 * the webview supports it (Chromium). Otherwise back is gated by history length.
 */
export function useHistoryNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [caps, setCaps] = useState<NavCaps>(readCaps);

  useEffect(() => {
    setCaps(readCaps());
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const sync = () => setCaps(readCaps());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const goForward = useCallback(() => {
    navigate(1);
  }, [navigate]);

  return { goBack, goForward, ...caps };
}
