import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertOctagon,
  ArrowRight,
  CheckSquare,
  Clock,
  History,
  Sparkles,
  Timer,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { WorkCard } from "@/components/common/WorkCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyWork } from "@/hooks/useWork";
import { useApprovals } from "@/hooks/useApprovals";
import { CURRENT_USER } from "@/lib/constants";
import type { WorkItem } from "@/domain/types";

const TERMINAL = ["Completed", "Dismissed"];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function byScoreDesc(a: WorkItem, b: WorkItem) {
  return b.priority.score - a.priority.score;
}

function isDueWithin(item: WorkItem, hours: number): boolean {
  if (!item.dueAt) return false;
  const diff = new Date(item.dueAt).getTime() - Date.now();
  return diff <= hours * 3600_000;
}

export default function TodayPage() {
  const { data: work, isLoading } = useMyWork();
  const { data: approvals } = useApprovals();

  const groups = useMemo(() => {
    const items = work ?? [];
    const active = items.filter((w) => !TERMINAL.includes(w.status));

    const approvalsList = active
      .filter((w) => w.isApproval)
      .sort(byScoreDesc);

    const immediate = active
      .filter(
        (w) =>
          !w.isApproval &&
          w.status !== "Waiting" &&
          (w.priority.band === "Critical" || w.priority.band === "High"),
      )
      .sort(byScoreDesc);
    const immediateIds = new Set(immediate.map((w) => w.id));

    const recommended = active
      .filter(
        (w) =>
          !w.isApproval &&
          w.status !== "Waiting" &&
          !immediateIds.has(w.id),
      )
      .sort(byScoreDesc);

    const waiting = active
      .filter((w) => w.status === "Waiting" && !w.isApproval)
      .sort(byScoreDesc);

    const completed = items
      .filter((w) => TERMINAL.includes(w.status))
      .sort(
        (a, b) =>
          new Date(b.completedAt ?? 0).getTime() -
          new Date(a.completedAt ?? 0).getTime(),
      );

    const changes = active
      .filter((w) => {
        const age = Date.now() - new Date(w.detectedAt).getTime();
        return age <= 6 * 3600_000;
      })
      .sort(
        (a, b) =>
          new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
      );

    return {
      active,
      approvalsList,
      immediate,
      recommended,
      waiting,
      completed,
      changes,
      criticalCount: active.filter((w) => w.priority.band === "Critical").length,
      dueTodayCount: active.filter((w) => isDueWithin(w, 24)).length,
    };
  }, [work]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
        <Skeleton className="h-9 w-72" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const approvalsCount = approvals?.length ?? groups.approvalsList.length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-6">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting()}, {CURRENT_USER.firstName}
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            You have {groups.active.length} active items -{" "}
            {groups.criticalCount} critical, {approvalsCount} awaiting your
            approval, {groups.dueTodayCount} due today.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Stat label="Active" value={groups.active.length} />
          <Stat label="Critical" value={groups.criticalCount} tone="critical" />
          <Stat label="Approvals" value={approvalsCount} tone="accent" />
          <Stat label="Due today" value={groups.dueTodayCount} tone="warning" />
        </div>
      </header>

      <Section
        icon={AlertOctagon}
        title="Immediate"
        subtitle="Critical and high-priority work that needs you now"
        items={groups.immediate}
      />
      <Section
        icon={CheckSquare}
        title="Approvals"
        subtitle="Decisions waiting on you"
        items={groups.approvalsList}
        footer={{ to: "/approvals", label: "Go to approvals" }}
      />
      <Section
        icon={Sparkles}
        title="Recommended today"
        subtitle="Worth your attention while you have time"
        items={groups.recommended}
        limit={6}
      />
      <Section
        icon={Timer}
        title="Waiting on others"
        subtitle="Blocked or pending external action"
        items={groups.waiting}
      />
      <Section
        icon={Clock}
        title="Important changes since last visit"
        subtitle="Detected in the last few hours"
        items={groups.changes}
        limit={6}
      />
      <Section
        icon={History}
        title="Recently completed"
        subtitle="Closed or dismissed recently"
        items={groups.completed}
        limit={4}
      />

      <div className="flex justify-center pt-2">
        <Link
          to="/work"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
        >
          View full queue <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "critical" | "accent" | "warning";
}) {
  const toneClass =
    tone === "critical"
      ? "text-critical"
      : tone === "accent"
        ? "text-accent"
        : tone === "warning"
          ? "text-warning"
          : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-2.5">
      <div className={`text-xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </div>
      <div className="text-2xs text-foreground-muted">{label}</div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  items,
  limit = 15,
  footer,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  items: WorkItem[];
  limit?: number;
  footer?: { to: string; label: string };
}) {
  if (items.length === 0) return null;
  const shown = items.slice(0, limit);
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-foreground-muted" aria-hidden />
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <span className="rounded-full bg-surface-hover px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground-muted">
            {items.length}
          </span>
        </div>
        {footer && (
          <Link
            to={footer.to}
            className="text-2xs font-medium text-accent hover:underline"
          >
            {footer.label} →
          </Link>
        )}
      </div>
      <p className="mb-3 text-2xs text-foreground-muted">{subtitle}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((item) => (
          <WorkCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
