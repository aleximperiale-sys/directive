import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { REASON_CODE_DESCRIPTIONS, REASON_CODE_LABELS } from "@/domain/labels";
import type { ReasonCode } from "@/domain/types";

/**
 * "Why this appeared" - reason codes with human labels and a tooltip
 * explanation for each. Directive never shows an unexplained signal.
 */
export function ReasonCodes({ codes }: { codes: ReasonCode[] }) {
  if (codes.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Reasons this appeared">
      {codes.map((code) => (
        <li key={code}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="cursor-help">
                {REASON_CODE_LABELS[code]}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-[240px]">
              {REASON_CODE_DESCRIPTIONS[code]}
            </TooltipContent>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
}
