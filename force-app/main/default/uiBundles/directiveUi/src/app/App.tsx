import { ErrorBoundary } from "./error-boundary";
import { AppRoutes } from "./routes";

/**
 * Root application component. The command palette and any global chrome live
 * inside AppShell (rendered by the routes), so App only wires the error
 * boundary around the router.
 */
export function App() {
  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  );
}
