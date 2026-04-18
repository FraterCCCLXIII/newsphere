import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { SendHorizontal, X } from "lucide-react";

import { useAiTools } from "@/components/ai/ai-tools-provider";
import { AiChatMessageBody } from "@/components/ai/ai-chat-message-body";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AiChatDrawer() {
  const {
    ready,
    aiToolsEnabled,
    drawerOpen,
    setDrawerOpen,
    messages,
    sendUserMessage,
    pending,
    error,
    clearError,
  } = useAiTools();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, drawerOpen, pending]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, setDrawerOpen]);

  if (!ready || !aiToolsEnabled) return null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (!t || pending) return;
    clearError();
    void sendUserMessage(t);
    setInput("");
  };

  return (
    <aside
      className={cn(
        // Fixed width + max-w-full avoids min(100%,…) resolving to 0 when the flex
        // percentage base is indefinite (drawer looked “closed” while state was open).
        "flex h-full min-h-0 shrink-0 flex-col border-border bg-background transition-[width,max-width] duration-200 ease-out",
        drawerOpen
          ? "min-w-0 w-[28rem] max-w-full border-l border-border"
          : "pointer-events-none w-0 max-w-0 overflow-hidden border-l-0",
      )}
      aria-hidden={!drawerOpen}
      aria-label="Assistant chat"
    >
      {drawerOpen ? (
        <>
          <div className="relative flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-4 pr-12">
            <div className="min-w-0 space-y-1 text-left">
              <h2 className="text-lg font-semibold leading-none text-foreground">
                Assistant
              </h2>
              <p className="text-sm text-muted-foreground">
                Answers use articles from your feeds. Links open in the reader.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 shrink-0 app-no-drag"
              aria-label="Close assistant"
              onClick={() => setDrawerOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="relative min-h-0 flex-1">
            <div className="absolute inset-0 space-y-3 overflow-y-auto overscroll-contain px-4 py-3 touch-pan-y">
              {messages.length === 0 && !pending && (
                <p className="text-sm text-muted-foreground">
                  Ask a question about headlines or topics in your feeds.
                </p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-lg px-3 py-2",
                    m.role === "user"
                      ? "ml-4 bg-muted text-foreground"
                      : "mr-4 bg-accent/40 text-foreground",
                  )}
                >
                  {m.role === "assistant" ? (
                    <AiChatMessageBody content={m.content} />
                  ) : (
                    <p className="whitespace-pre-wrap break-words text-sm">
                      {m.content}
                    </p>
                  )}
                </div>
              ))}
              {pending && (
                <p className="text-sm text-muted-foreground">Thinking…</p>
              )}
              {error && (
                <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            className="flex shrink-0 gap-2 border-t border-border p-4"
          >
            <label htmlFor="ai-drawer-input" className="sr-only">
              Message
            </label>
            <textarea
              id="ai-drawer-input"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e);
                }
              }}
              placeholder="Message…"
              disabled={pending}
              className="min-h-[2.75rem] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
            <Button
              type="submit"
              size="icon"
              className="shrink-0 self-end"
              aria-label="Send"
              disabled={pending || !input.trim()}
            >
              <SendHorizontal className="size-4" />
            </Button>
          </form>
        </>
      ) : null}
    </aside>
  );
}
