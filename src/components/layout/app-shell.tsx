import { useCallback, useRef, useState } from "react";
import { Outlet } from "react-router-dom";

import { AddSourceModal } from "@/components/layout/add-source-modal";
import { TitleBar } from "@/components/layout/title-bar";
import { useFeedItems } from "@/hooks/use-feed-items";
import type { BookmarksController } from "@/hooks/use-bookmarks";
import type { ReadHistoryController } from "@/hooks/use-read-history";
import type { AppOutletContext } from "@/types/app-outlet";
import type { CatalogSource } from "@/types/catalog";
import type { GridController } from "@/types/grid";

type AppShellProps = {
  grid: GridController;
  bookmarks: BookmarksController;
  readHistory: ReadHistoryController;
};

export function AppShell({ grid, bookmarks, readHistory }: AppShellProps) {
  const feed = useFeedItems(grid.columns);
  const [searchQuery, setSearchQuery] = useState("");
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const pendingInsertFeedAfterIdRef = useRef<string | null>(null);

  const openAddFeedModal = useCallback((afterColumnId: string | null) => {
    pendingInsertFeedAfterIdRef.current = afterColumnId;
    setAddSourceOpen(true);
  }, []);

  const openAddFeedModalAppend = useCallback(() => {
    const cols = grid.settingsColumns;
    pendingInsertFeedAfterIdRef.current =
      cols.length > 0 ? cols[cols.length - 1]!.id : null;
    setAddSourceOpen(true);
  }, [grid.settingsColumns]);

  const handleAddCatalogSource = useCallback(
    async (source: CatalogSource) => {
      const afterId = pendingInsertFeedAfterIdRef.current;
      pendingInsertFeedAfterIdRef.current = null;
      await grid.insertColumnAfter(afterId, "feed", source.name, source.url);
    },
    [grid],
  );

  const handleAddCustomColumn = useCallback(
    async (title: string, feedUrl?: string) => {
      const afterId = pendingInsertFeedAfterIdRef.current;
      pendingInsertFeedAfterIdRef.current = null;
      await grid.insertColumnAfter(afterId, "feed", title, feedUrl);
    },
    [grid],
  );

  const handleAddSourceModalOpenChange = useCallback((open: boolean) => {
    if (!open) pendingInsertFeedAfterIdRef.current = null;
    setAddSourceOpen(open);
  }, []);

  const handleRemoveByFeedUrl = useCallback(
    async (feedUrl: string) => {
      const norm = (u: string) => u.trim().replace(/\/$/, "");
      const target = norm(feedUrl);
      const col = grid.allColumns.find(
        (c) => c.feedUrl && norm(c.feedUrl) === target,
      );
      if (col) await grid.removeColumn(col.id);
    },
    [grid],
  );

  const outletContext: AppOutletContext = {
    ...grid,
    openAddFeedModal,
    searchQuery,
    setSearchQuery,
    ...feed,
    bookmarks: bookmarks.bookmarks,
    toggleBookmark: bookmarks.toggleBookmark,
    removeBookmark: bookmarks.removeBookmark,
    readHistory: readHistory.readHistory,
    recordArticleView: readHistory.recordArticleView,
    removeReadHistoryEntry: readHistory.removeReadHistoryEntry,
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
        onAddSourceClick={openAddFeedModalAppend}
      />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Outlet context={outletContext} />
      </main>
      <AddSourceModal
        open={addSourceOpen}
        onOpenChange={handleAddSourceModalOpenChange}
        catalogColumns={grid.allColumns}
        onAddSource={handleAddCatalogSource}
        onAddCustomColumn={handleAddCustomColumn}
        onRemoveByFeedUrl={handleRemoveByFeedUrl}
      />
    </div>
  );
}
