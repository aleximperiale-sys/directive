export const queryKeys = {
  work: ["work"] as const,
  workItem: (id: string) => ["work", id] as const,
  actions: (id: string) => ["actions", id] as const,
  approvals: ["approvals"] as const,
  agentActivity: ["agent-activity"] as const,
  customers: ["customers"] as const,
  personas: ["config", "personas"] as const,
  actionDefinitions: ["config", "action-definitions"] as const,
  scoreComponents: ["config", "score-components"] as const,
  views: ["config", "views"] as const,
};
