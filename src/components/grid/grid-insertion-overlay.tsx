import { Plus } from "@phosphor-icons/react";
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

/** Top-left of the grid's padding box in viewport coords (matches absolute inset-0 origin inside a relative grid). */
function gridPaddingBoxOriginViewport(grid: HTMLElement): { x: number; y: number } {
  const r = grid.getBoundingClientRect();
  const s = getComputedStyle(grid);
  const bl = parseFloat(s.borderLeftWidth) || 0;
  const bt = parseFloat(s.borderTopWidth) || 0;
  return { x: r.left + bl, y: r.top + bt };
}

/** Bottom edge of the grid content area (above padding + bottom border) in viewport Y. */
function gridContentBottomViewport(grid: HTMLElement): number {
  const r = grid.getBoundingClientRect();
  const s = getComputedStyle(grid);
  const bb = parseFloat(s.borderBottomWidth) || 0;
  const pb = parseFloat(s.paddingBottom) || 0;
  return r.bottom - bb - pb;
}

/** Matches `.grid-feed` column breakpoints in `src/index.css`. */
function gridFeedColumnCount(): number {
  if (typeof window === "undefined") return 1;
  if (window.matchMedia("(min-width: 1024px)").matches) return 3;
  if (window.matchMedia("(min-width: 640px)").matches) return 2;
  return 1;
}

/** Track width and gap using `clientWidth` so sizing matches layout (incl. scrollbar). */
function gridFeedTrackMetrics(grid: HTMLElement) {
  const s = getComputedStyle(grid);
  const pl = parseFloat(s.paddingLeft) || 0;
  const pr = parseFloat(s.paddingRight) || 0;
  const colGap = parseFloat(s.columnGap || s.gap) || 0;
  const cols = gridFeedColumnCount();
  const inner = grid.clientWidth - pl - pr;
  if (cols <= 1) {
    return { cols, colGap, track: inner, pl };
  }
  const track = (inner - colGap * (cols - 1)) / cols;
  return { cols, colGap, track, pl };
}

/**
 * Horizontal center of the gap between grid column tracks `gapIndex` and `gapIndex + 1`
 * (0 = gap after first column), in overlay coords (origin = grid padding box top-left).
 */
function verticalGapCenterX(
  pl: number,
  track: number,
  colGap: number,
  gapIndex: number,
): number {
  return pl + (gapIndex + 1) * track + (gapIndex + 0.5) * colGap;
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
              "flex size-full min-h-[2.5rem] min-w-[1.5rem] items-center justify-center rounded-sm border border-transparent bg-transparent p-0 outline-none ring-offset-background transition-[opacity,colors] duration-150 ease-out",
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
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="h-px min-w-0 flex-1 bg-border" aria-hidden />
              </span>
            ) : (
              <span className="flex h-full min-h-[4rem] w-full flex-col items-center justify-center gap-0.5 py-1">
                <span className="w-px min-h-0 flex-1 bg-border" aria-hidden />
                <Plus
                  className="size-3 shrink-0 transition-colors group-hover:text-foreground/85"
                  strokeWidth={1.75}
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
  orderedIds,
  hidden,
  onInsertSectionHeader,
  onOpenAddFeedModal,
}: {
  gridRef: RefObject<HTMLElement | null>;
  orderedIds: string[];
  hidden: boolean;
  onInsertSectionHeader: (afterId: string | null) => void;
  onOpenAddFeedModal: (afterId: string | null) => void;
}) {
  const [zones, setZones] = useState<LayoutZone[]>([]);

  const measure = useCallback(() => {
    const grid = gridRef.current;
    if (!grid || orderedIds.length === 0) {
      setZones([]);
      return;
    }

    const origin = gridPaddingBoxOriginViewport(grid);
    const contentBottomY = gridContentBottomViewport(grid);
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
    const rawTopPad = firstTop - origin.y;
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
    const bottomSpace = contentBottomY - lastBottom;
    const bottomH = bottomSpace > 0 ? bottomSpace : MIN_H_GAP;
    out.push({
      key: "h-bottom",
      kind: "horizontal",
      insertAfterId: lastId,
      style: {
        position: "absolute",
        left: 0,
        top: lastBottom - origin.y,
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
      const mid = (bottomR + topNext) / 2 - origin.y;
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

    const { cols: gridCols, colGap, track, pl } = gridFeedTrackMetrics(grid);

    for (const row of rows) {
      const rowTop = Math.min(...row.map((x) => x.rect.top));
      const rowBottom = Math.max(...row.map((x) => x.rect.bottom));
      for (let i = 0; i < row.length - 1; i++) {
        const a = row[i]!;
        const b = row[i + 1]!;
        const gapW = b.rect.left - a.rect.right;
        let centerX: number;
        let gw: number;
        if (gridCols >= 2 && row.length <= gridCols) {
          centerX = verticalGapCenterX(pl, track, colGap, i);
          gw = Math.max(MIN_V_GAP, colGap, gapW > 0 ? gapW : colGap);
        } else {
          centerX = (a.rect.right + b.rect.left) / 2 - origin.x;
          gw = Math.max(MIN_V_GAP, gapW > 0 ? gapW : MIN_V_GAP);
        }
        out.push({
          key: `v-${a.id}-${b.id}`,
          kind: "vertical",
          insertAfterId: a.id,
          style: {
            position: "absolute",
            left: centerX - gw / 2,
            top: rowTop - origin.y,
            width: gw,
            height: rowBottom - rowTop,
          },
        });
      }
    }

    setZones(out);
  }, [gridRef, orderedIds]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(() => {
      measure();
    });
    const grid = gridRef.current;
    if (grid) ro.observe(grid);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, gridRef]);

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
