import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getRepositories } from "@/salesforce/factory";
import { queryKeys } from "./queryKeys";
import type { ApprovalItem } from "@/domain/types";

const repos = getRepositories();

export function useApprovals() {
  return useQuery({
    queryKey: queryKeys.approvals,
    queryFn: () => repos.approvals.list(),
  });
}

export function useApprovalDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approve" | "reject" }) =>
      decision === "approve"
        ? repos.approvals.approve(id)
        : repos.approvals.reject(id),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: queryKeys.approvals });
      const previous = qc.getQueryData<ApprovalItem[]>(queryKeys.approvals);
      qc.setQueryData<ApprovalItem[]>(queryKeys.approvals, (prev) =>
        prev?.filter((a) => a.id !== id),
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.approvals, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.approvals });
      qc.invalidateQueries({ queryKey: queryKeys.work });
    },
  });
}
