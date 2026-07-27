import type { LucideIcon } from "lucide-react";
import {
  Inbox,
  ListTodo,
  LifeBuoy,
  BookOpen,
  Users,
  CheckSquare,
  Sparkles,
  BarChart3,
  Settings as SettingsIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/today", label: "Today", icon: Inbox },
  { to: "/work", label: "Work", icon: ListTodo },
  { to: "/cases", label: "Cases", icon: LifeBuoy },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/approvals", label: "Approvals", icon: CheckSquare },
  { to: "/knowledge-gaps", label: "Knowledge Gaps", icon: BookOpen },
  { to: "/ai-activity", label: "AI Activity", icon: Sparkles },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

/** Work-page view definitions (mirror Directive_View__mdt + spec view switcher). */
export interface QueueView {
  key: string;
  label: string;
  description: string;
}

export const QUEUE_VIEWS: QueueView[] = [
  { key: "my-work", label: "My work", description: "Assigned to me and active" },
  { key: "critical", label: "Critical", description: "Critical band only" },
  { key: "due-today", label: "Due today", description: "Due within 24 hours" },
  { key: "waiting", label: "Waiting", description: "Waiting on others" },
  { key: "approvals", label: "Approvals", description: "Needs your decision" },
  {
    key: "ai-recommendations",
    label: "AI recommendations",
    description: "Proposed by Agentforce",
  },
  {
    key: "recently-completed",
    label: "Recently completed",
    description: "Closed in the last 7 days",
  },
];

export const CURRENT_USER = {
  id: "user-me",
  name: "Jordan Rivera",
  firstName: "Jordan",
  role: "Service Operations Lead",
  email: "jordan.rivera@directive.example",
};
