import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Matches `FeedEntryRow` title lines (no action icon placeholders). */
export function GridFeedEntrySkeleton({
  isLast,
}: {
  isLast: boolean;
}) {
  return (
    <li
      className={cn(
        "group/row w-full px-2 py-2",
        !isLast && "border-b border-border",
      )}
    >
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-4 w-[94%] max-w-full" />
        <Skeleton className="h-3 w-[42%] max-w-[12rem]" />
      </div>
    </li>
  );
}

/** Matches `TimelineFeedRow` text stack (no favicon placeholder). */
export function TimelineFeedEntrySkeleton({
  isLast,
}: {
  isLast: boolean;
}) {
  return (
    <li
      className={cn(
        "px-4 py-3",
        !isLast && "border-b border-border",
      )}
    >
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-4 w-[92%]" />
        <Skeleton className="h-3 w-[58%]" />
        <Skeleton className="h-3 w-[36%] max-w-[10rem]" />
      </div>
    </li>
  );
}
