import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { PublishedDateFormatStyle } from "@/types/display-preferences";

const SHOW_TS_KEY = "newsphere-show-timestamps-inline";
const DATE_FMT_KEY = "newsphere-date-format";
const GRID_INSERTION_LINES_KEY = "newsphere-show-grid-insertion-lines";
const GRID_REORDER_KEY = "newsphere-allow-grid-reorder";

function readShowInline(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(SHOW_TS_KEY);
    if (v === null) return null;
    if (v === "1" || v === "true") return true;
    if (v === "0" || v === "false") return false;
  } catch {
    /* ignore */
  }
  return null;
}

function readDateFormat(): PublishedDateFormatStyle | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(DATE_FMT_KEY);
    if (v === "relative" || v === "absolute") return v;
  } catch {
    /* ignore */
  }
  return null;
}

function readShowGridInsertionLines(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(GRID_INSERTION_LINES_KEY);
    if (v === null) return null;
    if (v === "1" || v === "true") return true;
    if (v === "0" || v === "false") return false;
  } catch {
    /* ignore */
  }
  return null;
}

function readAllowGridReorder(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(GRID_REORDER_KEY);
    if (v === null) return null;
    if (v === "1" || v === "true") return true;
    if (v === "0" || v === "false") return false;
  } catch {
    /* ignore */
  }
  return null;
}

type DisplayPreferencesContextValue = {
  showTimestampsInline: boolean;
  setShowTimestampsInline: (value: boolean) => void;
  dateFormatStyle: PublishedDateFormatStyle;
  setDateFormatStyle: (value: PublishedDateFormatStyle) => void;
  /** Plus/dashed zones between grid columns to add a feed or section. */
  showGridInsertionLines: boolean;
  setShowGridInsertionLines: (value: boolean) => void;
  /** Drag feed columns and section headers on the home grid. */
  allowGridReorder: boolean;
  setAllowGridReorder: (value: boolean) => void;
};

const DisplayPreferencesContext =
  createContext<DisplayPreferencesContextValue | null>(null);

export function DisplayPreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [showTimestampsInline, setShowInlineState] = useState(
    () => readShowInline() ?? true,
  );
  const [dateFormatStyle, setFormatState] = useState<PublishedDateFormatStyle>(
    () => readDateFormat() ?? "absolute",
  );
  const [showGridInsertionLines, setGridInsertionLinesState] = useState(
    () => readShowGridInsertionLines() ?? true,
  );
  const [allowGridReorder, setAllowGridReorderState] = useState(
    () => readAllowGridReorder() ?? true,
  );

  const setShowTimestampsInline = useCallback((value: boolean) => {
    setShowInlineState(value);
    try {
      localStorage.setItem(SHOW_TS_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const setDateFormatStyle = useCallback(
    (value: PublishedDateFormatStyle) => {
      setFormatState(value);
      try {
        localStorage.setItem(DATE_FMT_KEY, value);
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const setShowGridInsertionLines = useCallback((value: boolean) => {
    setGridInsertionLinesState(value);
    try {
      localStorage.setItem(GRID_INSERTION_LINES_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const setAllowGridReorder = useCallback((value: boolean) => {
    setAllowGridReorderState(value);
    try {
      localStorage.setItem(GRID_REORDER_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      showTimestampsInline,
      setShowTimestampsInline,
      dateFormatStyle,
      setDateFormatStyle,
      showGridInsertionLines,
      setShowGridInsertionLines,
      allowGridReorder,
      setAllowGridReorder,
    }),
    [
      showTimestampsInline,
      setShowTimestampsInline,
      dateFormatStyle,
      setDateFormatStyle,
      showGridInsertionLines,
      setShowGridInsertionLines,
      allowGridReorder,
      setAllowGridReorder,
    ],
  );

  return (
    <DisplayPreferencesContext.Provider value={value}>
      {children}
    </DisplayPreferencesContext.Provider>
  );
}

export function useDisplayPreferences(): DisplayPreferencesContextValue {
  const ctx = useContext(DisplayPreferencesContext);
  if (!ctx) {
    throw new Error(
      "useDisplayPreferences must be used within DisplayPreferencesProvider",
    );
  }
  return ctx;
}
