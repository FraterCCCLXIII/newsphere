import { useOutletContext } from "react-router-dom";

import { FeedPageNav } from "@/components/feed/feed-page-nav";
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
      <div
        className={cn(
          "flex min-h-0 w-full min-w-0 flex-1 flex-col self-center overflow-hidden",
          showPageNav ? "max-w-4xl" : "max-w-xl",
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
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
