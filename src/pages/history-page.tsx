import { Bookmark, ExternalLink, Search, Share2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";

import { ShareModal } from "@/components/share/share-modal";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { normalizeBookmarkLink } from "@/lib/bookmark-utils";
import { buildReaderUrl } from "@/lib/reader-url";
import { matchesReadHistorySearch } from "@/lib/search-utils";
import { cn } from "@/lib/utils";
import type { ReadHistoryEntry } from "@/types/read-history";
import type { AppOutletContext } from "@/types/app-outlet";

function formatViewedTooltip(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatPublishedLine(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function HistoryRow({
  h,
  onRemove,
}: {
  h: ReadHistoryEntry;
  onRemove: () => void;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const { bookmarks, toggleBookmark } = useOutletContext<AppOutletContext>();

  const bookmarked = useMemo(() => {
    const n = normalizeBookmarkLink(h.link);
    return bookmarks.some((b) => normalizeBookmarkLink(b.link) === n);
  }, [bookmarks, h.link]);

  const metaParts: string[] = [];
  if (h.sourceFeedTitle?.trim()) {
    metaParts.push(`From ${h.sourceFeedTitle.trim()}`);
  }
  if (h.published) {
    metaParts.push(`Published ${formatPublishedLine(h.published)}`);
  }
  const metaLead = metaParts.join(" · ");

  const iconBtn =
    "app-no-drag inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <li className="group px-4 py-3 transition-colors hover:bg-accent/50">
      <div className="min-w-0 space-y-1.5">
        <div className="flex items-start gap-2">
          <Link
            to={buildReaderUrl(h.link, h.sourceColumnId)}
            className="line-clamp-2 min-w-0 flex-1 text-base font-medium leading-snug text-foreground hover:text-primary"
          >
            {h.title}
          </Link>
          <div
            className="flex shrink-0 items-center gap-0"
            role="group"
            aria-label="History actions"
          >
            <a
              href={h.link}
              target="_blank"
              rel="noopener noreferrer"
              className={iconBtn}
              title="Open in browser"
              aria-label="Open in browser"
            >
              <ExternalLink className="size-4" aria-hidden />
            </a>
            <button
              type="button"
              className={iconBtn}
              title="Share"
              aria-label="Share"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              className={cn(
                iconBtn,
                bookmarked && "text-foreground",
              )}
              title={bookmarked ? "Remove bookmark" : "Bookmark"}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
              onClick={() =>
                void toggleBookmark({
                  title: h.title,
                  link: h.link,
                  published: h.published,
                  sourceFeedTitle: h.sourceFeedTitle,
                  sourceColumnId: h.sourceColumnId,
                })
              }
            >
              <Bookmark
                className={cn(
                  "size-4",
                  bookmarked &&
                    "fill-current text-muted-foreground/55 dark:text-muted-foreground",
                )}
                strokeWidth={bookmarked ? 0 : 2}
                aria-hidden
              />
            </button>
            <button
              type="button"
              className={cn(iconBtn, "hover:text-destructive")}
              title="Remove from history"
              aria-label="Remove from history"
              onClick={onRemove}
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs leading-snug text-muted-foreground">
          {metaLead ? (
            <>
              <span className="min-w-0">{metaLead}</span>
              <span aria-hidden className="select-none text-muted-foreground/35">
                ·
              </span>
            </>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default tabular-nums">
                Viewed {formatPublishedLine(h.viewedAt)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start">
              <p className="text-xs">{formatViewedTooltip(h.viewedAt)}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="min-w-0 break-all font-mono text-xs text-muted-foreground/90">
          {normalizeBookmarkLink(h.link)}
        </p>
      </div>
      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={h.link}
        title={h.title}
      />
    </li>
  );
}

export function HistoryPage() {
  const { readHistory, removeReadHistoryEntry } =
    useOutletContext<AppOutletContext>();
  const [query, setQuery] = useState("");

  const sorted = useMemo(
    () =>
      [...readHistory].sort(
        (a, b) =>
          new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime(),
      ),
    [readHistory],
  );

  const visible = useMemo(
    () => sorted.filter((h) => matchesReadHistorySearch(query, h)),
    [sorted, query],
  );

  if (sorted.length === 0) {
    return (
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-12 text-center">
          <h2 className="text-lg font-semibold text-foreground">History</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Articles you open in the reader will appear here with the time you
            viewed them.
          </p>
        </div>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-12 text-center">
          <h2 className="text-lg font-semibold text-foreground">History</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            No history entries match your search. Try different keywords or
            clear the search field.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 w-full min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 pb-16">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">History</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {visible.length === sorted.length
              ? `${sorted.length} viewed ${sorted.length === 1 ? "article" : "articles"}`
              : `${visible.length} of ${sorted.length} articles`}
          </p>
          <div className="relative mt-4 max-w-md">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search history…"
              className="h-9 pl-9"
              aria-label="Search history"
            />
          </div>
        </div>

        <TooltipProvider delayDuration={300}>
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {visible.map((h) => (
              <HistoryRow
                key={h.id}
                h={h}
                onRemove={() => void removeReadHistoryEntry(h.id)}
              />
            ))}
          </ul>
        </TooltipProvider>
      </div>
    </div>
  );
}
