import type { CapabilityCard, DashboardPayload } from "./types";
import type { ObservationSeverity } from "../observations/types";
import type { Pattern } from "../patterns/types";
import type { Recommendation } from "../recommendations/types";

/**
 * DashboardFilterService — pure, side-effect-free projections over the
 * consolidated payload. Filtering is presentation, not business logic: nothing
 * here changes a score, confidence or severity, it only hides rows.
 */

export interface DashboardFilters {
  capability: string | "all";
  severity: ObservationSeverity | "all";
  category: string | "all";
  priority: Recommendation["priority"] | "all";
  horizon: Recommendation["horizon"] | "all";
  query: string;
}

export const DEFAULT_FILTERS: DashboardFilters = {
  capability: "all",
  severity: "all",
  category: "all",
  priority: "all",
  horizon: "all",
  query: "",
};

export function isFiltered(filters: DashboardFilters): boolean {
  return (
    filters.capability !== "all" ||
    filters.severity !== "all" ||
    filters.category !== "all" ||
    filters.priority !== "all" ||
    filters.horizon !== "all" ||
    filters.query.trim() !== ""
  );
}

function matchesQuery(query: string, ...fields: (string | null | undefined)[]): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) => (field ?? "").toLowerCase().includes(needle));
}

export function filterCapabilities(
  capabilities: CapabilityCard[],
  filters: DashboardFilters,
): CapabilityCard[] {
  return capabilities.filter(
    (card) =>
      (filters.capability === "all" || card.scoreCode === filters.capability) &&
      (filters.severity === "all" || card.severity === filters.severity) &&
      matchesQuery(filters.query, card.dimension, card.maturityLevel, card.topPatternName),
  );
}

export function filterPatterns(
  patterns: Pattern[],
  filters: DashboardFilters,
  capabilities: CapabilityCard[],
): Pattern[] {
  const scoped =
    filters.capability === "all"
      ? null
      : new Set(
          capabilities
            .filter((card) => card.scoreCode === filters.capability)
            .flatMap((card) => card.supportingPatternCodes),
        );

  return patterns.filter(
    (pattern) =>
      (!scoped || scoped.has(pattern.patternCode)) &&
      (filters.severity === "all" || pattern.severity === filters.severity) &&
      (filters.category === "all" || pattern.category === filters.category) &&
      matchesQuery(filters.query, pattern.name, pattern.description, pattern.patternCode),
  );
}

export function filterRecommendations(
  recommendations: Recommendation[],
  filters: DashboardFilters,
): Recommendation[] {
  return recommendations.filter(
    (item) =>
      (filters.capability === "all" || item.dimension === filters.capability) &&
      (filters.severity === "all" || item.severity === filters.severity) &&
      (filters.category === "all" || item.category === filters.category) &&
      (filters.priority === "all" || item.priority === filters.priority) &&
      (filters.horizon === "all" || item.horizon === filters.horizon) &&
      matchesQuery(filters.query, item.title, item.rationale, item.code, item.expectedBenefit),
  );
}

export interface DashboardView {
  capabilities: CapabilityCard[];
  patterns: Pattern[];
  recommendations: Recommendation[];
}

export function applyFilters(payload: DashboardPayload, filters: DashboardFilters): DashboardView {
  return {
    capabilities: filterCapabilities(payload.capabilities, filters),
    patterns: filterPatterns(payload.patterns, filters, payload.capabilities),
    recommendations: filterRecommendations(payload.recommendations, filters),
  };
}
