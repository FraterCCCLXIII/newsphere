import type { GridColumn } from "@/types/grid";

/**
 * Applies a new order for `visible` columns into the full `columns` array.
 * Hidden columns (not in `visible`) keep their positions; visible slots are
 * filled from `newVisibleOrder` in sequence.
 */
export function mergeVisibleColumnOrder(
  full: GridColumn[],
  visible: GridColumn[],
  newVisibleOrder: GridColumn[],
): GridColumn[] {
  const visibleSet = new Set(visible.map((c) => c.id));
  let vi = 0;
  return full.map((col) => {
    if (!visibleSet.has(col.id)) {
      return col;
    }
    const next = newVisibleOrder[vi++];
    return next ?? col;
  });
}
