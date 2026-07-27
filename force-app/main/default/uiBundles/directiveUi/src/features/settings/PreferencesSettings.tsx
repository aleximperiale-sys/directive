import { Monitor, Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  usePreferences,
  type Density,
  type ThemeMode,
} from "@/design-system/store";
import { QUEUE_VIEWS } from "@/lib/constants";

const THEMES: { value: ThemeMode; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function PreferencesSettings() {
  const theme = usePreferences((s) => s.theme);
  const setTheme = usePreferences((s) => s.setTheme);
  const density = usePreferences((s) => s.density);
  const setDensity = usePreferences((s) => s.setDensity);
  const defaultView = usePreferences((s) => s.defaultView);
  const setDefaultView = usePreferences((s) => s.setDefaultView);

  return (
    <div className="space-y-6">
      <Row
        title="Theme"
        description="Choose light, dark, or match your operating system."
      >
        <div className="flex gap-1.5">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-pressed={theme === value}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-2xs font-medium transition-colors",
                theme === value
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-foreground-muted hover:bg-surface-hover",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </Row>

      <Row
        title="Density"
        description="Compact tightens vertical spacing across lists and cards."
      >
        <label className="flex items-center gap-2 text-2xs text-foreground-muted">
          Comfortable
          <Switch
            checked={density === "compact"}
            onCheckedChange={(checked: boolean) =>
              setDensity((checked ? "compact" : "comfortable") as Density)
            }
            aria-label="Toggle compact density"
          />
          Compact
        </label>
      </Row>

      <Row
        title="Default work view"
        description="The view that opens first on the Work page."
      >
        <select
          value={defaultView}
          onChange={(e) => setDefaultView(e.target.value)}
          className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus-visible:border-accent focus-visible:outline-none"
        >
          {QUEUE_VIEWS.map((v) => (
            <option key={v.key} value={v.key}>
              {v.label}
            </option>
          ))}
        </select>
      </Row>

      <p className="text-[10px] text-foreground-muted">
        Preferences persist to this browser. When wired to the org they map to
        Directive_User_Preference__c.
      </p>
    </div>
  );
}

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <p className="text-2xs text-foreground-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}
