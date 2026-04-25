import { lazy, Suspense } from "react";

import { DocumentTitle } from "@/components/document-title";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { AiFloatingComposer } from "@/components/ai/ai-floating-composer";
import { AiToolsProvider } from "@/components/ai/ai-tools-provider";
import { AppShell } from "@/components/layout/app-shell";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useFeedItems } from "@/hooks/use-feed-items";
import { useGridConfig } from "@/hooks/use-grid-config";
import { useReadHistory } from "@/hooks/use-read-history";

const HomePage = lazy(() =>
  import("@/pages/home-page").then((m) => ({ default: m.HomePage })),
);
const FeedStreamPage = lazy(() =>
  import("@/pages/feed-stream-page").then((m) => ({
    default: m.FeedStreamPage,
  })),
);
const BookmarksPage = lazy(() =>
  import("@/pages/bookmarks-page").then((m) => ({
    default: m.BookmarksPage,
  })),
);
const HistoryPage = lazy(() =>
  import("@/pages/history-page").then((m) => ({ default: m.HistoryPage })),
);
const ReaderPage = lazy(() =>
  import("@/pages/reader-page").then((m) => ({ default: m.ReaderPage })),
);
const SettingsLayout = lazy(() =>
  import("@/pages/settings-layout").then((m) => ({
    default: m.SettingsLayout,
  })),
);
const SettingsGridPage = lazy(() =>
  import("@/pages/settings-grid-page").then((m) => ({
    default: m.SettingsGridPage,
  })),
);
const SettingsAppPage = lazy(() =>
  import("@/pages/settings-app-page").then((m) => ({
    default: m.SettingsAppPage,
  })),
);
const SettingsAboutPage = lazy(() =>
  import("@/pages/settings-about-page").then((m) => ({
    default: m.SettingsAboutPage,
  })),
);
function RouteFallback() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground">
      Loading…
    </div>
  );
}

function App() {
  const grid = useGridConfig();
  const bookmarks = useBookmarks();
  const readHistory = useReadHistory();
  const feed = useFeedItems(grid.allColumns);
  const location = useLocation();
  const navigate = useNavigate();

  if (!grid.ready || !bookmarks.ready || !readHistory.ready) {
    return (
      <div className="flex min-h-0 min-h-[min(100%,100dvh)] flex-1 items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <AiToolsProvider
      feedItemsByColumnId={feed.feedItemsByColumnId}
      columns={grid.allColumns}
      pages={grid.pages}
      bookmarks={bookmarks.bookmarks}
      readHistory={readHistory.readHistory}
      navigation={{
        pathname: location.pathname,
        search: location.search,
        navigate: (path: string) => {
          void navigate(path);
        },
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <DocumentTitle />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route
              element={
                <AppShell
                  grid={grid}
                  feed={feed}
                  bookmarks={bookmarks}
                  readHistory={readHistory}
                />
              }
            >
              <Route index element={<HomePage />} />
              <Route path="feed" element={<FeedStreamPage />} />
              <Route path="bookmarks" element={<BookmarksPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="reader" element={<ReaderPage />} />
              <Route path="settings" element={<SettingsLayout />}>
                <Route index element={<SettingsGridPage />} />
                <Route path="app" element={<SettingsAppPage />} />
                <Route
                  path="icons"
                  element={<Navigate to="/settings/app" replace />}
                />
                <Route path="about" element={<SettingsAboutPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <AiFloatingComposer />
      </div>
    </AiToolsProvider>
  );
}

export default App;
