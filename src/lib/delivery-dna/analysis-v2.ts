import {
  DELIVERY_DNA_V2_CONFIGURATION_DIGEST,
  deliveryDnaV2Capabilities,
  deliveryDnaV2Catalogue,
  deliveryDnaV2Domains,
  type DeliveryDnaV2Level,
} from "./catalogue-v2";
import { selectOverviewContext } from "./context-v2";
import type { CanonicalAnalysisInput } from "../analysis/types";

export type DeliveryDnaV2EvidenceStatus = "answered" | "not_applicable" | "missing" | "excluded";
export type DeliveryDnaV2Response = {
  questionId: string;
  status: DeliveryDnaV2EvidenceStatus;
  answer: number | null;
  reason?: string | null;
};

const round6 = (value: number) => Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
const roundHalfUp = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};
const normalise = (answer: number) => ((answer - 1) / 3) * 100;

function populationConsistency(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return 1;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return round6(1 - Math.min(Math.sqrt(variance) / 50, 1));
}

export function deliveryDnaV2ResponseConsistency(responses: DeliveryDnaV2Response[]) {
  const byId = new Map(responses.map((response) => [response.questionId, response]));
  const capabilityConsistency = Object.fromEntries(
    deliveryDnaV2Capabilities.map((capability) => {
      const eligible = capability.questions.flatMap((question) => {
        const response = byId.get(question.id);
        return response?.status === "answered" && typeof response.answer === "number"
          ? [normalise(response.answer)]
          : [];
      });
      return [capability.id, populationConsistency(eligible)];
    }),
  );
  return {
    capabilityConsistency,
    overall: round6(
      Object.values(capabilityConsistency).reduce((sum, value) => sum + value, 0) /
        deliveryDnaV2Capabilities.length,
    ),
  };
}

export function deliveryDnaV2EvidenceMetadataValues(input: {
  evidenceRecencyDeclaration?: string;
  perspectiveBreadthDeclaration?: string;
}) {
  const required = deliveryDnaV2Catalogue.confidencePolicy.requiredMetadata;
  return {
    evidenceRecency:
      required.evidenceRecencyDeclaration.options.find(
        (item) => item.id === input.evidenceRecencyDeclaration,
      )?.value ?? 0,
    perspectiveBreadth:
      required.perspectiveBreadthDeclaration.options.find(
        (item) => item.id === input.perspectiveBreadthDeclaration,
      )?.value ?? 0,
  };
}

export function deliveryDnaV2Band(score: number): DeliveryDnaV2Level {
  if (score < 25) return "emerging";
  if (score < 50) return "developing";
  if (score < 75) return "established";
  return "leading";
}

export function scoreDeliveryDnaV2Capability(
  capabilityId: string,
  responses: DeliveryDnaV2Response[],
) {
  const capability = deliveryDnaV2Capabilities.find((item) => item.id === capabilityId);
  if (!capability) throw new Error("DELIVERY_DNA_CAPABILITY_INVALID");
  const byId = new Map(responses.map((response) => [response.questionId, response]));
  const eligible = capability.questions.flatMap((question) => {
    const response = byId.get(question.id);
    return response?.status === "answered" &&
      Number.isInteger(response.answer) &&
      response.answer! >= 1 &&
      response.answer! <= 4
      ? [{ question, answer: response.answer! }]
      : [];
  });
  const eligibleWeight = round6(eligible.reduce((sum, item) => sum + item.question.weight, 0));
  if (eligible.length < 2 || eligibleWeight < 0.6) {
    return {
      capabilityId,
      available: false as const,
      rawScore: null,
      displayScore: null,
      band: null,
      eligibleQuestionCount: eligible.length,
      eligibleWeight,
      reason: "insufficient_eligible_evidence" as const,
    };
  }
  const rawScore = round6(
    eligible.reduce((sum, item) => sum + normalise(item.answer) * item.question.weight, 0) /
      eligibleWeight,
  );
  return {
    capabilityId,
    available: true as const,
    rawScore,
    displayScore: roundHalfUp(rawScore, 1),
    band: deliveryDnaV2Band(rawScore),
    eligibleQuestionCount: eligible.length,
    eligibleWeight,
    reason: null,
  };
}

