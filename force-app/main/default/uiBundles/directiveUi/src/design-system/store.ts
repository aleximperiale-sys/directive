import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";
export type Density = "comfortable" | "compact";

interface PreferencesState {
  theme: ThemeMode;
  density: Density;
  defaultView: string;
  contextPanelOpen: boolean;
  sidebarCollapsed: boolean;
  setTheme: (theme: ThemeMode) => void;
  setDensity: (density: Density) => void;
  setDefaultView: (view: string) => void;
  toggleContextPanel: () => void;
  setContextPanel: (open: boolean) => void;
  toggleSidebar: () => void;
}

/**
 * UI preferences persisted to localStorage. This runs in a real browser on the
 * user's machine (not the artifact sandbox), so localStorage is safe here. The
 * theme provider mirrors these values onto <html> class/data attributes.
 *
 * Mirrors Directive_User_Preference__c server-side; swap the storage for a
 * repository write when wiring to the org.
 */
export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: "system",
      density: "comfortable",
      defaultView: "my-work",
      contextPanelOpen: true,
      sidebarCollapsed: false,
      setTheme: (theme) => set({ theme }),
      setDensity: (density) => set({ density }),
      setDefaultView: (defaultView) => set({ defaultView }),
      toggleContextPanel: () =>
        set((s) => ({ contextPanelOpen: !s.contextPanelOpen })),
      setContextPanel: (open) => set({ contextPanelOpen: open }),
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: "directive.preferences" },
  ),
);
