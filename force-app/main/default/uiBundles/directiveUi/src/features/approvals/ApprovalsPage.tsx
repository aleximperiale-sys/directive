import { Link } from "react-router-dom";
import { Check, ExternalLink, ShieldCheck, X } from "lucide-react";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useApprovals, useApprovalDecision } from "@/hooks/useApprovals";
import { relativeTime } from "@/lib/format";
import type { ApprovalItem } from "@/domain/types";

export default function ApprovalsPage() {
  const { data: approvals, isLoading } = useApprovals();
  const decision = useApprovalDecision();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-sm text-foreground-muted">
          A unified queue of decisions waiting on you. Approving or rejecting
          resolves the underlying work item.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (approvals ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-12 text-center">
          <ShieldCheck className="size-6 text-success" aria-hidden />
          <p className="text-sm text-foreground-muted">
            You&apos;re all caught up. No approvals pending.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {(approvals ?? []).map((item) => (
            <ApprovalCard
              key={item.id}
              item={item}
              busy={decision.isPending}
              onApprove={() =>
                decision.mutate({ id: item.id, decision: "approve" })
              }
              onReject={() =>
                decision.mutate({ id: item.id, decision: "reject" })
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ApprovalCard({
  item,
  busy,
  onApprove,
  onReject,
}: {
  item: ApprovalItem;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <li className="rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge
              band={item.priority.band}
              score={item.priority.score}
            />
            {item.accountName && (
              <Badge variant="outline">{item.accountName}</Badge>
            )}
            <span className="text-[10px] text-foreground-muted">
              Requested by {item.requestedBy} · {relativeTime(item.requestedAt)}
            </span>
          </div>
          <h3 className="text-sm font-semibold leading-snug">{item.title}</h3>
          <p className="text-2xs text-foreground-muted">
            <span className="font-medium text-foreground">Action:</span>{" "}
            {item.requestedAction}
          </p>
          <p className="text-2xs text-foreground-muted">{item.rationale}</p>
          {typeof item.confidence === "number" && (
            <p className="text-[10px] text-foreground-muted">
              Confidence {Math.round(item.confidence * 100)}%
            </p>
          )}
          <Link
            to={`/work/${item.workItemId}`}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:underline"
          >
            View work item <ExternalLink className="size-3" aria-hidden />
          </Link>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button size="sm" disabled={busy} onClick={onApprove}>
            <Check /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={onReject}
          >
            <X /> Reject
          </Button>
        </div>
      </div>
    </li>
  );
}
