import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyWork } from "@/hooks/useWork";
import { CATEGORIES } from "@/domain/types";
import { OPEN_WORK_TREND, COMPLETION_TREND } from "@/salesforce/mock/seed";

const AXIS = { fontSize: 11, fill: "hsl(var(--foreground-muted))" };

export default function InsightsPage() {
  const { data: work, isLoading } = useMyWork();

  const byCategory = useMemo(() => {
    const active = (work ?? []).filter(
      (w) => !["Completed", "Dismissed"].includes(w.status),
    );
    return CATEGORIES.map((category) => ({
      category,
      count: active.filter((w) => w.category === category).length,
    }));
  }, [work]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 p-6">
        <Skeleton className="h-8 w-52" />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="text-sm text-foreground-muted">
          What changed, why it matters, and what to do about it.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <InsightCard
          title="Open work items over time"
          trend="up"
          changed="Open items rose from 29 to 47 across the week, with critical items up to 7."
          why="A routing rule change late in the week pushed a burst of billing cases into the queue."
          action="Review routing anomalies"
          onAction="/work?view=critical"
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={OPEN_WORK_TREND} margin={{ left: -18, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="openGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="open"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                fill="url(#openGrad)"
                name="Open"
              />
              <Line
                type="monotone"
                dataKey="critical"
                stroke="hsl(var(--critical))"
                strokeWidth={2}
                dot={false}
                name="Critical"
              />
            </AreaChart>
          </ResponsiveContainer>
        </InsightCard>

        <InsightCard
          title="Completion rate"
          trend="up"
          changed="Completion rate climbed from 66% midweek to 88% by Sunday."
          why="Faster triage on high-priority items cleared the backlog heading into the weekend."
          action="See recently completed"
          onAction="/work?view=recently-completed"
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={COMPLETION_TREND} margin={{ left: -18, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} />
              <YAxis
                tick={AXIS}
                tickLine={false}
                axisLine={false}
                width={40}
                domain={[0, 1]}
                tickFormatter={(v) => `${Math.round(v * 100)}%`}
              />
              <Tooltip content={<ChartTooltip percentKeys={["rate"]} />} />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(var(--success))" }}
                name="Rate"
              />
            </LineChart>
          </ResponsiveContainer>
        </InsightCard>

        <InsightCard
          title="Active work by category"
          trend="flat"
          changed={`Service and Revenue lead the ${byCategory.reduce((s, c) => s + c.count, 0)} active items.`}
          why="Service-impacting cases and revenue-at-risk accounts dominate the current queue."
          action="Filter the queue"
          onAction="/work"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCategory} margin={{ left: -18, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="category" tick={AXIS} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--surface-hover))" }} />
              <Bar
                dataKey="count"
                fill="hsl(var(--accent))"
                radius={[4, 4, 0, 0]}
                name="Active items"
              />
            </BarChart>
          </ResponsiveContainer>
        </InsightCard>
      </div>
    </div>
  );
}

function InsightCard({
  title,
  trend,
  changed,
  why,
  action,
  onAction,
  className,
  children,
}: {
  title: string;
  trend: "up" | "down" | "flat";
  changed: string;
  why: string;
  action: string;
  onAction: string;
  className?: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : ArrowUpRight;
  return (
    <section
      className={`space-y-3 rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-sm)] ${className ?? ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <TrendIcon className="size-4 text-foreground-muted" aria-hidden />
      </div>
      {children}
      <dl className="space-y-1.5 border-t border-border pt-3 text-2xs">
        <div>
          <dt className="inline font-semibold text-foreground">What changed: </dt>
          <dd className="inline text-foreground-muted">{changed}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-foreground">Why: </dt>
          <dd className="inline text-foreground-muted">{why}</dd>
        </div>
      </dl>
      <Button variant="secondary" size="sm" onClick={() => navigate(onAction)}>
        {action} <ArrowUpRight />
      </Button>
    </section>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  percentKeys = [],
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
  percentKeys?: string[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-2xs shadow-[var(--shadow-md)]">
      <div className="mb-1 font-medium text-foreground">{label}</div>
      {payload.map((entry, i) => {
        const isPercent =
          entry.name && percentKeys.includes(entry.name.toLowerCase());
        return (
          <div key={i} className="flex items-center gap-1.5 text-foreground-muted">
            <span
              className="inline-block size-2 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}:{" "}
            <span className="font-medium text-foreground">
              {isPercent
                ? `${Math.round((entry.value ?? 0) * 100)}%`
                : entry.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
