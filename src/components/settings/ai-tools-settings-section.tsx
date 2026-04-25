import { ChevronDown } from "lucide-react";

import { useAiTools } from "@/components/ai/ai-tools-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { LlmProviderKind } from "@/types/ai-tools";

const PROVIDER_OPTIONS: { value: LlmProviderKind; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google Gemini" },
  {
    value: "openaiCompatible",
    label: "OpenAI-compatible (Ollama, LM Studio, …)",
  },
];

export function AiToolsSettingsSection({ className }: { className?: string }) {
  const {
    ready,
    aiToolsEnabled,
    setAiToolsEnabled,
    webSearchEnabled,
    setWebSearchEnabled,
    llm,
    setLlm,
    setProvider,
  } = useAiTools();

  const ghosted = !aiToolsEnabled;
  const providerLabel =
    PROVIDER_OPTIONS.find((o) => o.value === llm.provider)?.label ?? "";

  if (!ready) {
    return (
      <section
        className={cn("rounded-lg border border-border bg-card p-4 shadow-sm", className)}
        aria-labelledby="settings-ai-tools-heading"
      >
        <p className="text-sm text-muted-foreground">Loading…</p>
      </section>
    );
  }

  return (
    <section
      className={cn("rounded-lg border border-border bg-card p-4 shadow-sm", className)}
      aria-labelledby="settings-ai-tools-heading"
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id="settings-ai-tools-heading"
            className="text-sm font-medium text-foreground"
          >
            AI tools
          </h2>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Beta
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Enable the in-app assistant and floating prompt. API keys are stored
          only on this device (same as other local settings).
        </p>
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex items-center gap-2">
          <Switch
            id="settings-ai-tools-enabled"
            className="app-no-drag shrink-0"
            checked={aiToolsEnabled}
            onCheckedChange={setAiToolsEnabled}
            aria-label="Enable AI tools beta"
          />
          <Label
            htmlFor="settings-ai-tools-enabled"
            className="cursor-pointer text-sm font-normal text-foreground"
          >
            Enable AI tools (beta)
          </Label>
        </div>

        <div
          className={cn(
            "flex flex-col gap-1.5 rounded-md border border-border/80 bg-muted/10 p-3",
            ghosted && "pointer-events-none opacity-50",
          )}
        >
          <div className="flex items-center gap-2">
            <Switch
              id="settings-ai-web-search"
              className="app-no-drag shrink-0"
              checked={webSearchEnabled}
              onCheckedChange={setWebSearchEnabled}
              disabled={ghosted}
              aria-label="Allow assistant web search"
            />
            <Label
              htmlFor="settings-ai-web-search"
              className={cn(
                "cursor-pointer text-sm font-normal text-foreground",
                ghosted && "cursor-not-allowed",
              )}
            >
              Web search (DuckDuckGo instant answers)
            </Label>
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground pl-9">
            Off by default. Feeds, bookmarks, and history stay local; web search
            only runs when the assistant calls it and this is on.
          </p>
        </div>

        <div
          className={cn(
            "space-y-3 rounded-md border border-border/80 bg-muted/20 p-3 transition-opacity",
            ghosted && "pointer-events-none opacity-50",
          )}
        >
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Provider</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-full justify-between font-normal"
                  disabled={ghosted}
                  aria-label="LLM provider"
                >
                  <span className="truncate">{providerLabel}</span>
                  <ChevronDown className="ml-2 size-4 shrink-0 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[min(24rem,calc(100vw-2rem))]"
                align="start"
              >
                <DropdownMenuRadioGroup
                  value={llm.provider}
                  onValueChange={(v) => setProvider(v as LlmProviderKind)}
                >
                  {PROVIDER_OPTIONS.map((o) => (
                    <DropdownMenuRadioItem key={o.value} value={o.value}>
                      {o.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ai-base-url" className="text-xs text-muted-foreground">
              Base URL
            </Label>
            <Input
              id="ai-base-url"
              value={llm.baseUrl}
              onChange={(e) =>
                setLlm((prev) => ({ ...prev, baseUrl: e.target.value }))
              }
              disabled={ghosted}
              placeholder="https://api.openai.com/v1"
              autoComplete="off"
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              For Ollama, try{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                http://127.0.0.1:11434/v1
              </code>
              . Gemini can leave this blank.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ai-api-key" className="text-xs text-muted-foreground">
              API key
            </Label>
            <Input
              id="ai-api-key"
              type="password"
              value={llm.apiKey}
              onChange={(e) =>
                setLlm((prev) => ({ ...prev, apiKey: e.target.value }))
              }
              disabled={ghosted}
              placeholder="Optional for some local servers"
              autoComplete="off"
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ai-model" className="text-xs text-muted-foreground">
              Model
            </Label>
            <Input
              id="ai-model"
              value={llm.model}
              onChange={(e) =>
                setLlm((prev) => ({ ...prev, model: e.target.value }))
              }
              disabled={ghosted}
              placeholder="Model id"
              autoComplete="off"
              className="font-mono text-xs"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
