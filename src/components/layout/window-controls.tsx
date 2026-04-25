import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Plus, Square, X } from "@phosphor-icons/react";

import { isMac } from "@/lib/platform";
import { cn } from "@/lib/utils";

/** macOS-style traffic lights (leading edge). */
function MacTrafficLights() {
  const minimize = () => void getCurrentWindow().minimize();
  const toggleMax = () => void getCurrentWindow().toggleMaximize();
  const close = () => void getCurrentWindow().close();

  const dot =
    "group app-no-drag relative flex size-[11px] items-center justify-center rounded-full " +
    "text-black transition-[filter,opacity] duration-150 hover:brightness-110 " +
    "active:brightness-90 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
    "dark:text-zinc-950";

  /** Glyphs match native macOS: hidden until hover or keyboard focus. */
  const glyph =
    "pointer-events-none size-[7px] opacity-0 transition-opacity duration-150 " +
    "group-hover:opacity-50 group-focus-visible:opacity-50";

  return (
    <div
      className="flex h-full items-center gap-2 px-3"
      role="group"
      aria-label="Window"
    >
      <button
        type="button"
        className={cn(dot, "bg-[#ff5f57] dark:bg-[#ff5f57]/95")}
        onClick={close}
        aria-label="Close"
      >
        <X className={glyph} strokeWidth={2} />
      </button>
      <button
        type="button"
        className={cn(dot, "bg-[#ffbd2e] dark:bg-[#ffbd2e]/95")}
        onClick={minimize}
        aria-label="Minimize"
      >
        <Minus className={glyph} strokeWidth={2} />
      </button>
      <button
        type="button"
        className={cn(dot, "bg-[#28c840] dark:bg-[#28c840]/95")}
        onClick={toggleMax}
        aria-label="Zoom"
      >
        <Plus className={glyph} strokeWidth={2} />
      </button>
    </div>
  );
}

/** Windows / Linux: icon buttons in a themed capsule. */
function WinLikeControls() {
  const minimize = () => void getCurrentWindow().minimize();
  const toggleMax = () => void getCurrentWindow().toggleMaximize();
  const close = () => void getCurrentWindow().close();

  const icon = "shrink-0 opacity-50";

  const btn =
    "app-no-drag flex size-8 items-center justify-center rounded-md text-foreground " +
    "transition-[background-color,box-shadow] duration-150 " +
    "hover:bg-accent " +
    "active:bg-accent/80 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset";

  return (
    <div
      className="flex h-full items-center gap-0.5 px-1.5"
      role="group"
      aria-label="Window"
    >
      <button type="button" className={btn} onClick={minimize} aria-label="Minimize">
        <Minus className={cn(icon, "size-3.5")} strokeWidth={1.75} />
      </button>
      <button type="button" className={btn} onClick={toggleMax} aria-label="Maximize">
        <Square className={cn(icon, "size-3")} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        className={cn(
          btn,
          "hover:bg-destructive/20 active:bg-destructive/30 focus-visible:ring-destructive/40",
        )}
        onClick={close}
        aria-label="Close"
      >
        <X className={cn(icon, "size-3.5")} strokeWidth={1.75} />
      </button>
    </div>
  );
}

export function WindowControls() {
  return isMac() ? <MacTrafficLights /> : <WinLikeControls />;
}
