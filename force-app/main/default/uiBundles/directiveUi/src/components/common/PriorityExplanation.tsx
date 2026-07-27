import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PriorityBadge } from "./PriorityBadge";
import { sortContributions } from "@/domain/priority";
import type { PriorityBreakdown } from "@/domain/types";

/**
 * FLAGSHIP: the decomposed priority score (spec 13.4).
 *
 * Renders every contribution as a signed, labelled line -
 * "+18 Revenue exposure", "-8 Recovery activity already scheduled" - with the
 * running band. Directive never shows an unexplained number: this is how a
 * priority score earns trust.
 */
export function PriorityExplanation({
  priority,
  className,
  compact = false,
}: {
  priority: PriorityBreakdown;
  className?: string;
  compact?: boolean;
}) {
  const contributions = sortContributions(priority.contributions);
  const positives = contributions.filter((c) => c.value >= 0);
  const negatives = contributions.filter((c) => c.value < 0);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums leading-none">
            {priority.score}
          </span>
          <span className="text-sm text-foreground-muted">/ 100</span>
        </div>
        <PriorityBadge band={priority.band} score={priority.score} showScore={false} />
      </div>

      {/* Proportional band track - a visual anchor for the number. */}
      <div
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-hover"
        role="presentation"
      >
        <div
          className="h-full rounded-full bg-[hsl(var(--band-critical))] transition-[width]"
          style={{
            width: `${priority.score}%`,
            backgroundColor: `hsl(var(--band-${priority.band.toLowerCase()}))`,
          }}
        />
      </div>

      <dl className={cn("space-y-1", compact && "text-2xs")}>
        {positives.map((c) => (
          <ContributionRow key={`${c.key}-${c.label}`} value={c.value} label={c.label} />
        ))}
        {negatives.length > 0 && (
          <div className="my-1.5 border-t border-dashed border-border pt-1.5">
            {negatives.map((c) => (
              <ContributionRow
                key={`${c.key}-${c.label}`}
                value={c.value}
                label={c.label}
              />
            ))}
          </div>
        )}
      </dl>
    </div>
  );
}

function ContributionRow({ value, label }: { value: number; label: string }) {
  const positive = value >= 0;
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <dt className="flex items-center gap-1.5 text-foreground-muted">
        <span
          className={cn(
            "inline-flex size-4 items-center justify-center rounded",
            positive
              ? "bg-success/12 text-success"
              : "bg-critical/12 text-critical",
          )}
          aria-hidden
        >
          {positive ? <Plus className="size-3" /> : <Minus className="size-3" />}
        </span>
        <span>{label}</span>
      </dt>
      <dd
        className={cn(
          "tabular-nums font-medium",
          positive ? "text-success" : "text-critical",
        )}
      >
        {positive ? "+" : ""}
        {value}
      </dd>
    </div>
  );
}
