import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

import { useIdentity } from "@/hooks/use-identity";
import { recordShellEvent } from "@/lib/shell/audit";
import { fetchPreferences, savePreferences } from "@/lib/shell/client";
import {
  DEFAULT_PREFERENCES,
  cachePreferences,
  mergePreferences,
  readCachedPreferences,
} from "@/lib/shell/preferences";
import { applyTheme, readStoredThemeMode, resolveTheme, storeThemeMode, watchSystemTheme } from "@/lib/shell/theme";
import type { UserPreferences } from "@/lib/shell/types";

const QUERY_KEY = ["shell", "preferences"] as const;

/**
 * UserPreferences hook — server-persisted, locally cached, optimistically
 * updated. Also the only place theme/appearance classes reach the document.
 */
export function usePreferences() {
  const { isAuthenticated } = useIdentity();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchPreferences,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
    retry: false,
  });

  // Signed-out visitors still get a themed shell from the cached copy.
  const fallback: UserPreferences = {
    ...DEFAULT_PREFERENCES,
    ...(typeof window === "undefined" ? {} : (readCachedPreferences() ?? {})),
    ...(typeof window === "undefined" ? {} : { theme: readStoredThemeMode() ?? DEFAULT_PREFERENCES.theme }),
  };
  const preferences = query.data ?? fallback;

  const mutation = useMutation({
    mutationFn: savePreferences,
    onMutate: async (patch: Partial<UserPreferences>) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<UserPreferences>(QUERY_KEY) ?? preferences;
      queryClient.setQueryData(QUERY_KEY, mergePreferences(previous, patch));
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous);
    },
    onSuccess: (next) => queryClient.setQueryData(QUERY_KEY, next),
  });

  const update = useCallback(
    (patch: Partial<UserPreferences>) => {
      const next = mergePreferences(preferences, patch);
      cachePreferences(next);
      if (patch.theme) storeThemeMode(patch.theme);
      recordShellEvent(patch.theme ? "theme.changed" : "preference.changed", patch as Record<string, unknown>);
      // Unauthenticated sessions keep preferences locally only.
      if (isAuthenticated) return mutation.mutateAsync(patch).catch(() => next);
      queryClient.setQueryData(QUERY_KEY, next);
      return Promise.resolve(next);
    },
    [isAuthenticated, mutation, preferences, queryClient],
  );

  // Apply appearance whenever it changes, and follow the OS in system mode.
  useEffect(() => {
    const appearance = {
      reducedMotion: preferences.reducedMotion,
      highContrast: preferences.highContrast,
    };
    applyTheme(resolveTheme(preferences.theme), appearance);
    if (preferences.theme !== "system") return;
    return watchSystemTheme((system) => applyTheme(system, appearance));
  }, [preferences.theme, preferences.reducedMotion, preferences.highContrast]);

  useEffect(() => {
    if (query.data) cachePreferences(query.data);
  }, [query.data]);

  return {
    preferences,
    isLoading: query.isLoading,
    isSaving: mutation.isPending,
    update,
    resolvedTheme: resolveTheme(preferences.theme),
  };
}
