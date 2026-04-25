import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { shouldIgnoreShortcutTarget } from "@/lib/keyboard-shortcut-target";

export type UseAppKeyboardShortcutsOptions = {
  openShortcutsDialog: () => void;
  focusSearch: () => void;
  onRefresh: () => void;
  onAddSource: () => void;
  toggleAi?: () => void;
};

export function useAppKeyboardShortcuts({
  openShortcutsDialog,
  focusSearch,
  onRefresh,
  onAddSource,
  toggleAi,
}: UseAppKeyboardShortcutsOptions) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const go = (path: string) => {
      const fromReader = location.pathname === "/reader";
      void navigate(path, { replace: fromReader });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      const openShortcuts =
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === "k";
      if (openShortcuts) {
        e.preventDefault();
        openShortcutsDialog();
        return;
      }

      if (e.defaultPrevented) return;

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) {
        if (e.key === "?") {
          if (shouldIgnoreShortcutTarget(e.target)) return;
          e.preventDefault();
          openShortcutsDialog();
        }
        return;
      }

      if (shouldIgnoreShortcutTarget(e.target)) return;

      const k = e.key.toLowerCase();

      const focusSearchChord =
        (e.key === "/" || e.code === "Slash") && !e.shiftKey;
      if (focusSearchChord) {
        e.preventDefault();
        focusSearch();
        return;
      }
      if (e.key === "1" && !e.shiftKey) {
        e.preventDefault();
        go("/");
        return;
      }
      if (e.key === "2" && !e.shiftKey) {
        e.preventDefault();
        go("/feed");
        return;
      }
      if (k === "b" && !e.shiftKey) {
        e.preventDefault();
        go("/bookmarks");
        return;
      }
      if (k === "s" && !e.shiftKey) {
        e.preventDefault();
        go("/settings");
        return;
      }
      if (k === "r" && !e.shiftKey) {
        e.preventDefault();
        onRefresh();
        return;
      }
      if (k === "h" && !e.shiftKey) {
        e.preventDefault();
        go("/history");
        return;
      }
      if (k === "n" && e.shiftKey) {
        e.preventDefault();
        onAddSource();
        return;
      }
      if (k === "a" && e.shiftKey && toggleAi) {
        e.preventDefault();
        toggleAi();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    location.pathname,
    navigate,
    openShortcutsDialog,
    focusSearch,
    onRefresh,
    onAddSource,
    toggleAi,
  ]);
}
