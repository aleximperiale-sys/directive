import type {
  AgentActivityStatus,
  OperationalCondition,
  ReasonCode,
  Status,
  WorkItemType,
} from "./types";

/** Display labels for enum tokens that need more than humanize() gives. */

export const TYPE_LABELS: Record<WorkItemType, string> = {
  SLA_Risk: "SLA risk",
  Critical_Case: "Critical case",
  High_Value_At_Risk: "High-value account at risk",
  Repeated_Response: "Repeated customer response",
  Escalation: "Escalation",
  Agent_Failure: "Agent failure",
  Routing_Anomaly: "Routing anomaly",
  Knowledge_Gap: "Knowledge gap",
  Approval: "Approval",
};

export const STATUS_LABELS: Record<Status, string> = {
  New: "New",
  In_Progress: "In progress",
  Waiting: "Waiting",
  Snoozed: "Snoozed",
  Completed: "Completed",
  Dismissed: "Dismissed",
};

export const REASON_CODE_LABELS: Record<ReasonCode, string> = {
  SLA_BREACH_IMMINENT: "SLA breach imminent",
  NO_OWNER_ACTION: "No owner action",
  HIGH_VALUE_ACCOUNT: "High-value account",
  REPEATED_CUSTOMER_RESPONSE: "Repeated customer response",
  EXECUTIVE_ENGAGEMENT_GAP: "Executive engagement gap",
  AGENT_FAILURE: "Agent failure",
  KNOWLEDGE_GAP: "Knowledge gap",
  RECOVERY_ALREADY_SCHEDULED: "Recovery already scheduled",
  DUPLICATE_WORK: "Duplicate work",
};

export const REASON_CODE_DESCRIPTIONS: Record<ReasonCode, string> = {
  SLA_BREACH_IMMINENT: "The service-level agreement will be missed soon.",
  NO_OWNER_ACTION: "No owner has acted since this was detected.",
  HIGH_VALUE_ACCOUNT: "This account is in the top revenue tier.",
  REPEATED_CUSTOMER_RESPONSE: "The customer has replied multiple times unanswered.",
  EXECUTIVE_ENGAGEMENT_GAP: "An executive relationship needs attention.",
  AGENT_FAILURE: "An Agentforce action failed to complete.",
  KNOWLEDGE_GAP: "No knowledge article covers this issue.",
  RECOVERY_ALREADY_SCHEDULED: "A recovery activity is already on the calendar.",
  DUPLICATE_WORK: "Another work item already covers this.",
};

export const AGENT_STATUS_LABELS: Record<AgentActivityStatus, string> = {
  Completed: "Completed",
  Awaiting_Approval: "Awaiting approval",
  Failed: "Failed",
  Rejected: "Rejected",
  Dismissed: "Dismissed",
};

export const CONDITION_LABELS: Record<OperationalCondition, string> = {
  Needs_Attention: "Needs attention",
  Newly_At_Risk: "Newly at risk",
  Improving: "Improving",
  Expanding: "Expanding",
  Quiet: "Quiet",
  Waiting_On_Us: "Waiting on us",
  Waiting_On_Customer: "Waiting on customer",
};

export const CONDITION_ORDER: OperationalCondition[] = [
  "Needs_Attention",
  "Newly_At_Risk",
  "Waiting_On_Us",
  "Improving",
  "Expanding",
  "Waiting_On_Customer",
  "Quiet",
];
