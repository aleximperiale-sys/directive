import {
  formatDistanceToNowStrict,
  isPast,
  differenceInCalendarDays,
  format,
} from "date-fns";

/** Relative time like "3h ago" / "in 2d". Accepts ISO string or Date. */
export function relativeTime(value: string | Date | null | undefined): string {
  if (!value) return " - ";
  const date = typeof value === "string" ? new Date(value) : value;
  const suffix = isPast(date) ? " ago" : "";
  const prefix = isPast(date) ? "" : "in ";
  return prefix + formatDistanceToNowStrict(date) + suffix;
}

/** Human due-date phrasing with overdue awareness. */
export function dueLabel(value: string | Date | null | undefined): {
  text: string;
  overdue: boolean;
} {
  if (!value) return { text: "No due date", overdue: false };
  const date = typeof value === "string" ? new Date(value) : value;
  const overdue = isPast(date);
  const days = differenceInCalendarDays(date, new Date());
  if (overdue) return { text: `Overdue ${relativeTime(date)}`, overdue: true };
  if (days === 0) return { text: `Due today`, overdue: false };
  if (days === 1) return { text: `Due tomorrow`, overdue: false };
  return { text: `Due in ${days}d`, overdue: false };
}

export function absoluteTime(value: string | Date | null | undefined): string {
  if (!value) return " - ";
  const date = typeof value === "string" ? new Date(value) : value;
  return format(date, "MMM d, yyyy 'at' h:mm a");
}

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function currency(value: number | null | undefined): string {
  if (value == null) return " - ";
  return currencyFmt.format(value);
}

/** Compact currency for tight spaces: $1.2M, $84K. */
export function currencyCompact(value: number | null | undefined): string {
  if (value == null) return " - ";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function percent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/** Convert an enum-ish token like "In_Progress" or "SLA_Risk" to a label. */
export function humanize(token: string | null | undefined): string {
  if (!token) return "";
  return token
    .replace(/_/g, " ")
    .replace(/\b([A-Z]{2,})\b/g, (m) => m) // keep acronyms (SLA, AI)
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
