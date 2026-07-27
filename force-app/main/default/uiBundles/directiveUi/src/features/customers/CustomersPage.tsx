import { useMemo } from "react";
import { Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useCustomers } from "@/hooks/useContext";
import { CONDITION_LABELS, CONDITION_ORDER } from "@/domain/labels";
import { currencyCompact, relativeTime } from "@/lib/format";
import type {
  CustomerAccount,
  OperationalCondition,
} from "@/domain/types";

const CONDITION_TONE: Record<
  OperationalCondition,
  "critical" | "warning" | "success" | "accent" | "info" | "default"
> = {
  Needs_Attention: "critical",
  Newly_At_Risk: "warning",
  Improving: "success",
  Expanding: "accent",
  Quiet: "default",
  Waiting_On_Us: "info",
  Waiting_On_Customer: "default",
};

export default function CustomersPage() {
  const { data: customers, isLoading } = useCustomers();

  const grouped = useMemo(() => {
    const map = new Map<OperationalCondition, CustomerAccount[]>();
    for (const c of customers ?? []) {
      const arr = map.get(c.condition) ?? [];
      arr.push(c);
      map.set(c.condition, arr);
    }
    return CONDITION_ORDER.map((condition) => ({
      condition,
      accounts: (map.get(condition) ?? []).sort((a, b) => b.arr - a.arr),
    })).filter((g) => g.accounts.length > 0);
  }, [customers]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-foreground-muted">
          Accounts grouped by operational condition.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ condition, accounts }) => (
            <section key={condition} aria-label={CONDITION_LABELS[condition]}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight">
                  {CONDITION_LABELS[condition]}
                </h2>
                <Badge variant={CONDITION_TONE[condition]}>
                  {accounts.length}
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {accounts.map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountCard({ account }: { account: CustomerAccount }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-surface-hover text-foreground-muted">
            <Building2 className="size-4" aria-hidden />
          </span>
          <h3 className="text-sm font-semibold leading-tight">
            {account.name}
          </h3>
        </div>
        <Badge variant={CONDITION_TONE[account.condition]}>
          {currencyCompact(account.arr)}
        </Badge>
      </div>
      <p className="text-2xs text-foreground-muted">{account.headline}</p>
      <div className="mt-auto flex items-center justify-between pt-1 text-[10px] text-foreground-muted">
        <span>
          {account.openWorkItems} open{" "}
          {account.openWorkItems === 1 ? "item" : "items"}
        </span>
        <span>Last activity {relativeTime(account.lastActivityAt)}</span>
      </div>
      <div className="text-[10px] text-foreground-muted">
        Owner: {account.owner}
      </div>
    </div>
  );
}
