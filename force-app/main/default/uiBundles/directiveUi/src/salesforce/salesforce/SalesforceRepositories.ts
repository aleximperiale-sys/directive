import type {
  ActionRepository,
  ApprovalRepository,
  ContextRepository,
  ExecuteActionResult,
  Repositories,
  WorkItemRepository,
} from "../repositories";
import type { ExecuteActionInput } from "@/domain/schemas";
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

/**
 * Salesforce-backed repositories (SEAM, not yet wired).
 *
 * When running inside the org, this bundle talks to the platform via
 * `@salesforce/platform-sdk`. That package is intentionally NOT a dependency of
 * this project so the app builds and runs standalone with the mock adapter. The
 * calls below are the reference shape; uncomment and install the SDK when
 * deploying against a live org (VITE_DATA_MODE=salesforce).
 *
 * Example (GraphQL wire - do not uncomment without the SDK installed):
 *
 *   import { graphql, gql } from "@salesforce/platform-sdk";
 *
 *   const MY_WORK = gql`
 *     query MyWork {
 *       uiapi {
 *         query {
 *           Directive_Work_Item__c(
 *             where: { Assigned_User__c: { eq: { CurrentUserId: {} } } }
 *             orderBy: { Priority_Score__c: { order: DESC } }
 *           ) {
 *             edges { node {
 *               Id
 *               Title__c { value }
 *               Type__c { value }
 *               Status__c { value }
 *               Severity__c { value }
 *               Priority_Score__c { value }
 *               Reason_Codes__c { value }
 *               Explanation__c { value }
 *               Business_Impact__c { value }
 *               Due_At__c { value }
 *             } }
 *           }
 *         }
 *       }
 *     }`;
 *
 *   const data = await graphql(MY_WORK);
 *   // ...map edges -> WorkItem[]
 *
 * Apex facades (CONTRACT.md §"Apex facades") for imperative work:
 *
 *   import { apex } from "@salesforce/platform-sdk";
 *   await apex.DirectiveActionService.execute({ workItemId, actionKey });
 *   await apex.DirectiveWorkService.updateStatus({ id, status });
 *   await apex.DirectivePriorityService.explain({ id }); // score breakdown
 */

const NOT_WIRED =
  "Salesforce data mode is selected but @salesforce/platform-sdk is not wired. " +
  "Install the SDK and complete src/salesforce/salesforce/SalesforceRepositories.ts, " +
  "or run with VITE_DATA_MODE=mock.";

export class SalesforceWorkItemRepository implements WorkItemRepository {
  async list(): Promise<WorkItem[]> {
    // return mapWorkItems(await graphql(MY_WORK));
    throw new Error(NOT_WIRED);
  }
  async get(_id: string): Promise<WorkItem | undefined> {
    // return mapWorkItem(await apex.DirectiveWorkService.getWorkItem({ id }));
    throw new Error(NOT_WIRED);
  }
  async updateStatus(_id: string, _status: WorkItem["status"]): Promise<WorkItem> {
    // return mapWorkItem(await apex.DirectiveWorkService.updateStatus({ id, status }));
    throw new Error(NOT_WIRED);
  }
  async snooze(_id: string, _until: string): Promise<WorkItem> {
    // return mapWorkItem(await apex.DirectiveWorkService.snooze({ id, until }));
    throw new Error(NOT_WIRED);
  }
  async dismiss(_id: string): Promise<WorkItem> {
    throw new Error(NOT_WIRED);
  }
}

export class SalesforceActionRepository implements ActionRepository {
  // Explicit return types are required: a body that only throws would otherwise
  // be inferred as Promise<void> and fail to satisfy the interface.
  async getAvailableActions(_workItemId: string): Promise<RecommendedAction[]> {
    // return await apex.DirectiveActionService.getAvailableActions({ workItemId });
    throw new Error(NOT_WIRED);
  }
  async execute(_input: ExecuteActionInput): Promise<ExecuteActionResult> {
    // return await apex.DirectiveActionService.execute(input);
    throw new Error(NOT_WIRED);
  }
}

export class SalesforceApprovalRepository implements ApprovalRepository {
  async list(): Promise<ApprovalItem[]> {
    throw new Error(NOT_WIRED);
  }
  async approve(_id: string): Promise<void> {
    throw new Error(NOT_WIRED);
  }
  async reject(_id: string): Promise<void> {
    throw new Error(NOT_WIRED);
  }
}

export class SalesforceContextRepository implements ContextRepository {
  async getAgentActivity(): Promise<AgentActivity[]> {
    throw new Error(NOT_WIRED);
  }
  async getCustomers(): Promise<CustomerAccount[]> {
    throw new Error(NOT_WIRED);
  }
  async getPersonas(): Promise<Persona[]> {
    // return await apex.DirectiveContextService.buildContext({ kind: "personas" });
    throw new Error(NOT_WIRED);
  }
  async getActionDefinitions(): Promise<ActionDefinition[]> {
    throw new Error(NOT_WIRED);
  }
  async getScoreComponents(): Promise<ScoreComponent[]> {
    throw new Error(NOT_WIRED);
  }
  async getViews(): Promise<WorkView[]> {
    throw new Error(NOT_WIRED);
  }
}

export function createSalesforceRepositories(): Repositories {
  return {
    workItems: new SalesforceWorkItemRepository(),
    actions: new SalesforceActionRepository(),
    approvals: new SalesforceApprovalRepository(),
    context: new SalesforceContextRepository(),
  };
}
