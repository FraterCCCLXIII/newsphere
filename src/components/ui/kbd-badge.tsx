import { cn } from "@/lib/utils";

type KbdBadgeProps = {
  children: string;
  className?: string;
};

/**
 * Keyboard shortcut chip. Uses em-based sizing so it scales with parent text and
 * with root font-size (TextScaleProvider / --text-scale).
 */
export function KbdBadge({ children, className }: KbdBadgeProps) {
  return (
    <kbd
      className={cn(
        "pointer-events-none inline-flex shrink-0 items-center justify-center rounded border border-border bg-muted/80",
        "font-mono font-medium tabular-nums leading-none tracking-tight",
        "px-[0.55em] py-[0.32em] text-[0.92em]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
