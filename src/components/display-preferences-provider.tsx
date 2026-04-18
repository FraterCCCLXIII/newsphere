import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { parseFeedStreamSort } from "@/lib/feed-stream-sort";
import type { PublishedDateFormatStyle } from "@/types/display-preferences";
import type { FeedStreamSortMode } from "@/types/feed-stream-sort";

const SHOW_TS_KEY = "newsphere-show-timestamps-inline";
const DATE_FMT_KEY = "newsphere-date-format";
const GRID_INSERTION_LINES_KEY = "newsphere-show-grid-insertion-lines";
const GRID_REORDER_KEY = "newsphere-allow-grid-reorder";
const HIDE_BROKEN_FEEDS_KEY = "newsphere-hide-broken-feeds";
const LOAD_NETWORK_FAVICONS_KEY = "newsphere-load-network-favicons";
const FEED_STREAM_SORT_KEY = "newsphere-feed-stream-sort";
const SHOW_FEED_PREVIEW_IMAGES_KEY = "newsphere-show-feed-preview-images";

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

/** When true, feed column icons load from third-party favicon services (privacy trade-off). Default off. */
function readLoadNetworkFavicons(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(LOAD_NETWORK_FAVICONS_KEY);
    if (v === null) return null;
    if (v === "1" || v === "true") return true;
    if (v === "0" || v === "false") return false;
  } catch {
    /* ignore */
  }
  return null;
}

/** When true (default), feeds that failed to load are hidden on the home grid. */
function readHideBrokenFeeds(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(HIDE_BROKEN_FEEDS_KEY);
    if (v === null) return null;
    if (v === "1" || v === "true") return true;
    if (v === "0" || v === "false") return false;
  } catch {
    /* ignore */
  }
  return null;
}

function readFeedStreamSort(): FeedStreamSortMode | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(FEED_STREAM_SORT_KEY);
    return parseFeedStreamSort(v);
  } catch {
    /* ignore */
  }
  return null;
}

function readShowFeedPreviewImages(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(SHOW_FEED_PREVIEW_IMAGES_KEY);
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
  /** When true, columns whose feed fetch failed are hidden (default on). */
  hideBrokenFeeds: boolean;
  setHideBrokenFeeds: (value: boolean) => void;
  /**
   * When true, load site icons via external favicon CDNs (leaks hostnames to
   * those providers). When false, show the RSS placeholder only.
   */
  loadNetworkFavicons: boolean;
  setLoadNetworkFavicons: (value: boolean) => void;
  /** Unified Latest feed (/feed) ordering. */
  feedStreamSort: FeedStreamSortMode;
  setFeedStreamSort: (value: FeedStreamSortMode) => void;
  /** Article preview thumbnails in feed lists and hover cards (default on). */
  showFeedPreviewImages: boolean;
  setShowFeedPreviewImages: (value: boolean) => void;
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
  const [hideBrokenFeeds, setHideBrokenFeedsState] = useState(
    () => readHideBrokenFeeds() ?? true,
  );
  const [loadNetworkFavicons, setLoadNetworkFaviconsState] = useState(
    () => readLoadNetworkFavicons() ?? false,
  );
  const [feedStreamSort, setFeedStreamSortState] = useState<FeedStreamSortMode>(
    () => readFeedStreamSort() ?? "newest_first",
  );
  const [showFeedPreviewImages, setFeedPreviewImagesState] = useState(
    () => readShowFeedPreviewImages() ?? true,
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

  const setHideBrokenFeeds = useCallback((value: boolean) => {
    setHideBrokenFeedsState(value);
    try {
      localStorage.setItem(HIDE_BROKEN_FEEDS_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const setLoadNetworkFavicons = useCallback((value: boolean) => {
    setLoadNetworkFaviconsState(value);
    try {
      localStorage.setItem(LOAD_NETWORK_FAVICONS_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const setFeedStreamSort = useCallback((value: FeedStreamSortMode) => {
    setFeedStreamSortState(value);
    try {
      localStorage.setItem(FEED_STREAM_SORT_KEY, value);
    } catch {
      /* ignore */
    }
  }, []);

  const setShowFeedPreviewImages = useCallback((value: boolean) => {
    setFeedPreviewImagesState(value);
    try {
      localStorage.setItem(SHOW_FEED_PREVIEW_IMAGES_KEY, value ? "1" : "0");
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
      hideBrokenFeeds,
      setHideBrokenFeeds,
      loadNetworkFavicons,
      setLoadNetworkFavicons,
      feedStreamSort,
      setFeedStreamSort,
      showFeedPreviewImages,
      setShowFeedPreviewImages,
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
      hideBrokenFeeds,
      setHideBrokenFeeds,
      loadNetworkFavicons,
      setLoadNetworkFavicons,
      feedStreamSort,
      setFeedStreamSort,
      showFeedPreviewImages,
      setShowFeedPreviewImages,
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
