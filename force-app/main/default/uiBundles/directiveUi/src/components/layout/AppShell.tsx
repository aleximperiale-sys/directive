import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ContextPanel } from "./ContextPanel";
import { CommandPalette } from "@/components/navigation/CommandPalette";
import { usePreferences } from "@/design-system/store";

const TITLES: Record<string, string> = {
  today: "Today",
  work: "Work",
  customers: "Customers",
  approvals: "Approvals",
  "ai-activity": "AI Activity",
  insights: "Insights",
  settings: "Settings",
};

function titleForPath(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean)[0] ?? "today";
  return TITLES[segment] ?? "Directive";
}

/**
 * Three-pane application shell: left nav rail, flexible main column
 * (topbar + routed content), and a collapsible right context panel.
 */
export function AppShell() {
  const location = useLocation();
  const contextPanelOpen = usePreferences((s) => s.contextPanelOpen);
  const [commandOpen, setCommandOpen] = useState(false);

  // Global ⌘K / Ctrl-K to open the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar onOpenCommand={() => setCommandOpen(true)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={titleForPath(location.pathname)}
          onOpenCommand={() => setCommandOpen(true)}
        />
        <main className="min-h-0 flex-1 overflow-y-auto" id="main-content">
          <Outlet />
        </main>
      </div>

      <ContextPanel open={contextPanelOpen} />

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
