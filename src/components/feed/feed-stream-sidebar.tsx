import {
  Bookmark,
  Grid3x3,
  History,
  Rows3,
  Settings,
} from "lucide-react";
import { useCallback } from "react";
import { NavLink, useLocation, useNavigate, useOutletContext } from "react-router-dom";

import { cn } from "@/lib/utils";
import type { AppOutletContext } from "@/types/app-outlet";
import { AGGREGATE_PAGE_ID } from "@/types/grid";

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "app-no-drag flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
    "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground",
    isActive && "bg-accent font-medium text-foreground",
  );

function pageButtonClass(active: boolean) {
  return cn(
    "app-no-drag w-full min-w-0 truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors",
    "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground",
    active && "bg-accent font-medium text-foreground",
  );
}

export function FeedStreamSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { pages, activePageId, setActivePage } =
    useOutletContext<AppOutletContext>();

  const linkFromReader = useCallback(
    (to: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (location.pathname !== "/reader") return;
      e.preventDefault();
      navigate(to, { replace: true });
    },
    [location.pathname, navigate],
  );

  const showAggregate = pages.length > 1;

  return (
    <aside
      className="hidden min-h-0 shrink-0 flex-col border-r border-border bg-muted/20 py-3 pl-2 pr-1 dark:bg-muted/10 md:flex md:w-52 lg:w-56"
      aria-label="Feed navigation"
    >
      <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Pages
      </p>
      <nav className="flex flex-col gap-0.5" aria-label="App sections">
        <NavLink
          to="/"
          end
          className={navItemClass}
          onClick={linkFromReader("/")}
        >
          <Grid3x3 className="size-4 shrink-0 opacity-80" aria-hidden />
          Grid
        </NavLink>
        <NavLink
          to="/feed"
          className={navItemClass}
          onClick={linkFromReader("/feed")}
        >
          <Rows3 className="size-4 shrink-0 opacity-80" aria-hidden />
          Latest
        </NavLink>
        <NavLink
          to="/bookmarks"
          className={navItemClass}
          onClick={linkFromReader("/bookmarks")}
        >
          <Bookmark className="size-4 shrink-0 opacity-80" aria-hidden />
          Bookmarks
        </NavLink>
        <NavLink
          to="/history"
          className={navItemClass}
          onClick={linkFromReader("/history")}
        >
          <History className="size-4 shrink-0 opacity-80" aria-hidden />
          History
        </NavLink>
        <NavLink
          to="/settings"
          className={navItemClass}
          onClick={linkFromReader("/settings")}
        >
          <Settings className="size-4 shrink-0 opacity-80" aria-hidden />
          Settings
        </NavLink>
      </nav>

      <p className="mb-1 mt-4 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Sources
      </p>
      <nav
        className="flex min-h-0 flex-col gap-0.5 overflow-y-auto overscroll-contain pr-1"
        aria-label="Feed source pages"
      >
        {showAggregate ? (
          <button
            type="button"
            className={pageButtonClass(
              activePageId === AGGREGATE_PAGE_ID,
            )}
            onClick={() => void setActivePage(AGGREGATE_PAGE_ID)}
          >
            All
          </button>
        ) : null}
        {pages.map((p) => (
          <button
            key={p.id}
            type="button"
            className={pageButtonClass(activePageId === p.id)}
            title={p.name}
            onClick={() => void setActivePage(p.id)}
          >
            {p.name}
          </button>
        ))}
      </nav>
    </aside>
  );
}
