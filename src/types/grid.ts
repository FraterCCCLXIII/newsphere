/** Default first page (sources live here until the user adds more pages). */
export const DEFAULT_FIRST_PAGE_ID = "page-news";

/**
 * Virtual page: when 2+ pages exist, shows every page’s columns in dropdown order
 * (concatenated). Not stored in `pages[]`.
 */
export const AGGREGATE_PAGE_ID = "page-all-aggregate";

export type GridColumn = {
  id: string;
  title: string;
  feedUrl?: string;
};

/** A named page of feed columns (sources). */
export type GridPage = {
  id: string;
  name: string;
  columns: GridColumn[];
};

export type GridConfig = {
  pages: GridPage[];
  activePageId: string;
};

/** Legacy single-list config (migrated on load). */
export type LegacyGridConfig = {
  columns: GridColumn[];
};

/** Shared grid state + actions (from `useGridConfig`) passed to pages. */
export type GridController = {
  /** Columns for the main grid / feeds (aggregate view flattens all pages in order). */
  columns: GridColumn[];
  /** Columns for Settings: the page you edit (on aggregate, the first page — News). */
  settingsColumns: GridColumn[];
  /** Every column across all pages (e.g. catalog “already added” checks). */
  allColumns: GridColumn[];
  /** True when viewing the virtual “All” combined layout. */
  isAggregateView: boolean;
  pages: GridPage[];
  activePageId: string;
  ready: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  setActivePage: (pageId: string) => Promise<void>;
  addPage: (name: string) => Promise<void>;
  addColumn: (title: string, feedUrl?: string) => Promise<void>;
  removeColumn: (id: string) => Promise<void>;
  reorderColumns: (columns: GridColumn[]) => Promise<void>;
};
