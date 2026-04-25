import { useOutletContext } from "react-router-dom";

import {
  FeedPageNav,
  FEED_PAGE_NAV_CENTERING_SHIFT_CLASS,
  FEED_PAGE_NAV_ROW_MAX_CLASS,
} from "@/components/feed/feed-page-nav";
import { TimelineView } from "@/components/feed/timeline-view";
import { cn } from "@/lib/utils";
import type { AppOutletContext } from "@/types/app-outlet";

export function FeedStreamPage() {
  const {
    pages,
    activePageId,
    isAggregateView,
    setActivePage,
  } = useOutletContext<AppOutletContext>();

  const showPageNav = pages.length > 1;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 justify-center overflow-x-hidden px-2">
        <div
          className={cn(
            "flex h-full min-h-0 w-full flex-row items-stretch",
            showPageNav
              ? cn(FEED_PAGE_NAV_ROW_MAX_CLASS, FEED_PAGE_NAV_CENTERING_SHIFT_CLASS)
              : "max-w-xl",
          )}
        >
          {showPageNav ? (
            <FeedPageNav
              pages={pages}
              activePageId={activePageId}
              isAggregateView={isAggregateView}
              setActivePage={setActivePage}
            />
          ) : null}
          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
              showPageNav && "max-w-xl",
            )}
          >
            <TimelineView />
          </div>
        </div>
      </div>
    </div>
  );
}
