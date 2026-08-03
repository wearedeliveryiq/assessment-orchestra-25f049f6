import { z } from "zod";

import rawConfiguration from "../../../docs/01-product/delivery-intelligence/configuration/PDR-003-005A Delivery DNA Snapshot Configuration.json";
import { deliveryDnaCatalogue, type DeliveryDnaQuestion } from "./catalogue";

const configurationSchema = z.object({
  document: z.object({
    id: z.literal("PDR-003-005A"),
    version: z.literal("1.0.0"),
    status: z.literal("locked"),
  }),
  identity: z
    .object({
      productId: z.literal("delivery-dna-snapshot"),
      productVersion: z.literal("1.0.0"),
      formalName: z.literal("Delivery DNA Snapshot"),
      questionCount: z.literal(13),
    })
    .passthrough(),
  copy: z.record(z.string(), z.unknown()),
  questionIds: z.array(z.string()).length(13),
  responsePolicy: z
    .object({
      minimumAnsweredQuestions: z.literal(9),
      allQuestionsDeliberateStatusRequired: z.literal(true),
    })
    .passthrough(),
  selectionPolicy: z
    .object({
      positiveSignalValues: z.tuple([z.literal(4), z.literal(5)]),
      areaToExploreValues: z.tuple([z.literal(1), z.literal(2)]),
      neutralValues: z.tuple([z.literal(3)]),
      maximumPositiveSignals: z.literal(2),
      maximumAreasToExplore: z.literal(2),
      analysisRunCreated: z.literal(false),
    })
    .passthrough(),
  continuationPolicy: z
    .object({
      provenance: z.object({
        source: z.literal("delivery-dna-snapshot"),
        version: z.literal("1.0.0"),
      }),
      automaticFullCompletion: z.literal(false),
      automaticAnalysisRequest: z.literal(false),
    })
    .passthrough(),
  privacyPolicy: z
    .object({
      unlinkedRetentionSeconds: z.literal(86400),
      analyticsAllowedEvents: z.array(z.string()),
      analyticsProhibitedFields: z.array(z.string()),
    })
    .passthrough(),
  fixtures: z.array(z.unknown()),
});

export const deliveryDnaSnapshotConfiguration = Object.freeze(
  configurationSchema.parse(rawConfiguration),
);

const practiceQuestions = [...deliveryDnaCatalogue.capabilities]
  .sort((left, right) => left.order - right.order)
  .map((capability) => {
    const question = capability.questions.find((candidate) => candidate.dimension === "practice");
    if (!question) throw new Error(`SNAPSHOT_CONFIGURATION_INVALID: ${capability.id}`);
    return {
      capabilityId: capability.id,
      capabilityLabel: capability.label,
      capabilityOrder: capability.order,
      question,
    };
  });

if (
  JSON.stringify(practiceQuestions.map((item) => item.question.id)) !==
  JSON.stringify(deliveryDnaSnapshotConfiguration.questionIds)
) {
  throw new Error("SNAPSHOT_CONFIGURATION_INVALID: practice-question manifest mismatch");
}

export const deliveryDnaSnapshotQuestions = Object.freeze(practiceQuestions);

export type SnapshotResponse = {
  questionId: string;
  status: "answered" | "not_applicable" | "missing";
  answer: number | null;
  notApplicableReasonCode: string | null;
  notApplicableReasonText: string | null;
  respondedAt: string | null;
};

export type SnapshotQuestion = DeliveryDnaQuestion;

export function snapshotContinuationRecord(response: SnapshotResponse) {
  if (
    !deliveryDnaSnapshotConfiguration.questionIds.includes(response.questionId) ||
    !response.respondedAt ||
    (response.status !== "answered" && response.status !== "not_applicable")
  ) {
    throw new Error("SNAPSHOT_TRANSFER_INVALID");
  }
  return {
    fullAssessmentQuestionId: response.questionId,
    status: response.status,
    answer: response.answer,
    notApplicableReasonCode: response.notApplicableReasonCode,
    notApplicableReasonText: response.notApplicableReasonText,
    respondedAt: response.respondedAt,
    provenance: "delivery-dna-snapshot@1.0.0" as const,
    fullAssessmentCompleted: false as const,
    analysisRunCreated: false as const,
  };
}

