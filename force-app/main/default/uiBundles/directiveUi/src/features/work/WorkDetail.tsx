import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ExternalLink,
  Info,
  ShieldCheck,
} from "lucide-react";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { PriorityExplanation } from "@/components/common/PriorityExplanation";
import { ReasonCodes } from "@/components/common/ReasonCodes";
import { SeverityIndicator } from "@/components/common/SeverityIndicator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkItem, useExecuteAction } from "@/hooks/useWork";
import { TYPE_LABELS, STATUS_LABELS } from "@/domain/labels";
import { absoluteTime, currency, dueLabel, relativeTime } from "@/lib/format";
import type { RecommendedAction } from "@/domain/types";

const AFFORDANCE_VARIANT: Record<
  RecommendedAction["affordance"],
  "default" | "secondary" | "outline" | "ghost"
> = {
  Execute: "default",
  Review: "secondary",
  Snooze: "outline",
  Dismiss: "ghost",
};

export default function WorkDetail() {
  const { workItemId } = useParams();
  const { data: item, isLoading } = useWorkItem(workItemId);
  const execute = useExecuteAction();
  const [pending, setPending] = useState<RecommendedAction | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-2/3" />
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 p-12 text-center">
        <p className="text-sm text-foreground-muted">
          That work item doesn&apos;t exist or has been removed.
        </p>
        <Button asChild variant="secondary">
          <Link to="/work">Back to work queue</Link>
        </Button>
      </div>
    );
  }

  const runAction = (action: RecommendedAction) => {
    if (action.confirmationRequired) {
      setPending(action);
      return;
    }
    fire(action);
  };

  const fire = (action: RecommendedAction) => {
    setPending(null);
    execute.mutate(
      {
        workItemId: item.id,
        actionKey: action.actionKey,
      },
      {
        onSuccess: (res) => setBanner(res.message),
        onError: (err) =>
          setBanner(
            err instanceof Error ? err.message : "Action failed. Try again.",
          ),
      },
    );
  };

  const due = item.dueAt ? dueLabel(item.dueAt) : null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <Link
        to="/work"
        className="inline-flex items-center gap-1.5 text-2xs font-medium text-foreground-muted hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Back to work
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge band={item.priority.band} score={item.priority.score} />
          <SeverityIndicator severity={item.severity} />
          <Badge variant="outline">{TYPE_LABELS[item.type]}</Badge>
          <Badge variant="default">{STATUS_LABELS[item.status]}</Badge>
          {due && (
            <span
              className={due.overdue ? "text-2xs text-critical" : "text-2xs text-foreground-muted"}
            >
              {due.text}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">
          {item.title}
        </h1>
        <p className="max-w-3xl text-sm text-foreground-muted">{item.summary}</p>
      </header>

      {banner && (
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-2.5 text-sm text-success">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          {banner}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Business impact */}
          <Panel title="Business impact">
            <p className="text-sm text-foreground">{item.businessImpact}</p>
            {typeof item.revenueExposure === "number" && (
              <p className="mt-2 text-2xs text-foreground-muted">
                Estimated revenue exposure:{" "}
                <span className="font-semibold text-foreground">
                  {currency(item.revenueExposure)}
                </span>
              </p>
            )}
          </Panel>

          {/* Why this appeared */}
          <Panel title="Why this appeared">
            <p className="mb-3 text-sm text-foreground-muted">
              {item.explanation}
            </p>
            <ReasonCodes codes={item.reasonCodes} />
          </Panel>

          {/* Related context */}
          <Panel title="Related context">
            <ul className="divide-y divide-border">
              {item.relatedContext.map((ctx) => (
                <li
                  key={ctx.id}
                  className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <div className="text-2xs uppercase tracking-wide text-foreground-muted">
                      {ctx.label}
                    </div>
                    <div className="text-sm text-foreground">{ctx.value}</div>
                  </div>
                  {ctx.href && (
                    <a
                      href={ctx.href}
                      className="mt-0.5 shrink-0 text-foreground-muted hover:text-accent"
                      aria-label={`Open ${ctx.label}`}
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
            {(item.accountName || item.sourceRecordLabel) && (
              <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3 text-2xs text-foreground-muted">
                {item.accountName && (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="size-3.5" aria-hidden />
                    {item.accountName}
                  </span>
                )}
                {item.sourceRecordLabel && (
                  <span className="inline-flex items-center gap-1">
                    <Info className="size-3.5" aria-hidden />
                    {item.sourceRecordLabel}
                  </span>
                )}
              </div>
            )}
          </Panel>
        </div>

        {/* Right rail: score breakdown + actions */}
        <aside className="space-y-6">
          <Panel title="Priority score">
            <PriorityExplanation priority={item.priority} />
          </Panel>

          <Panel title="Recommended actions">
            {item.actions.length === 0 ? (
              <p className="text-2xs text-foreground-muted">
                No actions available for this item.
              </p>
            ) : (
              <div className="space-y-2">
                {item.actions.map((action) => (
                  <ActionButton
                    key={action.id}
                    action={action}
                    disabled={execute.isPending}
                    onRun={() => runAction(action)}
                  />
                ))}
              </div>
            )}
          </Panel>

          <p className="px-1 text-[10px] text-foreground-muted">
            Detected {relativeTime(item.detectedAt)} ·{" "}
            {absoluteTime(item.detectedAt)}
            {item.completedAt && (
              <> · Completed {relativeTime(item.completedAt)}</>
            )}
          </p>
        </aside>
      </div>

      {/* Confirmation dialog for actions that require it. */}
      <Dialog
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm: {pending?.label}</DialogTitle>
            <DialogDescription>
              {pending?.description ||
                "This action will be executed against the source record."}
            </DialogDescription>
          </DialogHeader>
          {pending?.approvalRequired && (
            <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-2xs text-warning">
              <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
              This action also requires downstream approval.
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              variant={pending?.affordance === "Dismiss" ? "critical" : "default"}
              onClick={() => pending && fire(pending)}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActionButton({
  action,
  disabled,
  onRun,
}: {
  action: RecommendedAction;
  disabled: boolean;
  onRun: () => void;
}) {
  return (
    <div>
      <Button
        variant={AFFORDANCE_VARIANT[action.affordance]}
        size="sm"
        className="w-full justify-start"
        disabled={disabled}
        onClick={onRun}
      >
        {action.label}
        <span className="ml-auto flex items-center gap-1">
          {typeof action.confidence === "number" && (
            <span className="text-[10px] opacity-70">
              {Math.round(action.confidence * 100)}%
            </span>
          )}
          {action.approvalRequired && (
            <ShieldCheck className="size-3.5 opacity-70" aria-label="Approval required" />
          )}
        </span>
      </Button>
      {action.description && (
        <p className="mt-0.5 px-1 text-[10px] leading-snug text-foreground-muted">
          {action.description}
        </p>
      )}
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="mb-3 text-2xs font-semibold uppercase tracking-wide text-foreground-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}
