import { lazy, Suspense, type ReactNode } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

// Feature pages are code-split so each route loads on demand.
const TodayPage = lazy(() => import("@/features/today/TodayPage"));
const WorkPage = lazy(() => import("@/features/work/WorkPage"));
const WorkDetail = lazy(() => import("@/features/work/WorkDetail"));
const CasesPage = lazy(() => import("@/features/cases/CasesPage"));
const KnowledgeGapsPage = lazy(
  () => import("@/features/knowledge-gaps/KnowledgeGapsPage"),
);
const CustomersPage = lazy(() => import("@/features/customers/CustomersPage"));
const ApprovalsPage = lazy(() => import("@/features/approvals/ApprovalsPage"));
const AIActivityPage = lazy(() => import("@/features/ai-activity/AIActivityPage"));
const InsightsPage = lazy(() => import("@/features/insights/InsightsPage"));
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage"));
const PreferencesSettings = lazy(
  () => import("@/features/settings/PreferencesSettings"),
);
const RulesSettings = lazy(() => import("@/features/settings/RulesSettings"));
const PersonasSettings = lazy(
  () => import("@/features/settings/PersonasSettings"),
);
const ActionsSettings = lazy(
  () => import("@/features/settings/ActionsSettings"),
);
const ScoringSettings = lazy(
  () => import("@/features/settings/ScoringSettings"),
);
const PermissionsSettings = lazy(
  () => import("@/features/settings/PermissionsSettings"),
);

/** Skeleton shown while a lazily-loaded page chunk resolves. */
function PageFallback() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-6">
      <Skeleton className="h-8 w-52" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Wrap a lazily-loaded element in a Suspense boundary. */
function view(el: ReactNode) {
  return <Suspense fallback={<PageFallback />}>{el}</Suspense>;
}

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-5xl font-semibold tabular-nums text-foreground-muted">
        404
      </div>
      <p className="text-sm text-foreground-muted">
        We couldn&apos;t find that page.
      </p>
      <Button asChild variant="secondary">
        <Link to="/today">Back to Today</Link>
      </Button>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="today" element={view(<TodayPage />)} />
        <Route path="work" element={view(<WorkPage />)} />
        <Route path="work/:workItemId" element={view(<WorkDetail />)} />
        <Route path="cases" element={view(<CasesPage />)} />
        <Route path="knowledge-gaps" element={view(<KnowledgeGapsPage />)} />
        <Route path="customers" element={view(<CustomersPage />)} />
        <Route path="customers/:recordId" element={view(<CustomersPage />)} />
        <Route path="approvals" element={view(<ApprovalsPage />)} />
        <Route path="ai-activity" element={view(<AIActivityPage />)} />
        <Route path="insights" element={view(<InsightsPage />)} />
        <Route path="settings" element={view(<SettingsPage />)}>
          <Route index element={view(<PreferencesSettings />)} />
          <Route path="rules" element={view(<RulesSettings />)} />
          <Route path="personas" element={view(<PersonasSettings />)} />
          <Route path="actions" element={view(<ActionsSettings />)} />
          <Route path="scoring" element={view(<ScoringSettings />)} />
          <Route path="permissions" element={view(<PermissionsSettings />)} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
