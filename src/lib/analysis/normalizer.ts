import type { AssessmentResponse, AssessmentSession } from "../assessment/types";
import type { KnowledgePackDocument } from "../knowledge-packs/schema";
import {
  ANALYSIS_MODEL_VERSION,
  ANALYSIS_SCHEMA_VERSION,
  type CanonicalAnalysisInput,
} from "./types";

export class AnalysisValidationError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 422,
  ) {
    super(message);
    this.name = "AnalysisValidationError";
  }
}

export function normaliseAnalysisInput(input: {
  session: AssessmentSession;
  responses: AssessmentResponse[];
  pack: KnowledgePackDocument;
}): CanonicalAnalysisInput {
  const { session, responses, pack } = input;
  if (session.status !== "completed" || !session.completedAt) {
    throw new AnalysisValidationError(
      "Only a completed assessment can be analysed",
      "assessment_not_completed",
      409,
    );
  }

  const responseByQuestion = new Map(responses.map((response) => [response.questionId, response]));
  const missing = pack.questions.questions
    .filter((question) => responseByQuestion.get(question.id)?.value == null)
    .map((question) => question.id);
  if (missing.length > 0) {
    throw new AnalysisValidationError(
      `Assessment responses are incomplete: ${missing.join(", ")}`,
      "assessment_incomplete",
    );
  }

  return {
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    modelVersion: ANALYSIS_MODEL_VERSION,
    assessment: {
      sessionId: session.id,
      assessmentType: session.assessmentType,
      organisationId: session.organisationId,
      workspaceId: session.workspaceId,
      completedAt: session.completedAt,
    },
    knowledgePack: { id: pack.manifest.id, version: pack.manifest.version },
    responses: [...pack.questions.questions]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((question) => {
        const response = responseByQuestion.get(question.id)!;
        return {
          questionId: question.id,
          sectionId: question.sectionId,
          value: response.value as string | number,
          score: response.score,
        };
      }),
  };
}

export async function hashAnalysisInput(input: CanonicalAnalysisInput): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(input));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function analysisIdempotencyKey(input: CanonicalAnalysisInput, hash: string): string {
  return [
    input.assessment.sessionId,
    input.knowledgePack.id,
    input.knowledgePack.version,
    input.modelVersion,
    hash,
  ].join(":");
}
