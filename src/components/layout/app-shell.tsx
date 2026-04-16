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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <TitleBar
        onRefresh={() => {
          void grid.refresh();
          void feed.refetchFeeds();
        }}
        refreshing={grid.refreshing || feed.feedsRefreshing}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Outlet context={outletContext} />
      </main>
    </div>
  );
}
