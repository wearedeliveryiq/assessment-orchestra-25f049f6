import * as assessmentRepo from "../assessment/repository.server";
import { knowledgePackLoader, KnowledgePackError } from "../knowledge-packs/loader.server";
import * as observationRepo from "../observations/repository.server";
import { runObservations } from "../observations/service.server";
import { signalEngine } from "./engine.server";
import * as repo from "./repository.server";
import type { Signal, SignalRunSummary, SignalTrace } from "./types";

export class SignalServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SignalServiceError";
  }
}

async function requireSession(sessionId: string, ownerKey: string) {
  const session = await assessmentRepo.getSession(sessionId, ownerKey);
  if (!session) throw new SignalServiceError("Assessment not found", 404);
  return session;
}

function loadPack(packId?: string, packVersion?: string) {
  try {
    return packId ? knowledgePackLoader.load(packId, packVersion) : knowledgePackLoader.loadActive();
  } catch (error) {
    const message =
      error instanceof KnowledgePackError ? error.message : "Knowledge pack could not be loaded";
    console.error("[signal-service] knowledge pack load failed", error);
    throw new SignalServiceError(message, 503);
  }
}

/**
 * Runs the Signal Engine for an assessment and persists the result.
 * Observations are read from the Observation Repository; when none exist the
 * Observation Engine is run first so the pipeline stays self-healing.
 */
export async function runSignals(
  sessionId: string,
  ownerKey: string,
  options: { packId?: string; packVersion?: string; regenerateObservations?: boolean } = {},
): Promise<{ signals: Signal[]; summary: SignalRunSummary }> {
  const session = await requireSession(sessionId, ownerKey);
  const pack = loadPack(options.packId, options.packVersion);

  let observations = options.regenerateObservations
    ? (await runObservations(sessionId, ownerKey, options)).observations
    : await observationRepo.listObservations(sessionId);

  if (observations.length === 0) {
    observations = (await runObservations(sessionId, ownerKey, options)).observations;
  }

  const { signals, summary } = await signalEngine.run({ session, observations, pack });
  const persisted = await repo.replaceSignals(sessionId, signals);

  return { signals: persisted, summary };
}

export async function listSignals(
  sessionId: string,
  ownerKey: string,
): Promise<{ sessionId: string; signals: Signal[] }> {
  await requireSession(sessionId, ownerKey);
  return { sessionId, signals: await repo.listSignals(sessionId) };
}

/** Full provenance: Signal -> Observations -> Question -> Original response. */
export async function getSignalTrace(signalId: string, ownerKey: string): Promise<SignalTrace> {
  const signal = await repo.getSignal(signalId);
  if (!signal) throw new SignalServiceError("Signal not found", 404);

  const session = await assessmentRepo.getSession(signal.sessionId, ownerKey);
  if (!session) throw new SignalServiceError("Signal not found", 404);

  const pack = loadPack(signal.knowledgePack);
  const definition = pack.signals.definitions.find((d) => d.code === signal.signalCode);

  const observations = (await observationRepo.listObservations(signal.sessionId)).filter(
    (observation) =>
      signal.supportingObservationIds.includes(observation.id) ||
      signal.supportingDefinitionIds.includes(observation.definitionId),
  );
  const responses = await assessmentRepo.getResponses(signal.sessionId);

  return {
    signal,
    assessment: {
      id: session.id,
      organisationName: session.organisationName,
      status: session.status,
    },
    supportingObservations: observations.map((observation) => {
      const question = pack.questions.questions.find((q) => q.id === observation.questionId) ?? null;
      const response = responses.find((r) => r.questionId === observation.questionId) ?? null;
      return {
        observation,
        question: question
          ? { id: question.id, sectionId: question.sectionId, prompt: question.prompt }
          : null,
        answer: {
          value: response?.value ?? null,
          label: observation.sourceLabel,
          answeredAt: response?.answeredAt ?? null,
        },
      };
    }),
    knowledgePackRule: {
      packId: signal.knowledgePack,
      packVersion: signal.knowledgePackVersion,
      signalCode: signal.signalCode,
      expression: signal.ruleExpression,
      rationale: definition?.rationale ?? "Definition no longer present in the knowledge pack",
      minConfidence: definition?.minConfidence ?? 0,
      severity: signal.severity,
      weight: signal.weight,
      expectedEvidence: definition?.expectedEvidence ?? signal.supportingObservationIds.length,
    },
  };
}
