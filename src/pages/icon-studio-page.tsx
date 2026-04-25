import { Download, ImageIcon, Loader2, Save, Upload } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { APP_DISPLAY_NAME } from "@/lib/app-metadata";
import { isTauriRuntime } from "@/lib/tauri-env";
import { cn } from "@/lib/utils";

const PREVIEW_SIZES = [32, 64, 128, 256] as const;

function useSvgPreviewBlob(svg: string) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const t = svg.trim();
    if (!t) {
      setUrl(null);
      return;
    }
    const blob = new Blob([t], { type: "image/svg+xml;charset=utf-8" });
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => {
      URL.revokeObjectURL(u);
    };
  }, [svg]);

  return url;
}

export function IconStudioPage() {
  const fileInputId = useId();
  const [svg, setSvg] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const previewUrl = useSvgPreviewBlob(svg);

  const loadFromServer = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/app-icon.svg?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSvg(await res.text());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load icon");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFromServer();
  }, [loadFromServer]);

  const dirty = useMemo(() => svg.trim().length > 0, [svg]);

  const handleSaveProject = useCallback(async () => {
    if (!dirty) return;
    setStatus(null);
    setSaving(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("save_app_icon_svg", { contents: svg });
      setStatus("Saved to public/app-icon.svg. Run npm run icons to regenerate platform icons.");
    } catch (e) {
      setStatus(
        e instanceof Error
          ? e.message
          : "Save failed. Use Download and copy the file into public/ manually.",
      );
    } finally {
      setSaving(false);
    }
  }, [dirty, svg]);

  const handleDownload = useCallback(() => {
    if (!dirty) return;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "app-icon.svg";
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus("Download started (app-icon.svg).");
  }, [dirty, svg]);

  const handlePickFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      if (!f) return;
      void f.text().then(setSvg).catch(() => {
        setStatus("Could not read file.");
      });
    },
    [],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 pb-16">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <ImageIcon className="size-7 shrink-0 text-muted-foreground" aria-hidden />
          Icon Studio
        </h1>
        <p className="text-sm text-muted-foreground">
          Edit the source SVG for the {APP_DISPLAY_NAME} app icon. Saving
          updates{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            public/app-icon.svg
          </code>{" "}
          (desktop app only). Then run{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            npm run icons
          </code>{" "}
          to regenerate PNG/ICNS/ICO for Tauri bundles.
        </p>
      </div>

      {loadError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        <div className="space-y-2">
          <Label htmlFor="icon-svg" className="text-sm font-medium">
            SVG source
          </Label>
          <textarea
            id="icon-svg"
            value={svg}
            onChange={(e) => setSvg(e.target.value)}
            placeholder="<svg xmlns=…>…</svg>"
            disabled={loading}
            spellCheck={false}
            className={cn(
              "min-h-[min(50vh,24rem)] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs leading-relaxed shadow-sm",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void loadFromServer()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Reload from project
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              asChild
            >
              <label htmlFor={fileInputId} className="cursor-pointer">
                <Upload className="size-4" aria-hidden />
                Open file…
              </label>
            </Button>
            <input
              id={fileInputId}
              type="file"
              accept=".svg,image/svg+xml"
              className="sr-only"
              onChange={handlePickFile}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleDownload}
              disabled={!dirty || loading}
            >
              <Download className="size-4" aria-hidden />
              Download
            </Button>
            {isTauriRuntime() ? (
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                onClick={() => void handleSaveProject()}
                disabled={!dirty || loading || saving}
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="size-4" aria-hidden />
                )}
                Save to project
              </Button>
            ) : null}
          </div>
          {!isTauriRuntime() ? (
            <p className="text-xs text-muted-foreground">
              In the browser, use <strong>Download</strong> and replace{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                public/app-icon.svg
              </code>{" "}
              locally, then run <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">npm run icons</code>.
            </p>
          ) : null}
          {status ? (
            <p className="text-sm text-muted-foreground">{status}</p>
          ) : null}
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-medium text-foreground">Preview</h2>
          {!previewUrl ? (
            <p className="text-xs text-muted-foreground">No valid SVG yet.</p>
          ) : (
            <ul className="space-y-4">
              {PREVIEW_SIZES.map((size) => (
                <li
                  key={size}
                  className="flex items-center gap-3 border-b border-border/60 pb-3 last:border-b-0 last:pb-0"
                >
                  <span className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">
                    {size}×{size}
                  </span>
                  <div
                    className={cn(
                      "flex shrink-0 items-center justify-center rounded-md border border-border bg-muted/40",
                      "ring-1 ring-border",
                    )}
                    style={{ width: size, height: size }}
                  >
                    <img
                      src={previewUrl}
                      alt=""
                      width={size}
                      height={size}
                      className="max-h-full max-w-full"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
