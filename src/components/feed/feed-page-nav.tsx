import { AGGREGATE_PAGE_ID, type GridPage } from "@/types/grid";
import { cn } from "@/lib/utils";

/** Matches `w-[5.75rem] sm:w-36` — half is used to re-center the feed column in the viewport. */
export const FEED_PAGE_NAV_CENTERING_SHIFT_CLASS =
  "-translate-x-[2.875rem] sm:-translate-x-[4.5rem]";

/** Nav width + `max-w-xl` (36rem); caps the row on small viewports. */
export const FEED_PAGE_NAV_ROW_MAX_CLASS =
  "max-w-[min(100%,41.75rem)] sm:max-w-[min(100%,45rem)]";

type FeedPageNavProps = {
  pages: GridPage[];
  activePageId: string;
  isAggregateView: boolean;
  setActivePage: (pageId: string) => Promise<void>;
};

const navItemClass = (active: boolean) =>
  cn(
    "w-full rounded-md py-1.5 pr-1 text-left text-sm transition-colors",
    active
      ? "font-medium text-foreground"
      : "text-muted-foreground hover:text-foreground",
  );

export function FeedPageNav({
  pages,
  activePageId,
  isAggregateView,
  setActivePage,
}: FeedPageNavProps) {
  if (pages.length <= 1) return null;

  // pt-6 = TimelineView column `py-4` + FeedStreamSortHeader `py-2` so tops align with the title.
  return (
    <aside
      className="w-[5.75rem] shrink-0 bg-background/80 px-2 pb-4 pt-6 sm:w-36"
      aria-label="Feed pages"
    >
      <nav className="flex flex-col gap-0.5">
        <button
          type="button"
          className={navItemClass(isAggregateView)}
          onClick={() => void setActivePage(AGGREGATE_PAGE_ID)}
        >
          All
        </button>
        {pages.map((page) => {
          const active = !isAggregateView && activePageId === page.id;
          return (
            <button
              key={page.id}
              type="button"
              title={page.name}
              className={cn(navItemClass(active), "truncate")}
              onClick={() => void setActivePage(page.id)}
            >
              {page.name}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
