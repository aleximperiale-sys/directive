import { useEffect } from "react";
import { usePreferences, type ThemeMode } from "./store";

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") return systemPrefersDark() ? "dark" : "light";
  return mode;
}

function applyTheme(mode: ThemeMode, density: string) {
  const root = document.documentElement;
  const resolved = resolveTheme(mode);
  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
  root.dataset.density = density;
}

/**
 * ThemeProvider applies theme + density to <html> and keeps them in sync with
 * the OS when the mode is "system". No visual chrome - it just wires effects.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = usePreferences((s) => s.theme);
  const density = usePreferences((s) => s.density);

  useEffect(() => {
    applyTheme(theme, density);
  }, [theme, density]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system", density);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, density]);

  return <>{children}</>;
}
