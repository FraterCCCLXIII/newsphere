import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { APP_DISPLAY_NAME } from "@/lib/app-metadata";

/**
 * Sets `document.title` from the current route. Routes under `/reader` are
 * owned by `ReaderPage` and skipped here.
 */
export function DocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname.startsWith("/reader")) {
      return;
    }

    let title: string = APP_DISPLAY_NAME;
    if (pathname === "/feed") {
      title = `Feed — ${APP_DISPLAY_NAME}`;
    } else if (pathname === "/bookmarks") {
      title = `Bookmarks — ${APP_DISPLAY_NAME}`;
    } else if (pathname === "/history") {
      title = `History — ${APP_DISPLAY_NAME}`;
    } else if (pathname.startsWith("/settings")) {
      title = `Settings — ${APP_DISPLAY_NAME}`;
    }

    document.title = title;
  }, [pathname]);

  return null;
}
