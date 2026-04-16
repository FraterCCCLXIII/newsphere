import { useState } from "react";
import { Outlet } from "react-router-dom";

import { TitleBar } from "@/components/layout/title-bar";
import { useFeedItems } from "@/hooks/use-feed-items";
import type { BookmarksController } from "@/hooks/use-bookmarks";
import type { AppOutletContext } from "@/types/app-outlet";
import type { GridController } from "@/types/grid";

type AppShellProps = {
  grid: GridController;
  bookmarks: BookmarksController;
};

export function AppShell({ grid, bookmarks }: AppShellProps) {
  const feed = useFeedItems(grid.columns);
  const [searchQuery, setSearchQuery] = useState("");

  const outletContext: AppOutletContext = {
    ...grid,
    searchQuery,
    setSearchQuery,
    ...feed,
    bookmarks: bookmarks.bookmarks,
    toggleBookmark: bookmarks.toggleBookmark,
    removeBookmark: bookmarks.removeBookmark,
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <TitleBar
        onRefresh={() => {
          void grid.refresh();
          void feed.refetchFeeds();
        }}
        refreshing={grid.refreshing || feed.feedsRefreshing}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        pages={grid.pages}
        activePageId={grid.activePageId}
        onSelectPage={(pageId) => {
          void grid.setActivePage(pageId);
        }}
        onAddPage={grid.addPage}
        catalogColumns={grid.allColumns}
        onAddCatalogSource={async (source) => {
          await grid.addColumn(source.name, source.url);
        }}
        onAddCustomColumn={async (title, feedUrl) => {
          await grid.addColumn(title, feedUrl);
        }}
        onRemoveByFeedUrl={async (feedUrl) => {
          const norm = (u: string) => u.trim().replace(/\/$/, "");
          const target = norm(feedUrl);
          const col = grid.allColumns.find(
            (c) => c.feedUrl && norm(c.feedUrl) === target,
          );
          if (col) await grid.removeColumn(col.id);
        }}
      />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Outlet context={outletContext} />
      </main>
    </div>
  );
}