export function normaliseSnapshotResponse(input: {
  questionId: unknown;
  status: unknown;
  answer?: unknown;
  notApplicableReasonText?: unknown;
  respondedAt?: unknown;
}): SnapshotResponse {
  if (!deliveryDnaSnapshotConfiguration.questionIds.includes(String(input.questionId))) {
    throw new Error("SNAPSHOT_RESPONSE_INVALID");
  }
  if (input.status === "not_applicable") {
    const reason =
      typeof input.notApplicableReasonText === "string" ? input.notApplicableReasonText.trim() : "";
    if (!reason || reason.length > 500) throw new Error("SNAPSHOT_NOT_APPLICABLE_REASON_REQUIRED");
    return {
      questionId: String(input.questionId),
      status: "not_applicable",
      answer: null,
      notApplicableReasonCode: "customer_declared_not_applicable",
      notApplicableReasonText: reason,
      respondedAt:
        typeof input.respondedAt === "string" ? input.respondedAt : new Date().toISOString(),
    };
  }
  if (
    input.status !== "answered" ||
    !Number.isInteger(input.answer) ||
    Number(input.answer) < 1 ||
    Number(input.answer) > 5
  ) {
    throw new Error("SNAPSHOT_RESPONSE_INVALID");
  }
  return {
    questionId: String(input.questionId),
    status: "answered",
    answer: Number(input.answer),
    notApplicableReasonCode: null,
    notApplicableReasonText: null,
    respondedAt:
      typeof input.respondedAt === "string" ? input.respondedAt : new Date().toISOString(),
  };
}

export function evaluateDeliveryDnaSnapshot(responses: SnapshotResponse[]) {
  const byQuestion = new Map(responses.map((response) => [response.questionId, response]));
  const deliberate = deliveryDnaSnapshotQuestions.every((item) => {
    const response = byQuestion.get(item.question.id);
    return response?.status === "answered" || response?.status === "not_applicable";
  });
  const answered = deliveryDnaSnapshotQuestions.flatMap((item) => {
    const response = byQuestion.get(item.question.id);
    return response?.status === "answered" && response.answer !== null
      ? [{ ...item, answer: response.answer }]
      : [];
  });
  const unavailable = (
    reasonCode: "SNAPSHOT_INCOMPLETE" | "SNAPSHOT_INSUFFICIENT_APPLICABLE_RESPONSES",
  ) => ({
    available: false as const,
    reasonCode,
    positiveSignals: [],
    areasToExplore: [],
  });
  if (!deliberate) return unavailable("SNAPSHOT_INCOMPLETE");
  if (answered.length < deliveryDnaSnapshotConfiguration.responsePolicy.minimumAnsweredQuestions) {
    return unavailable("SNAPSHOT_INSUFFICIENT_APPLICABLE_RESPONSES");
  }
  const positiveSignals = answered
    .filter((item) => item.answer === 4 || item.answer === 5)
    .sort(
      (left, right) =>
        right.answer - left.answer ||
        left.capabilityOrder - right.capabilityOrder ||
        left.capabilityId.localeCompare(right.capabilityId),
    )
    .slice(0, 2)
    .map((item) => ({
      capabilityId: item.capabilityId,
      capabilityLabel: item.capabilityLabel,
      text: String(deliveryDnaSnapshotConfiguration.copy.positiveCardText),
    }));
  const areasToExplore = answered
    .filter((item) => item.answer === 1 || item.answer === 2)
    .sort(
      (left, right) =>
        left.answer - right.answer ||
        left.capabilityOrder - right.capabilityOrder ||
        left.capabilityId.localeCompare(right.capabilityId),
    )
    .slice(0, 2)
    .map((item) => ({
      capabilityId: item.capabilityId,
      capabilityLabel: item.capabilityLabel,
      text: String(deliveryDnaSnapshotConfiguration.copy.exploreCardText),
    }));
  return { available: true as const, reasonCode: null, positiveSignals, areasToExplore };
}

export function safeSnapshotAnalyticsEvent(event: string, stepNumber?: number | null) {
  if (!deliveryDnaSnapshotConfiguration.privacyPolicy.analyticsAllowedEvents.includes(event)) {
    throw new Error("SNAPSHOT_ANALYTICS_INVALID");
  }
  const safeStep =
    Number.isInteger(stepNumber) && Number(stepNumber) >= 1 && Number(stepNumber) <= 13
      ? Number(stepNumber)
      : null;
  return { eventType: event, stepNumber: safeStep };
}
