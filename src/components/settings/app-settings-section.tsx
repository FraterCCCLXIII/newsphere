import {
  CalendarDots,
  CaretDown,
  Clock,
  DotsSixVertical,
  GridFour,
  Image,
  ImagesSquare,
  Plugs,
} from "@phosphor-icons/react";

import { useDisplayPreferences } from "@/components/display-preferences-provider";
import { TextScaleSlider } from "@/components/layout/text-scale-slider";
import { ThemeAppearanceSwitch } from "@/components/layout/theme-appearance-switch";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTextScale } from "@/components/text-scale-provider";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import type { PublishedDateFormatStyle } from "@/types/display-preferences";

const DATE_FORMAT_OPTIONS: {
  value: PublishedDateFormatStyle;
  label: string;
}[] = [
  {
    value: "relative",
    label: 'Relative — e.g. "3h", "Apr 12"',
  },
  {
    value: "absolute",
    label: 'Date & time — e.g. "Apr 16, 2026, 2:30 PM"',
  },
];

export function AppSettingsSection({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { textScale, setTextScale } = useTextScale();
  const {
    showTimestampsInline,
    setShowTimestampsInline,
    dateFormatStyle,
    setDateFormatStyle,
    showGridInsertionLines,
    setShowGridInsertionLines,
    allowGridReorder,
    setAllowGridReorder,
    hideBrokenFeeds,
    setHideBrokenFeeds,
    loadNetworkFavicons,
    setLoadNetworkFavicons,
    showFeedPreviewImages,
    setShowFeedPreviewImages,
  } = useDisplayPreferences();

  const dateFormatLabel =
    DATE_FORMAT_OPTIONS.find((o) => o.value === dateFormatStyle)?.label ?? "";

  return (
    <div className={cn("space-y-1 px-1 pb-3 pt-2", className)}>
      <ThemeAppearanceSwitch theme={theme} onThemeChange={setTheme} />
      <TextScaleSlider
        textScale={textScale}
        onTextScaleChange={setTextScale}
      />

      <div className="space-y-2 px-2 py-2">
        <div className="flex items-start gap-2">
          <Clock
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="settings-show-timestamps"
                className="flex-1 cursor-pointer text-sm font-normal text-foreground"
              >
                Show timestamps in lists
              </Label>
              <Switch
                id="settings-show-timestamps"
                className="app-no-drag shrink-0"
                checked={showTimestampsInline}
                onCheckedChange={setShowTimestampsInline}
                aria-label="Show timestamps in feed lists"
              />
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              The unified feed stream always shows timestamps (using Timestamp
              style below). When off, grid columns hide inline times; they still
              appear in the hover preview when available.
            </p>
          </div>
        </div>

        <div className="flex flex-nowrap items-center gap-2 pt-1">
          <CalendarDots
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <Label
            htmlFor="settings-date-format"
            className="min-w-0 flex-1 cursor-default truncate text-sm font-normal text-foreground"
          >
            Timestamp style
          </Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                id="settings-date-format"
                variant="outline"
                role="combobox"
                aria-label="Timestamp style"
                className={cn(
                  "app-no-drag flex h-9 min-w-0 max-w-[min(16rem,50vw)] shrink-0 justify-between gap-2 px-3 font-normal",
                )}
              >
                <span className="truncate text-left text-sm">{dateFormatLabel}</span>
                <CaretDown
                  className="size-4 shrink-0 opacity-50"
                  aria-hidden
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[var(--radix-popper-anchor-width)] max-w-[min(100vw-2rem,24rem)]"
            >
              <DropdownMenuRadioGroup
                value={dateFormatStyle}
                onValueChange={(v) =>
                  setDateFormatStyle(v as PublishedDateFormatStyle)
                }
              >
                {DATE_FORMAT_OPTIONS.map((o) => (
                  <DropdownMenuRadioItem key={o.value} value={o.value}>
                    {o.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-start gap-2 pt-1">
          <ImagesSquare
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="settings-feed-preview-images"
                className="flex-1 cursor-pointer text-sm font-normal text-foreground"
              >
                Show preview images
              </Label>
              <Switch
                id="settings-feed-preview-images"
                className="app-no-drag shrink-0"
                checked={showFeedPreviewImages}
                onCheckedChange={setShowFeedPreviewImages}
                aria-label="Show article preview images in Latest and on the grid"
              />
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              When on, the Latest stream shows thumbnails under each article;
              the home grid still uses hover previews. Turn off to save space or
              avoid loading images.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 border-t border-border pt-3">
          <GridFour
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="settings-grid-insertion-lines"
                className="flex-1 cursor-pointer text-sm font-normal text-foreground"
              >
                Show add-content guides on grid
              </Label>
              <Switch
                id="settings-grid-insertion-lines"
                className="app-no-drag shrink-0"
                checked={showGridInsertionLines}
                onCheckedChange={setShowGridInsertionLines}
                aria-label="Show dashed lines and plus controls to add feeds on the home grid"
              />
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              When on, the home grid shows lines between columns (and between
              rows) with a plus to add a feed or section. You can still add
              sources from Settings.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 border-t border-border pt-3">
          <DotsSixVertical
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="settings-grid-reorder"
                className="flex-1 cursor-pointer text-sm font-normal text-foreground"
              >
                Allow reorder on home grid
              </Label>
              <Switch
                id="settings-grid-reorder"
                className="app-no-drag shrink-0"
                checked={allowGridReorder}
                onCheckedChange={setAllowGridReorder}
                aria-label="Allow drag-and-drop reorder of feed columns and sections on the home grid"
              />
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              When on, the grip handles drag columns and section headers. When
              off, the grip still opens the column menu (remove). You can
              reorder from Settings anytime.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 border-t border-border pt-3">
          <Image
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="settings-load-network-favicons"
                className="flex-1 cursor-pointer text-sm font-normal text-foreground"
              >
                Load site icons from the network
              </Label>
              <Switch
                id="settings-load-network-favicons"
                className="app-no-drag shrink-0"
                checked={loadNetworkFavicons}
                onCheckedChange={setLoadNetworkFavicons}
                aria-label="Load feed column icons from third-party favicon services"
              />
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              When off (default), feed columns use the RSS placeholder. When on,
              icons may be fetched via external services and can reveal which
              sites you follow.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 border-t border-border pt-3">
          <Plugs
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="settings-hide-broken-feeds"
                className="flex-1 cursor-pointer text-sm font-normal text-foreground"
              >
                Hide feeds that fail to load
              </Label>
              <Switch
                id="settings-hide-broken-feeds"
                className="app-no-drag shrink-0"
                checked={hideBrokenFeeds}
                onCheckedChange={setHideBrokenFeeds}
                aria-label="Hide feed columns that failed to load on the home grid and unified feed"
              />
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              When on, sources that return an error are hidden from the grid and
              Latest stream. Turn off to see them and fix URLs in Settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
