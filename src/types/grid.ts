export type GridColumn = {
  id: string;
  title: string;
  feedUrl?: string;
};

export type GridConfig = {
  columns: GridColumn[];
};

/** Shared grid state + actions (from `useGridConfig`) passed to pages. */
export type GridController = {
  columns: GridColumn[];
  ready: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  addColumn: (title: string, feedUrl?: string) => Promise<void>;
  removeColumn: (id: string) => Promise<void>;
  reorderColumns: (columns: GridColumn[]) => Promise<void>;
};
