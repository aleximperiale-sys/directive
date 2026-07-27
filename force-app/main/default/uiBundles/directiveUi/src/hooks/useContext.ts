import { useQuery } from "@tanstack/react-query";
import { getRepositories } from "@/salesforce/factory";
import { queryKeys } from "./queryKeys";

const repos = getRepositories();

export function useAgentActivity() {
  return useQuery({
    queryKey: queryKeys.agentActivity,
    queryFn: () => repos.context.getAgentActivity(),
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: queryKeys.customers,
    queryFn: () => repos.context.getCustomers(),
  });
}

export function usePersonas() {
  return useQuery({
    queryKey: queryKeys.personas,
    queryFn: () => repos.context.getPersonas(),
  });
}

export function useActionDefinitions() {
  return useQuery({
    queryKey: queryKeys.actionDefinitions,
    queryFn: () => repos.context.getActionDefinitions(),
  });
}

export function useScoreComponents() {
  return useQuery({
    queryKey: queryKeys.scoreComponents,
    queryFn: () => repos.context.getScoreComponents(),
  });
}

export function useViews() {
  return useQuery({
    queryKey: queryKeys.views,
    queryFn: () => repos.context.getViews(),
  });
}
