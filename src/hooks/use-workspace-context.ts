import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as tenancy from "@/lib/tenancy/client";
import { useIdentity } from "./use-identity";

/**
 * Workspace context for the whole app: current workspace, favourites, recents
 * and the switcher mutation. Backed by one cached server call.
 */
export function useWorkspaceContext() {
  const { isAuthenticated } = useIdentity();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tenancy", "workspace-context"],
    queryFn: tenancy.workspaceContext,
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const switchTo = useMutation({
    mutationFn: tenancy.switchWorkspace,
    onSuccess: (context) => {
      queryClient.setQueryData(["tenancy", "workspace-context"], context);
      queryClient.invalidateQueries({ queryKey: ["tenancy"] });
    },
  });

  return {
    context: query.data ?? null,
    workspaces: query.data?.workspaces ?? [],
    organisations: query.data?.organisations ?? [],
    currentWorkspace: query.data?.currentWorkspace ?? null,
    organisation: query.data?.organisation ?? null,
    isLoading: query.isLoading,
    switchWorkspace: switchTo.mutateAsync,
    isSwitching: switchTo.isPending,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["tenancy"] }),
  };
}
