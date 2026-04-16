import { Rss } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type FeedFaviconProps = {
  feedUrl?: string;
  className?: string;
};

function hostnameFromFeedUrl(feedUrl: string | undefined): string | null {
  if (!feedUrl?.trim()) return null;
  try {
    return new URL(feedUrl.trim()).hostname || null;
  } catch {
    return null;
  }
}

/**
 * Site icon for the feed origin.
 * Uses DuckDuckGo favicons first (square assets); Google s2 often returns circular PNGs.
 * Rounded square frame; image is clipped to the same shape.
 */
export function FeedFavicon({ feedUrl, className }: FeedFaviconProps) {
  const [failed, setFailed] = useState(false);
  const [srcIndex, setSrcIndex] = useState(0);
  const host = useMemo(() => hostnameFromFeedUrl(feedUrl), [feedUrl]);

  const sources = useMemo(() => {
    if (!host) return [];
    return [
      `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`,
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`,
    ];
  }, [host]);

  useEffect(() => {
    setFailed(false);
    setSrcIndex(0);
  }, [host]);

  const shell = cn(
    "inline-flex aspect-square shrink-0 overflow-hidden rounded-lg border border-border bg-background",
    "size-4 items-center justify-center text-muted-foreground",
    className,
  );

  if (!host || failed) {
    return (
      <span className={shell} aria-hidden>
        <Rss className="h-[62%] w-[62%]" aria-hidden />
      </span>
    );
  }

  const src = sources[srcIndex] ?? sources[0];

  return (
    <span className={shell}>
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className="size-full object-contain"
        onError={() => {
          if (srcIndex < sources.length - 1) {
            setSrcIndex((i) => i + 1);
          } else {
            setFailed(true);
          }
        }}
      />
    </span>
  );
}
