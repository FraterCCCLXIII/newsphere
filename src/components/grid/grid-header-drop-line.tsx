import { useDndMonitor } from "@dnd-kit/core";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

import { useGridSortDragKind } from "@/components/grid/grid-sort-drag-context";
import { cn } from "@/lib/utils";

type LineGeom = { top: number; left: number; width: number } | null;

function cssEscapeSelector(s: string): string {
  return typeof CSS !== "undefined" && "escape" in CSS
    ? (CSS as { escape: (x: string) => string }).escape(s)
    : s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

type GridHeaderDropLineProps = {
  wrapRef: RefObject<HTMLElement | null>;
  gridRef: RefObject<HTMLElement | null>;
};

/**
 * Full-width horizontal indicator for where a dragged section header will land.
 * Other grid items stay static (no shuffle transforms) while this is active.
 */
export function GridHeaderDropLine({ wrapRef, gridRef }: GridHeaderDropLineProps) {
  const dragKind = useGridSortDragKind();
  const active = dragKind === "header";
  const activeRef = useRef(active);
  activeRef.current = active;

  const [line, setLine] = useState<LineGeom>(null);

  const updateLine = useCallback(
    (overId: string | null, activeId: string) => {
      if (!activeRef.current || !overId || overId === activeId) {
        setLine(null);
        return;
      }
      const wrap = wrapRef.current;
      const grid = gridRef.current;
      if (!wrap || !grid) {
        setLine(null);
        return;
      }
      const escaped = cssEscapeSelector(overId);
      const overEl = document.querySelector<HTMLElement>(
        `[data-grid-column-id="${escaped}"]`,
      );
      if (!overEl) {
        setLine(null);
        return;
      }
      const wrapR = wrap.getBoundingClientRect();
      const gridR = grid.getBoundingClientRect();
      const overR = overEl.getBoundingClientRect();
      setLine({
        top: overR.top - wrapR.top,
        left: gridR.left - wrapR.left,
        width: gridR.width,
      });
    },
    [wrapRef, gridRef],
  );

  useDndMonitor(
    useMemo(
      () => ({
        onDragMove({ active: a, over }) {
          if (!a) return;
          updateLine(over?.id != null ? String(over.id) : null, String(a.id));
        },
        onDragOver({ active: a, over }) {
          if (!a) return;
          updateLine(over?.id != null ? String(over.id) : null, String(a.id));
        },
        onDragEnd() {
          setLine(null);
        },
        onDragCancel() {
          setLine(null);
        },
      }),
      [updateLine],
    ),
  );

  useLayoutEffect(() => {
    if (!active) {
      setLine(null);
    }
  }, [active]);

  if (!active || !line) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-[25] rounded-full bg-primary shadow-[0_0_0_1px_hsl(var(--background))]",
      )}
      style={{
        top: line.top,
        left: line.left,
        width: line.width,
        height: 3,
      }}
      aria-hidden
    />
  );
}
