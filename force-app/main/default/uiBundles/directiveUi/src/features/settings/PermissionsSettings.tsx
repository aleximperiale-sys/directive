import { useMemo } from "react";
import { KeyRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useActionDefinitions } from "@/hooks/useContext";
import { humanize } from "@/lib/format";
import type { ActionDefinition } from "@/domain/types";

const UNGATED = "No custom permission required";

export default function PermissionsSettings() {
  const { data: actions, isLoading } = useActionDefinitions();

  const groups = useMemo(() => {
    const map = new Map<string, ActionDefinition[]>();
    for (const a of actions ?? []) {
      const key = a.requiredCustomPermission ?? UNGATED;
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return [...map.entries()].sort((a, b) => {
      if (a[0] === UNGATED) return 1;
      if (b[0] === UNGATED) return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [actions]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-3">
      <p className="text-2xs text-foreground-muted">
        Custom permissions gating each action. Assign these via permission sets
        in the org.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {groups.map(([permission, defs]) => (
          <div
            key={permission}
            className="space-y-2 rounded-lg border border-border bg-surface p-4"
          >
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded bg-surface-hover text-foreground-muted">
                <KeyRound className="size-3.5" aria-hidden />
              </span>
              <h2 className="font-mono text-2xs font-medium text-foreground">
                {permission}
              </h2>
            </div>
            <div className="flex flex-wrap gap-1">
              {defs.map((d) => (
                <Badge key={d.actionKey} variant="outline">
                  {humanize(d.label)}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
