import {
  ArrowSquareOut,
  BookmarkSimple,
  CaretLeft,
  CaretRight,
  CircleNotch,
  ShareNetwork,
  X,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  useNavigate,
  useOutletContext,
  useSearchParams,
} from "react-router-dom";

import { useDisplayPreferences } from "@/components/display-preferences-provider";
import { ExternalBrowserLink } from "@/components/layout/external-browser-link";
import { ShareModal } from "@/components/share/share-modal";
import { Button } from "@/components/ui/button";
import { useReaderArticle } from "@/hooks/use-reader-article";
import { formatPublishedForPreference } from "@/lib/feed-time";
import { normalizeBookmarkLink } from "@/lib/bookmark-utils";
import { shouldIgnoreShortcutTarget } from "@/lib/keyboard-shortcut-target";
import { safeHttpHref } from "@/lib/safe-url";
import { APP_DISPLAY_NAME } from "@/lib/app-metadata";
import { cn } from "@/lib/utils";
import type { AppOutletContext } from "@/types/app-outlet";
import type { FeedItem } from "@/types/feed";

function linksMatch(a: string, b: string): boolean {
  try {
    return normalizeBookmarkLink(a) === normalizeBookmarkLink(b);
  } catch {
    return a === b;
  }
}

function findItemIndex(items: FeedItem[], link: string): number {
  return items.findIndex((it) => linksMatch(it.link, link));
}

const readerTitleLinkClassName = cn(
  "inline max-w-none border-0 bg-transparent p-0 text-left font-inherit",
  "text-inherit no-underline underline-offset-4 transition-colors",
  "hover:text-primary hover:underline hover:decoration-primary",
  "focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
);

