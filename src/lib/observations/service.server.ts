import * as assessmentRepo from "../assessment/repository.server";
import { knowledgePackLoader, KnowledgePackError } from "../knowledge-packs/loader.server";
import { observationEngine } from "./engine.server";
import * as repo from "./repository.server";
import type { Observation, ObservationRunSummary, ObservationTrace } from "./types";

export class ObservationServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ObservationServiceError";
  }
}

async function requireSession(sessionId: string, ownerKey: string) {
  const session = await assessmentRepo.getSession(sessionId, ownerKey);
  if (!session) throw new ObservationServiceError("Assessment not found", 404);
  return session;
}

/**
 * Runs the Observation Engine for an assessment and persists the result.
 * Knowledge Pack failures stop processing with a clear, logged error.
 */
export async function runObservations(
  sessionId: string,
  ownerKey: string,
  options: { packId?: string; packVersion?: string } = {},
): Promise<{ observations: Observation[]; summary: ObservationRunSummary }> {
  const session = await requireSession(sessionId, ownerKey);

  let pack;
  try {
    pack = options.packId
      ? knowledgePackLoader.load(options.packId, options.packVersion)
      : knowledgePackLoader.loadActive();
  } catch (error) {
    const message = error instanceof KnowledgePackError ? error.message : "Knowledge pack could not be loaded";
    console.error("[observation-service] knowledge pack load failed", error);
    throw new ObservationServiceError(message, 503);
  }

  const responses = await assessmentRepo.getResponses(sessionId);
  const { observations, summary } = await observationEngine.run({ session, responses, pack });
  const persisted = await repo.persistObservations(sessionId, observations);

  return { observations: persisted, summary };
}

export async function listObservations(
  sessionId: string,
  ownerKey: string,
): Promise<{ sessionId: string; observations: Observation[] }> {
  await requireSession(sessionId, ownerKey);
  return { sessionId, observations: await repo.listObservations(sessionId) };
}

/** Full traceability chain: Assessment -> Question -> Answer -> Observation -> Pack rule. */
export async function getObservationTrace(
  observationId: string,
  ownerKey: string,
): Promise<ObservationTrace> {
  const observation = await repo.getObservation(observationId);
  if (!observation) throw new ObservationServiceError("Observation not found", 404);

  const session = await assessmentRepo.getSession(observation.sessionId, ownerKey);
  if (!session) throw new ObservationServiceError("Observation not found", 404);

  const pack = knowledgePackLoader.load(observation.knowledgePack);
  const question = pack.questions.questions.find((q) => q.id === observation.questionId) ?? null;
  const responses = await assessmentRepo.getResponses(observation.sessionId);
  const response = responses.find((r) => r.questionId === observation.questionId) ?? null;

  return {
    observation,
    assessment: {
      id: session.id,
      organisationName: session.organisationName,
      status: session.status,
    },
    question: question
      ? { id: question.id, sectionId: question.sectionId, prompt: question.prompt }
      : null,
    answer: {
      value: response?.value ?? null,
      label: observation.sourceLabel,
      answeredAt: response?.answeredAt ?? null,
    },
    knowledgePackRule: {
      packId: observation.knowledgePack,
      packVersion: observation.knowledgePackVersion,
      definitionId: observation.definitionId,
      expression: observation.ruleExpression,
      severity: observation.severity,
      confidence: observation.confidence,
      weight: observation.weight,
    },
  };
}
