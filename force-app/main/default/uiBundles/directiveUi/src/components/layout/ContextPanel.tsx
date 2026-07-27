import { Link } from "react-router-dom";
import { Activity, CalendarClock, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyWork } from "@/hooks/useWork";
import { useAgentActivity } from "@/hooks/useContext";
import { AGENT_STATUS_LABELS } from "@/domain/labels";
import { dueLabel, relativeTime } from "@/lib/format";
import type { PriorityBand } from "@/domain/types";

const BANDS: PriorityBand[] = ["Critical", "High", "Medium", "Low"];

/**
 * Collapsible right context panel (spec: 360–460px). Shows an "at a glance"
 * summary - band distribution, what's due next, and the latest AI activity -
 * so the workspace always has situational context.
 */
export function ContextPanel({ open }: { open: boolean }) {
  const { data: work, isLoading } = useMyWork();
  const { data: activity } = useAgentActivity();

  if (!open) return null;

  const active = (work ?? []).filter(
    (w) => !["Completed", "Dismissed"].includes(w.status),
  );
  const byBand = BANDS.map((band) => ({
    band,
    count: active.filter((w) => w.priority.band === band).length,
  }));
  const nextDue = [...active]
    .filter((w) => w.dueAt)
    .sort((a, b) => +new Date(a.dueAt!) - +new Date(b.dueAt!))
    .slice(0, 4);
  const recentActivity = (activity ?? []).slice(0, 4);

  return (
    <aside
      className="flex w-[var(--panel,400px)] shrink-0 flex-col overflow-y-auto border-l border-border bg-surface"
      aria-label="Context"
    >
      <div className="flex h-14 shrink-0 items-center px-5 text-sm font-semibold">
        At a glance
      </div>
      <Separator />

      <div className="space-y-6 p-5">
        <section>
          <SectionLabel icon={Gauge}>Active by priority</SectionLabel>
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {byBand.map(({ band, count }) => (
                <div
                  key={band}
                  className="rounded-md border border-border bg-surface-raised p-2 text-center"
                >
                  <div
                    className="text-lg font-semibold tabular-nums"
                    style={{ color: `hsl(var(--band-${band.toLowerCase()}))` }}
                  >
                    {count}
                  </div>
                  <div className="text-[10px] text-foreground-muted">{band}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionLabel icon={CalendarClock}>Due next</SectionLabel>
          <ul className="space-y-1.5">
            {nextDue.map((w) => {
              const due = dueLabel(w.dueAt);
              return (
                <li key={w.id}>
                  <Link
                    to={`/work/${w.id}`}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-2xs transition-colors hover:bg-surface-hover"
                  >
                    <span className="truncate text-foreground">{w.title}</span>
                    <span
                      className={cn(
                        "shrink-0",
                        due.overdue ? "text-critical" : "text-foreground-muted",
                      )}
                    >
                      {due.text}
                    </span>
                  </Link>
                </li>
              );
            })}
            {nextDue.length === 0 && (
              <li className="px-2 text-2xs text-foreground-muted">
                Nothing due soon.
              </li>
            )}
          </ul>
        </section>

        <section>
          <SectionLabel icon={Activity}>Recent AI activity</SectionLabel>
          <ul className="space-y-2">
            {recentActivity.map((a) => (
              <li key={a.id} className="rounded-md border border-border p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xs font-medium">{a.actionLabel}</span>
                  <span className="text-[10px] text-foreground-muted">
                    {relativeTime(a.occurredAt)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] text-foreground-muted">
                  {a.conclusion}
                </p>
                <span className="mt-1 inline-block text-[10px] text-foreground-muted">
                  {AGENT_STATUS_LABELS[a.status]}
                </span>
              </li>
            ))}
          </ul>
          <Link
            to="/ai-activity"
            className="mt-2 inline-block text-2xs text-accent hover:underline"
          >
            View all AI activity →
          </Link>
        </section>
      </div>
    </aside>
  );
}

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: typeof Gauge;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-foreground-muted">
      <Icon className="size-3.5" aria-hidden />
      {children}
    </div>
  );
}
