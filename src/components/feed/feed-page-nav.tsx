import { AGGREGATE_PAGE_ID, type GridPage } from "@/types/grid";
import { cn } from "@/lib/utils";

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

  return (
    <aside
      className="w-[5.75rem] shrink-0 border-r border-border/70 bg-background/80 px-2 py-4 sm:w-36"
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
