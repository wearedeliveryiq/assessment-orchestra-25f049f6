import { sprint03Configuration } from "./config";
import { roundHalfUp } from "./math";

type RecommendationDefinition = (typeof sprint03Configuration.recommendations)[number];
export interface RecommendationInput {
  opportunities: string[];
  patterns: string[];
  analysisConfidence: number;
}

function triggerMatches(trigger: object, input: RecommendationInput): boolean {
  if ("opportunity" in trigger && typeof trigger.opportunity === "string")
    return input.opportunities.includes(trigger.opportunity);
  if ("pattern" in trigger && typeof trigger.pattern === "string")
    return input.patterns.includes(trigger.pattern);
  if ("analysisConfidence" in trigger && trigger.analysisConfidence === "low")
    return input.analysisConfidence < 50;
  return false;
}

export function resolveRecommendationEligibility(input: RecommendationInput) {
  const eligible: RecommendationDefinition[] = [];
  const excluded: Array<{ id: string; reason: string }> = [];
  const withheld: Array<{ id: string; reason: "low_confidence_material_action" }> = [];

  for (const definition of sprint03Configuration.recommendations) {
    const matched = definition.triggers.any.some((trigger) => triggerMatches(trigger, input));
    if (!matched) continue;
    const exclusion = definition.exclusions.find((item) =>
      "pattern" in item ? input.patterns.includes(item.pattern) : false,
    );
    if (exclusion && "pattern" in exclusion) {
      excluded.push({ id: definition.id, reason: exclusion.pattern });
      continue;
    }
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
    const rankScore = roundHalfUp(
      impact * policy.rankFormula.impact +
        urgency * policy.rankFormula.urgency +
        input.analysisConfidence * policy.rankFormula.confidence +
        effortEase * policy.rankFormula.effortEase +
        dependencyReadiness * policy.rankFormula.dependencyReadiness,
      6,
    );
    return {
      id: definition.id,
      title: definition.title,
      impact: impactBand,
      effort: effortBand,
      outcome: definition.outcome,
      successMeasures: definition.successMeasures,
      dependencies: definition.dependencies,
      rankScore,
      urgency,
      impactValue: impact,
      effortEase,
      dependencyReadiness,
      order: definition.order,
    };
  });
  return {
    ranked: [...ranked].sort(
      (a, b) =>
        b.rankScore - a.rankScore ||
        b.impactValue - a.impactValue ||
        b.urgency - a.urgency ||
        b.effortEase - a.effortEase ||
        a.order - b.order ||
        a.id.localeCompare(b.id),
    ),
    excluded: eligibility.excluded,
    withheld: eligibility.withheld,
  };
}
