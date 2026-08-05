import type {
  AssessmentAnswerInput,
  AssessmentResponse,
  AssessmentSession,
} from "../assessment/types";
import { sprint03Configuration } from "../delivery-intelligence/config";
import {
  DELIVERY_DNA_ASSESSMENT_TYPE,
  DELIVERY_DNA_NOT_APPLICABLE_REASON,
  deliveryDnaCatalogue,
  deliveryDnaQuestionManifest,
} from "./catalogue";

const questionById = new Map(
  deliveryDnaCatalogue.capabilities.flatMap((capability) =>
    capability.questions.map(
      (question) => [question.id, { ...question, sectionId: capability.id }] as const,
    ),
  ),
);

export function normaliseCustomerAnswerV1(answer: AssessmentAnswerInput) {
  const question = questionById.get(answer.questionId);
  if (!question) throw new Error("DELIVERY_DNA_QUESTION_INVALID");
  if (answer.evidenceStatus === "not_applicable") {
    const reason = answer.evidenceReasonText?.trim() ?? "";
    if (!reason) throw new Error("DELIVERY_DNA_NOT_APPLICABLE_REASON_REQUIRED");
    return {
      questionId: answer.questionId,
      sectionId: question.sectionId,
      value: null,
      notes: answer.notes ?? null,
      evidenceStatus: "not_applicable" as const,
      evidenceReasonCode: DELIVERY_DNA_NOT_APPLICABLE_REASON,
      evidenceReasonText: reason,
    };
  }
  if (!Number.isInteger(answer.value) || Number(answer.value) < 1 || Number(answer.value) > 5)
    throw new Error("DELIVERY_DNA_ANSWER_INVALID");
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

export function prepareDeliveryDnaCompletionV1(
  session: AssessmentSession,
  responses: AssessmentResponse[],
  options: { reviewAcknowledged?: boolean; missingAcknowledged?: boolean },
) {
  const value = (session.metadata as { deliveryDna?: Record<string, unknown> }).deliveryDna;
  if (
    session.assessmentType !== DELIVERY_DNA_ASSESSMENT_TYPE ||
    value?.knowledgePackVersion !== "1.0.0" ||
    value?.configurationSetId !== "sprint03-product-config-1.0.0" ||
    JSON.stringify([...(value?.questionManifest as string[])].sort()) !==
      JSON.stringify(deliveryDnaQuestionManifest)
  )
    throw new Error("DELIVERY_DNA_IDENTITY_INVALID");
  if (!options.reviewAcknowledged) throw new Error("DELIVERY_DNA_REVIEW_REQUIRED");
  const byId = new Map(responses.map((response) => [response.questionId, response]));
  for (const response of responses) {
    if (!questionById.has(response.questionId)) throw new Error("DELIVERY_DNA_MANIFEST_INVALID");
    if (
      response.evidenceStatus === "excluded" &&
      (!response.exclusionReason ||
        !sprint03Configuration.scoring.approvedExclusionReasons.includes(response.exclusionReason))
    )
      throw new Error("DELIVERY_DNA_EXCLUSION_INVALID");
  }
  const missing = deliveryDnaQuestionManifest.filter(
    (id) => !byId.has(id) || byId.get(id)?.evidenceStatus === "missing",
  );
  if (missing.length && !options.missingAcknowledged)
    throw new Error("DELIVERY_DNA_MISSING_ACKNOWLEDGEMENT_REQUIRED");
  return {
    identity: value,
    missingCount: missing.length,
    missingResponses: missing
      .filter((id) => !byId.has(id))
      .map((questionId) => ({
        questionId,
        sectionId: questionById.get(questionId)!.sectionId,
        value: null,
        notes: null,
        evidenceStatus: "missing" as const,
        evidenceReasonCode: null,
        evidenceReasonText: null,
      })),
  };
}
