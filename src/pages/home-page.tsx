import { useOutletContext } from "react-router-dom";

import { GridView } from "@/components/grid/grid-view";
import { useScrollRestoration } from "@/hooks/use-scroll-restoration";
import type { AppOutletContext } from "@/types/app-outlet";

export function HomePage() {
  const { activePageId } = useOutletContext<AppOutletContext>();
  const scrollRef = useScrollRestoration(`grid-page-${activePageId}`);

  return (
    <div
      ref={scrollRef}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto"
    >
      <GridView />
    </div>
  );
}
