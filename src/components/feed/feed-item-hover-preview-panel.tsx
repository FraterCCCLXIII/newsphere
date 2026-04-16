type FeedItemHoverPreviewPanelProps = {
  excerpt: string | null;
  imageUrl: string | null;
  relativeLabel: string;
};

export function FeedItemHoverPreviewPanel({
  excerpt,
  imageUrl,
  relativeLabel,
}: FeedItemHoverPreviewPanelProps) {
  return (
    <div className="p-3">
      {excerpt && imageUrl ? (
        <div className="flex flex-row-reverse items-start gap-3">
          <img
            src={imageUrl}
            alt=""
            className="size-[4.5rem] shrink-0 rounded border border-border object-cover"
            loading="lazy"
          />
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground line-clamp-8">
            {excerpt}
          </p>
        </div>
      ) : excerpt ? (
        <p className="text-sm leading-relaxed text-foreground line-clamp-8">
          {excerpt}
        </p>
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="max-h-40 w-full rounded border border-border object-cover"
          loading="lazy"
        />
      ) : null}
      {relativeLabel ? (
        <p className="mt-2 text-xs tabular-nums text-muted-foreground">
          {relativeLabel}
        </p>
      ) : null}
    </div>
  );
}
