import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAgentActivity } from "@/hooks/useContext";
import { AGENT_STATUS_LABELS } from "@/domain/labels";
import { relativeTime } from "@/lib/format";
import type { AgentActivity, AgentActivityStatus } from "@/domain/types";

const STATUS_TONE: Record<
  AgentActivityStatus,
  "success" | "warning" | "critical" | "default" | "info"
> = {
  Completed: "success",
  Awaiting_Approval: "warning",
  Failed: "critical",
  Rejected: "critical",
  Dismissed: "default",
};

export default function AIActivityPage() {
  const { data: activity, isLoading } = useAgentActivity();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">AI Activity</h1>
        <p className="text-sm text-foreground-muted">
          Every Agentforce action, with the full transparency trail. Directive
          never takes an action you can&apos;t inspect.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-hover/50 text-2xs uppercase tracking-wide text-foreground-muted">
              <tr>
                <th className="w-8 px-3 py-2" />
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Confidence</th>
                <th className="px-3 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {(activity ?? []).map((a) => (
                <ActivityRow
                  key={a.id}
                  activity={a}
                  open={expanded.has(a.id)}
                  onToggle={() => toggle(a.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ActivityRow({
  activity: a,
  open,
  onToggle,
}: {
  activity: AgentActivity;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="cursor-pointer border-t border-border transition-colors hover:bg-surface-hover/40"
        onClick={onToggle}
      >
        <td className="px-3 py-2.5 text-foreground-muted">
          {open ? (
            <ChevronDown className="size-4" aria-hidden />
          ) : (
            <ChevronRight className="size-4" aria-hidden />
          )}
        </td>
        <td className="px-3 py-2.5 font-medium">{a.actionLabel}</td>
        <td className="px-3 py-2.5">
          <Badge variant={STATUS_TONE[a.status]}>
            {AGENT_STATUS_LABELS[a.status]}
          </Badge>
        </td>
        <td className="px-3 py-2.5 tabular-nums text-foreground-muted">
          {Math.round(a.confidence * 100)}%
        </td>
        <td className="px-3 py-2.5 text-2xs text-foreground-muted">
          {relativeTime(a.occurredAt)}
        </td>
      </tr>
      {open && (
        <tr className="border-t border-border bg-surface-hover/20">
          <td />
          <td colSpan={4} className="px-3 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Detail label="Context used">
                <ul className="list-inside list-disc space-y-0.5">
                  {a.contextUsed.map((c, i) => (
                    <li key={i} className="text-foreground">
                      {c}
                    </li>
                  ))}
                </ul>
              </Detail>
              <Detail label="Conclusion">
                <p className="text-foreground">{a.conclusion}</p>
              </Detail>
              <Detail label="Proposed action">
                <p className="text-foreground">{a.proposedAction}</p>
              </Detail>
              <Detail label="Human approval">
                {a.humanApproval ? (
                  <p
                    className={cn(
                      a.humanApproval.decision === "Approved"
                        ? "text-success"
                        : "text-critical",
                    )}
                  >
                    {a.humanApproval.decision} by {a.humanApproval.by} ·{" "}
                    {relativeTime(a.humanApproval.at)}
                  </p>
                ) : (
                  <p className="text-foreground-muted">No human decision yet</p>
                )}
              </Detail>
              <Detail label="Confidence">
                <p className="tabular-nums text-foreground">
                  {Math.round(a.confidence * 100)}%
                </p>
              </Detail>
              <Detail label="Outcome">
                <p className="text-foreground">{a.outcome ?? " - "}</p>
              </Detail>
            </div>
            {a.workItemId && (
              <Link
                to={`/work/${a.workItemId}`}
                className="mt-3 inline-block text-[10px] font-medium text-accent hover:underline"
              >
                View related work item →
              </Link>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-2xs font-medium uppercase tracking-wide text-foreground-muted">
        {label}
      </div>
      <div className="text-2xs">{children}</div>
    </div>
  );
}
