import { useCallback, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { AiChatDrawer } from "@/components/ai/ai-chat-drawer";
import { useAiTools } from "@/components/ai/ai-tools-provider";
import { AddSourceModal } from "@/components/layout/add-source-modal";
import { TitleBar, type TitleBarProps } from "@/components/layout/title-bar";
import type { FeedItemsController } from "@/hooks/use-feed-items";
import type { BookmarksController } from "@/hooks/use-bookmarks";
import type { ReadHistoryController } from "@/hooks/use-read-history";
import type { AppOutletContext } from "@/types/app-outlet";
import type { CatalogSource } from "@/types/catalog";
import type { GridController } from "@/types/grid";

type AppShellProps = {
  grid: GridController;
  feed: FeedItemsController;
  bookmarks: BookmarksController;
  readHistory: ReadHistoryController;
};

function AppShellTitleBarWithAi(props: Omit<TitleBarProps, "aiAssistant">) {
  const ai = useAiTools();
  return (
    <TitleBar
      {...props}
      aiAssistant={
        ai.ready
          ? { drawerOpen: ai.drawerOpen, onToggle: ai.toggleDrawer }
          : undefined
      }
    />
  );
}

export function AppShell({ grid, feed, bookmarks, readHistory }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const pendingInsertFeedAfterIdRef = useRef<string | null>(null);

  const closeReaderForGridShell = useCallback(() => {
    if (location.pathname === "/reader") {
      navigate("/", { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleSelectPage = useCallback(
    (pageId: string) => {
      void grid.setActivePage(pageId);
      closeReaderForGridShell();
    },
    [grid, closeReaderForGridShell],
  );

  const handleAddPage = useCallback(
    async (name: string) => {
      await grid.addPage(name);
      closeReaderForGridShell();
    },
    [grid, closeReaderForGridShell],
  );

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

  const outletContext = useMemo<AppOutletContext>(
    () => ({
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
    }),
    [
      grid,
      openAddFeedModal,
      searchQuery,
      feed,
      bookmarks,
      readHistory,
    ],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <AppShellTitleBarWithAi
        onRefresh={() => {
          void grid.refresh();
          void feed.refetchFeeds();
        }}
        refreshing={grid.refreshing || feed.feedsRefreshing}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        pages={grid.pages}
        activePageId={grid.activePageId}
        onSelectPage={handleSelectPage}
        onAddPage={handleAddPage}
        onAddSourceClick={openAddFeedModalAppend}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden rounded-b-[var(--radius-xl)]">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Outlet context={outletContext} />
        </main>
        <AiChatDrawer />
      </div>
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
