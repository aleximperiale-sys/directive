import { NavLink } from "react-router-dom";
import { Command, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import { useApprovals } from "@/hooks/useApprovals";

/** Left navigation rail (spec: 224–264px). */
export function Sidebar({ onOpenCommand }: { onOpenCommand: () => void }) {
  const { data: approvals } = useApprovals();

  return (
    <aside
      className="flex w-[var(--nav,240px)] shrink-0 flex-col border-r border-border bg-surface"
      aria-label="Primary"
    >
      <div className="flex h-14 items-center gap-2 px-4">
        <span className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Zap className="size-4" aria-hidden />
        </span>
        <span className="text-sm font-semibold tracking-tight">Directive</span>
      </div>

      <button
        type="button"
        onClick={onOpenCommand}
        className="mx-3 mb-2 flex items-center justify-between rounded-md border border-border bg-surface-hover/50 px-2.5 py-1.5 text-2xs text-foreground-muted transition-colors hover:bg-surface-hover"
      >
        <span className="flex items-center gap-1.5">
          <Command className="size-3" aria-hidden />
          Search or jump to…
        </span>
        <kbd className="rounded border border-border bg-surface px-1 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const badgeCount =
            item.to === "/approvals" ? (approvals?.length ?? 0) : 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-surface-hover text-foreground"
                    : "text-foreground-muted hover:bg-surface-hover/60 hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      isActive ? "text-accent" : "text-foreground-muted",
                    )}
                    aria-hidden
                  />
                  <span className="flex-1">{item.label}</span>
                  {badgeCount > 0 && (
                    <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                      {badgeCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-border p-3 text-[10px] text-foreground-muted">
        Service Operations · MVP
      </div>
    </aside>
  );
}
