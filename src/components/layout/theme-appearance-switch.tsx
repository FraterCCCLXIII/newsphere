import * as SwitchPrimitives from "@radix-ui/react-switch";
import { Moon, Palette, Sun } from "@phosphor-icons/react";

import type { Theme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

type ThemeAppearanceSwitchProps = {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
};

export function ThemeAppearanceSwitch({
  theme,
  onThemeChange,
}: ThemeAppearanceSwitchProps) {
  const dark = theme === "dark";

  return (
    <div className="flex items-center gap-2 px-2 py-2">
      <Palette className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1 text-sm text-foreground">Appearance</span>
      <SwitchPrimitives.Root
        checked={dark}
        onCheckedChange={(v) => onThemeChange(v ? "dark" : "light")}
        className={cn(
          "app-no-drag inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        )}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        <SwitchPrimitives.Thumb
          className={cn(
            "pointer-events-none flex size-4 items-center justify-center rounded-full bg-background shadow-lg ring-0 transition-transform",
            "data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
          )}
        >
          {dark ? (
            <Moon className="size-2.5 text-foreground" aria-hidden />
          ) : (
            <Sun className="size-2.5 text-foreground" aria-hidden />
          )}
        </SwitchPrimitives.Thumb>
      </SwitchPrimitives.Root>
    </div>
  );
}
