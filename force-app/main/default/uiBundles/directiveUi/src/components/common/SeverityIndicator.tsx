import { AlertOctagon, AlertTriangle, Info, Circle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Severity } from "@/domain/types";

const CONFIG: Record<Severity, { icon: LucideIcon; className: string }> = {
  Critical: { icon: AlertOctagon, className: "text-critical" },
  High: { icon: AlertTriangle, className: "text-warning" },
  Medium: { icon: Info, className: "text-info" },
  Low: { icon: Circle, className: "text-foreground-muted" },
};

/**
 * Severity is shown as icon + text label, never color alone (accessibility).
 */
export function SeverityIndicator({
  severity,
  showLabel = true,
  className,
}: {
  severity: Severity;
  showLabel?: boolean;
  className?: string;
}) {
  const { icon: Icon, className: color } = CONFIG[severity];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-2xs", className)}
      aria-label={`Severity: ${severity}`}
    >
      <Icon className={cn("size-3.5", color)} aria-hidden />
      {showLabel && <span className="text-foreground-muted">{severity}</span>}
    </span>
  );
}
