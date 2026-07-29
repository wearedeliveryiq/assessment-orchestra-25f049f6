import * as assessmentRepo from "../assessment/repository.server";
import { knowledgePackLoader, KnowledgePackError } from "../knowledge-packs/loader.server";
import * as observationRepo from "../observations/repository.server";
import * as signalRepo from "../signals/repository.server";
import { runSignals } from "../signals/service.server";
import { ruleEngine } from "./engine.server";
import * as repo from "./repository.server";
import type { RuleResult, RuleRunSummary, RuleTrace } from "./types";

/**
 * RuleExecutionService
 *
 * Single responsibility: orchestrate a Rule Engine run — resolve the session,
 * load the Knowledge Pack, source the Signals (re-running the Signal Engine
 * when none are persisted), persist results and expose traceability reads.
 */
export class RuleServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "RuleServiceError";
  }
}

async function requireSession(sessionId: string, ownerKey: string) {
  const session = await assessmentRepo.getSession(sessionId, ownerKey);
  if (!session) throw new RuleServiceError("Assessment not found", 404);
  return session;
}

function loadPack(packId?: string, packVersion?: string) {
  try {
    return packId ? knowledgePackLoader.load(packId, packVersion) : knowledgePackLoader.loadActive();
  } catch (error) {
    const message =
      error instanceof KnowledgePackError
        ? error.message
        : "Knowledge pack rules could not be loaded";
    console.error("[rule-service] knowledge pack load failed", error);
    throw new RuleServiceError(message, 503);
  }
}

export async function runRules(
  sessionId: string,
  ownerKey: string,
  options: { packId?: string; packVersion?: string; regenerateSignals?: boolean } = {},
): Promise<{ rules: RuleResult[]; summary: RuleRunSummary }> {
  const session = await requireSession(sessionId, ownerKey);
  const pack = loadPack(options.packId, options.packVersion);

  if ((pack.rules.definitions ?? []).length === 0) {
    throw new RuleServiceError(
      `Knowledge pack "${pack.manifest.id}" declares no rule definitions`,
      503,
    );
  }

  let signals = options.regenerateSignals
    ? (await runSignals(sessionId, ownerKey, options)).signals
    : await signalRepo.listSignals(sessionId);

  if (signals.length === 0) {
    signals = (await runSignals(sessionId, ownerKey, options)).signals;
  }

  const { results, summary } = await ruleEngine.run({ session, signals, pack });
  const persisted = await repo.replaceRuleResults(sessionId, results);

  console.info("[rule-service] run complete", {
    sessionId,
    evaluated: summary.evaluated,
    passed: summary.passed,
    durationMs: summary.durationMs,
  });

  return { rules: persisted, summary };
}

export async function listRules(
  sessionId: string,
  ownerKey: string,
): Promise<{ sessionId: string; rules: RuleResult[] }> {
  await requireSession(sessionId, ownerKey);
  return { sessionId, rules: await repo.listRuleResults(sessionId) };
}

/** Rule -> Signals -> Observations -> Questions -> Responses. */
export async function getRuleTrace(ruleId: string, ownerKey: string): Promise<RuleTrace> {
  const rule = await repo.getRuleResult(ruleId);
  if (!rule) throw new RuleServiceError("Rule result not found", 404);

  const session = await assessmentRepo.getSession(rule.sessionId, ownerKey);
  if (!session) throw new RuleServiceError("Rule result not found", 404);

  const pack = loadPack(rule.knowledgePack);
  const definition = pack.rules.definitions.find((d) => d.ruleCode === rule.ruleCode);

  const signals = (await signalRepo.listSignals(rule.sessionId)).filter(
    (signal) =>
      rule.supportingSignalIds.includes(signal.id) ||
      rule.supportingSignalCodes.includes(signal.signalCode),
  );
  const observations = await observationRepo.listObservations(rule.sessionId);
  const responses = await assessmentRepo.getResponses(rule.sessionId);

  return {
    rule,
    assessment: {
      id: session.id,
      organisationName: session.organisationName,
      status: session.status,
    },
    supportingSignals: signals.map((signal) => ({
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
          const response = responses.find((r) => r.questionId === observation.questionId) ?? null;
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
    knowledgePackRule: {
      packId: rule.knowledgePack,
      packVersion: rule.knowledgePackVersion,
      ruleCode: rule.ruleCode,
      logic: definition?.logic ?? "ANY",
      threshold: definition?.threshold ?? null,
      minimumConfidence: definition?.minimumConfidence ?? 0,
      declaredSignals: definition?.signals ?? rule.supportingSignalCodes,
      expression: rule.ruleExpression,
      rationale: definition?.rationale ?? "Definition no longer present in the knowledge pack",
    },
  };
}
