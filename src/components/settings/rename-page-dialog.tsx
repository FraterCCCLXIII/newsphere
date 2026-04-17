import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GridPage } from "@/types/grid";

type RenamePageDialogProps = {
  page: GridPage | null;
  onDismiss: () => void;
  onSave: (pageId: string, name: string) => Promise<void>;
};

export function RenamePageDialog({
  page,
  onDismiss,
  onSave,
}: RenamePageDialogProps) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (page) setValue(page.name);
  }, [page]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!page || submitting) return;
    const name = value.trim();
    if (!name) return;
    setSubmitting(true);
    try {
      await onSave(page.id, name);
      onDismiss();
    } finally {
      setSubmitting(false);
    }
  }

  const open = page !== null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onDismiss();
      }}
    >
      <DialogContent className="app-no-drag sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename page</DialogTitle>
            <DialogDescription>
              Update the name shown in the app. Column contents are unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="rename-page-dialog-name">Page name</Label>
            <Input
              id="rename-page-dialog-name"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Page name"
              autoComplete="off"
              autoFocus
              disabled={submitting}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onDismiss}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !value.trim()}
            >
              {submitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
