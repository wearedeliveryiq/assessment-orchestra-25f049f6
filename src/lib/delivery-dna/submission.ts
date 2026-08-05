import type {
  AssessmentAnswerInput,
  AssessmentResponse,
  AssessmentSession,
} from "../assessment/types";
import {
  DELIVERY_DNA_V2_ASSESSMENT_TYPE,
  DELIVERY_DNA_V2_NOT_APPLICABLE_REASON,
  deliveryDnaV2Capabilities,
  deliveryDnaV2Catalogue,
  deliveryDnaV2QuestionManifest,
} from "./catalogue-v2";

export interface DeliveryDnaIdentitySnapshot {
  assessmentType: string;
  knowledgePackId: string;
  knowledgePackVersion: string;
  questionSetId: string;
  questionSetVersion: string;
  configurationSetId: string;
  questionManifest: string[];
  questionManifestDigest: string;
}

export interface DeliveryDnaCompletionOptions {
  reviewAcknowledged?: boolean;
  missingAcknowledged?: boolean;
  evidenceRecencyDeclaration?: string;
  perspectiveBreadthDeclaration?: string;
}

export function deliveryDnaV2EvidenceMetadata(options: DeliveryDnaCompletionOptions) {
  const recency =
    deliveryDnaV2Catalogue.confidencePolicy.requiredMetadata.evidenceRecencyDeclaration.options.find(
      (item) => item.id === options.evidenceRecencyDeclaration,
    );
  const breadth =
    deliveryDnaV2Catalogue.confidencePolicy.requiredMetadata.perspectiveBreadthDeclaration.options.find(
      (item) => item.id === options.perspectiveBreadthDeclaration,
    );
  if (!recency || !breadth) throw new Error("DELIVERY_DNA_EVIDENCE_METADATA_REQUIRED");
  return {
    evidenceRecencyDeclaration: recency.id,
    perspectiveBreadthDeclaration: breadth.id,
  };
}

const questionById = new Map(
  deliveryDnaV2Capabilities.flatMap((capability) =>
    capability.questions.map(
      (question) => [question.id, { ...question, sectionId: capability.id }] as const,
    ),
  ),
);

export function deliveryDnaIdentityOf(session: AssessmentSession): DeliveryDnaIdentitySnapshot {
  const snapshot = (session.metadata as { deliveryDna?: unknown }).deliveryDna;
  if (!snapshot || typeof snapshot !== "object") throw new Error("DELIVERY_DNA_IDENTITY_INVALID");
  const value = snapshot as Partial<DeliveryDnaIdentitySnapshot>;
  const expected = deliveryDnaV2Catalogue.identity;
  const rawManifest = Array.isArray(value.questionManifest) ? value.questionManifest : [];
  const manifest = rawManifest.filter((item): item is string => typeof item === "string");
  const exactManifest =
    rawManifest.length === manifest.length &&
    manifest.length === deliveryDnaV2QuestionManifest.length &&
    new Set(manifest).size === manifest.length &&
    [...manifest].sort().every((id, index) => id === deliveryDnaV2QuestionManifest[index]);
  if (
    session.assessmentType !== DELIVERY_DNA_V2_ASSESSMENT_TYPE ||
    value.assessmentType !== expected.assessmentType ||
    value.knowledgePackId !== expected.knowledgePackId ||
    value.knowledgePackVersion !== expected.knowledgePackVersion ||
    value.questionSetId !== expected.questionSetId ||
    value.questionSetVersion !== expected.questionSetVersion ||
    value.configurationSetId !== deliveryDnaV2Catalogue.identity.configurationSetId ||
    typeof value.questionManifestDigest !== "string" ||
    !/^[0-9a-f]{64}$/.test(value.questionManifestDigest) ||
    !exactManifest
  ) {
    throw new Error("DELIVERY_DNA_IDENTITY_INVALID");
  }
  return value as DeliveryDnaIdentitySnapshot;
}

