import * as assessmentRepo from "../assessment/repository.server";
import { knowledgePackLoader, KnowledgePackError } from "../knowledge-packs/loader.server";
import * as observationRepo from "../observations/repository.server";
import * as patternRepo from "../patterns/repository.server";
import { runPatterns } from "../patterns/service.server";
import * as ruleRepo from "../rules/repository.server";
import * as signalRepo from "../signals/repository.server";
import { scoringEngine } from "./engine.server";
import * as repo from "./repository.server";
import type {
  AssessmentScoreSummary,
  Score,
  ScoreRunSummary,
  ScoreSummaryEntity,
  ScoreTrace,
} from "./types";

/**
 * ScoreExecutionService
 *
 * Single responsibility: orchestrate a Scoring Engine run — resolve the
 * session, load the Knowledge Pack, source the Patterns (re-running the Pattern
 * Engine when none are persisted), persist the scores plus the assessment
 * summary, and expose traceability and dashboard reads.
 */
export class ScoreServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ScoreServiceError";
  }
}

async function requireSession(sessionId: string, ownerKey: string) {
  const session = await assessmentRepo.getSession(sessionId, ownerKey);
  if (!session) throw new ScoreServiceError("Assessment not found", 404);
  return session;
}

/** A pack that cannot be loaded stops processing with a clear, logged error. */
function loadPack(packId?: string, packVersion?: string) {
  try {
    return packId
      ? knowledgePackLoader.load(packId, packVersion)
      : knowledgePackLoader.loadActive();
  } catch (error) {
    const message =
      error instanceof KnowledgePackError
        ? error.message
        : "Knowledge pack scoring model could not be loaded";
    console.error("[score-service] knowledge pack load failed", error);
    throw new ScoreServiceError(message, 503);
  }
}

export async function runScores(
  sessionId: string,
  ownerKey: string,
  options: { packId?: string; packVersion?: string; regeneratePatterns?: boolean } = {},
): Promise<{ scores: Score[]; summary: ScoreSummaryEntity; run: ScoreRunSummary }> {
  const session = await requireSession(sessionId, ownerKey);
  const pack = loadPack(options.packId, options.packVersion);

  if ((pack.scoring.dimensions ?? []).length === 0) {
    throw new ScoreServiceError(
      `Knowledge pack "${pack.manifest.id}" declares no scoring dimensions`,
      503,
    );
  }

  let patterns = options.regeneratePatterns
    ? (await runPatterns(sessionId, ownerKey, options)).patterns
    : await patternRepo.listPatterns(sessionId);

  if (patterns.length === 0) {
    patterns = (await runPatterns(sessionId, ownerKey, options)).patterns;
  }

  const { scores, summary, runSummary } = await scoringEngine.run({ session, patterns, pack });

  const persisted = await repo.replaceScores(sessionId, scores);
  const persistedSummary = await repo.replaceSummary(sessionId, summary);

  console.info("[score-service] run complete", {
    sessionId,
    evaluated: runSummary.evaluated,
    calculated: runSummary.calculated,
    overall: persistedSummary.percentage,
    durationMs: runSummary.durationMs,
  });

  return { scores: persisted, summary: persistedSummary, run: runSummary };
}

export async function listScores(
  sessionId: string,
  ownerKey: string,
): Promise<{ sessionId: string; scores: Score[]; summary: ScoreSummaryEntity | null }> {
  await requireSession(sessionId, ownerKey);
  return {
    sessionId,
    scores: await repo.listScores(sessionId),
    summary: await repo.getSummary(sessionId),
  };
}

