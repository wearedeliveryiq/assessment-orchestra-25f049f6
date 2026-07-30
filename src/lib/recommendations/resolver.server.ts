import type { KnowledgePackDocument } from "../knowledge-packs/schema";
import type { Pattern } from "../patterns/types";
import type { Score } from "../scores/types";
import type { Recommendation } from "./types";

/**
 * RecommendationResolver
 *
 * Single responsibility: select the Knowledge Pack interventions whose declared
 * pattern triggers were actually detected for a session. It performs no
 * scoring and invents no content — every recommendation is a pack definition
 * bound to the persisted Patterns that made it relevant.
 */

const PRIORITY_ORDER: Record<Recommendation["priority"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const HORIZON_ORDER: Record<Recommendation["horizon"], number> = {
  now: 0,
  next: 1,
  later: 2,
};

export function resolveRecommendations(
  pack: KnowledgePackDocument,
  patterns: Pattern[],
  scores: Score[] = [],
): Recommendation[] {
  const definitions = pack.recommendations.definitions ?? [];
  if (definitions.length === 0) return [];

  const byCode = new Map(patterns.map((pattern) => [pattern.patternCode, pattern]));
  const dimensionNames = new Map(scores.map((score) => [score.scoreCode, score.dimension]));
  for (const definition of pack.scoring.dimensions) {
    if (!dimensionNames.has(definition.scoreCode)) {
      dimensionNames.set(definition.scoreCode, definition.dimension);
    }
  }

  const resolved: Recommendation[] = [];

  for (const definition of definitions) {
    const supporting = definition.triggers
      .map((code) => byCode.get(code))
      .filter((pattern): pattern is Pattern => Boolean(pattern));

    if (supporting.length === 0) continue;

    const strongest = supporting.reduce((best, pattern) =>
      pattern.confidence > best.confidence ? pattern : best,
    );

    resolved.push({
      code: definition.code,
      title: definition.title,
      rationale: definition.rationale,
      category: definition.category,
      dimension: definition.dimension,
      dimensionName: dimensionNames.get(definition.dimension) ?? definition.dimension,
      priority: definition.priority,
      horizon: definition.horizon,
      impact: definition.impact,
      effort: definition.effort,
      expectedBenefit: definition.expectedBenefit,
      confidence: strongest.confidence,
      severity: strongest.severity,
      supportingPatternIds: supporting.map((pattern) => pattern.id),
      supportingPatternCodes: supporting.map((pattern) => pattern.patternCode),
      selectionReason: `Triggered by ${supporting
        .map((pattern) => `${pattern.patternCode} (${pattern.name})`)
        .join(", ")}.`,
    });
  }

  return resolved.sort(
    (a, b) =>
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
      HORIZON_ORDER[a.horizon] - HORIZON_ORDER[b.horizon] ||
      b.confidence - a.confidence ||
      a.code.localeCompare(b.code),
  );
}
