import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { currentIdentity } from "@/lib/identity/client";
import { hasPermission } from "@/lib/identity/rbac";
import type { AuthenticatedIdentity } from "@/lib/identity/types";

/**
 * Single source of truth for "who is signed in" in the browser.
 * The provider session drives the query; the query resolves the full identity
 * (profile + roles + memberships + permissions) from the identity platform.
 */
export function useIdentity() {
  const queryClient = useQueryClient();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setHasSession(Boolean(data.session));
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setHasSession(Boolean(session));
      queryClient.invalidateQueries({ queryKey: ["identity"] });
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [queryClient]);

  const query = useQuery<AuthenticatedIdentity>({
    queryKey: ["identity"],
    queryFn: currentIdentity,
    enabled: hasSession === true,
    retry: false,
    staleTime: 60_000,
  });

  const identity = hasSession ? (query.data ?? null) : null;

  return {
    identity,
    roles: identity?.roles ?? [],
    isLoading: hasSession === null || (hasSession && query.isLoading),
    isAuthenticated: Boolean(identity),
    can: (permission: string) => (identity ? hasPermission(identity.roles, permission) : false),
    refresh: () => queryClient.invalidateQueries({ queryKey: ["identity"] }),
  };
}