export function aggregateDeliveryDnaV2Domain(
  domainId: string,
  capabilityScores: Record<string, number | null>,
) {
  const domain = deliveryDnaV2Domains.find((item) => item.id === domainId);
  if (!domain) throw new Error("DELIVERY_DNA_DOMAIN_INVALID");
  const scores = domain.capabilities.flatMap((capability) => {
    const score = capabilityScores[capability.id];
    return typeof score === "number" ? [score] : [];
  });
  if (scores.length < 2)
    return { available: false as const, rawScore: null, band: null, availableCount: scores.length };
  const rawScore = round6(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  return {
    available: true as const,
    rawScore,
    band: deliveryDnaV2Band(rawScore),
    availableCount: scores.length,
  };
}

export function aggregateDeliveryDnaV2Overall(capabilityScores: Record<string, number | null>) {
  const domainCoverage = deliveryDnaV2Domains.map(
    (domain) =>
      domain.capabilities.filter(
        (capability) => typeof capabilityScores[capability.id] === "number",
      ).length,
  );
  const scores = deliveryDnaV2Capabilities.flatMap((capability) => {
    const score = capabilityScores[capability.id];
    return typeof score === "number" ? [score] : [];
  });
  if (scores.length < 11 || domainCoverage.some((count) => count < 2)) {
    return { available: false as const, rawScore: null, band: null, availableCount: scores.length };
  }
  const rawScore = round6(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  return {
    available: true as const,
    rawScore,
    band: deliveryDnaV2Band(rawScore),
    availableCount: scores.length,
  };
}

export function deliveryDnaV2ConfidenceFromFactors(factors: number[]) {
  const weights = deliveryDnaV2Catalogue.confidencePolicy.factors.map((factor) => factor.weight);
  if (factors.length !== weights.length) throw new Error("DELIVERY_DNA_CONFIDENCE_INVALID");
  const rawConfidence = round6(
    100 * factors.reduce((sum, value, index) => sum + value * weights[index], 0),
  );
  return {
    rawConfidence,
    displayConfidence: roundHalfUp(rawConfidence, 0),
    band: confidenceBand(rawConfidence),
  };
}

export function confidenceBand(value: number): "low" | "moderate" | "high" {
  if (value < 50) return "low";
  if (value < 75) return "moderate";
  return "high";
}

export function deliveryDnaV2CapabilityConfidence(input: {
  eligibleQuestionCount: number;
  consistency: number;
  recency: number;
  breadth: number;
}) {
  return round6(
    100 *
      ((input.eligibleQuestionCount / 3) * 0.5 +
        input.consistency * 0.3 +
        input.recency * 0.1 +
        input.breadth * 0.1),
  );
}

export function selectDeliveryDnaV2Findings(
  scores: Array<{ id: string; score: number; confidence: number; order: number }>,
) {
  const strengths = scores
    .filter((item) => item.score >= 75 && item.confidence >= 50)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.confidence - left.confidence ||
        left.order - right.order ||
        left.id.localeCompare(right.id),
    )
    .slice(0, 5);
  const opportunities = scores
    .filter((item) => item.score < 50 && item.confidence >= 50)
    .sort(
      (left, right) =>
        left.score - right.score ||
        right.confidence - left.confidence ||
        left.order - right.order ||
        left.id.localeCompare(right.id),
    )
    .slice(0, 5);
  const insufficientEvidence = scores.filter((item) => item.confidence < 50);
  return { strengths, opportunities, insufficientEvidence };
}

type Pattern = (typeof deliveryDnaV2Catalogue.patterns)[number];
type PatternPredicate = Pattern["predicates"][number];

function compare(value: number, operator: string, target: number) {
  if (operator === "lt") return value < target;
  if (operator === "lte") return value <= target;
  if (operator === "gt") return value > target;
  if (operator === "gte") return value >= target;
  if (operator === "eq") return value === target;
  throw new Error("DELIVERY_DNA_PATTERN_OPERATOR_INVALID");
}

function predicateValue(predicate: PatternPredicate, scores: Record<string, number>): number {
  if ("capability" in predicate && typeof predicate.capability === "string")
    return scores[predicate.capability];
  if ("aggregate" in predicate && Array.isArray(predicate.capabilities)) {
    const values = predicate.capabilities.map((id) => scores[id]);
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  if ("difference" in predicate && predicate.difference) {
    const left = predicate.difference.leftMean.map((id) => scores[id]);
    const right = predicate.difference.rightMean.map((id) => scores[id]);
    return (
      left.reduce((sum, value) => sum + value, 0) / left.length -
      right.reduce((sum, value) => sum + value, 0) / right.length
    );
  }
  throw new Error("DELIVERY_DNA_PATTERN_PREDICATE_INVALID");
}

export function deliveryDnaV2PatternMatches(
  patternId: string,
  scores: Record<string, number>,
  confidences: Record<string, number>,
): boolean {
  const pattern = deliveryDnaV2Catalogue.patterns.find((item) => item.id === patternId);
  if (!pattern) throw new Error("DELIVERY_DNA_PATTERN_INVALID");
  const referenced = new Set<string>();
  for (const predicate of pattern.predicates) {
    if ("capability" in predicate && typeof predicate.capability === "string")
      referenced.add(predicate.capability);
    if ("aggregate" in predicate && Array.isArray(predicate.capabilities))
      predicate.capabilities.forEach((id) => referenced.add(id));
    if ("difference" in predicate && predicate.difference) {
      predicate.difference.leftMean.forEach((id) => referenced.add(id));
      predicate.difference.rightMean.forEach((id) => referenced.add(id));
    }
  }
  if ([...referenced].some((id) => confidences[id] < pattern.minimumCapabilityConfidence))
    return false;
  return pattern.predicates.every((predicate) =>
    compare(predicateValue(predicate, scores), predicate.operator, predicate.value),
  );
}

export function resolveDeliveryDnaV2Patterns(patterns: Pattern[]) {
  const retained = new Map<string, Pattern>();
  const noGroup: Pattern[] = [];
  for (const pattern of patterns) {
    if (!pattern.exclusiveGroup) {
      noGroup.push(pattern);
      continue;
    }
    const current = retained.get(pattern.exclusiveGroup);
    if (
      !current ||
      pattern.priority > current.priority ||
      (pattern.priority === current.priority &&
        (pattern.order < current.order ||
          (pattern.order === current.order && pattern.id < current.id)))
    ) {
      retained.set(pattern.exclusiveGroup, pattern);
    }
  }
  const keep = [...noGroup, ...retained.values()]
    .sort(
      (left, right) =>
        right.priority - left.priority ||
        left.order - right.order ||
        left.id.localeCompare(right.id),
    )
    .slice(0, 5);
  return {
    retained: keep,
    suppressed: patterns.filter((item) => !keep.some((kept) => kept.id === item.id)),
  };
}

export function eligibleDeliveryDnaV2Recommendations(input: {
  opportunityIds: string[];
  patterns: string[];
  analysisConfidence: "low" | "moderate" | "high";
}) {
  const opportunities = new Set(input.opportunityIds);
  const patterns = new Set(input.patterns);
  return deliveryDnaV2Catalogue.recommendations.filter((recommendation) => {
    const triggered = recommendation.triggers.any.some((trigger) => {
      if ("opportunity" in trigger && typeof trigger.opportunity === "string")
        return opportunities.has(trigger.opportunity);
      if ("pattern" in trigger && typeof trigger.pattern === "string")
        return patterns.has(trigger.pattern);
      if ("analysisConfidence" in trigger)
        return trigger.analysisConfidence === input.analysisConfidence;
      return false;
    });
    const excluded = recommendation.exclusions.some((exclusion) => patterns.has(exclusion.pattern));
    return triggered && !excluded;
  });
}

export function sortDeliveryDnaV2RecommendationCandidates<
  T extends {
    id: string;
    rankScore: number;
    impactValue: number;
    urgency: number;
    effortEase: number;
    order: number;
  },
>(items: T[]) {
  return [...items].sort(
    (left, right) =>
      right.rankScore - left.rankScore ||
      right.impactValue - left.impactValue ||
      right.urgency - left.urgency ||
      right.effortEase - left.effortEase ||
      left.order - right.order ||
      left.id.localeCompare(right.id),
  );
}

export function dedupeDeliveryDnaV2Recommendations<
  T extends { id: string; dedupeGroup: string; order: number; reasonIds: string[] },
>(items: T[]) {
  const byGroup = new Map<string, T>();
  const removed: string[] = [];
  for (const item of [...items].sort(
    (left, right) => left.order - right.order || left.id.localeCompare(right.id),
  )) {
    const current = byGroup.get(item.dedupeGroup);
    if (!current) byGroup.set(item.dedupeGroup, { ...item, reasonIds: [...item.reasonIds] });
    else {
      current.reasonIds = [...new Set([...current.reasonIds, ...item.reasonIds])];
      removed.push(item.id);
    }
  }
  return { retained: [...byGroup.values()], removed };
}

export function sequenceDeliveryDnaV2Roadmap(selected: string[], ranks: Record<string, number>) {
  const selectedSet = new Set(selected);
  const byId = new Map(deliveryDnaV2Catalogue.recommendations.map((item) => [item.id, item]));
  return sequenceDeliveryDnaRoadmapGraph(
    selected,
    ranks,
    Object.fromEntries(
      [...byId].map(([id, item]) => [
        id,
        item.dependencies.filter((dependency) => selectedSet.has(dependency)),
      ]),
    ),
  );
}

export function sequenceDeliveryDnaRoadmapGraph(
  selected: string[],
  ranks: Record<string, number>,
  dependencies: Record<string, string[]>,
) {
  const selectedSet = new Set(selected);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const sequence: string[] = [];
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error("ROADMAP_DEPENDENCY_CYCLE");
    if (visited.has(id)) return;
    visiting.add(id);
    (dependencies[id] ?? []).filter((dependency) => selectedSet.has(dependency)).forEach(visit);
    visiting.delete(id);
    visited.add(id);
    sequence.push(id);
  };
  [...selected]
    .sort((left, right) => (ranks[right] ?? 0) - (ranks[left] ?? 0) || left.localeCompare(right))
    .forEach(visit);
  return sequence;
}

export function allocateDeliveryDnaV2Roadmap(sequence: string[]) {
  const items = sequence.map((id) => ({ id, reason: "ranked_and_dependency_ready" }));
  return {
    day30: items.slice(0, 3),
    day60: items.slice(3, 6),
    day90: items.slice(6, 10),
    unscheduled: sequence.slice(10).map((id) => ({ id, reason: "capacity_exceeded" as const })),
  };
}

export function analyseDeliveryDnaV2(input: {
  responses: DeliveryDnaV2Response[];
  evidenceRecency: number;
  perspectiveBreadth: number;
}) {
  const capabilities = deliveryDnaV2Capabilities.map((capability) =>
    scoreDeliveryDnaV2Capability(capability.id, input.responses),
  );
  const scoreMap = Object.fromEntries(
    capabilities.map((item) => [item.capabilityId, item.rawScore]),
  );
  const domains = deliveryDnaV2Domains.map((domain) => ({
    domainId: domain.id,
    ...aggregateDeliveryDnaV2Domain(domain.id, scoreMap),
  }));
  const overall = aggregateDeliveryDnaV2Overall(scoreMap);
  const eligibleRequired = input.responses.filter(
    (response) => response.status === "answered",
  ).length;
  const consistency = deliveryDnaV2ResponseConsistency(input.responses);
  const factors = [
    eligibleRequired / 45,
    capabilities.filter((item) => item.available).length / 15,
    consistency.overall,
    input.evidenceRecency,
    input.perspectiveBreadth,
  ];
  const confidence = deliveryDnaV2ConfidenceFromFactors(factors);
  const capabilityConfidence = Object.fromEntries(
    capabilities.map((item) => [
      item.capabilityId,
      deliveryDnaV2CapabilityConfidence({
        eligibleQuestionCount: item.eligibleQuestionCount,
        consistency: consistency.capabilityConsistency[item.capabilityId],
        recency: input.evidenceRecency,
        breadth: input.perspectiveBreadth,
      }),
    ]),
  );
  const findings = selectDeliveryDnaV2Findings(
    capabilities.flatMap((item, index) =>
      item.available
        ? [
            {
              id: item.capabilityId,
              score: item.rawScore,
              confidence: capabilityConfidence[item.capabilityId],
              order: index + 1,
            },
          ]
        : [],
    ),
  );
  const numericScores = Object.fromEntries(
    capabilities.flatMap((item) => (item.available ? [[item.capabilityId, item.rawScore]] : [])),
  );
  const matched = deliveryDnaV2Catalogue.patterns.filter((pattern) =>
    deliveryDnaV2PatternMatches(pattern.id, numericScores, capabilityConfidence),
  );
  const patterns = resolveDeliveryDnaV2Patterns(matched).retained;
  const opportunityById = new Map(findings.opportunities.map((item) => [item.id, item]));
  const patternById = new Map(patterns.map((item) => [item.id, item]));
  const eligibleRecommendations = eligibleDeliveryDnaV2Recommendations({
    opportunityIds: findings.opportunities.map((item) => item.id),
    patterns: patterns.map((item) => item.id),
    analysisConfidence: confidence.band,
  });
  const eligibleIds = new Set(eligibleRecommendations.map((item) => item.id));
  const candidates = eligibleRecommendations.flatMap((recommendation) => {
    if (
      confidence.band === "low" &&
      deliveryDnaV2Catalogue.recommendationPolicy.confidenceGates.lowConfidenceWithholdEffort.includes(
        recommendation.effort as "medium" | "high",
      )
    ) {
      return [];
    }
    const opportunityReasons = recommendation.triggers.any.flatMap((trigger) =>
      "opportunity" in trigger &&
      typeof trigger.opportunity === "string" &&
      opportunityById.has(trigger.opportunity)
        ? [opportunityById.get(trigger.opportunity)!]
        : [],
    );
    const patternReasons = recommendation.triggers.any.flatMap((trigger) =>
      "pattern" in trigger &&
      typeof trigger.pattern === "string" &&
      patternById.has(trigger.pattern)
        ? [patternById.get(trigger.pattern)!]
        : [],
    );
    const urgency = Math.max(
      0,
      ...opportunityReasons.map((item) => 100 - item.score),
      ...patternReasons.map((item) => item.priority),
    );
    const reasonConfidence = Math.max(
      confidence.rawConfidence,
      ...opportunityReasons.map((item) => item.confidence),
      ...patternReasons.map((pattern) => {
        const ids = pattern.predicates.flatMap((predicate) => {
          if ("capability" in predicate && typeof predicate.capability === "string")
            return [predicate.capability];
          if ("capabilities" in predicate && Array.isArray(predicate.capabilities))
            return predicate.capabilities;
          if ("difference" in predicate && predicate.difference)
            return [...predicate.difference.leftMean, ...predicate.difference.rightMean];
          return [];
        });
        return Math.min(...ids.map((id) => capabilityConfidence[id]));
      }),
    );
    const impactValue =
      deliveryDnaV2Catalogue.recommendationPolicy.impactValues[
        recommendation.impact as "low" | "medium" | "high"
      ];
    const effortEase =
      deliveryDnaV2Catalogue.recommendationPolicy.effortEaseValues[
        recommendation.effort as "low" | "medium" | "high"
      ];
    const dependencyReadiness =
      recommendation.dependencies.length === 0
        ? deliveryDnaV2Catalogue.recommendationPolicy.dependencyReadiness.ready
        : recommendation.dependencies.every((id) => eligibleIds.has(id))
          ? deliveryDnaV2Catalogue.recommendationPolicy.dependencyReadiness.selectedDependency
          : deliveryDnaV2Catalogue.recommendationPolicy.dependencyReadiness.unavailableDependency;
    const weights = deliveryDnaV2Catalogue.recommendationPolicy.rankFormula;
    const rankScore = round6(
      impactValue * weights.impact +
        urgency * weights.urgency +
        reasonConfidence * weights.confidence +
        effortEase * weights.effortEase +
        dependencyReadiness * weights.dependencyReadiness,
    );
    return [
      {
        ...recommendation,
        impactValue,
        effortEase,
        urgency,
        confidence: reasonConfidence,
        dependencyReadiness,
        rankScore,
        reasonIds: [
          ...opportunityReasons.map((item) => `opportunity:${item.id}`),
          ...patternReasons.map((item) => `pattern:${item.id}`),
          ...(recommendation.triggers.any.some((trigger) => "analysisConfidence" in trigger)
            ? [`confidence:${confidence.band}`]
            : []),
        ],
      },
    ];
  });
  const deduped = dedupeDeliveryDnaV2Recommendations(candidates).retained;
  const recommendations = sortDeliveryDnaV2RecommendationCandidates(deduped);
  const presentedIds = new Set(recommendations.map((item) => item.id));
  const withheldRecommendations = eligibleRecommendations
    .filter((item) => !presentedIds.has(item.id))
    .map((item) => ({ id: item.id, reason: "low_confidence_effort_gate" as const }));
  const roadmapSequence = sequenceDeliveryDnaV2Roadmap(
    recommendations.map((item) => item.id),
    Object.fromEntries(recommendations.map((item) => [item.id, item.rankScore])),
  );
  const context = selectOverviewContext({
    domainIds: domains.filter((item) => item.available).map((item) => item.domainId),
    capabilityIds: findings.opportunities.map((item) => item.id),
  });
  return {
    version: "2.0.0" as const,
    capabilities,
    domains,
    overall,
    confidence,
    consistency,
    capabilityConfidence,
    findings,
    patterns,
    recommendations,
    withheldRecommendations,
    roadmap: allocateDeliveryDnaV2Roadmap(roadmapSequence),
    context,
  };
}

export function analyseCanonicalInputV2(input: CanonicalAnalysisInput) {
  const expected = new Set(
    deliveryDnaV2Capabilities.flatMap((item) => item.questions.map((question) => question.id)),
  );
  if (
    input.responses.length !== 45 ||
    input.responses.some((response) => !expected.has(response.questionId))
  ) {
    throw new Error("ANALYSIS_INPUT_INVALID: incompatible Delivery DNA 2.0 manifest");
  }
  const metadata = deliveryDnaV2EvidenceMetadataValues({
    evidenceRecencyDeclaration: input.assessment.evidenceRecencyDeclaration,
    perspectiveBreadthDeclaration: input.assessment.perspectiveBreadthDeclaration,
  });
  const core = analyseDeliveryDnaV2({
    responses: input.responses.map((response) => ({
      questionId: response.questionId,
      status: response.status,
      answer: typeof response.value === "number" ? response.value : null,
      reason: response.exclusionReason,
    })),
    evidenceRecency: metadata.evidenceRecency,
    perspectiveBreadth: metadata.perspectiveBreadth,
  });
  const responseByQuestion = new Map(
    input.responses.map((response) => [response.questionId, response]),
  );
  const capabilities = deliveryDnaV2Capabilities.map((definition) => {
    const calculated = core.capabilities.find((item) => item.capabilityId === definition.id)!;
    const statusIds = (status: string) =>
      definition.questions.flatMap((question) =>
        responseByQuestion.get(question.id)?.status === status ? [question.id] : [],
      );
    return {
      id: definition.id,
      label: definition.label,
      order: definition.order,
      domainId: definition.domainId,
      score: {
        available: calculated.available,
        rawScore: calculated.rawScore,
        displayScore: calculated.displayScore,
        band: calculated.band,
        eligibleQuestionCount: calculated.eligibleQuestionCount,
        eligibleWeight: calculated.eligibleWeight,
        missingQuestionIds: statusIds("missing"),
        excludedQuestionIds: statusIds("excluded"),
        notApplicableQuestionIds: statusIds("not_applicable"),
      },
      confidenceContribution: core.capabilityConfidence[definition.id],
      evidenceIds: definition.questions.map(
        (question) => responseByQuestion.get(question.id)!.answerId,
      ),
    };
  });
  const confidenceFactors = {
    required_completion:
      input.responses.filter((response) => response.status === "answered").length / 45,
    capability_coverage: core.capabilities.filter((item) => item.available).length / 15,
    response_consistency: core.consistency.overall,
    evidence_recency: metadata.evidenceRecency,
    perspective_breadth: metadata.perspectiveBreadth,
  };
  const limitations = Object.entries(confidenceFactors)
    .filter(
      ([, value]) => value < deliveryDnaV2Catalogue.confidencePolicy.limitationThresholdExclusive,
    )
    .map(([id]) => id);
  const ranked = core.recommendations.map((recommendation) => ({
    id: recommendation.id,
    order: recommendation.order,
    title: recommendation.title,
    impact: recommendation.impact,
    effort: recommendation.effort,
    outcome: recommendation.outcome,
    firstStep: recommendation.firstStep,
    dependencies: recommendation.dependencies,
    successMeasures: recommendation.successMeasures,
    reasonIds: recommendation.reasonIds,
    urgency: recommendation.urgency,
    impactValue: recommendation.impactValue,
    effortEase: recommendation.effortEase,
    dependencyReadiness: recommendation.dependencyReadiness,
    rankScore: recommendation.rankScore,
  }));
  return {
    schemaVersion: "deliveryiq.intelligence-result/2.0.0",
    versions: {
      configurationSetId: "delivery-dna-product-config-2.0.0",
      configurationVersion: "2.0.0",
      configurationDigest: DELIVERY_DNA_V2_CONFIGURATION_DIGEST,
    },
    scope: {
      organisationId: input.assessment.organisationId,
      workspaceId: input.assessment.workspaceId,
      assessmentId: input.assessment.sessionId,
      assessmentRevision: input.assessment.revision,
    },
    domains: core.domains,
    capabilities,
    overall: core.overall.available
      ? { ...core.overall, displayScore: roundHalfUp(core.overall.rawScore!, 1) }
      : { ...core.overall, displayScore: null },
    confidence: {
      factors: confidenceFactors,
      result: {
        index: core.confidence.rawConfidence,
        displayIndex: core.confidence.displayConfidence,
        band: core.confidence.band,
        limitations,
      },
    },
    findings: {
      strengths: core.findings.strengths.map((item) => item.id),
      priorityOpportunities: core.findings.opportunities.map((item) => item.id),
      insufficientEvidence: core.findings.insufficientEvidence.map((item) => item.id),
    },
    patterns: {
      detected: core.patterns.map((pattern) => ({
        id: pattern.id,
        version: pattern.version,
        severity: pattern.severity,
        explanation: pattern.explanation,
      })),
      suppressed: [],
    },
    recommendations: { ranked, withheld: core.withheldRecommendations },
    roadmap: core.roadmap,
    industryContext: core.context,
    narrative: {
      overallPosition: core.overall.available
        ? `The overall Delivery DNA position is ${core.overall.band}.`
        : "The overall Delivery DNA position is unavailable because coverage is insufficient.",
      confidence: `Evidence confidence is ${core.confidence.band}.`,
      strengths: core.findings.strengths.map((item) => `${item.id} is a current strength.`),
      opportunities: core.findings.opportunities.map(
        (item) => `${item.id} is a priority opportunity.`,
      ),
      recommendations: ranked.map((item) => item.outcome),
      caveat:
        limitations.length > 0
          ? "This evidence-led result includes limitations that should be reviewed before significant decisions are made."
          : null,
    },
  };
}
