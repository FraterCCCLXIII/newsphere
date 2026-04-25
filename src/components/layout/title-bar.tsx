import { useCallback, useMemo, type RefObject } from "react";
import {
  ArrowsClockwise,
  BookmarkSimple,
  CaretLeft,
  CaretRight,
  ClockCounterClockwise,
  DotsThreeVertical,
  Gear,
  GridNine,
  Hamburger,
  Keyboard,
  MagnifyingGlass,
  Plus,
  Rows,
  StarFour,
} from "@phosphor-icons/react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { useHistoryNavigation } from "@/hooks/use-history-navigation";
import { AppMark } from "@/components/icons/app-mark";
import { PageSwitcher } from "@/components/layout/page-switcher";
import { WindowControls } from "@/components/layout/window-controls";
import { TextScaleSlider } from "@/components/layout/text-scale-slider";
import { ThemeAppearanceSwitch } from "@/components/layout/theme-appearance-switch";
import { useTextScale } from "@/components/text-scale-provider";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { KbdBadge } from "@/components/ui/kbd-badge";
import { APP_DISPLAY_NAME } from "@/lib/app-metadata";
import { getMenuKeyHints } from "@/lib/menu-key-hints";
import { isTauriRuntime } from "@/lib/tauri-env";
import { MAC_CMD_GAP } from "@/lib/mac-cmd-gap";
import { controlsOnLeft, isMac } from "@/lib/platform";
import { cn } from "@/lib/utils";
import type { GridPage } from "@/types/grid";

export type AiAssistantTitleBarProps = {
  drawerOpen: boolean;
  onToggle: () => void;
};

export type TitleBarProps = {
  searchInputRef: RefObject<HTMLInputElement | null>;
  onOpenKeyboardShortcuts: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  pages: GridPage[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage: (name: string) => Promise<void>;
  onAddSourceClick: () => void;
  /** When set, shows the AI assistant toggle next to the app mark. */
  aiAssistant?: AiAssistantTitleBarProps;
};

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "app-no-drag flex size-9 shrink-0 items-center justify-center rounded-md transition-colors duration-150",
    "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground",
    isActive && "text-foreground",
  );

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "app-no-drag flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
    "focus:bg-accent focus:text-accent-foreground",
    isActive ? "bg-accent text-accent-foreground" : "",
  );

type SettingsThemeExtrasProps = {
  theme: ReturnType<typeof useTheme>["theme"];
  setTheme: ReturnType<typeof useTheme>["setTheme"];
  textScale: number;
  setTextScale: (n: number) => void;
  onOpenKeyboardShortcuts: () => void;
  keyHints: ReturnType<typeof getMenuKeyHints>;
};

function SettingsThemeExtras({
  theme,
  setTheme,
  textScale,
  setTextScale,
  onOpenKeyboardShortcuts,
  keyHints,
}: SettingsThemeExtrasProps) {
  return (
    <>
      <DropdownMenuItem
        className="flex cursor-pointer items-center gap-2"
        onSelect={() => onOpenKeyboardShortcuts()}
      >
        <Keyboard
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <span className="min-w-0 flex-1">Keyboard shortcuts</span>
        <KbdBadge className="text-muted-foreground">{keyHints.shortcuts}</KbdBadge>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <ThemeAppearanceSwitch theme={theme} onThemeChange={setTheme} />
      <DropdownMenuSeparator />
      <TextScaleSlider
        textScale={textScale}
        onTextScaleChange={setTextScale}
      />
    </>
  );
}

