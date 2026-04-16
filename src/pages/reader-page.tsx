import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Share2,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  useNavigate,
  useOutletContext,
  useSearchParams,
} from "react-router-dom";

import { ShareModal } from "@/components/share/share-modal";
import { Button } from "@/components/ui/button";
import { useReaderArticle } from "@/hooks/use-reader-article";
import { normalizeBookmarkLink } from "@/lib/bookmark-utils";
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

export function ReaderPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { feedItemsByColumnId, columns, bookmarks, toggleBookmark } =
    useOutletContext<AppOutletContext>();

  const linkParam = searchParams.get("l");
  const columnId = searchParams.get("c") ?? undefined;

  const [shareOpen, setShareOpen] = useState(false);
  const bodyState = useReaderArticle(linkParam);

  const items = useMemo(() => {
    if (!columnId) return [];
    return feedItemsByColumnId[columnId] ?? [];
  }, [columnId, feedItemsByColumnId]);

  const currentIndex = useMemo(() => {
    if (!linkParam) return -1;
    return findItemIndex(items, linkParam);
  }, [items, linkParam]);

  const currentItem: FeedItem | null = useMemo(() => {
    if (!linkParam) return null;
    if (currentIndex >= 0) return items[currentIndex] ?? null;
    return { title: "Article", link: linkParam };
  }, [currentIndex, items, linkParam]);

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
      if (!columnId) return;
      setSearchParams(
        { l: item.link, c: columnId },
        { replace: true },
      );
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

  const showNav = Boolean(columnId) && items.length > 0;
  const iframeSrc = currentItem?.link ?? linkParam ?? "";

  const bookmarked = useMemo(() => {
    if (!linkParam) return false;
    const n = normalizeBookmarkLink(linkParam);
    return bookmarks.some((b) => normalizeBookmarkLink(b.link) === n);
  }, [bookmarks, linkParam]);

  const handleBookmark = useCallback(() => {
    if (!linkParam) return;
    void toggleBookmark({
      title: displayTitle,
      link: linkParam,
      published: currentItem?.published,
      sourceFeedTitle: columnTitle ?? undefined,
      sourceColumnId: columnId,
    });
  }, [
    toggleBookmark,
    linkParam,
    displayTitle,
    currentItem?.published,
    columnTitle,
    columnId,
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
            <ChevronLeft className="size-5" />
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
            <ChevronRight className="size-5" />
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
            <Share2 className="size-4" aria-hidden />
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
            <Bookmark
              className={cn(
                "size-4",
                bookmarked &&
                  "fill-current text-primary/50 dark:text-primary",
              )}
              strokeWidth={bookmarked ? 0 : 2}
              aria-hidden
            />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 text-muted-foreground hover:text-foreground"
            title="Open in browser"
            aria-label="Open in browser"
            asChild
          >
            <a
              href={iframeSrc}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-4" aria-hidden />
            </a>
          </Button>
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
            <Loader2 className="size-5 animate-spin" aria-hidden />
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
                {displayTitle}
              </h1>
              {articleAuthorLabel ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {articleAuthorLabel}
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
                {displayTitle}
              </h1>
            </header>
            <iframe
              key={iframeSrc}
              title={displayTitle}
              src={iframeSrc}
              className="min-h-0 w-full flex-1 border-0 bg-background"
              referrerPolicy="no-referrer-when-downgrade"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-downloads"
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
