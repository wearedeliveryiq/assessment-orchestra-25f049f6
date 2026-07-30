import type { RecommendationDefinition } from "../knowledge-packs/schema";
import type { ObservationSeverity } from "../observations/types";

export type { RecommendationDefinition };

export type RecommendationPriority = RecommendationDefinition["priority"];
export type RecommendationHorizon = RecommendationDefinition["horizon"];
export type RecommendationEffortLevel = RecommendationDefinition["effort"];
export type RecommendationImpactLevel = RecommendationDefinition["impact"];

/**
 * A Recommendation as surfaced to the presentation layer: a Knowledge Pack
 * intervention selected because specific Patterns were detected. Nothing here
 * is invented at read time — every field is either declared by the pack or
 * copied from the persisted Pattern that triggered it.
 */
export interface Recommendation {
  code: string;
  title: string;
  rationale: string;
  category: string;
  /** Score code of the capability dimension the intervention improves. */
  dimension: string;
  dimensionName: string;
  priority: RecommendationPriority;
  horizon: RecommendationHorizon;
  impact: RecommendationImpactLevel;
  effort: RecommendationEffortLevel;
  expectedBenefit: string;
  /** Highest confidence among the triggering patterns. */
  confidence: number;
  severity: ObservationSeverity;
  supportingPatternIds: string[];
  supportingPatternCodes: string[];
  selectionReason: string;
}
