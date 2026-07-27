import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useScoreComponents } from "@/hooks/useContext";

export default function ScoringSettings() {
  const { data: components, isLoading } = useScoreComponents();

  const totals = useMemo(() => {
    const active = (components ?? []).filter((c) => c.active);
    const positive = active
      .filter((c) => c.maximumContribution > 0)
      .reduce((s, c) => s + c.maximumContribution, 0);
    return { positive, count: active.length };
  }, [components]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-3">
      <p className="text-2xs text-foreground-muted">
        Priority score components (Directive_Score_Component__mdt).{" "}
        {totals.count} active components; positive contributions cap at{" "}
        {totals.positive} points before mitigations.
      </p>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-hover/50 text-2xs uppercase tracking-wide text-foreground-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Component</th>
              <th className="px-3 py-2 font-medium">Weight</th>
              <th className="px-3 py-2 font-medium">Max</th>
              <th className="px-3 py-2 font-medium">Strategy</th>
              <th className="px-3 py-2 font-medium">Active</th>
            </tr>
          </thead>
          <tbody>
            {(components ?? []).map((c) => (
              <tr key={c.key} className="border-t border-border">
                <td className="px-3 py-2.5 font-medium">{c.label}</td>
                <td
                  className={cn(
                    "px-3 py-2.5 tabular-nums font-medium",
                    c.weight < 0 ? "text-critical" : "text-foreground",
                  )}
                >
                  {c.weight > 0 ? `+${c.weight}` : c.weight}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-foreground-muted">
                  {c.maximumContribution}
                </td>
                <td className="px-3 py-2.5">
                  <Badge variant="outline">{c.calculationStrategy}</Badge>
                </td>
                <td className="px-3 py-2.5">
                  <Badge variant={c.active ? "success" : "default"}>
                    {c.active ? "Active" : "Off"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
