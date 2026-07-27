import { ChevronsUp, ArrowUp, Equal, ArrowDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { bandChipClasses } from "@/domain/priority";
import type { PriorityBand } from "@/domain/types";

const BAND_ICON: Record<PriorityBand, LucideIcon> = {
  Critical: ChevronsUp,
  High: ArrowUp,
  Medium: Equal,
  Low: ArrowDown,
  Background: Minus,
};

/**
 * Priority band + score chip. Uses an icon in addition to color so severity is
 * conveyed without relying on color alone (accessibility).
 */
export function PriorityBadge({
  band,
  score,
  showScore = true,
  className,
}: {
  band: PriorityBand;
  score: number;
  showScore?: boolean;
  className?: string;
}) {
  const Icon = BAND_ICON[band];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-2xs font-semibold leading-none",
        bandChipClasses(band),
        className,
      )}
      aria-label={`Priority ${band}${showScore ? `, score ${score}` : ""}`}
    >
      <Icon className="size-3" aria-hidden />
      <span>{band}</span>
      {showScore && <span className="tabular-nums opacity-70">· {score}</span>}
    </span>
  );
}
