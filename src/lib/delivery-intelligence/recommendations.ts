import { sprint03Configuration } from "./config";
import { roundHalfUp } from "./math";
import { sprint03CatalogueSnapshot } from "../recommendation-catalogue/catalogue";
import { evaluateRecommendationCandidates } from "../recommendations/eligibility";

type RecommendationDefinition = (typeof sprint03Configuration.recommendations)[number];
export interface RecommendationInput {
  opportunities: string[];
  patterns: string[];
  analysisConfidence: number;
}

export function resolveRecommendationEligibility(input: RecommendationInput) {
  const definitions = sprint03Configuration.recommendations;
  const byId = new Map(definitions.map((item) => [item.id, item]));
  const evaluated = evaluateRecommendationCandidates(
    sprint03CatalogueSnapshot().definitions,
    input,
  );
  const eligible: RecommendationDefinition[] = [];
  const excluded = evaluated
    .filter((item) => item.result === "excluded")
    .map((item) => ({ id: item.recommendationId, reason: item.exclusions[0].split(":", 2)[1] }));
  const withheld: Array<{ id: string; reason: "low_confidence_material_action" }> = [];

  for (const candidate of evaluated.filter((item) => item.result === "eligible")) {
    const definition = byId.get(candidate.recommendationId);
    if (!definition) continue;
    if (
      input.analysisConfidence <
        sprint03Configuration.recommendationPolicy.confidenceGates.lowMaximumExclusive &&
      sprint03Configuration.recommendationPolicy.confidenceGates.lowConfidenceWithholdEffort.includes(
        definition.effort,
      )
    ) {
      withheld.push({ id: definition.id, reason: "low_confidence_material_action" });
      continue;
    }
    eligible.push(definition);
  }

  const eligibleIds = new Set(eligible.map((item) => item.id));
  const dependencyReadiness = Object.fromEntries(
    eligible.map((item) => [
      item.id,
      item.dependencies.length === 0 ||
      item.dependencies.every((dependency) => eligibleIds.has(dependency))
        ? 100
        : 40,
    ]),
  );
  return { eligible, excluded, withheld, dependencyReadiness };
}

export interface RankedRecommendation {
  id: string;
  rankScore: number;
  impact: number;
  urgency: number;
  effortEase: number;
  order: number;
}

export interface RecommendationRankComponents {
  impact: number;
  urgency: number;
  confidence: number;
  effortEase: number;
  dependencyReadiness: number;
}

/**
 * Shared DIQ-203 rank primitive. Consumers retain the unrounded score for
 * ordering and use the six-decimal value only for the locked stored result.
 */
export function calculateRecommendationRankScore(components: RecommendationRankComponents) {
  const values: RecommendationRankComponents = {
    impact: components.impact,
    urgency: components.urgency,
    confidence: components.confidence,
    effortEase: components.effortEase,
    dependencyReadiness: components.dependencyReadiness,
  };
  for (const [name, value] of Object.entries(values)) {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error(`Recommendation rank component ${name} is outside 0..100`);
    }
  }
  const formula = sprint03Configuration.recommendationPolicy.rankFormula;
  const raw =
    values.impact * formula.impact +
    values.urgency * formula.urgency +
    values.confidence * formula.confidence +
    values.effortEase * formula.effortEase +
    values.dependencyReadiness * formula.dependencyReadiness;
  return { raw, stored: roundHalfUp(raw, 6) };
}

export function sortRecommendations(items: RankedRecommendation[]): RankedRecommendation[] {
  return [...items].sort(
    (a, b) =>
      b.rankScore - a.rankScore ||
      b.impact - a.impact ||
      b.urgency - a.urgency ||
      b.effortEase - a.effortEase ||
      a.order - b.order ||
      a.id.localeCompare(b.id),
  );
}

export function deduplicateRecommendations(
  candidates: Array<{ id: string; dedupeGroup: string; order: number; triggers: string[] }>,
) {
  const groups = new Map<
    string,
    { id: string; dedupeGroup: string; order: number; triggers: string[] }
  >();
  for (const candidate of [...candidates].sort(
    (a, b) => a.order - b.order || a.id.localeCompare(b.id),
  )) {
    const existing = groups.get(candidate.dedupeGroup);
    if (!existing)
      groups.set(candidate.dedupeGroup, { ...candidate, triggers: [...candidate.triggers] });
    else existing.triggers = [...new Set([...existing.triggers, ...candidate.triggers])];
  }
  return [...groups.values()].map(({ id, triggers }) => ({ id, triggers }));
}

export function rankRecommendations(input: {
  opportunities: Array<{ id: string; score: number }>;
  patterns: Array<{ id: string; severity: string }>;
  analysisConfidence: number;
}) {
  const eligibility = resolveRecommendationEligibility({
    opportunities: input.opportunities.map((item) => item.id),
    patterns: input.patterns.map((item) => item.id),
    analysisConfidence: input.analysisConfidence,
  });
  const policy = sprint03Configuration.recommendationPolicy;
  const ranked = eligibility.eligible.map((definition) => {
    const opportunityUrgencies = definition.triggers.any.flatMap((trigger) => {
      if (!("opportunity" in trigger)) return [];
      const opportunity = input.opportunities.find((item) => item.id === trigger.opportunity);
      return opportunity ? [opportunity.score < 25 ? 90 : 65] : [];
    });
    const patternUrgencies = definition.triggers.any.flatMap((trigger) => {
      if (!("pattern" in trigger)) return [];
      const pattern = input.patterns.find((item) => item.id === trigger.pattern);
      return pattern
        ? [pattern.severity === "critical" ? 100 : pattern.severity === "high" ? 80 : 65]
        : [];
    });
    const urgency = Math.max(0, ...opportunityUrgencies, ...patternUrgencies);
    const impactBand = definition.impact as keyof typeof policy.impactValues;
    const effortBand = definition.effort as keyof typeof policy.effortEaseValues;
    const impact = policy.impactValues[impactBand];
    const effortEase = policy.effortEaseValues[effortBand];
    const dependencyReadiness = eligibility.dependencyReadiness[definition.id];
    const rankScore = calculateRecommendationRankScore({
      impact,
      urgency,
      confidence: input.analysisConfidence,
      effortEase,
      dependencyReadiness,
    });
    return {
      id: definition.id,
      title: definition.title,
      impact: impactBand,
      effort: effortBand,
      outcome: definition.outcome,
      successMeasures: definition.successMeasures,
      dependencies: definition.dependencies,
      rankScore: rankScore.stored,
      rawRankScore: rankScore.raw,
      urgency,
      impactValue: impact,
      effortEase,
      dependencyReadiness,
      order: definition.order,
    };
  });
  return {
    ranked: [...ranked]
      .sort(
        (a, b) =>
          b.rawRankScore - a.rawRankScore ||
          b.impactValue - a.impactValue ||
          b.urgency - a.urgency ||
          b.effortEase - a.effortEase ||
          a.order - b.order ||
          a.id.localeCompare(b.id),
      )
      .map(({ rawRankScore: _rawRankScore, ...item }) => item),
    excluded: eligibility.excluded,
    withheld: eligibility.withheld,
  };
}
