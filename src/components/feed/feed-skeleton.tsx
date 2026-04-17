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
      {/* Same as title `line-clamp-2 text-sm font-medium leading-snug` + meta `mt-0.5 text-xs` */}
      <div className="min-w-0 text-sm font-medium leading-snug">
        <Skeleton className="h-[1.375em] w-[94%] max-w-full rounded-sm" />
        <Skeleton className="mt-0.5 h-[1.375em] w-[42%] max-w-[12rem] rounded-sm" />
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
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-snug">
          <Skeleton className="h-[1.375em] w-[92%] rounded-sm" />
        </div>
        <div className="mt-1 text-[0.9375rem] font-medium leading-snug">
          <Skeleton className="h-[1.375em] w-[58%] rounded-sm" />
          <Skeleton className="h-[1.375em] w-[36%] max-w-[10rem] rounded-sm" />
        </div>
      </div>
    </li>
  );
}
