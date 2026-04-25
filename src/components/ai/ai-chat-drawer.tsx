import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import { Plus, SendHorizontal, X } from "lucide-react";

import {
  useAiTools,
  type UiChatMessage,
} from "@/components/ai/ai-tools-provider";
import { AiChatMessageBody } from "@/components/ai/ai-chat-message-body";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function labelForSession(messages: UiChatMessage[]) {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New chat";
  const line = (first.content.trim().split("\n")[0] ?? "").trim();
  if (!line) return "New chat";
  return line.length > 32 ? `${line.slice(0, 31)}…` : line;
}

export function AiChatDrawer() {
  const {
    ready,
    aiToolsEnabled,
    drawerOpen,
    setDrawerOpen,
    setAiToolsEnabled,
    messages,
    chatSessions,
    activeChatSessionId,
    setActiveChatSession,
    addChatSession,
    closeChatSession,
    sendUserMessage,
    pending,
    error,
    clearError,
  } = useAiTools();
  const [input, setInput] = useState("");
  const asideRef = useRef<HTMLElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  /** Scroll only the drawer list — scrollIntoView() can scroll page/window in Tauri WebView. */
  useLayoutEffect(() => {
    if (!drawerOpen || !aiToolsEnabled) return;
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, drawerOpen, pending, aiToolsEnabled]);

  const blurDrawerFocus = useCallback(() => {
    const root = asideRef.current;
    if (!root) return;
    const ae = document.activeElement;
    if (ae && root.contains(ae) && ae instanceof HTMLElement) ae.blur();
  }, []);

  const closeDrawer = useCallback(() => {
    blurDrawerFocus();
    setDrawerOpen(false);
  }, [blurDrawerFocus, setDrawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // DropdownMenuContent dispatches a synthetic Escape on document scroll to
      // close menus; that bubbles to window and must not close the assistant.
      if (!e.isTrusted) return;
      closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, closeDrawer]);

  if (!ready) return null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (!t || pending || !aiToolsEnabled) return;
    clearError();
    void sendUserMessage(t);
    setInput("");
  };

  return (
    <aside
      ref={asideRef}
      data-tauri-drag-region="false"
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      className={cn(
        // Fixed width + max-w-full avoids min(100%,…) resolving to 0 when the flex
        // percentage base is indefinite (drawer looked “closed” while state was open).
        "app-no-drag flex h-full min-h-0 shrink-0 flex-col overscroll-contain border-border bg-background transition-[width,max-width] duration-200 ease-out",
        drawerOpen
          ? "min-w-0 w-[28rem] max-w-full border-l border-border"
          : "pointer-events-none w-0 max-w-0 overflow-hidden border-l-0",
      )}
      aria-hidden={!drawerOpen}
      aria-label="Assistant chat"
    >
      {drawerOpen ? (
        <>
          {aiToolsEnabled ? (
            <div className="flex min-h-12 shrink-0 items-center gap-0.5 border-b border-border py-1.5 pl-2 pr-1.5">
              <div
                className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto overflow-y-hidden pr-0.5 touch-pan-x [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]"
                role="tablist"
                aria-label="Assistant conversations"
              >
                {chatSessions.map((s) => {
                  const selected = s.id === activeChatSessionId;
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "inline-flex h-8 min-w-0 max-w-[9.5rem] shrink-0 items-stretch overflow-hidden rounded-full border text-xs",
                        selected
                          ? "border-border bg-accent/90 text-accent-foreground"
                          : "border-transparent bg-muted/60 text-muted-foreground hover:border-border/80 hover:bg-muted",
                      )}
                    >
                      <button
                        type="button"
                        role="tab"
                        id={`ai-chat-tab-${s.id}`}
                        aria-selected={selected}
                        className="app-no-drag min-w-0 flex-1 px-2.5 py-1.5 text-left text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                        onClick={() => setActiveChatSession(s.id)}
                      >
                        <span className="block truncate">
                          {labelForSession(s.messages)}
                        </span>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="app-no-drag h-8 w-7 shrink-0 rounded-none rounded-r-full px-0 text-muted-foreground hover:bg-background/30 hover:text-foreground"
                        aria-label="Close conversation"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeChatSession(s.id);
                        }}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="app-no-drag h-8 w-8 shrink-0"
                aria-label="New conversation"
                onClick={() => addChatSession()}
              >
                <Plus className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="app-no-drag h-8 w-8 shrink-0"
                aria-label="Close assistant"
                onClick={closeDrawer}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="relative flex min-h-12 shrink-0 items-center border-b border-border px-4 py-2 pr-12">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-3 top-1/2 shrink-0 -translate-y-1/2 app-no-drag"
                aria-label="Close assistant"
                onClick={closeDrawer}
              >
                <X className="size-4" />
              </Button>
            </div>
          )}

          {!aiToolsEnabled ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Turn on AI tools and add your API details in Settings to chat
                about your feeds.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  className="app-no-drag w-full"
                  onClick={() => setAiToolsEnabled(true)}
                >
                  Enable AI tools
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="app-no-drag w-full"
                  asChild
                >
                  <Link to="/settings/app" onClick={closeDrawer}>
                    Open App settings
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative min-h-0 flex-1">
                <div
                  ref={messagesScrollRef}
                  className="absolute inset-0 space-y-3 overflow-y-auto overscroll-contain px-4 py-3 touch-pan-y"
                >
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
          )}
        </>
      ) : null}
    </aside>
  );
}
