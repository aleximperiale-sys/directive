import { Monitor, Moon, Sun, Search, Rows3, Rows4, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePreferences, type ThemeMode } from "@/design-system/store";
import { CURRENT_USER } from "@/lib/constants";
import { initials } from "@/lib/format";

const THEME_ICON: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

export function Topbar({
  title,
  onOpenCommand,
}: {
  title: string;
  onOpenCommand: () => void;
}) {
  const { theme, setTheme, density, setDensity, toggleContextPanel } =
    usePreferences();
  const ThemeIcon = THEME_ICON[theme];

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/80 px-5 backdrop-blur">
      <h1 className="text-sm font-semibold tracking-tight">{title}</h1>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onOpenCommand}
              aria-label="Open command palette"
            >
              <Search />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Search (⌘K)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                setDensity(density === "comfortable" ? "compact" : "comfortable")
              }
              aria-label={`Density: ${density}. Toggle.`}
            >
              {density === "comfortable" ? <Rows3 /> : <Rows4 />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {density === "comfortable" ? "Comfortable" : "Compact"} density
          </TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Theme">
                  <ThemeIcon />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Theme</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setTheme("light")}>
              <Sun /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTheme("dark")}>
              <Moon /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTheme("system")}>
              <Monitor /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleContextPanel}
              aria-label="Toggle context panel"
            >
              <PanelRight />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Context panel</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="ml-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--focus-ring))]"
              aria-label="Account menu"
            >
              <Avatar>
                <AvatarFallback>{initials(CURRENT_USER.name)}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[12rem]">
            <DropdownMenuLabel>{CURRENT_USER.name}</DropdownMenuLabel>
            <div className="px-2 pb-1 text-2xs text-foreground-muted">
              {CURRENT_USER.role}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Preferences</DropdownMenuItem>
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
