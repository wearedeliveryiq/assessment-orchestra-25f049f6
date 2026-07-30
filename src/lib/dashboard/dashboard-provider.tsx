import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";

import { useHydrated } from "@/hooks/use-hydrated";
import { dashboardApi, dashboardKeys } from "./client";
import {
  applyFilters,
  DEFAULT_FILTERS,
  isFiltered,
  type DashboardFilters,
  type DashboardView,
} from "./filter-service";
import { buildEvidenceChain, type EvidenceChain, type EvidenceSelection } from "./evidence-navigator";
import type { DashboardPayload } from "./types";

/**
 * DashboardDataProvider + DashboardStateManager.
 *
 * One fetch of the consolidated endpoint feeds every widget. Widgets stay
 * decoupled: they subscribe to this context and never call the API, never
 * hold cross-widget state and never compute intelligence output.
 */

interface DashboardContextValue {
  assessmentId: string;
  data: DashboardPayload | null;
  view: DashboardView | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  filters: DashboardFilters;
  filtersActive: boolean;
  setFilter: <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => void;
  resetFilters: () => void;
  selection: EvidenceSelection | null;
  evidence: EvidenceChain | null;
  select: (selection: EvidenceSelection) => void;
  clearSelection: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({
  assessmentId,
  children,
}: {
  assessmentId: string;
  children: ReactNode;
}) {
  const hydrated = useHydrated();
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [selection, setSelection] = useState<EvidenceSelection | null>(null);

  const query = useQuery({
    queryKey: dashboardKeys.detail(assessmentId),
    queryFn: () => dashboardApi.get(assessmentId),
    enabled: hydrated,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const data = query.data ?? null;

  const view = useMemo(() => (data ? applyFilters(data, filters) : null), [data, filters]);
  const evidence = useMemo(
    () => (data && selection ? buildEvidenceChain(data, selection) : null),
    [data, selection],
  );

  const setFilter = useCallback(
    <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => {
      setFilters((previous) => ({ ...previous, [key]: value }));
    },
    [],
  );

  const value = useMemo<DashboardContextValue>(
    () => ({
      assessmentId,
      data,
      view,
      isLoading: !hydrated || query.isPending,
      error: (query.error as Error | null) ?? null,
      refetch: () => void query.refetch(),
      filters,
      filtersActive: isFiltered(filters),
      setFilter,
      resetFilters: () => setFilters(DEFAULT_FILTERS),
      selection,
      evidence,
      select: setSelection,
      clearSelection: () => setSelection(null),
    }),
    [assessmentId, data, view, hydrated, query, filters, setFilter, selection, evidence],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("useDashboard must be used inside a DashboardProvider");
  return context;
}
