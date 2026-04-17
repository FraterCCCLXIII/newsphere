import { useCallback, useMemo } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Bookmark,
  History,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  Menu,
  MoreVertical,
  Plus,
  Rows3,
  RefreshCw,
  Search,
  Settings,
} from "lucide-react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { isTauriRuntime } from "@/lib/tauri-env";
import { controlsOnLeft, isMac } from "@/lib/platform";
import { cn } from "@/lib/utils";
import type { GridPage } from "@/types/grid";

type TitleBarProps = {
  onRefresh: () => void;
  refreshing: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  pages: GridPage[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage: (name: string) => Promise<void>;
  onAddSourceClick: () => void;
};

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "app-no-drag flex size-9 shrink-0 items-center justify-center rounded-md transition-colors duration-150",
    "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground",
    isActive && "text-foreground",
  );

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "app-no-drag flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
    "focus:bg-accent focus:text-accent-foreground",
    isActive ? "bg-accent text-accent-foreground" : "",
  );

function shouldStartWindowDrag(target: EventTarget | null): boolean {
  if (!target || !isTauriRuntime()) return false;
  const el = target as HTMLElement;
  if (el.closest(".app-no-drag")) return false;
  if (el.closest("button, a[href], [role='button'], input, select, textarea")) {
    return false;
  }
  return true;
}

type SettingsThemeExtrasProps = {
  theme: ReturnType<typeof useTheme>["theme"];
  setTheme: ReturnType<typeof useTheme>["setTheme"];
  textScale: number;
  setTextScale: (n: number) => void;
  linkFromReader: (to: string) => (e: React.MouseEvent<HTMLAnchorElement>) => void;
};

function SettingsThemeExtras({
  theme,
  setTheme,
  textScale,
  setTextScale,
  linkFromReader,
}: SettingsThemeExtrasProps) {
  return (
    <>
      <DropdownMenuItem asChild>
        <Link
          to="/settings"
          onClick={linkFromReader("/settings")}
          className="flex w-full cursor-pointer items-center gap-2"
        >
          <Settings
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          Settings
        </Link>
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
  onRefresh,
  refreshing,
  searchValue,
  onSearchChange,
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onAddSourceClick,
}: TitleBarProps) {
  const showControls = isTauriRuntime();
  const mac = controlsOnLeft();
  const location = useLocation();
  const navigate = useNavigate();
  const settingsActive =
    location.pathname === "/settings" ||
    location.pathname.startsWith("/settings/");
  const { theme, setTheme } = useTheme();
  const { textScale, setTextScale } = useTextScale();
  const { goBack, goForward, canGoBack, canGoForward } =
    useHistoryNavigation();

  const { backButtonTitle, forwardButtonTitle } = useMemo(() => {
    if (isMac()) {
      return {
        backButtonTitle: "Back — ⌘[",
        forwardButtonTitle: "Forward — ⌘]",
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
      linkFromReader={linkFromReader}
    />
  );

  const desktopNav = (
    <nav className="hidden h-full items-center gap-0.5 bg-muted/20 px-1 py-0 dark:bg-muted/10 lg:flex">
      <NavLink
        to="/"
        end
        className={navClass}
        title="Grid"
        aria-label="Grid"
        onClick={linkFromReader("/")}
      >
        <Grid3x3 className="size-4 shrink-0" aria-hidden />
        <span className="sr-only">Grid</span>
      </NavLink>
      <NavLink
        to="/feed"
        className={navClass}
        title="Latest feed"
        aria-label="Latest feed"
        onClick={linkFromReader("/feed")}
      >
        <Rows3 className="size-4 shrink-0" aria-hidden />
        <span className="sr-only">Latest feed</span>
      </NavLink>
      <NavLink
        to="/bookmarks"
        className={navClass}
        title="Bookmarks"
        aria-label="Bookmarks"
        onClick={linkFromReader("/bookmarks")}
      >
        <Bookmark className="size-4 shrink-0" aria-hidden />
        <span className="sr-only">Bookmarks</span>
      </NavLink>
      <NavLink
        to="/history"
        className={navClass}
        title="Reading history"
        aria-label="Reading history"
        onClick={linkFromReader("/history")}
      >
        <History className="size-4 shrink-0" aria-hidden />
        <span className="sr-only">History</span>
      </NavLink>
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
        <RefreshCw
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
              settingsActive && "text-foreground",
            )}
            title="More options"
            aria-label="More options"
            aria-haspopup="menu"
          >
            <MoreVertical className="size-4 shrink-0" aria-hidden />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="app-no-drag w-64"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
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
          <Menu className="size-5 shrink-0" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="app-no-drag w-64"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuItem asChild>
          <NavLink
            to="/"
            end
            className={mobileNavLinkClass}
            onClick={linkFromReader("/")}
          >
            <Grid3x3 className="size-4 shrink-0 text-muted-foreground" />
            Grid
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <NavLink
            to="/feed"
            className={mobileNavLinkClass}
            onClick={linkFromReader("/feed")}
          >
            <Rows3 className="size-4 shrink-0 text-muted-foreground" />
            Latest feed
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <NavLink
            to="/bookmarks"
            className={mobileNavLinkClass}
            onClick={linkFromReader("/bookmarks")}
          >
            <Bookmark className="size-4 shrink-0 text-muted-foreground" />
            Bookmarks
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <NavLink
            to="/history"
            className={mobileNavLinkClass}
            onClick={linkFromReader("/history")}
          >
            <History className="size-4 shrink-0 text-muted-foreground" />
            History
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(e) => {
            e.preventDefault();
            onRefresh();
          }}
        >
          <RefreshCw
            className={cn(
              "mr-2 size-4 shrink-0 text-muted-foreground",
              refreshing && "animate-spin",
            )}
            aria-hidden
          />
          Refresh feeds
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
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        if (!shouldStartWindowDrag(e.target)) return;
        void getCurrentWindow().startDragging();
      }}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 px-2 py-2 md:h-full md:flex-row md:items-center md:gap-3 md:py-0 md:pl-2 md:pr-3">
        <div className="flex min-w-0 items-center justify-between gap-2 md:contents">
          <div className="flex min-w-0 flex-1 cursor-default items-center gap-2 md:order-1 md:shrink-0 md:flex-none">
            {showControls && mac ? <WindowControls /> : null}
            <Link
              to="/"
              onClick={linkFromReader("/")}
              className={cn(
                "app-no-drag inline-flex size-8 shrink-0 items-center justify-center rounded-md outline-none",
                "[-webkit-tap-highlight-color:transparent]",
                "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              )}
              aria-label="Newsphere — go to grid"
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

          <div className="flex min-w-0 shrink-0 items-center justify-end gap-0.5 md:order-3">
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

        <div className="flex min-w-0 w-full items-center gap-0.5 md:order-2 md:flex-1 md:justify-center">
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
              <ChevronLeft className="size-4 shrink-0" aria-hidden />
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
              <ChevronRight className="size-4 shrink-0" aria-hidden />
            </Button>
          </div>
          <div className="relative min-w-0 w-full max-w-full md:max-w-[min(28rem,calc(100%-14rem))] lg:max-w-xl">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 z-[1] size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
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
      </div>

    </header>
  );
}