export function TitleBar({
  searchInputRef,
  onOpenKeyboardShortcuts,
  onRefresh,
  refreshing,
  searchValue,
  onSearchChange,
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onAddSourceClick,
  aiAssistant,
}: TitleBarProps) {
  const showControls = isTauriRuntime();
  const mac = controlsOnLeft();
  const location = useLocation();
  const navigate = useNavigate();
  const settingsActive =
    location.pathname === "/settings" ||
    location.pathname.startsWith("/settings/");
  const moreMenuPageActive =
    settingsActive ||
    location.pathname === "/bookmarks" ||
    location.pathname === "/history";
  const { theme, setTheme } = useTheme();
  const { textScale, setTextScale } = useTextScale();
  const { goBack, goForward, canGoBack, canGoForward } =
    useHistoryNavigation();

  const keyHints = useMemo(() => getMenuKeyHints(), []);

  const { backButtonTitle, forwardButtonTitle } = useMemo(() => {
    if (isMac()) {
      return {
        backButtonTitle: `Back — ⌘${MAC_CMD_GAP}[`,
        forwardButtonTitle: `Forward — ⌘${MAC_CMD_GAP}]`,
      };
    }
    return {
      backButtonTitle: "Back — Alt+←",
      forwardButtonTitle: "Forward — Alt+→",
    };
  }, []);

  const linkFromReader = useCallback(
    (to: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (location.pathname !== "/reader") return;
      e.preventDefault();
      navigate(to, { replace: true });
    },
    [location.pathname, navigate],
  );

  const extras = (
    <SettingsThemeExtras
      theme={theme}
      setTheme={setTheme}
      textScale={textScale}
      setTextScale={setTextScale}
      onOpenKeyboardShortcuts={onOpenKeyboardShortcuts}
      keyHints={keyHints}
    />
  );

  const desktopNav = (
    <nav
      data-tauri-drag-region="false"
      className="app-no-drag hidden h-full items-center gap-0.5 px-1 py-0 lg:flex"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <NavLink
        to="/"
        end
        className={navClass}
        title="Grid"
        aria-label="Grid"
        onClick={linkFromReader("/")}
      >
        <GridNine className="size-4 shrink-0" aria-hidden />
        <span className="sr-only">Grid</span>
      </NavLink>
      <NavLink
        to="/feed"
        className={navClass}
        title="Latest feed"
        aria-label="Latest feed"
        onClick={linkFromReader("/feed")}
      >
        <Rows className="size-4 shrink-0" aria-hidden />
        <span className="sr-only">Latest feed</span>
      </NavLink>
      {aiAssistant ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          data-tauri-drag-region="false"
          className={cn(
            "app-no-drag size-9 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            aiAssistant.drawerOpen && "text-foreground",
          )}
          aria-pressed={aiAssistant.drawerOpen}
          aria-label="AI assistant"
          title="AI assistant"
          onClick={() => aiAssistant.onToggle()}
        >
          <StarFour className="size-4 shrink-0" aria-hidden />
          <span className="sr-only">AI assistant</span>
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="app-no-drag size-9 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        title="Add source from catalog"
        aria-label="Add source from catalog"
        onClick={onAddSourceClick}
      >
        <Plus className="size-4 shrink-0" aria-hidden />
        <span className="sr-only">Add source</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="app-no-drag size-9 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        onClick={onRefresh}
        disabled={refreshing}
        title="Refresh grid and RSS feeds"
        aria-label="Refresh grid and feeds"
      >
        <ArrowsClockwise
          className={cn("size-4 shrink-0", refreshing && "animate-spin")}
        />
      </Button>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "app-no-drag size-9 text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground",
              moreMenuPageActive && "text-foreground",
            )}
            title="More options"
            aria-label="More options"
            aria-haspopup="menu"
          >
            <DotsThreeVertical className="size-4 shrink-0" aria-hidden />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="app-no-drag min-w-[16rem]"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DropdownMenuItem asChild>
            <NavLink
              to="/bookmarks"
              onClick={linkFromReader("/bookmarks")}
              className={({ isActive }) =>
                cn(
                  "flex w-full cursor-pointer items-center gap-2",
                  isActive && "font-medium text-foreground",
                )
              }
            >
              <BookmarkSimple
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="min-w-0 flex-1">Bookmarks</span>
              <KbdBadge className="text-muted-foreground">{keyHints.bookmarks}</KbdBadge>
            </NavLink>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <NavLink
              to="/history"
              onClick={linkFromReader("/history")}
              className={({ isActive }) =>
                cn(
                  "flex w-full cursor-pointer items-center gap-2",
                  isActive && "font-medium text-foreground",
                )
              }
            >
              <ClockCounterClockwise
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="min-w-0 flex-1">Reading history</span>
              <KbdBadge className="text-muted-foreground">{keyHints.history}</KbdBadge>
            </NavLink>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <NavLink
              to="/settings"
              onClick={linkFromReader("/settings")}
              className={({ isActive }) =>
                cn(
                  "flex w-full cursor-pointer items-center gap-2",
                  isActive && "font-medium text-foreground",
                )
              }
            >
              <Gear
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="min-w-0 flex-1">Settings</span>
              <KbdBadge className="text-muted-foreground">{keyHints.settings}</KbdBadge>
            </NavLink>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {extras}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );

  const mobileMenu = (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="app-no-drag size-9 text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground lg:hidden"
          aria-label="Open navigation menu"
          aria-haspopup="menu"
        >
          <Hamburger className="size-5 shrink-0" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="app-no-drag min-w-[16rem]"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuItem asChild>
          <NavLink
            to="/"
            end
            className={mobileNavLinkClass}
            onClick={linkFromReader("/")}
          >
            <GridNine className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">Grid</span>
            <KbdBadge className="text-muted-foreground">{keyHints.grid}</KbdBadge>
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <NavLink
            to="/feed"
            className={mobileNavLinkClass}
            onClick={linkFromReader("/feed")}
          >
            <Rows className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">Latest feed</span>
            <KbdBadge className="text-muted-foreground">{keyHints.feed}</KbdBadge>
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="app-no-drag">
            <BookmarkSimple
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            Library
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className="app-no-drag w-48"
            sideOffset={4}
            alignOffset={-4}
          >
            <DropdownMenuItem asChild>
              <NavLink
                to="/bookmarks"
                className={mobileNavLinkClass}
                onClick={linkFromReader("/bookmarks")}
              >
                <BookmarkSimple className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">Bookmarks</span>
                <KbdBadge className="text-muted-foreground">{keyHints.bookmarks}</KbdBadge>
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <NavLink
                to="/history"
                className={mobileNavLinkClass}
                onClick={linkFromReader("/history")}
              >
                <ClockCounterClockwise className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">Reading history</span>
                <KbdBadge className="text-muted-foreground">{keyHints.history}</KbdBadge>
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <NavLink
                to="/settings"
                className={mobileNavLinkClass}
                onClick={linkFromReader("/settings")}
              >
                <Gear
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="min-w-0 flex-1">Settings</span>
                <KbdBadge className="text-muted-foreground">{keyHints.settings}</KbdBadge>
              </NavLink>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {aiAssistant ? (
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2"
            onSelect={() => {
              aiAssistant.onToggle();
            }}
          >
            <StarFour
              className={cn(
                "size-4 shrink-0 text-muted-foreground",
                aiAssistant.drawerOpen && "text-foreground",
              )}
              aria-hidden
            />
            <span className="min-w-0 flex-1">AI assistant</span>
            <KbdBadge className="text-muted-foreground">{keyHints.ai}</KbdBadge>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          className="flex cursor-pointer items-center gap-2"
          onSelect={(e) => {
            e.preventDefault();
            onRefresh();
          }}
        >
          <ArrowsClockwise
            className={cn(
              "size-4 shrink-0 text-muted-foreground",
              refreshing && "animate-spin",
            )}
            aria-hidden
          />
          <span className="min-w-0 flex-1">Refresh feeds</span>
          <KbdBadge className="text-muted-foreground">{keyHints.refresh}</KbdBadge>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {extras}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header
      data-tauri-drag-region
      className="titlebar app-drag-region flex min-h-11 h-auto shrink-0 cursor-default items-stretch border-b border-border bg-background/95 md:h-11"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 px-2 py-2 md:h-full md:flex-row md:items-center md:gap-3 md:py-0 md:pl-2 md:pr-3">
        <div className="flex min-w-0 w-full items-center gap-2 md:contents">
          <div
            className="app-no-drag flex min-w-0 shrink-0 cursor-default items-center gap-2 md:order-1 md:flex-none"
            data-tauri-drag-region="false"
          >
            {showControls && mac ? <WindowControls /> : null}
            <Link
              to="/"
              onClick={linkFromReader("/")}
              className={cn(
                "app-no-drag inline-flex size-8 shrink-0 items-center justify-center rounded-md outline-none",
                "[-webkit-tap-highlight-color:transparent]",
                "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              )}
              aria-label={`${APP_DISPLAY_NAME} — go to grid`}
              title="Grid"
            >
              <AppMark className="size-7 shrink-0" />
            </Link>
            <PageSwitcher
              pages={pages}
              activePageId={activePageId}
              onSelectPage={onSelectPage}
              onAddPage={onAddPage}
            />
          </div>

          <div
            className="app-drag-region min-h-9 min-w-6 flex-1 md:hidden"
            data-tauri-drag-region
            aria-hidden
          />

          <div
            className="app-no-drag relative z-20 flex min-w-0 shrink-0 items-center justify-end gap-0.5 md:order-5"
            data-tauri-drag-region="false"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="app-no-drag size-9 text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden"
              title="Add source from catalog"
              aria-label="Add source from catalog"
              onClick={onAddSourceClick}
            >
              <Plus className="size-4 shrink-0" aria-hidden />
              <span className="sr-only">Add source</span>
            </Button>
            {mobileMenu}
            {desktopNav}
            {showControls && !mac ? <WindowControls /> : null}
          </div>
        </div>

        <div
          className="app-drag-region hidden min-h-9 min-w-4 shrink-0 md:order-2 md:block md:flex-[0.7]"
          data-tauri-drag-region
          aria-hidden
        />

        <div
          className="app-no-drag relative z-0 flex min-w-0 flex-1 items-center gap-0.5 md:order-3 md:flex-[1.6]"
          data-tauri-drag-region="false"
        >
          <div className="flex shrink-0 items-center gap-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "app-no-drag size-9 text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground",
                !canGoBack && "pointer-events-none opacity-40",
              )}
              disabled={!canGoBack}
              title={backButtonTitle}
              aria-label="Go back"
              onClick={() => {
                void goBack();
              }}
            >
              <CaretLeft className="size-4 shrink-0" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "app-no-drag size-9 text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground",
                !canGoForward && "pointer-events-none opacity-40",
              )}
              disabled={!canGoForward}
              title={forwardButtonTitle}
              aria-label="Go forward"
              onClick={() => {
                void goForward();
              }}
            >
              <CaretRight className="size-4 shrink-0" aria-hidden />
            </Button>
          </div>
          <div className="relative min-w-0 flex-1 md:min-w-[12rem]">
            <MagnifyingGlass
              className="pointer-events-none absolute left-2.5 top-1/2 z-[1] size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              ref={searchInputRef}
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search articles…"
              autoComplete="off"
              aria-label="Search articles"
              className="app-no-drag h-9 w-full min-w-0 bg-muted/50 pl-8 text-sm shadow-none placeholder:text-muted-foreground/80 sm:h-8 dark:bg-muted/30"
            />
          </div>
        </div>

        <div
          className="app-drag-region hidden min-h-9 min-w-4 shrink-0 md:order-4 md:block md:flex-[0.7]"
          data-tauri-drag-region
          aria-hidden
        />
      </div>

    </header>
  );
}
