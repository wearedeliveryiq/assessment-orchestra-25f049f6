import type { AssessmentResponse, AssessmentSession } from "../assessment/types";
import { SPRINT03_CONFIGURATION_SET_ID } from "../delivery-intelligence/config";
import {
  DELIVERY_DNA_V2_CONFIGURATION_SET_ID,
  DELIVERY_DNA_V2_VERSION,
} from "../delivery-dna/catalogue-v2";
import {
  ANALYSIS_ENGINE_VERSION,
  ANALYSIS_SCHEMA_VERSION,
  type AnalysisRequestedMode,
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

export interface AnalysisQuestionSet {
  manifest: { id: string; version: string; questionSetVersion?: string };
  questions: { questions: Array<{ id: string; sectionId: string }> };
}

export function normaliseAnalysisInput(input: {
  session: AssessmentSession;
  responses: AssessmentResponse[];
  pack: AnalysisQuestionSet;
  requestedMode?: AnalysisRequestedMode;
}): CanonicalAnalysisInput {
  const { session, responses, pack } = input;
  const deliveryDnaEvidence = (
    (session.metadata ?? {}) as {
      deliveryDnaEvidence?: {
        evidenceRecencyDeclaration?: unknown;
        perspectiveBreadthDeclaration?: unknown;
      };
    }
  ).deliveryDnaEvidence;
  if (session.status !== "completed" || !session.completedAt) {
    throw new AnalysisValidationError(
      "Only a completed assessment can be analysed",
      "ANALYSIS_INPUT_INCOMPLETE",
    );
  }
  const expected = new Set(pack.questions.questions.map((question) => question.id));
  const unknown = responses.filter((response) => !expected.has(response.questionId));
  if (unknown.length) {
    throw new AnalysisValidationError(
      "Assessment contains unknown questions",
      "ANALYSIS_INPUT_INVALID",
    );
  }
  const responseByQuestion = new Map(responses.map((response) => [response.questionId, response]));
  const missing = pack.questions.questions
    .filter((question) => !responseByQuestion.has(question.id))
    .map((question) => question.id);
  if (missing.length) {
    throw new AnalysisValidationError(
      "Required assessment evidence is incomplete",
      "ANALYSIS_INPUT_INCOMPLETE",
    );
  }

  return {
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    engineVersion: ANALYSIS_ENGINE_VERSION,
    assessment: {
      sessionId: session.id,
      assessmentType: session.assessmentType,
      revision: session.assessmentRevision ?? 1,
      organisationId: session.organisationId,
      workspaceId: session.workspaceId,
      completedAt: session.completedAt,
      consentBasis: session.consentBasis ?? "authenticated_assessment_submission",
      ...(typeof deliveryDnaEvidence?.evidenceRecencyDeclaration === "string"
        ? { evidenceRecencyDeclaration: deliveryDnaEvidence.evidenceRecencyDeclaration }
        : {}),
      ...(typeof deliveryDnaEvidence?.perspectiveBreadthDeclaration === "string"
        ? { perspectiveBreadthDeclaration: deliveryDnaEvidence.perspectiveBreadthDeclaration }
        : {}),
    },
    knowledgePack: {
      id: pack.manifest.id,
      version: pack.manifest.version,
      questionSetVersion: pack.manifest.questionSetVersion ?? pack.manifest.version,
    },
    requestedMode: input.requestedMode ?? "workspace",
    responses: [...pack.questions.questions]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((question) => {
        const response = responseByQuestion.get(question.id)!;
        const status = response.evidenceStatus ?? "answered";
        if (status === "answered" && response.value == null) {
          throw new AnalysisValidationError(
            "Answered evidence has no value",
            "ANALYSIS_INPUT_INCOMPLETE",
          );
        }
        return {
          answerId: `${session.id}:${question.id}`,
          answerVersion: response.answeredAt,
          questionId: question.id,
          questionVersion: pack.manifest.version,
          sectionId: question.sectionId,
          value: status === "answered" ? response.value : null,
          status,
          exclusionReason: response.evidenceReasonCode ?? response.exclusionReason ?? null,
          respondentGroupId: response.respondentGroupId ?? null,
          evidenceAt: response.evidenceAt ?? null,
        };
      }),
  };
}

export async function hashAnalysisInput(input: CanonicalAnalysisInput): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(input)),
  );
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function deriveAnalysisIdempotencyKey(input: CanonicalAnalysisInput): Promise<string> {
  const configurationSetId =
    input.knowledgePack.version === DELIVERY_DNA_V2_VERSION
      ? DELIVERY_DNA_V2_CONFIGURATION_SET_ID
      : SPRINT03_CONFIGURATION_SET_ID;
  const material = [
    input.assessment.organisationId,
    input.assessment.workspaceId,
    input.assessment.sessionId,
    String(input.assessment.revision),
    configurationSetId,
    input.requestedMode,
  ].join("\n");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
