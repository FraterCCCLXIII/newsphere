import { useState, type FormEvent } from "react";
import { PaperPlaneRight } from "@phosphor-icons/react";

import { useAiTools } from "@/components/ai/ai-tools-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AiFloatingComposer() {
  const { ready, aiToolsEnabled, drawerOpen, submitFromFloatingBar } =
    useAiTools();
  const [value, setValue] = useState("");

  if (!ready || !aiToolsEnabled || drawerOpen) return null;

  const handleSend = () => {
    const t = value.trim();
    if (!t) return;
    submitFromFloatingBar(t);
    setValue("");
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2",
      )}
    >
      <form
        onSubmit={onSubmit}
        className="app-no-drag pointer-events-auto flex w-full max-w-xl gap-2 rounded-xl border border-border bg-card/95 p-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80"
      >
        <label htmlFor="ai-floating-input" className="sr-only">
          Ask about your articles
        </label>
        <textarea
          id="ai-floating-input"
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask about your articles…"
          className="max-h-32 min-h-9 flex-1 resize-none rounded-md border border-transparent bg-muted/50 px-3 py-2 text-sm text-foreground shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button
          type="submit"
          size="icon"
          variant="secondary"
          className="shrink-0"
          aria-label="Send"
          disabled={!value.trim()}
        >
          <PaperPlaneRight className="size-4" />
        </Button>
      </form>
    </div>
  );
}
