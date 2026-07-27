import type {
  ActionRepository,
  ApprovalRepository,
  ContextRepository,
  ExecuteActionResult,
  Repositories,
  WorkItemRepository,
} from "../repositories";
import type { ExecuteActionInput } from "@/domain/schemas";
import type { WorkItem } from "@/domain/types";
import {
  ACTION_DEFINITIONS,
  AGENT_ACTIVITY,
  APPROVALS,
  CUSTOMERS,
  PERSONAS,
  SCORE_COMPONENTS,
  WORK_ITEMS,
  WORK_VIEWS,
} from "./seed";

const LATENCY = Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? "280");

function delay<T>(value: T): Promise<T> {
  if (!LATENCY) return Promise.resolve(value);
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY));
}

function clone<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);
}

/**
 * In-memory mock backing store. Mutations persist for the browser session so
 * optimistic updates and executed actions feel real. Seed data is cloned on
 * load so the exported constants stay pristine.
 */
class MockStore {
  workItems: WorkItem[] = clone(WORK_ITEMS);
  approvals = clone(APPROVALS);

  find(id: string): WorkItem | undefined {
    return this.workItems.find((w) => w.id === id);
  }
}

const store = new MockStore();

export class MockWorkItemRepository implements WorkItemRepository {
  async list(): Promise<WorkItem[]> {
    return delay(clone(store.workItems));
  }
  async get(id: string): Promise<WorkItem | undefined> {
    return delay(clone(store.find(id)));
  }
  async updateStatus(id: string, status: WorkItem["status"]): Promise<WorkItem> {
    const item = store.find(id);
    if (!item) throw new Error(`Work item ${id} not found`);
    item.status = status;
    if (status === "Completed") {
      item.completedAt = new Date().toISOString();
      item.completedBy = item.assignedUser;
    }
    return delay(clone(item));
  }
  async snooze(id: string, until: string): Promise<WorkItem> {
    const item = store.find(id);
    if (!item) throw new Error(`Work item ${id} not found`);
    item.status = "Snoozed";
    item.snoozedUntil = until;
    return delay(clone(item));
  }
  async dismiss(id: string): Promise<WorkItem> {
    const item = store.find(id);
    if (!item) throw new Error(`Work item ${id} not found`);
    item.status = "Dismissed";
    item.completedAt = new Date().toISOString();
    return delay(clone(item));
  }
}

export class MockActionRepository implements ActionRepository {
  async getAvailableActions(workItemId: string) {
    const item = store.find(workItemId);
    return delay(clone(item?.actions ?? []));
  }
  async execute(input: ExecuteActionInput): Promise<ExecuteActionResult> {
    const item = store.find(input.workItemId);
    if (!item) throw new Error(`Work item ${input.workItemId} not found`);

    let message = "";
    switch (input.actionKey) {
      case "SNOOZE_ITEM":
        item.status = "Snoozed";
        item.snoozedUntil =
          input.snoozeUntil ?? new Date(Date.now() + 4 * 3600_000).toISOString();
        message = "Snoozed.";
        break;
      case "DISMISS_FALSE_POSITIVE":
        item.status = "Dismissed";
        item.completedAt = new Date().toISOString();
        message = "Dismissed as a false positive.";
        break;
      case "APPROVE_RECOMMENDATION":
        item.status = "Completed";
        item.completedAt = new Date().toISOString();
        item.completedBy = item.assignedUser;
        message = "Recommendation approved.";
        break;
      case "ESCALATE_CASE":
        item.status = "In_Progress";
        message = "Case escalated. A Tier 3 owner will pick this up.";
        break;
      case "REASSIGN_CASE":
        item.status = "In_Progress";
        message = "Case reassigned.";
        break;
      case "DRAFT_CUSTOMER_RESPONSE":
      case "GENERATE_CASE_SUMMARY":
      case "CREATE_KNOWLEDGE_DRAFT":
        message = "Draft generated for review.";
        break;
      case "CREATE_FOLLOWUP_TASK":
        message = "Follow-up task created.";
        break;
      case "NOTIFY_MANAGER":
        message = "Manager notified.";
        break;
    }
    return delay({ workItem: clone(item), message });
  }
}

export class MockApprovalRepository implements ApprovalRepository {
  async list() {
    return delay(clone(store.approvals));
  }
  async approve(id: string): Promise<void> {
    store.approvals = store.approvals.filter((a) => a.id !== id);
    await delay(null);
  }
  async reject(id: string): Promise<void> {
    store.approvals = store.approvals.filter((a) => a.id !== id);
    await delay(null);
  }
}

export class MockContextRepository implements ContextRepository {
  async getAgentActivity() {
    return delay(clone(AGENT_ACTIVITY));
  }
  async getCustomers() {
    return delay(clone(CUSTOMERS));
  }
  async getPersonas() {
    return delay(clone(PERSONAS));
  }
  async getActionDefinitions() {
    return delay(clone(ACTION_DEFINITIONS));
  }
  async getScoreComponents() {
    return delay(clone(SCORE_COMPONENTS));
  }
  async getViews() {
    return delay(clone(WORK_VIEWS));
  }
}

export function createMockRepositories(): Repositories {
  return {
    workItems: new MockWorkItemRepository(),
    actions: new MockActionRepository(),
    approvals: new MockApprovalRepository(),
    context: new MockContextRepository(),
  };
}
