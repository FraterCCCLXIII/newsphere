import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KbdBadge } from "@/components/ui/kbd-badge";
import { KEYBOARD_SHORTCUT_HELP_ROWS } from "@/lib/keyboard-shortcut-help";
import { MAC_CMD_GAP } from "@/lib/mac-cmd-gap";
import { isMac } from "@/lib/platform";

type KeyboardShortcutsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const dialogKbdClass = "text-foreground shadow-sm";

function splitChord(label: string): string[] {
  return label.split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean);
}

function ChordRow({ label }: { label: string }) {
  const parts = splitChord(label);
  if (parts.length <= 1) {
    return <KbdBadge className={dialogKbdClass}>{label}</KbdBadge>;
  }
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {parts.map((p) => (
        <KbdBadge key={p} className={dialogKbdClass}>
          {p}
        </KbdBadge>
      ))}
    </span>
  );
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  const mac = isMac();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-no-drag max-h-[min(90vh,32rem)] max-w-2xl gap-0 overflow-hidden p-0 sm:rounded-lg">
        <DialogHeader className="border-b border-border px-6 py-4 text-left">
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription className="text-left">
            Shortcuts apply when a text field is not focused (except{" "}
            <ChordRow label={mac ? `⌘${MAC_CMD_GAP}K` : "Ctrl+K"} />, which
            always opens this panel).
          </DialogDescription>
        </DialogHeader>
        <div
          className="max-h-[min(70vh,24rem)] overflow-y-auto overscroll-contain px-6 py-3"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Action</th>
                <th className="pb-2 pr-2 font-medium">
                  {mac ? "Mac" : "Windows / Linux"}
                </th>
              </tr>
            </thead>
            <tbody>
              {KEYBOARD_SHORTCUT_HELP_ROWS.map((row) => (
                <tr
                  key={row.action}
                  className="border-b border-border/80 last:border-0"
                >
                  <td className="py-2.5 pr-4 align-middle text-foreground">
                    {row.action}
                  </td>
                  <td className="py-2.5 align-middle">
                    {row.plain ? (
                      <KbdBadge className={dialogKbdClass}>
                        {mac ? row.mac : row.windowsLinux}
                      </KbdBadge>
                    ) : (
                      <ChordRow label={mac ? row.mac : row.windowsLinux} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
            The AI assistant shortcut only works when AI tools are enabled in
            Settings → App.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
