import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getRepositories } from "@/salesforce/factory";
import { queryKeys } from "./queryKeys";
import type { WorkItem } from "@/domain/types";
import type { ExecuteActionInput } from "@/domain/schemas";

const repos = getRepositories();

export function useMyWork() {
  return useQuery({
    queryKey: queryKeys.work,
    queryFn: () => repos.workItems.list(),
  });
}

export function useWorkItem(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.workItem(id) : queryKeys.workItem("none"),
    queryFn: () => repos.workItems.get(id!),
    enabled: Boolean(id),
  });
}

export function useAvailableActions(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.actions(id) : queryKeys.actions("none"),
    queryFn: () => repos.actions.getAvailableActions(id!),
    enabled: Boolean(id),
  });
}

/** Optimistically patch a work item in both the list and detail caches. */
function patchWorkItemCaches(
  qc: ReturnType<typeof useQueryClient>,
  id: string,
  patch: Partial<WorkItem>,
) {
  qc.setQueryData<WorkItem[]>(queryKeys.work, (prev) =>
    prev?.map((w) => (w.id === id ? { ...w, ...patch } : w)),
  );
  qc.setQueryData<WorkItem | undefined>(queryKeys.workItem(id), (prev) =>
    prev ? { ...prev, ...patch } : prev,
  );
}

export function useExecuteAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExecuteActionInput) => repos.actions.execute(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: queryKeys.work });
      const previous = qc.getQueryData<WorkItem[]>(queryKeys.work);
      // Optimistic status hints for the terminal-ish actions.
      const optimistic: Partial<WorkItem> | null =
        input.actionKey === "SNOOZE_ITEM"
          ? { status: "Snoozed" }
          : input.actionKey === "DISMISS_FALSE_POSITIVE"
            ? { status: "Dismissed" }
            : input.actionKey === "APPROVE_RECOMMENDATION"
              ? { status: "Completed" }
              : input.actionKey === "ESCALATE_CASE" ||
                  input.actionKey === "REASSIGN_CASE"
                ? { status: "In_Progress" }
                : null;
      if (optimistic) patchWorkItemCaches(qc, input.workItemId, optimistic);
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.work, ctx.previous);
    },
    onSuccess: (result) => {
      patchWorkItemCaches(qc, result.workItem.id, result.workItem);
    },
    onSettled: (_res, _err, input) => {
      qc.invalidateQueries({ queryKey: queryKeys.work });
      qc.invalidateQueries({ queryKey: queryKeys.workItem(input.workItemId) });
      qc.invalidateQueries({ queryKey: queryKeys.approvals });
    },
  });
}

export function useUpdateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkItem["status"] }) =>
      repos.workItems.updateStatus(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: queryKeys.work });
      const previous = qc.getQueryData<WorkItem[]>(queryKeys.work);
      patchWorkItemCaches(qc, id, { status });
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.work, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.work }),
  });
}
