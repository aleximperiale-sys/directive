import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { usePersonas } from "@/hooks/useContext";
import { humanize } from "@/lib/format";

export default function PersonasSettings() {
  const { data: personas, isLoading } = usePersonas();

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-3">
      <p className="text-2xs text-foreground-muted">
        Personas scope which categories and actions a user sees
        (Directive_Persona__mdt).
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {(personas ?? []).map((p) => (
          <div
            key={p.key}
            className="space-y-3 rounded-lg border border-border bg-surface p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">{p.label}</h2>
              <Badge variant="outline">{p.defaultView}</Badge>
            </div>
            <div>
              <div className="mb-1 text-2xs font-medium uppercase tracking-wide text-foreground-muted">
                Categories
              </div>
              <div className="flex flex-wrap gap-1">
                {p.categories.map((c) => (
                  <Badge key={c} variant="default">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-2xs font-medium uppercase tracking-wide text-foreground-muted">
                Allowed actions ({p.allowedActions.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {p.allowedActions.map((a) => (
                  <span
                    key={a}
                    className="rounded border border-border px-1.5 py-0.5 text-[10px] text-foreground-muted"
                  >
                    {humanize(a)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
