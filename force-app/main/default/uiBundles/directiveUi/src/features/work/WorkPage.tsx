import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowDownWideNarrow } from "lucide-react";
import { WorkCard } from "@/components/common/WorkCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMyWork } from "@/hooks/useWork";
import { QUEUE_VIEWS } from "@/lib/constants";
import type { WorkItem } from "@/domain/types";

const TERMINAL = ["Completed", "Dismissed"];
const DEFAULT_VIEW = "my-work";

function isActive(w: WorkItem) {
  return !TERMINAL.includes(w.status);
}

function isDueWithin(w: WorkItem, hours: number) {
  if (!w.dueAt) return false;
  return new Date(w.dueAt).getTime() - Date.now() <= hours * 3600_000;
}

function hasAIRecommendation(w: WorkItem) {
  return w.actions.some((a) => typeof a.confidence === "number");
}

/** Apply the active view's filter to the full work list. */
function filterForView(items: WorkItem[], view: string): WorkItem[] {
  switch (view) {
    case "critical":
      return items.filter((w) => isActive(w) && w.priority.band === "Critical");
    case "due-today":
      return items.filter((w) => isActive(w) && isDueWithin(w, 24));
    case "waiting":
      return items.filter((w) => w.status === "Waiting");
    case "approvals":
      return items.filter((w) => w.isApproval && isActive(w));
    case "ai-recommendations":
      return items.filter((w) => isActive(w) && hasAIRecommendation(w));
    case "recently-completed":
      return items.filter((w) => TERMINAL.includes(w.status));
    case "my-work":
    default:
      return items.filter(isActive);
  }
}

export default function WorkPage() {
  const [params, setParams] = useSearchParams();
  const view = params.get("view") ?? DEFAULT_VIEW;
  const { data: work, isLoading } = useMyWork();

  const active = QUEUE_VIEWS.find((v) => v.key === view) ?? QUEUE_VIEWS[0];

  const rows = useMemo(() => {
    const filtered = filterForView(work ?? [], view);
    return [...filtered].sort((a, b) => b.priority.score - a.priority.score);
  }, [work, view]);

  const setView = (key: string) => {
    const next = new URLSearchParams(params);
    if (key === DEFAULT_VIEW) next.delete("view");
    else next.set("view", key);
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Work</h1>
        <p className="text-sm text-foreground-muted">{active.description}</p>
      </header>

      <div
        className="flex flex-wrap gap-1.5 border-b border-border pb-3"
        role="tablist"
        aria-label="Work views"
      >
        {QUEUE_VIEWS.map((v) => {
          const selected = v.key === active.key;
          return (
            <button
              key={v.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setView(v.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-2xs font-medium transition-colors",
                selected
                  ? "bg-accent text-accent-foreground"
                  : "border border-border text-foreground-muted hover:bg-surface-hover hover:text-foreground",
              )}
            >
              {v.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-2xs text-foreground-muted">
          {rows.length} {rows.length === 1 ? "item" : "items"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-2xs text-foreground-muted">
          <ArrowDownWideNarrow className="size-3.5" aria-hidden />
          Sorted by priority score
        </span>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-foreground-muted">
          Nothing in this view right now.
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