export function normaliseCustomerAnswer(answer: AssessmentAnswerInput) {
  const question = questionById.get(answer.questionId);
  if (!question) throw new Error("DELIVERY_DNA_QUESTION_INVALID");
  const status = answer.evidenceStatus ?? "answered";
  if (status === "not_applicable") {
    const reason = answer.evidenceReasonText?.trim() ?? "";
    if (!reason) throw new Error("DELIVERY_DNA_NOT_APPLICABLE_REASON_REQUIRED");
    if (reason.length > 500) throw new Error("DELIVERY_DNA_NOT_APPLICABLE_REASON_TOO_LONG");
    return {
      questionId: answer.questionId,
      sectionId: question.sectionId,
      value: null,
      notes: answer.notes ?? null,
      evidenceStatus: status,
      evidenceReasonCode: DELIVERY_DNA_V2_NOT_APPLICABLE_REASON,
      evidenceReasonText: reason,
    } as const;
  }
  if (!Number.isInteger(answer.value) || Number(answer.value) < 1 || Number(answer.value) > 4) {
    throw new Error("DELIVERY_DNA_ANSWER_INVALID");
  }
  return {
    questionId: answer.questionId,
    sectionId: question.sectionId,
    value: Number(answer.value),
    notes: answer.notes ?? null,
    evidenceStatus: "answered" as const,
    evidenceReasonCode: null,
    evidenceReasonText: null,
  };
}

export function prepareDeliveryDnaCompletion(
  session: AssessmentSession,
  responses: AssessmentResponse[],
  options: DeliveryDnaCompletionOptions,
) {
  const identity = deliveryDnaIdentityOf(session);
  if (!options.reviewAcknowledged) throw new Error("DELIVERY_DNA_REVIEW_REQUIRED");
  const evidenceMetadata = deliveryDnaV2EvidenceMetadata(options);
  const responseById = new Map<string, AssessmentResponse>();
  for (const response of responses) {
    if (!questionById.has(response.questionId) || responseById.has(response.questionId)) {
      throw new Error("DELIVERY_DNA_MANIFEST_INVALID");
    }
    const status = response.evidenceStatus ?? "answered";
    if (status === "answered") {
      if (
        !Number.isInteger(response.value) ||
        Number(response.value) < 1 ||
        Number(response.value) > 4
      ) {
        throw new Error("DELIVERY_DNA_ANSWER_INVALID");
      }
    } else if (status === "not_applicable") {
      if (
        response.value !== null ||
        response.evidenceReasonCode !== DELIVERY_DNA_V2_NOT_APPLICABLE_REASON ||
        !response.evidenceReasonText?.trim()
      ) {
        throw new Error("DELIVERY_DNA_NOT_APPLICABLE_REASON_REQUIRED");
      }
    } else if (status === "excluded") {
      if (!response.exclusionReason) {
        throw new Error("DELIVERY_DNA_EXCLUSION_INVALID");
      }
    } else if (status !== "missing") {
      throw new Error("DELIVERY_DNA_EVIDENCE_STATUS_INVALID");
    }
    responseById.set(response.questionId, response);
  }

  const missingQuestionIds = deliveryDnaV2QuestionManifest.filter(
    (id) => !responseById.has(id) || responseById.get(id)?.evidenceStatus === "missing",
  );
  if (missingQuestionIds.length && !options.missingAcknowledged) {
    throw new Error("DELIVERY_DNA_MISSING_ACKNOWLEDGEMENT_REQUIRED");
  }
  const missingResponses = missingQuestionIds
    .filter((questionId) => !responseById.has(questionId))
    .map((questionId) => ({
      questionId,
      sectionId: questionById.get(questionId)!.sectionId,
      value: null,
      notes: null,
      evidenceStatus: "missing" as const,
      evidenceReasonCode: null,
      evidenceReasonText: null,
    }));
  return { identity, missingResponses, missingCount: missingQuestionIds.length, evidenceMetadata };
}

export function answeredEvidenceCount(responses: AssessmentResponse[]): number {
  return responses.filter((response) =>
    ["answered", "not_applicable", "excluded"].includes(response.evidenceStatus ?? "answered"),
  ).length;
}
