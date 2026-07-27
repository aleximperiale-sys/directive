import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/settings", label: "Preferences", end: true },
  { to: "/settings/rules", label: "Rules" },
  { to: "/settings/personas", label: "Personas" },
  { to: "/settings/actions", label: "Actions" },
  { to: "/settings/scoring", label: "Scoring" },
  { to: "/settings/permissions", label: "Permissions" },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-foreground-muted">
          Your preferences and the configuration that drives Directive.
        </p>
      </header>

      <nav
        className="flex flex-wrap gap-1 border-b border-border"
        aria-label="Settings sections"
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-accent text-foreground"
                  : "border-transparent text-foreground-muted hover:text-foreground",
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
