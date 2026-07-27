import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PriorityBadge } from "./PriorityBadge";
import { SeverityIndicator } from "./SeverityIndicator";
import { Badge } from "@/components/ui/badge";
import { TYPE_LABELS } from "@/domain/labels";
import { dueLabel, relativeTime } from "@/lib/format";
import type { WorkItem } from "@/domain/types";

/**
 * A single work item as a compact, scannable card. Priority-forward: band and
 * score lead, then title, then the one-line explanation and meta.
 */
export function WorkCard({
  item,
  className,
}: {
  item: WorkItem;
  className?: string;
}) {
  const due = item.dueAt ? dueLabel(item.dueAt) : null;
  return (
    <Link
      to={`/work/${item.id}`}
      className={cn(
        "group flex flex-col gap-2 rounded-lg border border-border bg-surface p-[var(--card-padding,16px)] shadow-[var(--shadow-sm)] transition-all hover:border-border-strong hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--focus-ring))]",
        className,
      )}
      aria-label={`${item.title}, priority ${item.priority.band}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <PriorityBadge band={item.priority.band} score={item.priority.score} />
          <SeverityIndicator severity={item.severity} />
        </div>
        {due && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-2xs",
              due.overdue ? "text-critical" : "text-foreground-muted",
            )}
          >
            <Clock className="size-3" aria-hidden />
            {due.text}
          </span>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold leading-snug text-foreground group-hover:text-accent">
          {item.title}
        </h3>
        <p className="mt-0.5 line-clamp-2 text-2xs text-foreground-muted">
          {item.explanation}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline">{TYPE_LABELS[item.type]}</Badge>
          {item.accountName && (
            <span className="truncate text-2xs text-foreground-muted">
              {item.accountName}
            </span>
          )}
        </div>
        <span className="shrink-0 text-2xs text-foreground-muted">
          {relativeTime(item.detectedAt)}
        </span>
      </div>
    </Link>
  );
}
