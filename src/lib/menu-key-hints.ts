import { MAC_CMD_GAP } from "@/lib/mac-cmd-gap";
import { isMac } from "@/lib/platform";

const G = MAC_CMD_GAP;

/** Shortcut labels for title bar / overflow menus (kept in sync with use-app-keyboard-shortcuts). */
export function getMenuKeyHints(): {
  shortcuts: string;
  bookmarks: string;
  history: string;
  settings: string;
  refresh: string;
  addSource: string;
  ai: string;
  grid: string;
  feed: string;
  focusSearch: string;
} {
  if (isMac()) {
    return {
      shortcuts: `⌘${G}K`,
      bookmarks: `⌘${G}B`,
      history: `⌘${G}H`,
      settings: `⌘${G}S`,
      refresh: `⌘${G}R`,
      addSource: `⌘${G}⇧${G}N`,
      ai: `⌘${G}⇧${G}A`,
      grid: `⌘${G}1`,
      feed: `⌘${G}2`,
      focusSearch: `⌘${G}/`,
    };
  }
  return {
    shortcuts: "Ctrl+K",
    bookmarks: "Ctrl+B",
    history: "Ctrl+H",
    settings: "Ctrl+S",
    refresh: "Ctrl+R",
    addSource: "Ctrl+Shift+N",
    ai: "Ctrl+Shift+A",
    grid: "Ctrl+1",
    feed: "Ctrl+2",
    focusSearch: "Ctrl+/",
  };
}
