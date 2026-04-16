import { TimelineView } from "@/components/feed/timeline-view";

export function FeedStreamPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <TimelineView />
    </div>
  );
}
