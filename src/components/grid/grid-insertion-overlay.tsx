import { Plus } from "lucide-react";
import {
  useCallback,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

import { GridInsertPlusMenu } from "@/components/grid/grid-insert-plus-menu";
import { cn } from "@/lib/utils";

const ROW_EPS = 10;
const MIN_H_GAP = 18;
const MIN_V_GAP = 16;

function cssEscapeSelector(s: string): string {
  return typeof CSS !== "undefined" && "escape" in CSS
    ? (CSS as { escape: (x: string) => string }).escape(s)
    : s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

type Item = { id: string; rect: DOMRect };

type LayoutZone =
  | {
      key: string;
      kind: "horizontal";
      insertAfterId: string | null;
      style: CSSProperties;
    }
  | {
      key: string;
      kind: "vertical";
      insertAfterId: string;
      style: CSSProperties;
    };

function lastIdInFlatOrder(
  rowIds: string[],
  orderedIds: string[],
): string | null {
  if (rowIds.length === 0) return null;
  let best = rowIds[0]!;
  let bestIdx = -1;
  for (const id of rowIds) {
    const idx = orderedIds.indexOf(id);
    if (idx > bestIdx) {
      bestIdx = idx;
      best = id;
    }
  }
  return best;
}

function InsertionZone({
  zone,
  onInsertSectionHeader,
  onOpenAddFeedModal,
}: {
  zone: LayoutZone;
  onInsertSectionHeader: (afterId: string | null) => void;
  onOpenAddFeedModal: (afterId: string | null) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const insertAfterId = zone.insertAfterId;

  return (
    <div
      className="group pointer-events-auto overflow-visible"
      style={zone.style}
    >
      <GridInsertPlusMenu
        insertAfterId={insertAfterId}
        onInsertSectionHeader={onInsertSectionHeader}
        onOpenAddFeedModal={onOpenAddFeedModal}
        onOpenChange={setMenuOpen}
        trigger={
          <button
            type="button"
            className={cn(
              "flex size-full min-h-[2.5rem] min-w-[2.5rem] items-center justify-center rounded-sm border border-transparent bg-transparent p-0 outline-none ring-offset-background transition-[opacity,colors] duration-150 ease-out",
              "opacity-0 delay-0 group-hover:opacity-100 group-hover:delay-300 group-focus-within:opacity-100 group-focus-within:delay-300",
              menuOpen && "opacity-100 delay-0",
              "text-muted-foreground hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              menuOpen && "text-accent-foreground",
            )}
            aria-label="Insert section header or feed"
            aria-haspopup="menu"
          >
            {zone.kind === "horizontal" ? (
              <span className="flex w-full items-center gap-2 px-1">
                <span className="h-px min-w-0 flex-1 bg-border" aria-hidden />
                <Plus
                  className="size-3 shrink-0 transition-colors group-hover:text-foreground/85"
                  strokeWidth={2.25}
                  aria-hidden
                />
                <span className="h-px min-w-0 flex-1 bg-border" aria-hidden />
              </span>
            ) : (
              <span className="flex h-full min-h-[4rem] w-full flex-col items-center justify-center gap-0.5 py-1">
                <span className="w-px min-h-0 flex-1 bg-border" aria-hidden />
                <Plus
                  className="size-3 shrink-0 transition-colors group-hover:text-foreground/85"
                  strokeWidth={2.25}
                  aria-hidden
                />
                <span className="w-px min-h-0 flex-1 bg-border" aria-hidden />
              </span>
            )}
          </button>
        }
      />
    </div>
  );
}

export function GridInsertionOverlay({
  gridRef,
  wrapRef,
  orderedIds,
  hidden,
  onInsertSectionHeader,
  onOpenAddFeedModal,
}: {
  gridRef: RefObject<HTMLElement | null>;
  wrapRef: RefObject<HTMLElement | null>;
  orderedIds: string[];
  hidden: boolean;
  onInsertSectionHeader: (afterId: string | null) => void;
  onOpenAddFeedModal: (afterId: string | null) => void;
}) {
  const [zones, setZones] = useState<LayoutZone[]>([]);

  const measure = useCallback(() => {
    const grid = gridRef.current;
    const wrap = wrapRef.current;
    if (!grid || !wrap || orderedIds.length === 0) {
      setZones([]);
      return;
    }

    const wrapRect = wrap.getBoundingClientRect();
    const items: Item[] = [];
    for (const id of orderedIds) {
      const el = grid.querySelector(
        `[data-grid-column-id="${cssEscapeSelector(id)}"]`,
      );
      if (el instanceof HTMLElement) {
        items.push({ id, rect: el.getBoundingClientRect() });
      }
    }
    if (items.length === 0) {
      setZones([]);
      return;
    }

    const sorted = [...items].sort((a, b) => {
      const dy = a.rect.top - b.rect.top;
      if (Math.abs(dy) < ROW_EPS) return a.rect.left - b.rect.left;
      return dy;
    });

    const rows: Item[][] = [];
    for (const item of sorted) {
      const curRow = rows[rows.length - 1];
      if (
        !curRow ||
        Math.abs(item.rect.top - curRow[0]!.rect.top) > ROW_EPS
      ) {
        rows.push([item]);
      } else {
        curRow.push(item);
      }
    }
    for (const row of rows) {
      row.sort((a, b) => a.rect.left - b.rect.left);
    }

    const out: LayoutZone[] = [];

    const firstTop = Math.min(...rows[0]!.map((x) => x.rect.top));
    const rawTopPad = firstTop - wrapRect.top;
    const topH =
      rawTopPad > 0 ? Math.min(40, Math.max(rawTopPad, 8)) : 8;
    out.push({
      key: "h-top",
      kind: "horizontal",
      insertAfterId: null,
      style: {
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: topH,
      },
    });

    const lastRow = rows[rows.length - 1]!;
    const lastBottom = Math.max(...lastRow.map((x) => x.rect.bottom));
    const lastId = orderedIds[orderedIds.length - 1]!;
    const bottomSpace = wrapRect.bottom - lastBottom;
    const bottomH = bottomSpace > 0 ? bottomSpace : MIN_H_GAP;
    out.push({
      key: "h-bottom",
      kind: "horizontal",
      insertAfterId: lastId,
      style: {
        position: "absolute",
        left: 0,
        top: lastBottom - wrapRect.top,
        width: "100%",
        height: bottomH,
      },
    });

    for (let r = 0; r < rows.length - 1; r++) {
      const bottomR = Math.max(...rows[r]!.map((x) => x.rect.bottom));
      const topNext = Math.min(...rows[r + 1]!.map((x) => x.rect.top));
      const gap = topNext - bottomR;
      const afterId = lastIdInFlatOrder(
        rows[r]!.map((x) => x.id),
        orderedIds,
      );
      if (!afterId) continue;
      const h =
        gap > 0 ? Math.max(MIN_H_GAP, gap) : MIN_H_GAP;
      const mid = (bottomR + topNext) / 2 - wrapRect.top;
      out.push({
        key: `h-row-${r}`,
        kind: "horizontal",
        insertAfterId: afterId,
        style: {
          position: "absolute",
          left: 0,
          top: mid - h / 2,
          width: "100%",
          height: h,
        },
      });
    }

    for (const row of rows) {
      const rowTop = Math.min(...row.map((x) => x.rect.top));
      const rowBottom = Math.max(...row.map((x) => x.rect.bottom));
      for (let i = 0; i < row.length - 1; i++) {
        const a = row[i]!;
        const b = row[i + 1]!;
        const gapW = b.rect.left - a.rect.right;
        const centerX = (a.rect.right + b.rect.left) / 2 - wrapRect.left;
        const gw = Math.max(MIN_V_GAP, gapW > 0 ? gapW : MIN_V_GAP);
        out.push({
          key: `v-${a.id}-${b.id}`,
          kind: "vertical",
          insertAfterId: a.id,
          style: {
            position: "absolute",
            left: centerX - gw / 2,
            top: rowTop - wrapRect.top,
            width: gw,
            height: rowBottom - rowTop,
          },
        });
      }
    }

    setZones(out);
  }, [gridRef, wrapRef, orderedIds]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(() => {
      measure();
    });
    const grid = gridRef.current;
    const wrap = wrapRef.current;
    if (grid) ro.observe(grid);
    if (wrap) ro.observe(wrap);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, gridRef, wrapRef]);

  if (orderedIds.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[5] overflow-visible",
        hidden && "invisible",
      )}
      aria-hidden={hidden}
    >
      {!hidden &&
        zones.map((z) => (
          <InsertionZone
            key={z.key}
            zone={z}
            onInsertSectionHeader={onInsertSectionHeader}
            onOpenAddFeedModal={onOpenAddFeedModal}
          />
        ))}
    </div>
  );
}
