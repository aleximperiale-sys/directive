import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/design-system/theme";

/**
 * When this bundle runs inside Salesforce it is NOT served from the domain root
 * - it is mounted under a path like `/app/c__directive`. The platform exposes
 * that prefix as `globalThis.SFDC_ENV.basePath`; without passing it to the
 * router as `basename`, React Router matches the full pathname against our
 * routes, finds nothing, and renders the 404 page even though the app loaded.
 *
 * Standalone (`npm run dev`) has no SFDC_ENV, so basename stays undefined and
 * the app serves from "/" as before.
 */
function resolveBasename(): string | undefined {
  const raw = (globalThis as { SFDC_ENV?: { basePath?: string } }).SFDC_ENV
    ?.basePath;
  // Strip any trailing slash so it matches URLs exactly.
  return typeof raw === "string" ? raw.replace(/\/+$/, "") : undefined;
}

/**
 * Application providers, composed once at the root:
 *  - TanStack Query for server-state (repositories via the factory)
 *  - ThemeProvider syncs theme/density preferences onto <html>
 *  - Radix TooltipProvider for shared tooltip timing
 *  - BrowserRouter for routing, mounted at the platform's base path
 *
 * The QueryClient is created lazily in state so it survives Fast Refresh and is
 * never recreated on re-render.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider delayDuration={200} skipDelayDuration={400}>
          <BrowserRouter basename={resolveBasename()}>{children}</BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