export function ReaderPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    feedItemsByColumnId,
    columns,
    bookmarks,
    toggleBookmark,
    recordArticleView,
  } = useOutletContext<AppOutletContext>();
  const { dateFormatStyle } = useDisplayPreferences();

  const linkParam = searchParams.get("l");
  const columnId = searchParams.get("c") ?? undefined;

  const safeArticleUrl = useMemo(
    () => (linkParam ? safeHttpHref(linkParam) : null),
    [linkParam],
  );

  const bodyState = useReaderArticle(
    linkParam && safeArticleUrl ? safeArticleUrl : null,
  );

  const [shareOpen, setShareOpen] = useState(false);

  const items = useMemo(() => {
    if (!columnId) return [];
    return feedItemsByColumnId[columnId] ?? [];
  }, [columnId, feedItemsByColumnId]);

  const currentIndex = useMemo(() => {
    if (!linkParam || !safeArticleUrl) return -1;
    return findItemIndex(items, linkParam);
  }, [items, linkParam, safeArticleUrl]);

  const currentItem: FeedItem | null = useMemo(() => {
    if (!safeArticleUrl) return null;
    if (currentIndex >= 0) return items[currentIndex] ?? null;
    return { title: "Article", link: safeArticleUrl };
  }, [currentIndex, items, safeArticleUrl]);

  const prevItem = useMemo(() => {
    if (currentIndex <= 0) return null;
    return items[currentIndex - 1] ?? null;
  }, [currentIndex, items]);

  const nextItem = useMemo(() => {
    if (currentIndex < 0 || currentIndex >= items.length - 1) return null;
    return items[currentIndex + 1] ?? null;
  }, [currentIndex, items]);

  const columnTitle = useMemo(() => {
    if (!columnId) return null;
    return columns.find((c) => c.id === columnId)?.title ?? null;
  }, [columnId, columns]);

  const goToItem = useCallback(
    (item: FeedItem) => {
      if (!columnId || !item.link) return;
      const safe = safeHttpHref(item.link);
      if (!safe) return;
      setSearchParams({ l: safe, c: columnId }, { replace: true });
    },
    [columnId, setSearchParams],
  );

  const handleClose = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }, [navigate]);

  const displayTitle = useMemo(() => {
    if (bodyState.kind === "article" && bodyState.title?.trim()) {
      return bodyState.title.trim();
    }
    return currentItem?.title ?? "Article";
  }, [bodyState, currentItem?.title]);

  useLayoutEffect(() => {
    if (!linkParam) {
      document.title = `Reader — ${APP_DISPLAY_NAME}`;
    } else {
      document.title = `${displayTitle} — ${APP_DISPLAY_NAME}`;
    }
    return () => {
      document.title = APP_DISPLAY_NAME;
    };
  }, [linkParam, displayTitle]);

  const articleSourceLabel = useMemo(() => {
    if (bodyState.kind !== "article") return null;
    return (
      bodyState.siteName?.trim() ||
      columnTitle ||
      null
    );
  }, [bodyState, columnTitle]);

  const articleAuthorLabel = useMemo(() => {
    if (bodyState.kind !== "article") return null;
    return bodyState.byline?.trim() || null;
  }, [bodyState]);

  const publishedLabel = useMemo(
    () => formatPublishedForPreference(currentItem?.published, dateFormatStyle),
    [currentItem?.published, dateFormatStyle],
  );

  const iframeSrc = safeArticleUrl ?? "";

  const bookmarked = useMemo(() => {
    if (!safeArticleUrl) return false;
    const n = normalizeBookmarkLink(safeArticleUrl);
    return bookmarks.some((b) => normalizeBookmarkLink(b.link) === n);
  }, [bookmarks, safeArticleUrl]);

  const handleBookmark = useCallback(() => {
    if (!safeArticleUrl) return;
    void toggleBookmark({
      title: displayTitle,
      link: safeArticleUrl,
      published: currentItem?.published,
      sourceFeedTitle: columnTitle ?? undefined,
      sourceColumnId: columnId,
    });
  }, [
    toggleBookmark,
    safeArticleUrl,
    displayTitle,
    currentItem?.published,
    columnTitle,
    columnId,
  ]);

  const showNav = Boolean(columnId) && items.length > 0;

  useEffect(() => {
    if (!linkParam || !safeArticleUrl) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat) return;

      if (e.key === "Escape") {
        if (!e.isTrusted) return;
        if (shouldIgnoreShortcutTarget(e.target)) return;
        e.preventDefault();
        handleClose();
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "d") {
        if (shouldIgnoreShortcutTarget(e.target)) return;
        e.preventDefault();
        handleBookmark();
        return;
      }

      if (shouldIgnoreShortcutTarget(e.target)) return;
      if (!showNav) return;

      const key = e.key;
      if (key === "k" || key === "K" || key === "ArrowLeft") {
        if (prevItem) {
          e.preventDefault();
          goToItem(prevItem);
        }
        return;
      }
      if (key === "j" || key === "J" || key === "ArrowRight") {
        if (nextItem) {
          e.preventDefault();
          goToItem(nextItem);
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    linkParam,
    safeArticleUrl,
    handleClose,
    handleBookmark,
    showNav,
    prevItem,
    nextItem,
    goToItem,
  ]);

  useEffect(() => {
    if (!safeArticleUrl) return;
    const t = window.setTimeout(() => {
      void recordArticleView({
        title: displayTitle,
        link: safeArticleUrl,
        published: currentItem?.published,
        sourceFeedTitle: columnTitle ?? undefined,
        sourceColumnId: columnId,
      });
    }, 450);
    return () => window.clearTimeout(t);
  }, [
    safeArticleUrl,
    columnId,
    displayTitle,
    currentItem?.published,
    columnTitle,
    recordArticleView,
  ]);

  if (!linkParam) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6">
        <p className="text-sm text-muted-foreground">No article selected.</p>
        <Button type="button" variant="outline" onClick={() => navigate("/")}>
          Back to grid
        </Button>
      </div>
    );
  }

  if (!safeArticleUrl) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6">
        <p className="text-center text-sm text-muted-foreground">
          This link cannot be opened in the reader (only http/https URLs are
          allowed).
        </p>
        <Button type="button" variant="outline" onClick={() => navigate("/")}>
          Back to grid
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <header className="app-no-drag flex shrink-0 items-center gap-1 border-b border-border px-2 py-2 sm:gap-2 sm:px-3">
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            disabled={!showNav || !prevItem}
            title="Previous article in this feed"
            aria-label="Previous article in this feed"
            onClick={() => prevItem && goToItem(prevItem)}
          >
            <CaretLeft className="size-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            disabled={!showNav || !nextItem}
            title="Next article in this feed"
            aria-label="Next article in this feed"
            onClick={() => nextItem && goToItem(nextItem)}
          >
            <CaretRight className="size-5" />
          </Button>
        </div>

        <div className="min-w-0 flex-1 px-1">
          <span className="sr-only">{displayTitle}</span>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 text-muted-foreground hover:text-foreground"
            title="Share"
            aria-label="Share"
            onClick={() => setShareOpen(true)}
          >
            <ShareNetwork className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 text-muted-foreground hover:text-foreground"
            title={bookmarked ? "Remove bookmark" : "Bookmark"}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
            onClick={handleBookmark}
          >
            <BookmarkSimple
              weight={bookmarked ? "fill" : "regular"}
              className={cn(
                "size-4",
                bookmarked && "text-primary/50 dark:text-primary",
              )}
              aria-hidden
            />
          </Button>
          <ExternalBrowserLink
            href={iframeSrc}
            className={cn(
              "app-no-drag inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
            title="Open in browser"
            aria-label="Open in browser"
          >
            <ArrowSquareOut className="size-4" aria-hidden />
          </ExternalBrowserLink>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 text-muted-foreground hover:text-foreground"
            title="Close reader"
            aria-label="Close reader"
            onClick={handleClose}
          >
            <X className="size-5" aria-hidden />
          </Button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
        {bodyState.kind === "loading" ? (
          <div className="flex min-h-[50vh] flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
            <CircleNotch className="size-5 animate-spin" aria-hidden />
            Loading article…
          </div>
        ) : null}

        {bodyState.kind === "article" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {bodyState.likelyTruncated ? (
              <p className="shrink-0 border-b border-border bg-muted/40 px-4 py-2 text-xs leading-relaxed text-muted-foreground">
                This article may be incomplete—the page might only show a preview
                or require a subscription. Try{" "}
                <span className="text-foreground">Open in browser</span> for the
                full story.
              </p>
            ) : null}
            <header className="mx-auto w-full max-w-5xl px-6 pb-8 pt-10 sm:px-10">
              {articleSourceLabel ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {articleSourceLabel}
                </p>
              ) : null}
              <h1
                className={cn(
                  "text-balance text-3xl font-semibold leading-[1.15] tracking-tight text-foreground sm:text-4xl",
                  articleSourceLabel ? "mt-4" : "mt-0",
                )}
              >
                <ExternalBrowserLink
                  href={iframeSrc}
                  className={readerTitleLinkClassName}
                  title="View original article"
                  aria-label={`Open original article: ${displayTitle}`}
                >
                  {displayTitle}
                </ExternalBrowserLink>
              </h1>
              {articleAuthorLabel ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {articleAuthorLabel}
                </p>
              ) : null}
              {publishedLabel ? (
                <p
                  className={cn(
                    "text-xs tabular-nums text-muted-foreground",
                    articleAuthorLabel ? "mt-1" : "mt-2",
                  )}
                >
                  <time dateTime={currentItem?.published}>
                    {publishedLabel}
                  </time>
                </p>
              ) : null}
            </header>
            <article
              className="reader-article min-h-full bg-background pb-12 pt-8"
              dangerouslySetInnerHTML={{ __html: bodyState.html }}
            />
          </div>
        ) : null}

        {bodyState.kind === "iframe" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {bodyState.hint ? (
              <p className="shrink-0 border-b border-border bg-muted/40 px-4 py-2 text-xs leading-relaxed text-muted-foreground">
                {bodyState.hint}
              </p>
            ) : null}
            <header className="shrink-0 bg-background px-6 py-8 sm:px-10">
              {columnTitle ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {columnTitle}
                </p>
              ) : null}
              <h1
                className={cn(
                  "text-balance text-3xl font-semibold leading-[1.15] tracking-tight text-foreground sm:text-4xl",
                  columnTitle ? "mt-4" : "mt-0",
                )}
              >
                <ExternalBrowserLink
                  href={iframeSrc}
                  className={readerTitleLinkClassName}
                  title="View original article"
                  aria-label={`Open original article: ${displayTitle}`}
                >
                  {displayTitle}
                </ExternalBrowserLink>
              </h1>
              {publishedLabel ? (
                <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                  <time dateTime={currentItem?.published}>
                    {publishedLabel}
                  </time>
                </p>
              ) : null}
            </header>
            <iframe
              key={iframeSrc}
              title={displayTitle}
              src={iframeSrc}
              className="min-h-0 w-full flex-1 border-0 bg-background"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        ) : null}
      </div>

      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={iframeSrc}
        title={displayTitle}
      />
    </div>
  );
}
