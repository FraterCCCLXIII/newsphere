import { MAC_CMD_GAP } from "@/lib/mac-cmd-gap";

const G = MAC_CMD_GAP;

export type ShortcutHelpRow = {
  action: string;
  mac: string;
  windowsLinux: string;
  /** If set, label is shown as-is (no splitting on / for combined shortcuts). */
  plain?: boolean;
};

export const KEYBOARD_SHORTCUT_HELP_ROWS: ShortcutHelpRow[] = [
  {
    action: "Open keyboard shortcuts",
    mac: `⌘${G}K`,
    windowsLinux: "Ctrl+K",
  },
  {
    action: "Go back / forward (app history)",
    mac: `⌘${G}[ / ⌘${G}]`,
    windowsLinux: "Alt+← / Alt+→",
  },
  {
    action: "Focus search",
    mac: `⌘${G}/`,
    windowsLinux: "Ctrl+/",
  },
  {
    action: "Grid home",
    mac: `⌘${G}1`,
    windowsLinux: "Ctrl+1",
  },
  {
    action: "Latest feed",
    mac: `⌘${G}2`,
    windowsLinux: "Ctrl+2",
  },
  {
    action: "Bookmarks",
    mac: `⌘${G}B`,
    windowsLinux: "Ctrl+B",
  },
  {
    action: "Reading history",
    mac: `⌘${G}H`,
    windowsLinux: "Ctrl+H",
  },
  {
    action: "Settings",
    mac: `⌘${G}S`,
    windowsLinux: "Ctrl+S",
  },
  {
    action: "Refresh feeds",
    mac: `⌘${G}R`,
    windowsLinux: "Ctrl+R",
  },
  {
    action: "Add source (catalog)",
    mac: `⌘${G}⇧${G}N`,
    windowsLinux: "Ctrl+Shift+N",
  },
  {
    action: "Toggle AI assistant",
    mac: `⌘${G}⇧${G}A`,
    windowsLinux: "Ctrl+Shift+A",
  },
  {
    action: "Reader: previous article",
    mac: "K or ←",
    windowsLinux: "K or ←",
    plain: true,
  },
  {
    action: "Reader: next article",
    mac: "J or →",
    windowsLinux: "J or →",
    plain: true,
  },
  {
    action: "Reader: bookmark article",
    mac: `⌘${G}D`,
    windowsLinux: "Ctrl+D",
  },
  {
    action: "Reader: close",
    mac: "Esc",
    windowsLinux: "Esc",
  },
];
