import { bandForScore, scoreFromContributions } from "@/domain/priority";
import type {
  ActionDefinition,
  AgentActivity,
  ApprovalItem,
  CustomerAccount,
  Persona,
  PriorityBreakdown,
  RecommendedAction,
  ScoreComponent,
  ScoreContribution,
  WorkItem,
  WorkView,
} from "@/domain/types";

// ---- date helpers (relative to load time so the queue always feels fresh) ----
const now = Date.now();
const H = 3600_000;
const D = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();
const hoursAgo = (h: number) => iso(now - h * H);
const hoursAhead = (h: number) => iso(now + h * H);
const daysAgo = (d: number) => iso(now - d * D);
const daysAhead = (d: number) => iso(now + d * D);

/** Build a PriorityBreakdown from contributions, deriving score + band. */
function breakdown(contributions: ScoreContribution[]): PriorityBreakdown {
  const score = scoreFromContributions(contributions);
  return { score, band: bandForScore(score), contributions };
}

/** Action factory pulling defaults from ACTION_DEFINITIONS. */
function action(
  actionKey: RecommendedAction["actionKey"],
  overrides: Partial<RecommendedAction> = {},
): RecommendedAction {
  const def = ACTION_DEFINITIONS.find((a) => a.actionKey === actionKey);
  return {
    id: `${actionKey}-${Math.random().toString(36).slice(2, 8)}`,
    actionKey,
    label: def?.label ?? actionKey,
    description: "",
    affordance: "Execute",
    confirmationRequired: def?.confirmationRequired ?? false,
    approvalRequired: def?.approvalRequired ?? false,
    requiredCustomPermission: def?.requiredCustomPermission,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Config seed (mirrors custom metadata in force-app)
// ---------------------------------------------------------------------------

export const PERSONAS: Persona[] = [
  {
    key: "Service_Operations",
    label: "Service Operations",
    categories: ["Revenue", "Customer", "Service", "Data", "AI"],
    defaultView: "my-work",
    allowedActions: [
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
    ],
  },
];

export const ACTION_DEFINITIONS: ActionDefinition[] = [
  {
    actionKey: "ESCALATE_CASE",
    label: "Escalate Case",
    implementationType: "Flow",
    implementationName: "Directive_Escalate_Case_Flow",
    confirmationRequired: true,
    approvalRequired: false,
    requiredCustomPermission: "Directive_Escalate_Case",
    supportedObject: "Case",
    idempotent: false,
  },
  {
    actionKey: "REASSIGN_CASE",
    label: "Reassign Case",
    implementationType: "Flow",
    implementationName: "Directive_Reassign_Case_Flow",
    confirmationRequired: true,
    approvalRequired: false,
    requiredCustomPermission: "Directive_Reassign_Work",
    supportedObject: "Case",
    idempotent: false,
  },
  {
    actionKey: "CREATE_FOLLOWUP_TASK",
    label: "Create Follow-up Task",
    implementationType: "Apex",
    implementationName: "DirectiveCreateFollowupTask",
    confirmationRequired: false,
    approvalRequired: false,
    supportedObject: "Task",
    idempotent: true,
  },
  {
    actionKey: "DRAFT_CUSTOMER_RESPONSE",
    label: "Draft Customer Response",
    implementationType: "Agent",
    implementationName: "Directive_Draft_Response_Topic",
    confirmationRequired: false,
    approvalRequired: true,
    requiredCustomPermission: "Directive_Execute_AI_Action",
    supportedObject: "Case",
    idempotent: false,
  },
  {
    actionKey: "GENERATE_CASE_SUMMARY",
    label: "Generate Case Summary",
    implementationType: "Agent",
    implementationName: "Directive_Case_Summary_Topic",
    confirmationRequired: false,
    approvalRequired: false,
    requiredCustomPermission: "Directive_Execute_AI_Action",
    supportedObject: "Case",
    idempotent: true,
  },
  {
    actionKey: "NOTIFY_MANAGER",
    label: "Notify Manager",
    implementationType: "Flow",
    implementationName: "Directive_Notify_Manager_Flow",
    confirmationRequired: false,
    approvalRequired: false,
    idempotent: true,
  },
  {
    actionKey: "CREATE_KNOWLEDGE_DRAFT",
    label: "Create Knowledge Draft",
    implementationType: "Agent",
    implementationName: "Directive_Knowledge_Draft_Topic",
    confirmationRequired: false,
    approvalRequired: true,
    requiredCustomPermission: "Directive_Publish_Knowledge",
    supportedObject: "Knowledge__kav",
    idempotent: false,
  },
  {
    actionKey: "APPROVE_RECOMMENDATION",
    label: "Approve Recommendation",
    implementationType: "Apex",
    implementationName: "DirectiveApproveRecommendation",
    confirmationRequired: true,
    approvalRequired: false,
    requiredCustomPermission: "Directive_Approve_Recommendation",
    idempotent: false,
  },
  {
    actionKey: "DISMISS_FALSE_POSITIVE",
    label: "Dismiss as False Positive",
    implementationType: "Apex",
    implementationName: "DirectiveDismissItem",
    confirmationRequired: true,
    approvalRequired: false,
    idempotent: true,
  },
  {
    actionKey: "SNOOZE_ITEM",
    label: "Snooze",
    implementationType: "Apex",
    implementationName: "DirectiveSnoozeItem",
    confirmationRequired: false,
    approvalRequired: false,
    idempotent: true,
  },
];

export const SCORE_COMPONENTS: ScoreComponent[] = [
  { key: "BASE_RULE", label: "Base rule", weight: 20, maximumContribution: 20, calculationStrategy: "Static", active: true },
  { key: "URGENCY", label: "Urgency", weight: 20, maximumContribution: 20, calculationStrategy: "Formula", active: true },
  { key: "BUSINESS_IMPACT", label: "Revenue exposure", weight: 25, maximumContribution: 25, calculationStrategy: "Apex", active: true },
  { key: "CUSTOMER_IMPORTANCE", label: "Customer importance", weight: 15, maximumContribution: 15, calculationStrategy: "Apex", active: true },
  { key: "SLA_EXPOSURE", label: "SLA exposure", weight: 15, maximumContribution: 15, calculationStrategy: "Formula", active: true },
  { key: "USER_RELEVANCE", label: "Relevance to you", weight: 10, maximumContribution: 10, calculationStrategy: "Apex", active: true },
  { key: "CONFIDENCE", label: "Confidence", weight: 10, maximumContribution: 10, calculationStrategy: "Apex", active: true },
  { key: "ESCALATION", label: "Escalation", weight: 10, maximumContribution: 10, calculationStrategy: "Formula", active: true },
  { key: "RECENCY", label: "Recency", weight: 8, maximumContribution: 8, calculationStrategy: "Formula", active: true },
  { key: "MITIGATION", label: "Recovery activity", weight: -12, maximumContribution: 0, calculationStrategy: "Apex", active: true },
  { key: "SUPPRESSION", label: "Duplicate suppression", weight: -20, maximumContribution: 0, calculationStrategy: "Apex", active: true },
];

export const WORK_VIEWS: WorkView[] = [
  { key: "my-work", label: "My work", persona: "Service_Operations", filterDefinition: { assignedToMe: true, status: ["New", "In_Progress", "Waiting"] }, sort: "Priority_Score__c DESC", shared: true },
  { key: "critical", label: "Critical", persona: "Service_Operations", filterDefinition: { band: "Critical" }, sort: "Priority_Score__c DESC", shared: true },
  { key: "due-today", label: "Due today", persona: "Service_Operations", filterDefinition: { dueWithinHours: 24 }, sort: "Due_At__c ASC", shared: true },
];

// ---------------------------------------------------------------------------
// Work items - a realistic Service Operations queue
// ---------------------------------------------------------------------------

export const WORK_ITEMS: WorkItem[] = [
  // 1. The canonical flagship example - Acme renewal at risk, score 92.
  {
    id: "wi-001",
    title: "Acme renewal is at risk",
    summary:
      "Two critical cases open for 9 days on Acme's production integration, 6 weeks before a $480K renewal. No owner reply since Tuesday.",
    type: "High_Value_At_Risk",
    category: "Revenue",
    status: "New",
    severity: "Critical",
    priority: breakdown([
      { key: "BUSINESS_IMPACT", label: "Revenue exposure", value: 18 },
      { key: "CUSTOMER_IMPORTANCE", label: "Customer importance", value: 15 },
      { key: "SLA_EXPOSURE", label: "SLA exposure", value: 14 },
      { key: "BASE_RULE", label: "Base rule", value: 20 },
      { key: "URGENCY", label: "Urgency", value: 16 },
      { key: "ESCALATION", label: "Executive engagement gap", value: 9 },
      { key: "MITIGATION", label: "Recovery activity already scheduled", value: -8 },
      { key: "SUPPRESSION", label: "Duplicate suppression", value: 0 },
    ]),
    businessImpact: "$480K ARR renewal in 6 weeks with an unresolved production issue.",
    revenueExposure: 480000,
    reasonCodes: [
      "HIGH_VALUE_ACCOUNT",
      "SLA_BREACH_IMMINENT",
      "NO_OWNER_ACTION",
      "EXECUTIVE_ENGAGEMENT_GAP",
      "RECOVERY_ALREADY_SCHEDULED",
    ],
    explanation:
      "Acme is a top-tier account with a $480K renewal in 6 weeks. Two critical cases have been open 9 days with no owner reply since Tuesday, and the executive sponsor has not been engaged. A recovery call is on the calendar, which slightly reduces urgency.",
    confidence: 0.93,
    assignedUser: "Jordan Rivera",
    accountName: "Acme Corporation",
    accountId: "acc-acme",
    sourceObject: "Case",
    sourceRecordId: "500A000001",
    sourceRecordLabel: "Case #48213 - Production sync failing",
    ruleKey: "High_Value_Account_Critical_Case",
    detectedAt: hoursAgo(5),
    dueAt: hoursAhead(3),
    relatedContext: [
      { id: "c1", label: "Primary case", value: "#48213 - Production sync failing", kind: "case", href: "#" },
      { id: "c2", label: "Second case", value: "#48180 - API latency SLA", kind: "case", href: "#" },
      { id: "c3", label: "Account", value: "Acme Corporation · $480K ARR", kind: "account", href: "#" },
      { id: "c4", label: "Exec sponsor", value: "Dana Fowler (VP Eng) - no touch in 21d", kind: "contact" },
      { id: "c5", label: "Recovery activity", value: "Recovery call scheduled Fri 2pm", kind: "metric" },
    ],
    actions: [
      action("ESCALATE_CASE", { primary: true, affordance: "Execute", description: "Escalate #48213 to Tier 3 with the renewal context attached." }),
      action("NOTIFY_MANAGER", { affordance: "Execute", description: "Alert the account's success manager and your director." }),
      action("GENERATE_CASE_SUMMARY", { affordance: "Review", description: "Draft an executive summary of both cases.", confidence: 0.9 }),
      action("SNOOZE_ITEM", { affordance: "Snooze", description: "Snooze until the recovery call concludes." }),
    ],
  },

  // 2. SLA risk
  {
    id: "wi-002",
    title: "SLA breach in 40 minutes on Northwind case",
    summary:
      "First-response SLA on #48991 expires in 40 minutes. Case is unassigned in the Tier 1 queue.",
    type: "SLA_Risk",
    category: "Service",
    status: "New",
    severity: "High",
    priority: breakdown([
      { key: "SLA_EXPOSURE", label: "SLA exposure", value: 15 },
      { key: "URGENCY", label: "Urgency", value: 19 },
      { key: "BASE_RULE", label: "Base rule", value: 18 },
      { key: "ESCALATION", label: "No owner action", value: 12 },
      { key: "RECENCY", label: "Recency", value: 6 },
    ]),
    businessImpact: "Breaching first-response SLA affects the account's contractual guarantee.",
    reasonCodes: ["SLA_BREACH_IMMINENT", "NO_OWNER_ACTION"],
    explanation:
      "The first-response SLA on case #48991 expires in 40 minutes and no agent has picked it up from the Tier 1 queue.",
    confidence: 0.88,
    assignedUser: "Jordan Rivera",
    accountName: "Northwind Traders",
    accountId: "acc-northwind",
    sourceObject: "Case",
    sourceRecordId: "500A000002",
    sourceRecordLabel: "Case #48991 - Login errors after SSO change",
    ruleKey: "Case_SLA_Breach",
    detectedAt: hoursAgo(1),
    dueAt: hoursAhead(0.6),
    relatedContext: [
      { id: "c1", label: "Case", value: "#48991 - Login errors after SSO change", kind: "case", href: "#" },
      { id: "c2", label: "Queue", value: "Tier 1 Support - 14 waiting", kind: "metric" },
      { id: "c3", label: "SLA target", value: "First response within 1h", kind: "metric" },
    ],
    actions: [
      action("REASSIGN_CASE", { primary: true, affordance: "Execute", description: "Assign to an available Tier 1 agent now." }),
      action("DRAFT_CUSTOMER_RESPONSE", { affordance: "Review", description: "Draft an acknowledgement to stop the SLA clock.", confidence: 0.82 }),
      action("SNOOZE_ITEM", { affordance: "Snooze", description: "Snooze 15 minutes." }),
    ],
  },

  // 3. Critical case, no owner action
  {
    id: "wi-003",
    title: "Critical case untouched for 26 hours",
    summary:
      "Sev-1 outage case for Globex has had no owner activity in 26 hours despite customer replies.",
    type: "Critical_Case",
    category: "Service",
    status: "In_Progress",
    severity: "Critical",
    priority: breakdown([
      { key: "BASE_RULE", label: "Base rule", value: 20 },
      { key: "URGENCY", label: "Urgency", value: 18 },
      { key: "SLA_EXPOSURE", label: "SLA exposure", value: 12 },
      { key: "ESCALATION", label: "Escalation", value: 10 },
      { key: "CUSTOMER_IMPORTANCE", label: "Customer importance", value: 11 },
      { key: "RECENCY", label: "Recency", value: 5 },
    ]),
    businessImpact: "Sev-1 outage impacting Globex checkout; every hour risks churn signals.",
    reasonCodes: ["NO_OWNER_ACTION", "REPEATED_CUSTOMER_RESPONSE"],
    explanation:
      "This Sev-1 outage case has had no owner activity for 26 hours even though the customer has replied twice.",
    confidence: 0.91,
    assignedUser: "Priya Nair",
    accountName: "Globex",
    accountId: "acc-globex",
    sourceObject: "Case",
    sourceRecordId: "500A000003",
    sourceRecordLabel: "Case #48044 - Checkout 500 errors",
    ruleKey: "Critical_Case_No_Owner_Action",
    detectedAt: hoursAgo(26),
    dueAt: hoursAhead(1),
    relatedContext: [
      { id: "c1", label: "Case", value: "#48044 - Checkout 500 errors", kind: "case", href: "#" },
      { id: "c2", label: "Owner", value: "Priya Nair - last active 26h ago", kind: "agent" },
      { id: "c3", label: "Customer replies", value: "2 unanswered replies", kind: "signal" },
    ],
    actions: [
      action("ESCALATE_CASE", { primary: true, affordance: "Execute", description: "Escalate to on-call engineering." }),
      action("NOTIFY_MANAGER", { affordance: "Execute", description: "Notify the owner's manager." }),
      action("GENERATE_CASE_SUMMARY", { affordance: "Review", description: "Summarize the thread for handoff.", confidence: 0.87 }),
    ],
  },

  // 4. Repeated response
  {
    id: "wi-004",
    title: "Customer has replied 4 times with no answer",
    summary:
      "Initech contact replied 4 times on #47820 asking for a status update; last agent reply was 5 days ago.",
    type: "Repeated_Response",
    category: "Customer",
    status: "New",
    severity: "High",
    priority: breakdown([
      { key: "BASE_RULE", label: "Base rule", value: 16 },
      { key: "URGENCY", label: "Urgency", value: 12 },
      { key: "CUSTOMER_IMPORTANCE", label: "Customer importance", value: 10 },
      { key: "ESCALATION", label: "Escalation", value: 8 },
      { key: "RECENCY", label: "Recency", value: 7 },
      { key: "SLA_EXPOSURE", label: "SLA exposure", value: 10 },
    ]),
    businessImpact: "Repeated unanswered replies are the top predictor of a CSAT detractor.",
    reasonCodes: ["REPEATED_CUSTOMER_RESPONSE", "NO_OWNER_ACTION"],
    explanation:
      "The customer has replied 4 times on case #47820 with no agent answer for 5 days.",
    confidence: 0.85,
    assignedUser: "Jordan Rivera",
    accountName: "Initech",
    accountId: "acc-initech",
    sourceObject: "Case",
    sourceRecordId: "500A000004",
    sourceRecordLabel: "Case #47820 - Invoice discrepancy",
    ruleKey: "Repeated_Customer_Response",
    detectedAt: hoursAgo(9),
    dueAt: hoursAhead(6),
    relatedContext: [
      { id: "c1", label: "Case", value: "#47820 - Invoice discrepancy", kind: "case", href: "#" },
      { id: "c2", label: "Thread", value: "4 customer replies · 0 agent replies (5d)", kind: "signal" },
    ],
    actions: [
      action("DRAFT_CUSTOMER_RESPONSE", { primary: true, affordance: "Review", description: "Draft a status update citing the last known state.", confidence: 0.8 }),
      action("CREATE_FOLLOWUP_TASK", { affordance: "Execute", description: "Create a task to follow up tomorrow." }),
      action("SNOOZE_ITEM", { affordance: "Snooze", description: "Snooze 4 hours." }),
    ],
  },

  // 5. Escalation
  {
    id: "wi-005",
    title: "Escalation requested by account team for Umbrella",
    summary:
      "The Umbrella account team flagged #48500 for escalation ahead of a QBR next week.",
    type: "Escalation",
    category: "Customer",
    status: "New",
    severity: "High",
    priority: breakdown([
      { key: "ESCALATION", label: "Escalation", value: 10 },
      { key: "CUSTOMER_IMPORTANCE", label: "Customer importance", value: 13 },
      { key: "BASE_RULE", label: "Base rule", value: 15 },
      { key: "URGENCY", label: "Urgency", value: 12 },
      { key: "BUSINESS_IMPACT", label: "Revenue exposure", value: 12 },
    ]),
    businessImpact: "QBR next week; unresolved escalation undermines the expansion conversation.",
    revenueExposure: 220000,
    reasonCodes: ["HIGH_VALUE_ACCOUNT", "EXECUTIVE_ENGAGEMENT_GAP"],
    explanation:
      "The account team escalated case #48500 ahead of next week's QBR with Umbrella.",
    confidence: 0.79,
    assignedUser: "Jordan Rivera",
    accountName: "Umbrella Corp",
    accountId: "acc-umbrella",
    sourceObject: "Case",
    sourceRecordId: "500A000005",
    sourceRecordLabel: "Case #48500 - Data export timeouts",
    detectedAt: hoursAgo(20),
    dueAt: daysAhead(2),
    relatedContext: [
      { id: "c1", label: "Case", value: "#48500 - Data export timeouts", kind: "case", href: "#" },
      { id: "c2", label: "Upcoming", value: "QBR in 6 days", kind: "metric" },
    ],
    actions: [
      action("ESCALATE_CASE", { primary: true, affordance: "Execute", description: "Escalate with QBR context." }),
      action("GENERATE_CASE_SUMMARY", { affordance: "Review", confidence: 0.84, description: "Prepare a QBR-ready summary." }),
      action("DISMISS_FALSE_POSITIVE", { affordance: "Dismiss", description: "Not actually an escalation." }),
    ],
  },

  // 6. Agent failure (Agentforce) - awaiting nothing, but a failure
  {
    id: "wi-006",
    title: "Agentforce action failed on auto-response",
    summary:
      "The DRAFT_CUSTOMER_RESPONSE agent action failed with a callout timeout on #48777.",
    type: "Agent_Failure",
    category: "AI",
    status: "New",
    severity: "Medium",
    priority: breakdown([
      { key: "ESCALATION", label: "Agent failure", value: 14 },
      { key: "BASE_RULE", label: "Base rule", value: 12 },
      { key: "URGENCY", label: "Urgency", value: 8 },
      { key: "RECENCY", label: "Recency", value: 6 },
      { key: "CONFIDENCE", label: "Confidence", value: 5 },
    ]),
    businessImpact: "A stalled agent action means a customer response was never sent.",
    reasonCodes: ["AGENT_FAILURE", "NO_OWNER_ACTION"],
    explanation:
      "An Agentforce draft-response action failed with a callout timeout, so no reply was sent on case #48777.",
    confidence: 0.72,
    assignedUser: "Jordan Rivera",
    accountName: "Soylent Corp",
    accountId: "acc-soylent",
    sourceObject: "Case",
    sourceRecordId: "500A000006",
    sourceRecordLabel: "Case #48777 - Password reset loop",
    detectedAt: hoursAgo(3),
    dueAt: hoursAhead(8),
    relatedContext: [
      { id: "c1", label: "Case", value: "#48777 - Password reset loop", kind: "case", href: "#" },
      { id: "c2", label: "Failure", value: "Callout timeout (HTTP 504) at 11:04", kind: "signal" },
      { id: "c3", label: "Action run", value: "Directive_Action_Run a09… - Failed", kind: "metric" },
    ],
    actions: [
      action("DRAFT_CUSTOMER_RESPONSE", { primary: true, affordance: "Review", confidence: 0.7, description: "Retry the draft manually." }),
      action("CREATE_FOLLOWUP_TASK", { affordance: "Execute", description: "Task an agent to reply directly." }),
      action("DISMISS_FALSE_POSITIVE", { affordance: "Dismiss", description: "Dismiss - already handled elsewhere." }),
    ],
  },

  // 7. Routing anomaly
  {
    id: "wi-007",
    title: "Routing anomaly: 30 cases piled into one queue",
    summary:
      "A routing rule change sent 30 billing cases to the Tier 3 queue in the last hour.",
    type: "Routing_Anomaly",
    category: "Data",
    status: "New",
    severity: "Medium",
    priority: breakdown([
      { key: "BASE_RULE", label: "Base rule", value: 12 },
      { key: "URGENCY", label: "Urgency", value: 10 },
      { key: "SLA_EXPOSURE", label: "SLA exposure", value: 9 },
      { key: "RECENCY", label: "Recency", value: 8 },
      { key: "BUSINESS_IMPACT", label: "Revenue exposure", value: 6 },
    ]),
    businessImpact: "Mis-routed cases will breach SLA in bulk if not corrected quickly.",
    reasonCodes: ["SLA_BREACH_IMMINENT", "NO_OWNER_ACTION"],
    explanation:
      "A recent routing rule change misdirected 30 billing cases into the Tier 3 queue within the last hour.",
    confidence: 0.68,
    assignedUser: "Jordan Rivera",
    sourceObject: "Case",
    sourceRecordId: "500A000007",
    sourceRecordLabel: "Bulk: 30 cases in Tier 3 queue",
    detectedAt: hoursAgo(1),
    dueAt: hoursAhead(4),
    relatedContext: [
      { id: "c1", label: "Queue", value: "Tier 3 Billing - +30 in 1h", kind: "metric" },
      { id: "c2", label: "Change", value: "Routing rule 'Billing_v3' edited 70m ago", kind: "signal" },
    ],
    actions: [
      action("NOTIFY_MANAGER", { primary: true, affordance: "Execute", description: "Alert the routing admin and ops lead." }),
      action("CREATE_FOLLOWUP_TASK", { affordance: "Execute", description: "Open a task to revert the routing rule." }),
      action("DISMISS_FALSE_POSITIVE", { affordance: "Dismiss", description: "Intentional change - dismiss." }),
    ],
  },

  // 8. Knowledge gap
  {
    id: "wi-008",
    title: "Knowledge gap: 12 cases, no article",
    summary:
      "12 cases this week reference the new billing export error with no matching knowledge article.",
    type: "Knowledge_Gap",
    category: "Data",
    status: "New",
    severity: "Low",
    priority: breakdown([
      { key: "USER_RELEVANCE", label: "Knowledge gap", value: 10 },
      { key: "BASE_RULE", label: "Base rule", value: 10 },
      { key: "BUSINESS_IMPACT", label: "Deflection opportunity", value: 8 },
      { key: "RECENCY", label: "Recency", value: 5 },
    ]),
    businessImpact: "An article would deflect an estimated 12+ cases per week.",
    reasonCodes: ["KNOWLEDGE_GAP"],
    explanation:
      "12 cases this week describe the new billing export error and no knowledge article covers it.",
    confidence: 0.7,
    assignedUser: "Jordan Rivera",
    detectedAt: daysAgo(1),
    dueAt: daysAhead(3),
    relatedContext: [
      { id: "c1", label: "Cluster", value: "12 cases - 'billing export failed'", kind: "signal" },
      { id: "c2", label: "Deflection", value: "~12 cases/week estimated", kind: "metric" },
    ],
    actions: [
      action("CREATE_KNOWLEDGE_DRAFT", { primary: true, affordance: "Review", confidence: 0.75, description: "Draft an article from the resolved cases." }),
      action("SNOOZE_ITEM", { affordance: "Snooze", description: "Snooze to next week." }),
    ],
  },

  // 9. Approval item (AI proposes escalation)
  {
    id: "wi-009",
    title: "Approve: escalate Wayne Enterprises case to Tier 3",
    summary:
      "Agentforce recommends escalating #48610 to Tier 3 based on repeated failures and account tier.",
    type: "Approval",
    category: "AI",
    status: "Waiting",
    severity: "High",
    isApproval: true,
    priority: breakdown([
      { key: "CONFIDENCE", label: "Confidence", value: 9 },
      { key: "CUSTOMER_IMPORTANCE", label: "Customer importance", value: 13 },
      { key: "BASE_RULE", label: "Base rule", value: 16 },
      { key: "URGENCY", label: "Urgency", value: 14 },
      { key: "BUSINESS_IMPACT", label: "Revenue exposure", value: 14 },
    ]),
    businessImpact: "Escalation would commit a Tier 3 engineer; needs human sign-off.",
    revenueExposure: 310000,
    reasonCodes: ["HIGH_VALUE_ACCOUNT", "AGENT_FAILURE"],
    explanation:
      "Agentforce recommends escalating case #48610 to Tier 3. It requires approval because escalation commits engineering time.",
    confidence: 0.81,
    assignedUser: "Jordan Rivera",
    accountName: "Wayne Enterprises",
    accountId: "acc-wayne",
    sourceObject: "Case",
    sourceRecordId: "500A000009",
    sourceRecordLabel: "Case #48610 - Data residency compliance",
    detectedAt: hoursAgo(2),
    dueAt: hoursAhead(5),
    relatedContext: [
      { id: "c1", label: "Case", value: "#48610 - Data residency compliance", kind: "case", href: "#" },
      { id: "c2", label: "Proposed by", value: "Agentforce · confidence 81%", kind: "agent" },
    ],
    actions: [
      action("APPROVE_RECOMMENDATION", { primary: true, affordance: "Execute", description: "Approve the escalation to Tier 3." }),
      action("DISMISS_FALSE_POSITIVE", { affordance: "Dismiss", description: "Reject - escalation not warranted." }),
    ],
  },

  // 10. Approval - knowledge publish
  {
    id: "wi-010",
    title: "Approve: publish knowledge draft on SSO errors",
    summary:
      "Agentforce drafted a knowledge article on the SSO login loop; publishing needs approval.",
    type: "Approval",
    category: "AI",
    status: "Waiting",
    severity: "Medium",
    isApproval: true,
    priority: breakdown([
      { key: "CONFIDENCE", label: "Confidence", value: 8 },
      { key: "BASE_RULE", label: "Base rule", value: 12 },
      { key: "BUSINESS_IMPACT", label: "Deflection opportunity", value: 10 },
      { key: "USER_RELEVANCE", label: "Knowledge gap", value: 9 },
    ]),
    businessImpact: "Publishing improves deflection but requires knowledge governance sign-off.",
    reasonCodes: ["KNOWLEDGE_GAP"],
    explanation:
      "Agentforce drafted an article covering the SSO login loop. Publishing requires the Publish Knowledge permission and approval.",
    confidence: 0.76,
    assignedUser: "Jordan Rivera",
    detectedAt: hoursAgo(7),
    dueAt: daysAhead(1),
    relatedContext: [
      { id: "c1", label: "Draft", value: "'Resolving the SSO login loop'", kind: "signal" },
      { id: "c2", label: "Sources", value: "5 resolved cases", kind: "metric" },
    ],
    actions: [
      action("APPROVE_RECOMMENDATION", { primary: true, affordance: "Execute", description: "Approve and publish the article." }),
      action("CREATE_KNOWLEDGE_DRAFT", { affordance: "Review", description: "Open the draft to edit first.", confidence: 0.76 }),
      action("DISMISS_FALSE_POSITIVE", { affordance: "Dismiss", description: "Reject the draft." }),
    ],
  },

  // 11. Waiting on others
  {
    id: "wi-011",
    title: "Waiting on engineering for Stark case fix",
    summary:
      "#48301 is blocked on an engineering fix (JIRA SVC-2210). ETA was yesterday.",
    type: "Critical_Case",
    category: "Service",
    status: "Waiting",
    severity: "Medium",
    priority: breakdown([
      { key: "BASE_RULE", label: "Base rule", value: 12 },
      { key: "URGENCY", label: "Urgency", value: 9 },
      { key: "ESCALATION", label: "Escalation", value: 7 },
      { key: "RECENCY", label: "Recency", value: 4 },
    ]),
    businessImpact: "Blocked case; the customer is waiting on a committed engineering fix.",
    reasonCodes: ["NO_OWNER_ACTION"],
    explanation:
      "Case #48301 is waiting on engineering fix SVC-2210, whose ETA slipped past yesterday.",
    confidence: 0.66,
    assignedUser: "Jordan Rivera",
    accountName: "Stark Industries",
    accountId: "acc-stark",
    sourceObject: "Case",
    sourceRecordId: "500A000011",
    sourceRecordLabel: "Case #48301 - Report scheduler bug",
    detectedAt: daysAgo(2),
    dueAt: hoursAhead(20),
    relatedContext: [
      { id: "c1", label: "Case", value: "#48301 - Report scheduler bug", kind: "case", href: "#" },
      { id: "c2", label: "Blocker", value: "JIRA SVC-2210 - ETA slipped 1d", kind: "signal" },
    ],
    actions: [
      action("NOTIFY_MANAGER", { primary: true, affordance: "Execute", description: "Ping engineering for a revised ETA." }),
      action("CREATE_FOLLOWUP_TASK", { affordance: "Execute", description: "Follow up when the fix ships." }),
      action("SNOOZE_ITEM", { affordance: "Snooze", description: "Snooze 1 day." }),
    ],
  },

  // 12. Medium SLA risk, assigned to teammate
  {
    id: "wi-012",
    title: "SLA at 70% on Hooli support case",
    summary:
      "Resolution SLA on #48120 has consumed 70% of its window; still In Progress.",
    type: "SLA_Risk",
    category: "Service",
    status: "In_Progress",
    severity: "Medium",
    priority: breakdown([
      { key: "SLA_EXPOSURE", label: "SLA exposure", value: 11 },
      { key: "BASE_RULE", label: "Base rule", value: 12 },
      { key: "URGENCY", label: "Urgency", value: 8 },
      { key: "RECENCY", label: "Recency", value: 4 },
    ]),
    businessImpact: "Resolution SLA at 70% consumed; trending toward a miss.",
    reasonCodes: ["SLA_BREACH_IMMINENT"],
    explanation:
      "Case #48120 has consumed 70% of its resolution SLA window and is still in progress.",
    confidence: 0.7,
    assignedUser: "Marco Diaz",
    accountName: "Hooli",
    accountId: "acc-hooli",
    sourceObject: "Case",
    sourceRecordId: "500A000012",
    sourceRecordLabel: "Case #48120 - Webhook retries failing",
    ruleKey: "Case_SLA_Breach",
    detectedAt: hoursAgo(11),
    dueAt: hoursAhead(10),
    relatedContext: [
      { id: "c1", label: "Case", value: "#48120 - Webhook retries failing", kind: "case", href: "#" },
      { id: "c2", label: "SLA", value: "70% of resolution window used", kind: "metric" },
    ],
    actions: [
      action("GENERATE_CASE_SUMMARY", { primary: true, affordance: "Review", confidence: 0.83, description: "Summarize progress for the owner." }),
      action("CREATE_FOLLOWUP_TASK", { affordance: "Execute", description: "Nudge the owner." }),
    ],
  },

  // 13. Expanding / positive-ish revenue signal
  {
    id: "wi-013",
    title: "Cyberdyne asked about premium support tier",
    summary:
      "Cyberdyne opened a case asking about the premium support add-on - an expansion signal.",
    type: "High_Value_At_Risk",
    category: "Revenue",
    status: "New",
    severity: "Low",
    priority: breakdown([
      { key: "BUSINESS_IMPACT", label: "Revenue exposure", value: 12 },
      { key: "CUSTOMER_IMPORTANCE", label: "Customer importance", value: 9 },
      { key: "BASE_RULE", label: "Base rule", value: 10 },
      { key: "USER_RELEVANCE", label: "Relevance to you", value: 5 },
    ]),
    businessImpact: "Potential $90K expansion on the premium support tier.",
    revenueExposure: 90000,
    reasonCodes: ["HIGH_VALUE_ACCOUNT"],
    explanation:
      "Cyberdyne asked about the premium support add-on, which represents a ~$90K expansion opportunity.",
    confidence: 0.64,
    assignedUser: "Jordan Rivera",
    accountName: "Cyberdyne Systems",
    accountId: "acc-cyberdyne",
    sourceObject: "Case",
    sourceRecordId: "500A000013",
    sourceRecordLabel: "Case #48702 - Premium support inquiry",
    detectedAt: hoursAgo(14),
    dueAt: daysAhead(2),
    relatedContext: [
      { id: "c1", label: "Case", value: "#48702 - Premium support inquiry", kind: "case", href: "#" },
      { id: "c2", label: "Opportunity", value: "~$90K expansion", kind: "metric" },
    ],
    actions: [
      action("NOTIFY_MANAGER", { primary: true, affordance: "Execute", description: "Loop in the account executive." }),
      action("CREATE_FOLLOWUP_TASK", { affordance: "Execute", description: "Schedule a follow-up call." }),
      action("SNOOZE_ITEM", { affordance: "Snooze", description: "Snooze 1 day." }),
    ],
  },

  // 14. Recently completed
  {
    id: "wi-014",
    title: "Resolved: Pied Piper data import failure",
    summary:
      "Escalated and resolved the Pied Piper import failure; customer confirmed fix.",
    type: "Critical_Case",
    category: "Service",
    status: "Completed",
    severity: "High",
    priority: breakdown([
      { key: "BASE_RULE", label: "Base rule", value: 18 },
      { key: "URGENCY", label: "Urgency", value: 12 },
      { key: "SLA_EXPOSURE", label: "SLA exposure", value: 10 },
    ]),
    businessImpact: "Resolved within SLA; customer confirmed the fix.",
    reasonCodes: ["SLA_BREACH_IMMINENT"],
    explanation: "Escalated case #47990 to engineering and confirmed the fix with Pied Piper.",
    confidence: 0.9,
    assignedUser: "Jordan Rivera",
    accountName: "Pied Piper",
    accountId: "acc-piedpiper",
    sourceObject: "Case",
    sourceRecordId: "500A000014",
    sourceRecordLabel: "Case #47990 - Import failure",
    detectedAt: daysAgo(3),
    completedAt: hoursAgo(5),
    completedBy: "Jordan Rivera",
    relatedContext: [
      { id: "c1", label: "Case", value: "#47990 - Import failure", kind: "case", href: "#" },
      { id: "c2", label: "Outcome", value: "Resolved in 4h · CSAT 5/5", kind: "metric" },
    ],
    actions: [
      action("GENERATE_CASE_SUMMARY", { affordance: "Review", confidence: 0.9, description: "Generate the resolution summary." }),
    ],
  },

  // 15. Recently completed / dismissed false positive
  {
    id: "wi-015",
    title: "Dismissed: duplicate SLA alert on Vandelay",
    summary:
      "SLA alert on #48088 was a duplicate of #48087, already being handled. Dismissed.",
    type: "SLA_Risk",
    category: "Service",
    status: "Dismissed",
    severity: "Low",
    priority: breakdown([
      { key: "BASE_RULE", label: "Base rule", value: 12 },
      { key: "SUPPRESSION", label: "Duplicate suppression", value: -20 },
      { key: "SLA_EXPOSURE", label: "SLA exposure", value: 10 },
    ]),
    businessImpact: "No impact - duplicate of an item already in progress.",
    reasonCodes: ["DUPLICATE_WORK"],
    explanation: "This SLA alert duplicated an item already being handled on the same account.",
    confidence: 0.6,
    assignedUser: "Jordan Rivera",
    accountName: "Vandelay Industries",
    accountId: "acc-vandelay",
    sourceObject: "Case",
    sourceRecordId: "500A000015",
    sourceRecordLabel: "Case #48088 - Duplicate SLA alert",
    detectedAt: daysAgo(1),
    completedAt: hoursAgo(20),
    completedBy: "Jordan Rivera",
    relatedContext: [
      { id: "c1", label: "Duplicate of", value: "Work item wi-012", kind: "signal" },
    ],
    actions: [],
  },

  // 16. Data category - stale data anomaly
  {
    id: "wi-016",
    title: "Contact data gap on 3 top accounts",
    summary:
      "Three top-tier accounts are missing an executive sponsor contact, weakening escalation paths.",
    type: "Knowledge_Gap",
    category: "Data",
    status: "New",
    severity: "Low",
    priority: breakdown([
      { key: "BASE_RULE", label: "Base rule", value: 9 },
      { key: "CUSTOMER_IMPORTANCE", label: "Customer importance", value: 8 },
      { key: "BUSINESS_IMPACT", label: "Revenue exposure", value: 6 },
    ]),
    businessImpact: "Missing exec contacts slow escalation on high-value accounts.",
    reasonCodes: ["EXECUTIVE_ENGAGEMENT_GAP", "HIGH_VALUE_ACCOUNT"],
    explanation:
      "Three top-tier accounts have no executive sponsor on file, which slows escalations.",
    confidence: 0.62,
    assignedUser: "Jordan Rivera",
    detectedAt: daysAgo(1),
    dueAt: daysAhead(5),
    relatedContext: [
      { id: "c1", label: "Accounts", value: "Globex, Umbrella, Hooli", kind: "account" },
    ],
    actions: [
      action("CREATE_FOLLOWUP_TASK", { primary: true, affordance: "Execute", description: "Task the AEs to add exec contacts." }),
      action("SNOOZE_ITEM", { affordance: "Snooze", description: "Snooze to next week." }),
    ],
  },
];

// ---------------------------------------------------------------------------
// AI activity (Agentforce transparency)
// ---------------------------------------------------------------------------

export const AGENT_ACTIVITY: AgentActivity[] = [
  {
    id: "aa-001",
    workItemId: "wi-014",
    actionKey: "GENERATE_CASE_SUMMARY",
    actionLabel: "Generate Case Summary",
    status: "Completed",
    occurredAt: hoursAgo(5),
    contextUsed: ["Case #47990 thread (14 messages)", "Account: Pied Piper", "Related JIRA SVC-2190"],
    conclusion: "Import failure was caused by a malformed CSV header; fixed by engineering.",
    confidence: 0.9,
    proposedAction: "Post a resolution summary to the case and notify the customer.",
    humanApproval: { by: "Jordan Rivera", decision: "Approved", at: hoursAgo(5) },
    outcome: "Summary posted. Case closed with CSAT 5/5.",
  },
  {
    id: "aa-002",
    workItemId: "wi-009",
    actionKey: "ESCALATE_CASE",
    actionLabel: "Escalate Case",
    status: "Awaiting_Approval",
    occurredAt: hoursAgo(2),
    contextUsed: ["Case #48610", "Account tier: Enterprise", "2 prior failed resolutions"],
    conclusion: "Repeated failures on a data-residency issue warrant Tier 3 engineering.",
    confidence: 0.81,
    proposedAction: "Escalate #48610 to Tier 3 with a compliance summary attached.",
    outcome: "Pending human approval.",
  },
  {
    id: "aa-003",
    workItemId: "wi-006",
    actionKey: "DRAFT_CUSTOMER_RESPONSE",
    actionLabel: "Draft Customer Response",
    status: "Failed",
    occurredAt: hoursAgo(3),
    contextUsed: ["Case #48777", "Password reset KB article"],
    conclusion: "Drafted a reset-loop workaround response.",
    confidence: 0.7,
    proposedAction: "Send the drafted response to the customer.",
    outcome: "Failed: callout timeout (HTTP 504). No message sent.",
  },
  {
    id: "aa-004",
    workItemId: "wi-010",
    actionKey: "CREATE_KNOWLEDGE_DRAFT",
    actionLabel: "Create Knowledge Draft",
    status: "Awaiting_Approval",
    occurredAt: hoursAgo(7),
    contextUsed: ["5 resolved SSO cases", "SSO configuration docs"],
    conclusion: "A repeatable SSO login-loop fix can be documented for deflection.",
    confidence: 0.76,
    proposedAction: "Publish a knowledge article: 'Resolving the SSO login loop'.",
    outcome: "Pending human approval.",
  },
  {
    id: "aa-005",
    workItemId: "wi-015",
    actionKey: "DISMISS_FALSE_POSITIVE",
    actionLabel: "Dismiss as False Positive",
    status: "Dismissed",
    occurredAt: hoursAgo(20),
    contextUsed: ["Case #48088", "Case #48087 (duplicate)"],
    conclusion: "This SLA alert duplicates an item already in progress.",
    confidence: 0.6,
    proposedAction: "Suppress the duplicate work item.",
    humanApproval: { by: "Jordan Rivera", decision: "Approved", at: hoursAgo(20) },
    outcome: "Duplicate suppressed.",
  },
  {
    id: "aa-006",
    actionKey: "GENERATE_CASE_SUMMARY",
    actionLabel: "Generate Case Summary",
    status: "Rejected",
    occurredAt: daysAgo(1),
    contextUsed: ["Case #47600 thread"],
    conclusion: "Summarized a billing dispute.",
    confidence: 0.55,
    proposedAction: "Post the summary to the case.",
    humanApproval: { by: "Priya Nair", decision: "Rejected", at: daysAgo(1) },
    outcome: "Rejected: summary missed the contractual context. Reviewed manually.",
  },
  {
    id: "aa-007",
    workItemId: "wi-002",
    actionKey: "DRAFT_CUSTOMER_RESPONSE",
    actionLabel: "Draft Customer Response",
    status: "Completed",
    occurredAt: hoursAgo(1),
    contextUsed: ["Case #48991", "SSO change advisory"],
    conclusion: "Acknowledgement drafted to stop the SLA clock.",
    confidence: 0.82,
    proposedAction: "Send an acknowledgement to the customer.",
    humanApproval: { by: "Jordan Rivera", decision: "Approved", at: hoursAgo(1) },
    outcome: "Sent. First-response SLA met.",
  },
];

// ---------------------------------------------------------------------------
// Customers by operational condition
// ---------------------------------------------------------------------------

export const CUSTOMERS: CustomerAccount[] = [
  { id: "acc-acme", name: "Acme Corporation", condition: "Needs_Attention", arr: 480000, openWorkItems: 3, headline: "Renewal at risk with unresolved production issue", owner: "Jordan Rivera", lastActivityAt: hoursAgo(5) },
  { id: "acc-globex", name: "Globex", condition: "Needs_Attention", arr: 260000, openWorkItems: 2, headline: "Sev-1 outage untouched for 26 hours", owner: "Priya Nair", lastActivityAt: hoursAgo(26) },
  { id: "acc-wayne", name: "Wayne Enterprises", condition: "Newly_At_Risk", arr: 310000, openWorkItems: 1, headline: "Compliance case escalation pending approval", owner: "Jordan Rivera", lastActivityAt: hoursAgo(2) },
  { id: "acc-initech", name: "Initech", condition: "Waiting_On_Us", arr: 120000, openWorkItems: 1, headline: "4 unanswered customer replies", owner: "Jordan Rivera", lastActivityAt: daysAgo(5) },
  { id: "acc-stark", name: "Stark Industries", condition: "Waiting_On_Customer", arr: 190000, openWorkItems: 1, headline: "Blocked on engineering fix ETA", owner: "Jordan Rivera", lastActivityAt: daysAgo(2) },
  { id: "acc-piedpiper", name: "Pied Piper", condition: "Improving", arr: 95000, openWorkItems: 0, headline: "Critical case resolved, CSAT 5/5", owner: "Jordan Rivera", lastActivityAt: hoursAgo(5) },
  { id: "acc-cyberdyne", name: "Cyberdyne Systems", condition: "Expanding", arr: 150000, openWorkItems: 1, headline: "Asked about premium support tier (~$90K)", owner: "Jordan Rivera", lastActivityAt: hoursAgo(14) },
  { id: "acc-umbrella", name: "Umbrella Corp", condition: "Newly_At_Risk", arr: 220000, openWorkItems: 1, headline: "Escalation ahead of next week's QBR", owner: "Jordan Rivera", lastActivityAt: hoursAgo(20) },
  { id: "acc-hooli", name: "Hooli", condition: "Quiet", arr: 88000, openWorkItems: 1, headline: "Resolution SLA trending toward a miss", owner: "Marco Diaz", lastActivityAt: hoursAgo(11) },
  { id: "acc-soylent", name: "Soylent Corp", condition: "Waiting_On_Us", arr: 60000, openWorkItems: 1, headline: "Agent action failed; response not sent", owner: "Jordan Rivera", lastActivityAt: hoursAgo(3) },
  { id: "acc-vandelay", name: "Vandelay Industries", condition: "Quiet", arr: 45000, openWorkItems: 0, headline: "Duplicate alert dismissed", owner: "Jordan Rivera", lastActivityAt: hoursAgo(20) },
];

// ---------------------------------------------------------------------------
// Approvals (derived detail beyond the work items flagged isApproval)
// ---------------------------------------------------------------------------

export const APPROVALS: ApprovalItem[] = [
  {
    id: "ap-001",
    workItemId: "wi-009",
    title: "Escalate Wayne Enterprises case to Tier 3",
    requestedAction: "Escalate #48610 to Tier 3 engineering",
    actionKey: "APPROVE_RECOMMENDATION",
    requestedBy: "Agentforce",
    requestedAt: hoursAgo(2),
    accountName: "Wayne Enterprises",
    rationale: "Two prior resolution attempts failed on a data-residency compliance issue for an Enterprise-tier account.",
    confidence: 0.81,
    priority: WORK_ITEMS.find((w) => w.id === "wi-009")!.priority,
  },
  {
    id: "ap-002",
    workItemId: "wi-010",
    title: "Publish knowledge article: SSO login loop",
    requestedAction: "Publish the drafted SSO knowledge article",
    actionKey: "APPROVE_RECOMMENDATION",
    requestedBy: "Agentforce",
    requestedAt: hoursAgo(7),
    rationale: "Five resolved cases share a repeatable fix; publishing should deflect ~12 cases/week.",
    confidence: 0.76,
    priority: WORK_ITEMS.find((w) => w.id === "wi-010")!.priority,
  },
  {
    id: "ap-003",
    workItemId: "wi-001",
    title: "Escalate Acme production case with renewal context",
    requestedAction: "Escalate #48213 to Tier 3 and attach renewal brief",
    actionKey: "APPROVE_RECOMMENDATION",
    requestedBy: "Jordan Rivera",
    requestedAt: hoursAgo(1),
    accountName: "Acme Corporation",
    rationale: "$480K renewal in 6 weeks with a 9-day-old critical case and no owner reply.",
    confidence: 0.93,
    priority: WORK_ITEMS.find((w) => w.id === "wi-001")!.priority,
  },
];

// ---------------------------------------------------------------------------
// Insights (trend series framed as "what changed / why / action")
// ---------------------------------------------------------------------------

export const OPEN_WORK_TREND = [
  { day: "Mon", open: 38, critical: 4 },
  { day: "Tue", open: 41, critical: 5 },
  { day: "Wed", open: 44, critical: 6 },
  { day: "Thu", open: 40, critical: 5 },
  { day: "Fri", open: 47, critical: 7 },
  { day: "Sat", open: 33, critical: 3 },
  { day: "Sun", open: 29, critical: 2 },
];

export const COMPLETION_TREND = [
  { day: "Mon", completed: 22, rate: 0.71 },
  { day: "Tue", completed: 25, rate: 0.74 },
  { day: "Wed", completed: 19, rate: 0.66 },
  { day: "Thu", completed: 28, rate: 0.79 },
  { day: "Fri", completed: 31, rate: 0.82 },
  { day: "Sat", completed: 12, rate: 0.85 },
  { day: "Sun", completed: 9, rate: 0.88 },
];
