import * as assessmentRepo from "../assessment/repository.server";
import { knowledgePackLoader, KnowledgePackError } from "../knowledge-packs/loader.server";
import * as observationRepo from "../observations/repository.server";
import * as ruleRepo from "../rules/repository.server";
import { runRules } from "../rules/service.server";
import * as signalRepo from "../signals/repository.server";
import { patternEngine } from "./engine.server";
import * as repo from "./repository.server";
import type { Pattern, PatternRunSummary, PatternTrace } from "./types";

/**
 * PatternExecutionService
 *
 * Single responsibility: orchestrate a Pattern Engine run — resolve the session,
 * load the Knowledge Pack, source the Rule Results (re-running the Rule Engine
 * when none are persisted), persist patterns and expose traceability reads.
 */
export class PatternServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PatternServiceError";
  }
}

async function requireSession(sessionId: string, ownerKey: string) {
  const session = await assessmentRepo.getSession(sessionId, ownerKey);
  if (!session) throw new PatternServiceError("Assessment not found", 404);
  return session;
}

/** A pack that cannot be loaded stops processing with a clear, logged error. */
function loadPack(packId?: string, packVersion?: string) {
  try {
    return packId ? knowledgePackLoader.load(packId, packVersion) : knowledgePackLoader.loadActive();
  } catch (error) {
    const message =
      error instanceof KnowledgePackError
        ? error.message
        : "Knowledge pack patterns could not be loaded";
    console.error("[pattern-service] knowledge pack load failed", error);
    throw new PatternServiceError(message, 503);
  }
}

export async function runPatterns(
  sessionId: string,
  ownerKey: string,
  options: { packId?: string; packVersion?: string; regenerateRules?: boolean } = {},
): Promise<{ patterns: Pattern[]; summary: PatternRunSummary }> {
  const session = await requireSession(sessionId, ownerKey);
  const pack = loadPack(options.packId, options.packVersion);

  if ((pack.patterns.definitions ?? []).length === 0) {
    throw new PatternServiceError(
      `Knowledge pack "${pack.manifest.id}" declares no pattern definitions`,
      503,
    );
  }

  let rules = options.regenerateRules
    ? (await runRules(sessionId, ownerKey, options)).rules
    : await ruleRepo.listRuleResults(sessionId);

  if (rules.length === 0) {
    rules = (await runRules(sessionId, ownerKey, options)).rules;
  }

  const { patterns, summary } = await patternEngine.run({ session, rules, pack });
  const persisted = await repo.replacePatterns(sessionId, patterns);

  console.info("[pattern-service] run complete", {
    sessionId,
    evaluated: summary.evaluated,
    matched: summary.matched,
    durationMs: summary.durationMs,
  });

  return { patterns: persisted, summary };
}

export async function listPatterns(
  sessionId: string,
  ownerKey: string,
): Promise<{ sessionId: string; patterns: Pattern[] }> {
  await requireSession(sessionId, ownerKey);
  return { sessionId, patterns: await repo.listPatterns(sessionId) };
}

/** Pattern -> Rules -> Signals -> Observations -> Questions -> Responses. */
export async function getPatternTrace(
  patternId: string,
  ownerKey: string,
): Promise<PatternTrace> {
  const pattern = await repo.getPattern(patternId);
  if (!pattern) throw new PatternServiceError("Pattern not found", 404);

  const session = await assessmentRepo.getSession(pattern.sessionId, ownerKey);
  if (!session) throw new PatternServiceError("Pattern not found", 404);

  const pack = loadPack(pattern.knowledgePack);
  const definition = pack.patterns.definitions.find(
    (d) => d.patternCode === pattern.patternCode,
  );

  const rules = (await ruleRepo.listRuleResults(pattern.sessionId)).filter(
    (rule) =>
      pattern.supportingRuleIds.includes(rule.id) ||
      pattern.supportingRuleCodes.includes(rule.ruleCode),
  );
  const signals = await signalRepo.listSignals(pattern.sessionId);
  const observations = await observationRepo.listObservations(pattern.sessionId);
  const responses = await assessmentRepo.getResponses(pattern.sessionId);

  return {
    pattern,
    assessment: {
      id: session.id,
      organisationName: session.organisationName,
      status: session.status,
    },
    supportingRules: rules.map((rule) => ({
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
    knowledgePackPattern: {
      packId: pattern.knowledgePack,
      packVersion: pattern.knowledgePackVersion,
      patternCode: pattern.patternCode,
      logic: definition?.logic ?? "ANY",
      threshold: definition?.threshold ?? null,
      minimumConfidence: definition?.minimumConfidence ?? 0,
      statusIn: definition?.statusIn ?? ["passed"],
      declaredRules: definition?.requiredRules ?? pattern.supportingRuleCodes,
      expression: pattern.patternExpression,
      businessImpact: definition?.businessImpact ?? pattern.businessImpact,
    },
  };
}
