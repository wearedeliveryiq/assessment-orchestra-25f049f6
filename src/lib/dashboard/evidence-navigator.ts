import type { CapabilityCard, DashboardPayload } from "./types";
import type { Observation } from "../observations/types";
import type { Pattern } from "../patterns/types";
import type { Recommendation } from "../recommendations/types";
import type { RuleResult } from "../rules/types";
import type { Signal } from "../signals/types";
import type { AssessmentResponse } from "../assessment/types";

/**
 * EvidenceNavigator — walks the provenance chain that the Intelligence Runtime
 * already recorded on each entity:
 *
 *   Recommendation -> Pattern -> Rule -> Signal -> Observation -> Question -> Response
 *
 * It only follows persisted id/code references. It never re-derives a link.
 */

export type EvidenceKind =
  | "recommendation"
  | "capability"
  | "score"
  | "pattern"
  | "rule"
  | "signal"
  | "observation";

export interface EvidenceSelection {
  kind: EvidenceKind;
  /** Entity id for persisted rows, or the pack code for capabilities. */
  id: string;
  label: string;
}

export interface EvidenceChain {
  selection: EvidenceSelection;
  headline: string;
  subtitle: string;
  recommendations: Recommendation[];
  capabilities: CapabilityCard[];
  patterns: Pattern[];
  rules: RuleResult[];
  signals: Signal[];
  observations: Observation[];
  questions: { questionId: string; response: AssessmentResponse | null }[];
}

function unique<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const output: T[] = [];
  for (const item of items) {
    const id = key(item);
    if (seen.has(id)) continue;
    seen.add(id);
    output.push(item);
  }
  return output;
}

export function buildEvidenceChain(
  payload: DashboardPayload,
  selection: EvidenceSelection,
): EvidenceChain {
  let recommendations: Recommendation[] = [];
  let capabilities: CapabilityCard[] = [];
  let patterns: Pattern[] = [];
  let rules: RuleResult[] = [];
  let signals: Signal[] = [];
  let observations: Observation[] = [];
  let headline = selection.label;
  let subtitle = "";

  switch (selection.kind) {
    case "recommendation": {
      const item = payload.recommendations.find((entry) => entry.code === selection.id);
      if (item) {
        recommendations = [item];
        headline = item.title;
        subtitle = item.selectionReason;
        patterns = payload.patterns.filter((pattern) =>
          item.supportingPatternIds.includes(pattern.id),
        );
        capabilities = payload.capabilities.filter((card) => card.scoreCode === item.dimension);
      }
      break;
    }
    case "capability":
    case "score": {
      const card =
        payload.capabilities.find((entry) => entry.scoreCode === selection.id) ??
        payload.capabilities.find((entry) => entry.scoreId === selection.id);
      const score = payload.scores.find((entry) => entry.scoreCode === card?.scoreCode);
      if (card) {
        capabilities = [card];
        headline = card.dimension;
        subtitle = score?.calculationReason ?? "";
        patterns = payload.patterns.filter((pattern) =>
          card.supportingPatternCodes.includes(pattern.patternCode),
        );
        recommendations = payload.recommendations.filter(
          (item) => item.dimension === card.scoreCode,
        );
      }
      break;
    }
    case "pattern": {
      const pattern =
        payload.patterns.find((entry) => entry.id === selection.id) ??
        payload.patterns.find((entry) => entry.patternCode === selection.id);
      if (pattern) {
        patterns = [pattern];
        headline = pattern.name;
        subtitle = pattern.evaluationReason;
        recommendations = payload.recommendations.filter((item) =>
          item.supportingPatternCodes.includes(pattern.patternCode),
        );
        capabilities = payload.capabilities.filter((card) =>
          card.supportingPatternCodes.includes(pattern.patternCode),
        );
      }
      break;
    }
    case "rule": {
      const rule = payload.rules.find((entry) => entry.id === selection.id);
      if (rule) {
        rules = [rule];
        headline = rule.name;
        subtitle = rule.evaluationReason;
        patterns = payload.patterns.filter((pattern) =>
          pattern.supportingRuleIds.includes(rule.id),
        );
      }
      break;
    }
    case "signal": {
      const signal = payload.signals.find((entry) => entry.id === selection.id);
      if (signal) {
        signals = [signal];
        headline = signal.name;
        subtitle = signal.description;
        rules = payload.rules.filter((rule) => rule.supportingSignalIds.includes(signal.id));
        patterns = payload.patterns.filter((pattern) =>
          rules.some((rule) => pattern.supportingRuleIds.includes(rule.id)),
        );
      }
      break;
    }
    case "observation": {
      const observation = payload.observations.find((entry) => entry.id === selection.id);
      if (observation) {
        observations = [observation];
        headline = observation.title;
        subtitle = observation.evidence;
        signals = payload.signals.filter((signal) =>
          signal.supportingObservationIds.includes(observation.id),
        );
        rules = payload.rules.filter((rule) =>
          signals.some((signal) => rule.supportingSignalIds.includes(signal.id)),
        );
        patterns = payload.patterns.filter((pattern) =>
          rules.some((rule) => pattern.supportingRuleIds.includes(rule.id)),
        );
      }
      break;
    }
  }

  // Walk downwards from patterns for the selections that start higher up.
  if (rules.length === 0 && patterns.length > 0) {
    const ruleIds = new Set(patterns.flatMap((pattern) => pattern.supportingRuleIds));
    rules = payload.rules.filter((rule) => ruleIds.has(rule.id));
  }
  if (signals.length === 0 && rules.length > 0) {
    const signalIds = new Set(rules.flatMap((rule) => rule.supportingSignalIds));
    signals = payload.signals.filter((signal) => signalIds.has(signal.id));
  }
  if (observations.length === 0 && signals.length > 0) {
    const observationIds = new Set(signals.flatMap((signal) => signal.supportingObservationIds));
    observations = payload.observations.filter((entry) => observationIds.has(entry.id));
  }

  const questionIds = unique(
    observations.map((observation) => observation.questionId),
    (id) => id,
  );
  const responsesById = new Map(
    payload.responses.map((response) => [response.questionId, response]),
  );

  return {
    selection,
    headline,
    subtitle,
    recommendations,
    capabilities,
    patterns: unique(patterns, (item) => item.id),
    rules: unique(rules, (item) => item.id),
    signals: unique(signals, (item) => item.id),
    observations: unique(observations, (item) => item.id),
    questions: questionIds.map((questionId) => ({
      questionId,
      response: responsesById.get(questionId) ?? null,
    })),
  };
}
