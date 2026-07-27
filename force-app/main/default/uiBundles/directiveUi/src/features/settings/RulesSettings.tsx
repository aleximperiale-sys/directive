import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useMyWork } from "@/hooks/useWork";
import { useViews } from "@/hooks/useContext";
import { humanize } from "@/lib/format";
import { TYPE_LABELS } from "@/domain/labels";
import type { Category } from "@/domain/types";

interface RuleRow {
  ruleKey: string;
  matches: number;
  categories: Category[];
  example: string;
}

export default function RulesSettings() {
  const { data: work, isLoading } = useMyWork();
  const { data: views } = useViews();

  const rules = useMemo<RuleRow[]>(() => {
    const map = new Map<string, RuleRow>();
    for (const w of work ?? []) {
      if (!w.ruleKey) continue;
      const existing =
        map.get(w.ruleKey) ??
        ({ ruleKey: w.ruleKey, matches: 0, categories: [], example: "" } as RuleRow);
      existing.matches += 1;
      if (!existing.categories.includes(w.category))
        existing.categories.push(w.category);
      if (!existing.example) existing.example = `${TYPE_LABELS[w.type]} - ${w.title}`;
      map.set(w.ruleKey, existing);
    }
    return [...map.values()].sort((a, b) => b.matches - a.matches);
  }, [work]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Detection rules
          </h2>
          <p className="text-2xs text-foreground-muted">
            Signal rules currently generating work, derived from active items.
          </p>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-hover/50 text-2xs uppercase tracking-wide text-foreground-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Rule</th>
                <th className="px-3 py-2 font-medium">Matches</th>
                <th className="px-3 py-2 font-medium">Categories</th>
                <th className="px-3 py-2 font-medium">Example</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.ruleKey} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium">
                    {humanize(r.ruleKey)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-foreground-muted">
                    {r.matches}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {r.categories.map((c) => (
                        <Badge key={c} variant="outline">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-2xs text-foreground-muted">
                    {r.example}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Saved views</h2>
          <p className="text-2xs text-foreground-muted">
            Shared queue definitions (Directive_View__mdt).
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(views ?? []).map((v) => (
            <div
              key={v.key}
              className="rounded-lg border border-border bg-surface p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{v.label}</span>
                {v.shared && <Badge variant="accent">Shared</Badge>}
              </div>
              <p className="mt-1 font-mono text-[10px] text-foreground-muted">
                sort: {v.sort}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
