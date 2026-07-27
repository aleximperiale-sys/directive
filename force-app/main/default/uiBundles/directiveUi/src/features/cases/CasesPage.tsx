import { useMemo } from "react";
import { LifeBuoy } from "lucide-react";
import { WorkCard } from "@/components/common/WorkCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyWork } from "@/hooks/useWork";
import type { WorkItem } from "@/domain/types";

const TERMINAL = ["Completed", "Dismissed"];

/** Case-backed service work: the operational queue for the Service persona. */
function isCaseWork(w: WorkItem) {
  const active = !TERMINAL.includes(w.status);
  return active && (w.sourceObject === "Case" || w.category === "Service");
}

/**
 * Cases - the MVP service surface (spec §23). Unlike a Salesforce Case list view,
 * this presents Case-backed work items already prioritized and explained.
 */
export default function CasesPage() {
  const { data: work, isLoading } = useMyWork();

  const rows = useMemo(() => {
    const filtered = (work ?? []).filter(isCaseWork);
    return [...filtered].sort((a, b) => b.priority.score - a.priority.score);
  }, [work]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <LifeBuoy className="size-5 text-accent" aria-hidden />
          Cases
        </h1>
        <p className="text-sm text-foreground-muted">
          Case-backed service work, prioritized and explained.
        </p>
      </header>

      <div className="flex items-center justify-between">
        <span className="text-2xs text-foreground-muted">
          {rows.length} {rows.length === 1 ? "case" : "cases"}
        </span>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-foreground-muted">
          No open case work right now.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((item) => (
            <WorkCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
