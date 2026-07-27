import { Check, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useActionDefinitions } from "@/hooks/useContext";

export default function ActionsSettings() {
  const { data: actions, isLoading } = useActionDefinitions();

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-3">
      <p className="text-2xs text-foreground-muted">
        The action catalog (Directive_Action_Definition__mdt) - implementation,
        confirmation, and approval requirements.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-hover/50 text-2xs uppercase tracking-wide text-foreground-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Implementation</th>
              <th className="px-3 py-2 font-medium">Confirm</th>
              <th className="px-3 py-2 font-medium">Approval</th>
              <th className="px-3 py-2 font-medium">Idempotent</th>
              <th className="px-3 py-2 font-medium">Permission</th>
            </tr>
          </thead>
          <tbody>
            {(actions ?? []).map((a) => (
              <tr key={a.actionKey} className="border-t border-border">
                <td className="px-3 py-2.5 font-medium">{a.label}</td>
                <td className="px-3 py-2.5">
                  <Badge variant="outline">{a.implementationType}</Badge>
                </td>
                <td className="px-3 py-2.5 font-mono text-[10px] text-foreground-muted">
                  {a.implementationName}
                </td>
                <td className="px-3 py-2.5">
                  <BoolCell value={a.confirmationRequired} />
                </td>
                <td className="px-3 py-2.5">
                  <BoolCell value={a.approvalRequired} />
                </td>
                <td className="px-3 py-2.5">
                  <BoolCell value={a.idempotent} />
                </td>
                <td className="px-3 py-2.5 text-2xs text-foreground-muted">
                  {a.requiredCustomPermission ?? " - "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BoolCell({ value }: { value: boolean }) {
  return value ? (
    <Check className="size-4 text-success" aria-label="Yes" />
  ) : (
    <Minus className="size-4 text-foreground-muted" aria-label="No" />
  );
}
