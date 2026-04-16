import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/app-shell";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useGridConfig } from "@/hooks/use-grid-config";
import { BookmarksPage } from "@/pages/bookmarks-page";
import { FeedStreamPage } from "@/pages/feed-stream-page";
import { HomePage } from "@/pages/home-page";
import { ReaderPage } from "@/pages/reader-page";
import { SettingsPage } from "@/pages/settings-page";

function App() {
  const grid = useGridConfig();
  const bookmarks = useBookmarks();

  if (!grid.ready || !bookmarks.ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell grid={grid} bookmarks={bookmarks} />}>
          <Route index element={<HomePage />} />
          <Route path="feed" element={<FeedStreamPage />} />
          <Route path="bookmarks" element={<BookmarksPage />} />
          <Route path="reader" element={<ReaderPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
