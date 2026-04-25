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
    mac: "⌘/",
    windowsLinux: "Ctrl+/",
  },
  {
    action: "Go back / forward (app history)",
    mac: "⌘[ / ⌘]",
    windowsLinux: "Alt+← / Alt+→",
  },
  {
    action: "Focus search",
    mac: "⌘K",
    windowsLinux: "Ctrl+K",
  },
  {
    action: "Grid home",
    mac: "⌘1",
    windowsLinux: "Ctrl+1",
  },
  {
    action: "Latest feed",
    mac: "⌘2",
    windowsLinux: "Ctrl+2",
  },
  {
    action: "Bookmarks",
    mac: "⌘B",
    windowsLinux: "Ctrl+B",
  },
  {
    action: "Reading history",
    mac: "⌘⇧H",
    windowsLinux: "Ctrl+Shift+H",
  },
  {
    action: "Settings",
    mac: "⌘,",
    windowsLinux: "Ctrl+,",
  },
  {
    action: "Refresh feeds",
    mac: "⌘R",
    windowsLinux: "Ctrl+R",
  },
  {
    action: "Add source (catalog)",
    mac: "⌘⇧N",
    windowsLinux: "Ctrl+Shift+N",
  },
  {
    action: "Toggle AI assistant",
    mac: "⌘⇧A",
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
    mac: "⌘D",
    windowsLinux: "Ctrl+D",
  },
  {
    action: "Reader: close",
    mac: "Esc",
    windowsLinux: "Esc",
  },
];
