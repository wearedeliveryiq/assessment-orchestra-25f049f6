import type { CanonicalAnalysisInput } from "../analysis/types";
import { calculateCapabilityConfidence, deriveConfidenceFactors } from "./confidence";
import { componentDigests, sprint03Configuration } from "./config";
import { classifyFindings } from "./findings";
import { detectPatterns } from "./patterns";
import { rankRecommendations } from "./recommendations";
import { buildRoadmap } from "./roadmap";
import { renderExecutiveNarrative } from "./narrative";
import { calculateCapabilityScore, calculateOverallScore, type ScoreResponse } from "./scoring";

export interface CanonicalCapabilityResult {
  id: string;
  label: string;
  order: number;
  score: ReturnType<typeof calculateCapabilityScore>;
  confidenceContribution: number;
  evidenceIds: string[];
}

/**
 * Pure, deterministic Sprint 03 intelligence core. It accepts only the S3-001
 * canonical snapshot and performs no persistence, orchestration or projection.
 */
export function analyseCanonicalInput(input: CanonicalAnalysisInput) {
  const expectedQuestionIds = new Set(
    sprint03Configuration.capabilities.flatMap((capability) =>
      capability.questions.map((question) => question.id),
    ),
  );
  const unknown = input.responses.filter(
    (response) => !expectedQuestionIds.has(response.questionId),
  );
  if (unknown.length) throw new Error("ANALYSIS_INPUT_INVALID: unknown Delivery DNA question");
  const byQuestion = new Map(input.responses.map((response) => [response.questionId, response]));

  const capabilities: CanonicalCapabilityResult[] = sprint03Configuration.capabilities.map(
    (definition) => {
      const responses = definition.questions.flatMap((question) => {
        const response = byQuestion.get(question.id);
        return response ? [response] : [];
      });
      const scoreResponses = Object.fromEntries(
        definition.questions.map((question) => {
          const response = byQuestion.get(question.id);
          const scoreResponse: ScoreResponse = response
            ? {
                status: response.status,
                value: typeof response.value === "number" ? response.value : undefined,
                reason: response.exclusionReason ?? undefined,
              }
            : { status: "missing" };
          return [question.id, scoreResponse];
        }),
      );
      const score = calculateCapabilityScore(
        Object.fromEntries(definition.questions.map((question) => [question.id, question.weight])),
        scoreResponses,
      );
      return {
        id: definition.id,
        label: definition.label,
        order: definition.order,
        score,
        confidenceContribution: calculateCapabilityConfidence(
          {
            id: definition.id,
            requiredQuestionIds: definition.questions
              .filter((question) => question.required)
              .map((question) => question.id),
            responses,
            available: score.available,
          },
          input.assessment.completedAt,
        ),
        evidenceIds: responses.map((response) => response.answerId),
      };
    },
  );

  const confidenceInput = capabilities.map((capability) => ({
    id: capability.id,
    requiredQuestionIds: sprint03Configuration.capabilities
      .find((definition) => definition.id === capability.id)!
      .questions.filter((question) => question.required)
      .map((question) => question.id),
    responses: sprint03Configuration.capabilities
      .find((definition) => definition.id === capability.id)!
      .questions.flatMap((question) => {
        const response = byQuestion.get(question.id);
        return response ? [response] : [];
      }),
    available: capability.score.available,
  }));
  const confidence = deriveConfidenceFactors({
    completedAt: input.assessment.completedAt,
    capabilities: confidenceInput,
  });
  const overall = calculateOverallScore(
    capabilities.flatMap((capability) =>
      capability.score.rawScore == null ? [] : [capability.score.rawScore],
    ),
  );
  const findings = classifyFindings(
    capabilities.flatMap((capability) =>
      capability.score.rawScore == null
        ? []
        : [
            {
              id: capability.id,
              order: capability.order,
              score: capability.score.rawScore,
              confidence: capability.confidenceContribution,
            },
          ],
    ),
  );
  const patterns = detectPatterns({
    scores: Object.fromEntries(
      capabilities.flatMap((capability) =>
        capability.score.rawScore == null ? [] : [[capability.id, capability.score.rawScore]],
      ),
    ),
    confidence: Object.fromEntries(
      capabilities.map((capability) => [capability.id, capability.confidenceContribution]),
    ),
  });
  const patternResults = patterns.detected.map((item) => ({
    id: item.id,
    version: item.version,
    severity: item.severity,
    explanation: item.explanation,
  }));
  const recommendations = rankRecommendations({
    opportunities: findings.priorityOpportunities.map((item) => ({
      id: item.id,
      score: item.score,
    })),
    patterns: patternResults.map((item) => ({ id: item.id, severity: item.severity })),
    analysisConfidence: confidence.result.index,
  });
  const roadmap = buildRoadmap({
    ranked: recommendations.ranked.map((item) => item.id),
    effort: Object.fromEntries(recommendations.ranked.map((item) => [item.id, item.effort])),
    dependencies: Object.fromEntries(
      recommendations.ranked.map((item) => [item.id, item.dependencies]),
    ),
  });
  const narrative = renderExecutiveNarrative({
    overall,
    confidence: confidence.result,
    capabilities: capabilities.map((item) => ({
      id: item.id,
      label: item.label,
      displayScore: item.score.displayScore,
      confidence: item.confidenceContribution,
    })),
    strengths: findings.strengths.map((item) => item.id),
    opportunities: findings.priorityOpportunities.map((item) => item.id),
    recommendations: recommendations.ranked.map((item) => ({
      title: item.title,
      outcome: item.outcome,
    })),
  });

  return {
    schemaVersion: "deliveryiq.intelligence-result/1.0.0",
    versions: componentDigests(),
    scope: {
      organisationId: input.assessment.organisationId,
      workspaceId: input.assessment.workspaceId,
      assessmentId: input.assessment.sessionId,
      assessmentRevision: input.assessment.revision,
    },
    capabilities,
    overall,
    confidence,
    findings: {
      strengths: findings.strengths.map((item) => item.id),
      priorityOpportunities: findings.priorityOpportunities.map((item) => item.id),
      insufficientEvidence: findings.insufficientEvidence.map((item) => item.id),
    },
    patterns: {
      detected: patternResults,
      suppressed: patterns.suppressed,
    },
    recommendations,
    roadmap,
    narrative,
  };
}

export type CanonicalIntelligenceCore = ReturnType<typeof analyseCanonicalInput>;
