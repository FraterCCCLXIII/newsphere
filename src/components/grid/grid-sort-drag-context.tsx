import { createContext, useContext } from "react";

export type GridSortDragKind = "header" | "feed" | null;

export const GridSortDragKindContext = createContext<GridSortDragKind>(null);

export function useGridSortDragKind(): GridSortDragKind {
  return useContext(GridSortDragKindContext);
}
