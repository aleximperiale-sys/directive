import { useMemo } from "react";
import { BookOpen } from "lucide-react";
import { WorkCard } from "@/components/common/WorkCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyWork } from "@/hooks/useWork";
import type { WorkItem } from "@/domain/types";

const TERMINAL = ["Completed", "Dismissed"];

/** Knowledge-gap work: missing/failed knowledge surfaced as actionable items. */
function isKnowledgeGap(w: WorkItem) {
  const active = !TERMINAL.includes(w.status);
  return (
    active &&
    (w.type === "Knowledge_Gap" || w.reasonCodes.includes("KNOWLEDGE_GAP"))
  );
}

/**
 * Knowledge Gaps - an MVP surface (spec §23). Repeated retrieval failures and
 * missing articles become work: draft the article, then publish after review.
 */
export default function KnowledgeGapsPage() {
  const { data: work, isLoading } = useMyWork();

  const rows = useMemo(() => {
    const filtered = (work ?? []).filter(isKnowledgeGap);
    return [...filtered].sort((a, b) => b.priority.score - a.priority.score);
  }, [work]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <BookOpen className="size-5 text-accent" aria-hidden />
          Knowledge Gaps
        </h1>
        <p className="text-sm text-foreground-muted">
          Missing or failing knowledge, ready to draft and publish.
        </p>
      </header>

      <div className="flex items-center justify-between">
        <span className="text-2xs text-foreground-muted">
          {rows.length} {rows.length === 1 ? "gap" : "gaps"}
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
          No knowledge gaps detected right now.
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
