import { sprint03Configuration } from "../delivery-intelligence/config";
import type { CatalogueDefinition } from "../recommendation-catalogue/types";

export type RecommendationEvaluationResult = "eligible" | "ineligible" | "excluded";
export type RecommendationConfidenceState = "low" | "moderate" | "high";

export interface RecommendationSignalInput {
  opportunities: string[];
  patterns: string[];
  analysisConfidence: number;
}

export interface RecommendationDecisiveFact {
  kind: "matched_trigger" | "unmet_trigger" | "matched_exclusion";
  signalType: "opportunity" | "pattern" | "analysis_confidence";
  signalId: string;
}

export interface RecommendationCandidateEvaluation {
  recommendationId: string;
  recommendationVersion: string;
  catalogueOrder: number;
  result: RecommendationEvaluationResult;
  matchedTriggers: string[];
  unmetTriggers: string[];
  unmetPrerequisites: string[];
  exclusions: string[];
  confidenceState: RecommendationConfidenceState;
  decisiveFacts: RecommendationDecisiveFact[];
  sourceDomainIds: string[];
}

export class RecommendationEvaluationError extends Error {
  readonly code = "RECOMMENDATION_EVALUATION_INVALID";
}

function signalReference(value: Record<string, string>): string {
  const entries = Object.entries(value);
  if (entries.length !== 1) throw new RecommendationEvaluationError("Invalid signal rule");
  const [kind, id] = entries[0];
  if (kind === "opportunity") return `opportunity:${id}`;
  if (kind === "pattern") return `pattern:${id}`;
  if (kind === "analysisConfidence" && id === "low") return "analysis_confidence:low";
  throw new RecommendationEvaluationError("Unknown recommendation signal rule");
}

function signalMatches(reference: string, input: RecommendationSignalInput): boolean {
  const [kind, id] = reference.split(":", 2);
  if (kind === "opportunity") return input.opportunities.includes(id);
  if (kind === "pattern") return input.patterns.includes(id);
  if (kind === "analysis_confidence") return input.analysisConfidence < 50;
  return false;
}

function fact(reference: string, kind: RecommendationDecisiveFact["kind"]) {
  const [signalType, signalId] = reference.split(":", 2) as [
    RecommendationDecisiveFact["signalType"],
    string,
  ];
  return { kind, signalType, signalId };
}

function sourceDomainId(reference: string): string | null {
  const [kind, id] = reference.split(":", 2);
  if (kind === "opportunity") return `finding:${id}`;
  if (kind === "pattern") return `pattern:${id}`;
  if (kind === "analysis_confidence") return "confidence";
  return null;
}

export function recommendationConfidenceState(value: number): RecommendationConfidenceState {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new RecommendationEvaluationError("Recommendation confidence is outside 0..100");
  }
  const gates = sprint03Configuration.recommendationPolicy.confidenceGates;
  if (value >= gates.highMinimum) return "high";
  if (value >= gates.moderateMinimum && value < gates.highMinimum) return "moderate";
  if (value < gates.lowMaximumExclusive) return "low";
  throw new RecommendationEvaluationError("Recommendation confidence does not match a gate");
}

function validateSignals(input: RecommendationSignalInput) {
  const knownCapabilities = new Set(sprint03Configuration.capabilities.map((item) => item.id));
  const knownPatterns = new Set(sprint03Configuration.patterns.map((item) => item.id));
  if (new Set(input.opportunities).size !== input.opportunities.length) {
    throw new RecommendationEvaluationError("Duplicate opportunity signal");
  }
  if (new Set(input.patterns).size !== input.patterns.length) {
    throw new RecommendationEvaluationError("Duplicate pattern signal");
  }
  for (const id of input.opportunities) {
    if (!knownCapabilities.has(id)) {
      throw new RecommendationEvaluationError(`Unknown opportunity signal: ${id}`);
    }
  }
  for (const id of input.patterns) {
    if (!knownPatterns.has(id)) {
      throw new RecommendationEvaluationError(`Unknown pattern signal: ${id}`);
    }
  }
  recommendationConfidenceState(input.analysisConfidence);
}

/**
 * Shared deterministic eligibility primitive used by both the locked Sprint 03
 * result and the Sprint 04 persisted evaluation. Presentation layers never
 * recreate these rules.
 */
export function evaluateRecommendationCandidates(
  definitions: CatalogueDefinition[],
  rawInput: RecommendationSignalInput,
): RecommendationCandidateEvaluation[] {
  const input = {
    opportunities: [...rawInput.opportunities].sort(),
    patterns: [...rawInput.patterns].sort(),
    analysisConfidence: rawInput.analysisConfidence,
  };
  validateSignals(input);
  const confidenceState = recommendationConfidenceState(input.analysisConfidence);
  const ordered = [...definitions].sort(
    (left, right) => left.order - right.order || left.id.localeCompare(right.id),
  );
  const preliminary = ordered.map((definition) => {
    const triggerReferences = definition.triggers.any.map(signalReference);
    const exclusionReferences = definition.exclusions.map(signalReference);
    const matchedTriggers = triggerReferences.filter((item) => signalMatches(item, input));
    const unmetTriggers = triggerReferences.filter((item) => !signalMatches(item, input));
    const exclusions = exclusionReferences.filter((item) => signalMatches(item, input));
    const result: RecommendationEvaluationResult =
      matchedTriggers.length && exclusions.length
        ? "excluded"
        : matchedTriggers.length
          ? "eligible"
          : "ineligible";
    const decisiveReferences =
      result === "excluded" ? exclusions : result === "eligible" ? matchedTriggers : unmetTriggers;
    const decisiveKind: RecommendationDecisiveFact["kind"] =
      result === "excluded"
        ? "matched_exclusion"
        : result === "eligible"
          ? "matched_trigger"
          : "unmet_trigger";
    return {
      recommendationId: definition.id,
      recommendationVersion: definition.version,
      catalogueOrder: definition.order,
      result,
      matchedTriggers,
      unmetTriggers,
      unmetPrerequisites: [] as string[],
      exclusions,
      confidenceState,
      decisiveFacts: decisiveReferences.map((item) => fact(item, decisiveKind)),
      sourceDomainIds: [
        ...new Set(
          [...matchedTriggers, ...exclusions]
            .map(sourceDomainId)
            .filter((item): item is string => item !== null),
        ),
      ].sort(),
    };
  });
  const eligible = new Set(
    preliminary.filter((item) => item.result === "eligible").map((item) => item.recommendationId),
  );
  const byId = new Map(ordered.map((item) => [item.id, item]));
  return preliminary.map((candidate) => ({
    ...candidate,
    unmetPrerequisites: (byId.get(candidate.recommendationId)?.dependencies ?? [])
      .filter((dependency) => !eligible.has(dependency))
      .sort(),
  }));
}
