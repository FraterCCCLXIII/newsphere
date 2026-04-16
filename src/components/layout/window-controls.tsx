import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";

import { isMac } from "@/lib/platform";
import { cn } from "@/lib/utils";

/** macOS-style traffic lights (leading edge). */
function MacTrafficLights() {
  const minimize = () => void getCurrentWindow().minimize();
  const toggleMax = () => void getCurrentWindow().toggleMaximize();
  const close = () => void getCurrentWindow().close();

  const dot =
    "app-no-drag relative flex size-[11px] items-center justify-center rounded-full transition-[filter,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95";

  return (
    <div
      className="flex h-full items-center gap-2 bg-muted/30 px-3 dark:bg-muted/20"
      role="group"
      aria-label="Window"
    >
      <button
        type="button"
        className={cn(dot, "bg-[#ff5f57] hover:brightness-95 dark:bg-[#ff5f57]/95")}
        onClick={close}
        aria-label="Close"
      />
      <button
        type="button"
        className={cn(dot, "bg-[#ffbd2e] hover:brightness-95 dark:bg-[#ffbd2e]/95")}
        onClick={minimize}
        aria-label="Minimize"
      />
      <button
        type="button"
        className={cn(dot, "bg-[#28c840] hover:brightness-95 dark:bg-[#28c840]/95")}
        onClick={toggleMax}
        aria-label="Zoom"
      />
    </div>
  );
}

/** Windows / Linux: icon buttons in a themed capsule. */
function WinLikeControls() {
  const minimize = () => void getCurrentWindow().minimize();
  const toggleMax = () => void getCurrentWindow().toggleMaximize();
  const close = () => void getCurrentWindow().close();

  const btn =
    "app-no-drag flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset active:bg-accent/80";

  return (
    <div
      className="flex h-full items-center gap-0.5 bg-gradient-to-b from-muted/50 to-muted/30 px-1.5 dark:from-muted/30 dark:to-muted/15"
      role="group"
      aria-label="Window"
    >
      <button type="button" className={btn} onClick={minimize} aria-label="Minimize">
        <Minus className="size-3.5 shrink-0" strokeWidth={2.25} />
      </button>
      <button type="button" className={btn} onClick={toggleMax} aria-label="Maximize">
        <Square className="size-3 shrink-0" strokeWidth={2.25} />
      </button>
      <button
        type="button"
        className={cn(
          btn,
          "hover:bg-destructive/15 hover:text-destructive focus-visible:ring-destructive/40",
        )}
        onClick={close}
        aria-label="Close"
      >
        <X className="size-3.5 shrink-0" strokeWidth={2.25} />
      </button>
    </div>
  );
}

export function WindowControls() {
  return isMac() ? <MacTrafficLights /> : <WinLikeControls />;
}
