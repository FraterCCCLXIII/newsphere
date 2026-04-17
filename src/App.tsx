import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/app-shell";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useGridConfig } from "@/hooks/use-grid-config";
import { useReadHistory } from "@/hooks/use-read-history";
import { BookmarksPage } from "@/pages/bookmarks-page";
import { HistoryPage } from "@/pages/history-page";
import { FeedStreamPage } from "@/pages/feed-stream-page";
import { HomePage } from "@/pages/home-page";
import { ReaderPage } from "@/pages/reader-page";
import { SettingsAppPage } from "@/pages/settings-app-page";
import { SettingsGridPage } from "@/pages/settings-grid-page";
import { SettingsLayout } from "@/pages/settings-layout";

function App() {
  const grid = useGridConfig();
  const bookmarks = useBookmarks();
  const readHistory = useReadHistory();

  if (!grid.ready || !bookmarks.ready || !readHistory.ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <Routes>
      <Route
        element={<AppShell grid={grid} bookmarks={bookmarks} readHistory={readHistory} />}
      >
        <Route index element={<HomePage />} />
        <Route path="feed" element={<FeedStreamPage />} />
        <Route path="bookmarks" element={<BookmarksPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="reader" element={<ReaderPage />} />
        <Route path="settings" element={<SettingsLayout />}>
          <Route index element={<SettingsGridPage />} />
          <Route path="app" element={<SettingsAppPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
