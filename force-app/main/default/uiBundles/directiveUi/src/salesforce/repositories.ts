import type {
  ActionDefinition,
  AgentActivity,
  ApprovalItem,
  CustomerAccount,
  Persona,
  RecommendedAction,
  ScoreComponent,
  WorkItem,
  WorkView,
} from "@/domain/types";
import type { ExecuteActionInput } from "@/domain/schemas";

/**
 * Repository interfaces (spec 6.5). The UI depends only on these; the concrete
 * implementation (mock vs. Salesforce) is chosen by the factory at runtime.
 */

export interface ExecuteActionResult {
  workItem: WorkItem;
  message: string;
}

export interface WorkItemRepository {
  list(): Promise<WorkItem[]>;
  get(id: string): Promise<WorkItem | undefined>;
  updateStatus(id: string, status: WorkItem["status"]): Promise<WorkItem>;
  snooze(id: string, until: string): Promise<WorkItem>;
  dismiss(id: string): Promise<WorkItem>;
}

export interface ActionRepository {
  getAvailableActions(workItemId: string): Promise<RecommendedAction[]>;
  execute(input: ExecuteActionInput): Promise<ExecuteActionResult>;
}

export interface ApprovalRepository {
  list(): Promise<ApprovalItem[]>;
  approve(id: string): Promise<void>;
  reject(id: string): Promise<void>;
}

export interface ContextRepository {
  getAgentActivity(): Promise<AgentActivity[]>;
  getCustomers(): Promise<CustomerAccount[]>;
  getPersonas(): Promise<Persona[]>;
  getActionDefinitions(): Promise<ActionDefinition[]>;
  getScoreComponents(): Promise<ScoreComponent[]>;
  getViews(): Promise<WorkView[]>;
}

export interface Repositories {
  workItems: WorkItemRepository;
  actions: ActionRepository;
  approvals: ApprovalRepository;
  context: ContextRepository;
}
