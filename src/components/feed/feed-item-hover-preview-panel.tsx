import { useEffect, useState } from "react";

type FeedItemHoverPreviewPanelProps = {
  excerpt: string | null;
  imageUrl: string | null;
  /** Publish time, formatted per user preference. */
  dateLabel: string;
};

export function FeedItemHoverPreviewPanel({
  excerpt,
  imageUrl,
  dateLabel,
}: FeedItemHoverPreviewPanelProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <div className="p-3">
      {excerpt && showImage && imageUrl ? (
        <div className="flex flex-row-reverse items-start gap-3">
          <img
            src={imageUrl}
            alt=""
            className="size-[4.5rem] shrink-0 rounded border border-border object-cover"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground line-clamp-8">
            {excerpt}
          </p>
        </div>
      ) : excerpt ? (
        <p className="text-sm leading-relaxed text-foreground line-clamp-8">
          {excerpt}
        </p>
      ) : showImage && imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="max-h-40 w-full rounded border border-border object-cover"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : null}
      {dateLabel ? (
        <p className="mt-2 text-xs tabular-nums text-muted-foreground">
          {dateLabel}
        </p>
      ) : null}
    </div>
  );
}
