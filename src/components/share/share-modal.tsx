import {
  Check,
  Copy,
  Facebook,
  Mail,
  MessageSquare,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ShareModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
};

function buildShareTargets(url: string, title: string) {
  const text = `${title}\n\n${url}`;
  return {
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    sms: `sms:?body=${encodeURIComponent(text)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  };
}

type CircleActionProps = {
  href?: string;
  onClick?: () => void;
  label: string;
  className?: string;
  children: React.ReactNode;
};

function CircleAction({ href, onClick, label, className, children }: CircleActionProps) {
  const inner = (
    <>
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-full text-white shadow-sm transition-transform hover:scale-105",
          className,
        )}
      >
        {children}
      </span>
      <span className="max-w-[4.5rem] text-center text-[11px] leading-tight text-muted-foreground">
        {label}
      </span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="app-no-drag flex flex-col items-center gap-1.5 rounded-lg p-1 outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="app-no-drag flex flex-col items-center gap-1.5 rounded-lg p-1 outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
    >
      {inner}
    </button>
  );
}

export function ShareModal({ open, onOpenChange, url, title }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const targets = buildShareTargets(url, title);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [url]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const nativeShare = useCallback(async () => {
    try {
      await navigator.share({ title, text: title, url });
      onOpenChange(false);
    } catch {
      /* user cancelled or error */
    }
  }, [title, url, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-no-drag max-w-md gap-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
          <DialogDescription>
            Copy the link or choose where to share.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 items-stretch gap-0 overflow-hidden rounded-lg border border-border bg-muted/40">
          <p className="min-h-[2.75rem] min-w-0 flex-1 break-all px-3 py-2 font-mono text-xs leading-relaxed text-foreground">
            {url}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="app-no-drag h-auto shrink-0 rounded-none border-l border-border px-3 hover:bg-muted"
            onClick={copyLink}
            aria-label={copied ? "Copied" : "Copy link"}
            title={copied ? "Copied" : "Copy link"}
          >
            {copied ? (
              <Check className="size-4 text-emerald-600" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4">
          <CircleAction href={targets.email} label="Email" className="bg-muted text-foreground">
            <Mail className="size-5" aria-hidden />
          </CircleAction>

          <CircleAction href={targets.whatsapp} label="WhatsApp" className="bg-[#25D366]">
            <WhatsAppGlyph className="size-6" />
          </CircleAction>

          <CircleAction href={targets.facebook} label="Facebook" className="bg-[#1877F2]">
            <Facebook className="size-5" aria-hidden />
          </CircleAction>

          <CircleAction href={targets.telegram} label="Telegram" className="bg-[#26A5E4]">
            <Send className="size-5" aria-hidden />
          </CircleAction>

          <CircleAction href={targets.twitter} label="X" className="bg-foreground text-background">
            <XLogo className="size-4" />
          </CircleAction>

          <CircleAction href={targets.sms} label="Messages" className="bg-emerald-600">
            <MessageSquare className="size-5" aria-hidden />
          </CircleAction>

          <CircleAction href={targets.linkedin} label="LinkedIn" className="bg-[#0A66C2]">
            <LinkedInGlyph className="size-5" />
          </CircleAction>

          {canNativeShare ? (
            <CircleAction label="More…" onClick={nativeShare} className="bg-secondary text-secondary-foreground">
              <ShareGlyph className="size-5" />
            </CircleAction>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function ShareGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
      <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
    </svg>
  );
}
