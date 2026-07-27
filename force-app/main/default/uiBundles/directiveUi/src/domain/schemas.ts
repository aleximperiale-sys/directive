import { z } from "zod";
import {
  ACTION_KEYS,
  CATEGORIES,
  PRIORITY_BANDS,
  REASON_CODES,
  SCORE_COMPONENT_KEYS,
  SEVERITIES,
  STATUSES,
  WORK_ITEM_TYPES,
} from "./types";

export const workItemTypeSchema = z.enum(WORK_ITEM_TYPES);
export const categorySchema = z.enum(CATEGORIES);
export const statusSchema = z.enum(STATUSES);
export const severitySchema = z.enum(SEVERITIES);
export const priorityBandSchema = z.enum(PRIORITY_BANDS);
export const actionKeySchema = z.enum(ACTION_KEYS);
export const reasonCodeSchema = z.enum(REASON_CODES);
export const scoreComponentKeySchema = z.enum(SCORE_COMPONENT_KEYS);

export const scoreContributionSchema = z.object({
  key: scoreComponentKeySchema,
  label: z.string(),
  value: z.number(),
});

export const priorityBreakdownSchema = z.object({
  score: z.number().min(0).max(100),
  band: priorityBandSchema,
  contributions: z.array(scoreContributionSchema),
});

export const recommendedActionSchema = z.object({
  id: z.string(),
  actionKey: actionKeySchema,
  label: z.string(),
  description: z.string(),
  affordance: z.enum(["Execute", "Review", "Snooze", "Dismiss"]),
  confirmationRequired: z.boolean(),
  approvalRequired: z.boolean(),
  requiredCustomPermission: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  primary: z.boolean().optional(),
});

export const workItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  type: workItemTypeSchema,
  category: categorySchema,
  status: statusSchema,
  severity: severitySchema,
  priority: priorityBreakdownSchema,
  businessImpact: z.string(),
  revenueExposure: z.number().optional(),
  reasonCodes: z.array(reasonCodeSchema),
  explanation: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  assignedUser: z.string().optional(),
  accountName: z.string().optional(),
  accountId: z.string().optional(),
  sourceObject: z.string().optional(),
  sourceRecordId: z.string().optional(),
  sourceRecordLabel: z.string().optional(),
  ruleKey: z.string().optional(),
  detectedAt: z.string(),
  dueAt: z.string().optional(),
  snoozedUntil: z.string().optional(),
  completedAt: z.string().optional(),
  completedBy: z.string().optional(),
  relatedContext: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      value: z.string(),
      href: z.string().optional(),
      kind: z
        .enum(["case", "account", "contact", "agent", "signal", "metric"])
        .optional(),
    }),
  ),
  actions: z.array(recommendedActionSchema),
  isApproval: z.boolean().optional(),
});

/** Form schema for the user preferences panel in Settings. */
export const preferencesFormSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  density: z.enum(["comfortable", "compact"]),
  defaultView: z.string().min(1),
});
export type PreferencesFormValues = z.infer<typeof preferencesFormSchema>;

/** Payload for executing an action against a work item (mock + real). */
export const executeActionSchema = z.object({
  workItemId: z.string(),
  actionKey: actionKeySchema,
  note: z.string().optional(),
  snoozeUntil: z.string().optional(),
});
export type ExecuteActionInput = z.infer<typeof executeActionSchema>;
