import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { useOutletContext } from "react-router-dom";

import { AppSettingsSection } from "@/components/settings/app-settings-section";
import { AiToolsSettingsSection } from "@/components/settings/ai-tools-settings-section";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SettingsOutletContext } from "@/types/settings-outlet";

export function SettingsAppPage() {
  const { resetLayoutToDefaults, refetchFeeds } =
    useOutletContext<SettingsOutletContext>();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleConfirmReset = async () => {
    setResetting(true);
    try {
      await resetLayoutToDefaults();
      await refetchFeeds();
      setResetDialogOpen(false);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 pb-16">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        App
      </h1>
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <AppSettingsSection className="p-0" />
      </div>

      <AiToolsSettingsSection />

      <section
        className="rounded-lg border border-border bg-card p-4 shadow-sm"
        aria-labelledby="settings-app-reset-layout-heading"
      >
        <h2
          id="settings-app-reset-layout-heading"
          className="text-sm font-medium text-foreground"
        >
          Grid layout
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Restore the built-in default pages, section headers, and feeds (from
          the app bundle). This replaces your current layout and cannot be
          undone.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4 gap-1.5 text-muted-foreground hover:text-destructive"
          onClick={() => setResetDialogOpen(true)}
        >
          <RotateCcw className="size-4" aria-hidden />
          Reset to default layout
        </Button>
      </section>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="app-no-drag sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset to default layout?</DialogTitle>
            <DialogDescription>
              This replaces all pages, section headers, and feeds with the
              app&apos;s built-in default (News, Tech, Business, Science, and
              Culture). Your current layout cannot be recovered.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetDialogOpen(false)}
              disabled={resetting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmReset()}
              disabled={resetting}
            >
              {resetting ? "Resetting…" : "Reset layout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
