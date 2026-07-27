/**
 * Domain types for Directive. Field names and picklist values mirror
 * CONTRACT.md exactly so the mock adapter and the real Salesforce adapter are
 * interchangeable. Where the org uses `__c` API names, the UI uses camelCase
 * and the Salesforce adapter is responsible for the mapping.
 */

export const WORK_ITEM_TYPES = [
  "SLA_Risk",
  "Critical_Case",
  "High_Value_At_Risk",
  "Repeated_Response",
  "Escalation",
  "Agent_Failure",
  "Routing_Anomaly",
  "Knowledge_Gap",
  "Approval",
] as const;
export type WorkItemType = (typeof WORK_ITEM_TYPES)[number];

export const CATEGORIES = [
  "Revenue",
  "Customer",
  "Service",
  "Data",
  "AI",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATUSES = [
  "New",
  "In_Progress",
  "Waiting",
  "Snoozed",
  "Completed",
  "Dismissed",
] as const;
export type Status = (typeof STATUSES)[number];

export const SEVERITIES = ["Critical", "High", "Medium", "Low"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const PRIORITY_BANDS = [
  "Critical",
  "High",
  "Medium",
  "Low",
  "Background",
] as const;
export type PriorityBand = (typeof PRIORITY_BANDS)[number];

export const ACTION_KEYS = [
  "ESCALATE_CASE",
  "REASSIGN_CASE",
  "CREATE_FOLLOWUP_TASK",
  "DRAFT_CUSTOMER_RESPONSE",
  "GENERATE_CASE_SUMMARY",
  "NOTIFY_MANAGER",
  "CREATE_KNOWLEDGE_DRAFT",
  "APPROVE_RECOMMENDATION",
  "DISMISS_FALSE_POSITIVE",
  "SNOOZE_ITEM",
] as const;
export type ActionKey = (typeof ACTION_KEYS)[number];

export const REASON_CODES = [
  "SLA_BREACH_IMMINENT",
  "NO_OWNER_ACTION",
  "HIGH_VALUE_ACCOUNT",
  "REPEATED_CUSTOMER_RESPONSE",
  "EXECUTIVE_ENGAGEMENT_GAP",
  "AGENT_FAILURE",
  "KNOWLEDGE_GAP",
  "RECOVERY_ALREADY_SCHEDULED",
  "DUPLICATE_WORK",
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export const SCORE_COMPONENT_KEYS = [
  "BASE_RULE",
  "URGENCY",
  "BUSINESS_IMPACT",
  "CUSTOMER_IMPORTANCE",
  "SLA_EXPOSURE",
  "USER_RELEVANCE",
  "CONFIDENCE",
  "ESCALATION",
  "RECENCY",
  "MITIGATION",
  "SUPPRESSION",
] as const;
export type ScoreComponentKey = (typeof SCORE_COMPONENT_KEYS)[number];

/** One decomposed contribution to a priority score (spec 13.4). */
export interface ScoreContribution {
  key: ScoreComponentKey;
  /** Human label, e.g. "Revenue exposure". */
  label: string;
  /** Signed points; negative values mitigate the score. */
  value: number;
}

export interface PriorityBreakdown {
  score: number;
  band: PriorityBand;
  contributions: ScoreContribution[];
}

export interface RelatedContextItem {
  id: string;
  label: string;
  value: string;
  /** Optional deep link into the source record. */
  href?: string;
  kind?: "case" | "account" | "contact" | "agent" | "signal" | "metric";
}

export interface RecommendedAction {
  id: string;
  actionKey: ActionKey;
  label: string;
  description: string;
  /** UX affordance the button maps to. */
  affordance: "Execute" | "Review" | "Snooze" | "Dismiss";
  confirmationRequired: boolean;
  approvalRequired: boolean;
  requiredCustomPermission?: string;
  /** For AI recommendations. */
  confidence?: number;
  primary?: boolean;
}

export interface WorkItem {
  id: string;
  title: string;
  summary: string;
  type: WorkItemType;
  category: Category;
  status: Status;
  severity: Severity;
  priority: PriorityBreakdown;
  businessImpact: string;
  /** Estimated revenue exposure in USD, when quantifiable. */
  revenueExposure?: number;
  reasonCodes: ReasonCode[];
  /** One-line natural-language explanation (Explanation__c). */
  explanation: string;
  confidence?: number;
  assignedUser?: string;
  accountName?: string;
  accountId?: string;
  sourceObject?: string;
  sourceRecordId?: string;
  sourceRecordLabel?: string;
  ruleKey?: string;
  detectedAt: string;
  dueAt?: string;
  snoozedUntil?: string;
  completedAt?: string;
  completedBy?: string;
  relatedContext: RelatedContextItem[];
  actions: RecommendedAction[];
  /** True when this item is an approval that a human must decide. */
  isApproval?: boolean;
}

export interface Signal {
  id: string;
  signalType: string;
  sourceObject: string;
  sourceRecordId: string;
  occurredAt: string;
  rawValue: string;
}

// ---- AI activity (Agentforce transparency) ----

export type AgentActivityStatus =
  | "Completed"
  | "Awaiting_Approval"
  | "Failed"
  | "Rejected"
  | "Dismissed";

export interface AgentActivity {
  id: string;
  workItemId?: string;
  actionKey: ActionKey;
  actionLabel: string;
  status: AgentActivityStatus;
  occurredAt: string;
  /** What the agent looked at. */
  contextUsed: string[];
  /** What it concluded. */
  conclusion: string;
  confidence: number;
  /** What it proposed doing. */
  proposedAction: string;
  /** Who approved / decided, if applicable. */
  humanApproval?: { by: string; decision: "Approved" | "Rejected"; at: string };
  /** Measured or expected outcome. */
  outcome?: string;
}

// ---- Customers ----

export type OperationalCondition =
  | "Needs_Attention"
  | "Newly_At_Risk"
  | "Improving"
  | "Expanding"
  | "Quiet"
  | "Waiting_On_Us"
  | "Waiting_On_Customer";

export interface CustomerAccount {
  id: string;
  name: string;
  condition: OperationalCondition;
  arr: number;
  openWorkItems: number;
  headline: string;
  owner: string;
  lastActivityAt: string;
}

// ---- Approvals ----

export interface ApprovalItem {
  id: string;
  workItemId: string;
  title: string;
  requestedAction: string;
  actionKey: ActionKey;
  requestedBy: string;
  requestedAt: string;
  accountName?: string;
  rationale: string;
  confidence?: number;
  priority: PriorityBreakdown;
}

// ---- Config (mirrors custom metadata) ----

export interface Persona {
  key: string;
  label: string;
  categories: Category[];
  defaultView: string;
  allowedActions: ActionKey[];
}

export interface ActionDefinition {
  actionKey: ActionKey;
  label: string;
  implementationType: "Flow" | "Apex" | "Agent";
  implementationName: string;
  confirmationRequired: boolean;
  approvalRequired: boolean;
  requiredCustomPermission?: string;
  supportedObject?: string;
  idempotent: boolean;
}

export interface ScoreComponent {
  key: ScoreComponentKey;
  label: string;
  weight: number;
  maximumContribution: number;
  calculationStrategy: "Apex" | "Formula" | "Static";
  active: boolean;
}

export interface WorkView {
  key: string;
  label: string;
  persona: string;
  filterDefinition: Record<string, unknown>;
  sort: string;
  shared: boolean;
}

// ---- Query filter model reflected in the URL on the Work page ----

export interface WorkQueryFilters {
  view: string;
  search?: string;
  severity?: Severity;
  category?: Category;
  type?: WorkItemType;
}
