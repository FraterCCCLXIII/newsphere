import { FeedStreamSidebar } from "@/components/feed/feed-stream-sidebar";
import { TimelineView } from "@/components/feed/timeline-view";

export function FeedStreamPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <FeedStreamSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <TimelineView />
      </div>
    </div>
  );
}
