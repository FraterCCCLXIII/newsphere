import type { ReactNode } from "react";

import { openExternalUrl } from "@/lib/open-external";
import { isTauriRuntime } from "@/lib/tauri-env";
import { cn } from "@/lib/utils";

type ExternalBrowserLinkProps = {
  href: string;
  className?: string;
  title?: string;
  "aria-label"?: string;
  children: ReactNode;
};

/**
 * Renders a normal `<a target="_blank">` on the web; in Tauri opens the system
 * browser via the opener plugin so the app webview is not navigated away.
 */
export function ExternalBrowserLink({
  href,
  className,
  title,
  "aria-label": ariaLabel,
  children,
}: ExternalBrowserLinkProps) {
  if (isTauriRuntime()) {
    return (
      <button
        type="button"
        className={cn(className)}
        title={title}
        aria-label={ariaLabel}
        onClick={() => void openExternalUrl(href)}
      >
        {children}
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}
