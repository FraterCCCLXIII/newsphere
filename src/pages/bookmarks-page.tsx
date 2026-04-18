import { ExternalLink, Search, Share2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";

import { ExternalBrowserLink } from "@/components/layout/external-browser-link";
import { ShareModal } from "@/components/share/share-modal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { normalizeBookmarkLink } from "@/lib/bookmark-utils";
import { buildReaderUrl } from "@/lib/reader-url";
import { safeHttpHref } from "@/lib/safe-url";
import { matchesBookmarkSearch } from "@/lib/search-utils";
import { cn } from "@/lib/utils";
import type { BookmarkEntry } from "@/types/bookmark";
import type { AppOutletContext } from "@/types/app-outlet";

function formatSavedTooltip(iso: string): string {
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

function BookmarkRow({
  b,
  onRemove,
}: {
  b: BookmarkEntry;
  onRemove: () => void;
}) {
  const [shareOpen, setShareOpen] = useState(false);

  const safeLink = useMemo(() => safeHttpHref(b.link), [b.link]);

  const metaParts: string[] = [];
  if (b.sourceFeedTitle?.trim()) {
    metaParts.push(`From ${b.sourceFeedTitle.trim()}`);
  }
  if (b.published) {
    metaParts.push(`Published ${formatPublishedLine(b.published)}`);
  }
  const metaLead = metaParts.join(" · ");

  const iconBtn =
    "app-no-drag inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <li className="group px-4 py-3 transition-colors hover:bg-accent/50">
      <div className="min-w-0 space-y-1.5">
        <div className="flex items-start gap-2">
          {safeLink ? (
            <Link
              to={buildReaderUrl(safeLink, b.sourceColumnId)}
              className="line-clamp-2 min-w-0 flex-1 text-base font-medium leading-snug text-foreground hover:text-primary"
            >
              {b.title}
            </Link>
          ) : (
            <span className="line-clamp-2 min-w-0 flex-1 text-base font-medium leading-snug text-foreground">
              {b.title}
            </span>
          )}
          <div
            className="flex shrink-0 items-center gap-0"
            role="group"
            aria-label="Bookmark actions"
          >
            {safeLink ? (
              <ExternalBrowserLink
                href={safeLink}
                className={iconBtn}
                title="Open in browser"
                aria-label="Open in browser"
              >
                <ExternalLink className="size-4" aria-hidden />
              </ExternalBrowserLink>
            ) : (
              <span
                className={cn(iconBtn, "pointer-events-none opacity-40")}
                title="No safe URL for this bookmark"
                aria-hidden
              >
                <ExternalLink className="size-4" aria-hidden />
              </span>
            )}
            <button
              type="button"
              className={iconBtn}
              title="Share"
              aria-label="Share"
              disabled={!safeLink}
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              className={cn(iconBtn, "hover:text-destructive")}
              title="Remove bookmark"
              aria-label="Remove bookmark"
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
                Saved {formatPublishedLine(b.savedAt)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start">
              <p className="text-xs">{formatSavedTooltip(b.savedAt)}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="min-w-0 break-all font-mono text-xs text-muted-foreground/90">
          {normalizeBookmarkLink(b.link)}
        </p>
      </div>
      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={safeLink ?? ""}
        title={b.title}
      />
    </li>
  );
}

export function BookmarksPage() {
  const { bookmarks, removeBookmark } = useOutletContext<AppOutletContext>();
  const [query, setQuery] = useState("");

  const sorted = useMemo(
    () =>
      [...bookmarks].sort(
        (a, b) =>
          new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
      ),
    [bookmarks],
  );

  const visible = useMemo(
    () => sorted.filter((b) => matchesBookmarkSearch(query, b)),
    [sorted, query],
  );

  if (sorted.length === 0) {
    return (
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-12 text-center">
          <h2 className="text-lg font-semibold text-foreground">Bookmarks</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Saved articles will appear here. Hover a feed entry on the grid and
            click the bookmark icon to save it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 w-full min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 pb-16">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Bookmarks</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {query.trim()
              ? visible.length === sorted.length
                ? `${sorted.length} saved ${sorted.length === 1 ? "link" : "links"}`
                : `${visible.length} of ${sorted.length} ${sorted.length === 1 ? "link" : "links"}`
              : `${sorted.length} saved ${sorted.length === 1 ? "link" : "links"}`}
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
              placeholder="Search bookmarks…"
              className="h-9 pl-9"
              aria-label="Search bookmarks"
              autoComplete="off"
            />
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No bookmarks match your search. Try different keywords or clear the
            search field.
          </p>
        ) : (
          <TooltipProvider delayDuration={300}>
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {visible.map((b) => (
                <BookmarkRow
                  key={b.id}
                  b={b}
                  onRemove={() => void removeBookmark(b.id)}
                />
              ))}
            </ul>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