/** Dashboard-ready payload — overall score, dimensions and trend-ready points. */
export async function getAssessmentSummary(
  sessionId: string,
  ownerKey: string,
): Promise<AssessmentScoreSummary> {
  const session = await requireSession(sessionId, ownerKey);
  const scores = await repo.listScores(sessionId);
  const summary = await repo.getSummary(sessionId);

  const trend = [
    ...(summary
      ? [
          {
            capturedAt: summary.createdAt,
            scoreCode: "SCR-OVERALL",
            dimension: "Overall Assessment",
            percentage: summary.percentage,
            maturityLevel: summary.maturityLevel,
            confidence: summary.confidence,
          },
        ]
      : []),
    ...scores.map((score) => ({
      capturedAt: score.createdAt,
      scoreCode: score.scoreCode,
      dimension: score.dimension,
      percentage: score.percentage,
      maturityLevel: score.maturityLevel,
      confidence: score.confidence,
    })),
  ];

  return {
    sessionId,
    assessment: {
      id: session.id,
      organisationName: session.organisationName,
      status: session.status,
      completedAt: session.completedAt ?? null,
    },
    knowledgePack: summary?.knowledgePack ?? scores[0]?.knowledgePack ?? "",
    knowledgePackVersion:
      summary?.knowledgePackVersion ?? scores[0]?.knowledgePackVersion ?? "",
    overall: summary,
    scores,
    trend,
  };
}

/** Score -> Patterns -> Rules -> Signals -> Observations -> Questions -> Responses. */
export async function getScoreTrace(scoreId: string, ownerKey: string): Promise<ScoreTrace> {
  const score = await repo.getScore(scoreId);
  if (!score) throw new ScoreServiceError("Score not found", 404);

  const session = await assessmentRepo.getSession(score.sessionId, ownerKey);
  if (!session) throw new ScoreServiceError("Score not found", 404);

  const pack = loadPack(score.knowledgePack);
  const definition = pack.scoring.dimensions.find((d) => d.scoreCode === score.scoreCode);

  const patterns = (await patternRepo.listPatterns(score.sessionId)).filter(
    (pattern) =>
      score.supportingPatternIds.includes(pattern.id) ||
      score.supportingPatternCodes.includes(pattern.patternCode),
  );
  const rules = await ruleRepo.listRuleResults(score.sessionId);
  const signals = await signalRepo.listSignals(score.sessionId);
  const observations = await observationRepo.listObservations(score.sessionId);
  const responses = await assessmentRepo.getResponses(score.sessionId);

  return {
    score,
    assessment: {
      id: session.id,
      organisationName: session.organisationName,
      status: session.status,
    },
    supportingPatterns: patterns.map((pattern) => ({
      pattern,
      contribution:
        score.breakdown?.contributions?.find((c) => c.patternCode === pattern.patternCode) ?? null,
      rules: rules
        .filter(
          (rule) =>
            pattern.supportingRuleIds.includes(rule.id) ||
            pattern.supportingRuleCodes.includes(rule.ruleCode),
        )
        .map((rule) => ({
          rule,
          signals: signals
            .filter(
              (signal) =>
                rule.supportingSignalIds.includes(signal.id) ||
                rule.supportingSignalCodes.includes(signal.signalCode),
            )
            .map((signal) => ({
              signal,
              observations: observations
                .filter(
                  (observation) =>
                    signal.supportingObservationIds.includes(observation.id) ||
                    signal.supportingDefinitionIds.includes(observation.definitionId),
                )
                .map((observation) => {
                  const question =
                    pack.questions.questions.find((q) => q.id === observation.questionId) ?? null;
                  const response =
                    responses.find((r) => r.questionId === observation.questionId) ?? null;
                  return {
                    observationId: observation.id,
                    definitionId: observation.definitionId,
                    title: observation.title,
                    evidence: observation.evidence,
                    severity: observation.severity,
                    confidence: observation.confidence,
                    question: question
                      ? { id: question.id, sectionId: question.sectionId, prompt: question.prompt }
                      : null,
                    answer: {
                      value: (response?.value ?? null) as number | string | null,
                      label: observation.sourceLabel,
                      answeredAt: response?.answeredAt ?? null,
                    },
                  };
                }),
            })),
        })),
    })),
    knowledgePackScore: {
      packId: score.knowledgePack,
      packVersion: score.knowledgePackVersion,
      scoreCode: score.scoreCode,
      declaredPatterns: definition?.patterns ?? score.supportingPatternCodes,
      weight: definition?.weight ?? score.weight,
      maximumScore: definition?.maximumScore ?? score.maximumScore,
      direction: definition?.direction ?? score.breakdown?.direction ?? "deduct",
      maturityBands:
        definition?.maturityBands && definition.maturityBands.length > 0
          ? definition.maturityBands
          : (pack.scoring.defaults?.maturityBands ?? []),
      expression: score.scoreExpression,
    },
  };
}
