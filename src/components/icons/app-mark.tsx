import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

/** Concentric ellipses mark — uses `currentColor` for strokes (no background). */
export function AppMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 text-foreground", className)}
      aria-hidden
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth={36}
      >
        <ellipse cx="512" cy="512" rx="336.96" ry="184.32" />
        <ellipse cx="512" cy="512" rx="259.68" ry="184.32" />
        <ellipse cx="512" cy="512" rx="174.24" ry="184.32" />
        <ellipse cx="512" cy="512" rx="66.72" ry="184.32" />
      </g>
    </svg>
  );
}
