import {
  DELIVERY_DNA_V2_NOT_APPLICABLE_REASON,
  deliveryDnaV2AnswerOptions,
  deliveryDnaV2Catalogue,
  deliveryDnaV2Domains,
  deliveryDnaV2SnapshotQuestions,
  DELIVERY_DNA_V2_PRESENTATION_POLICY_VERSION,
  type DeliveryDnaV2Level,
} from "./catalogue-v2";

export type SnapshotV2ConfigurationVersion = "2.1.0";
export type SnapshotV2PresentationPolicyVersion = "2.1.1";
export type SnapshotV2Response = {
  questionId: string;
  status: "answered" | "not_applicable" | "missing";
  answer: number | null;
  notApplicableReasonCode: string | null;
  notApplicableReasonText: string | null;
  respondedAt: string | null;
};

export type SnapshotV2DomainProfile = {
  axisNumber: number;
  domainId: string;
  domainLabel: string;
  value: number | null;
  level: DeliveryDnaV2Level | null;
  answeredCount: number;
};

export const deliveryDnaSnapshotV2Configuration = Object.freeze({
  version: "2.1.0" as const,
  presentationPolicyVersion: DELIVERY_DNA_V2_PRESENTATION_POLICY_VERSION,
  productName: "Delivery DNA Snapshot",
  questionIds: deliveryDnaV2SnapshotQuestions.map((item) => item.question.id),
  responsePolicy: {
    minimumAnsweredQuestions: deliveryDnaV2Catalogue.snapshotPolicy.minimumAnsweredOverall,
    minimumAnsweredPerDomain: deliveryDnaV2Catalogue.snapshotPolicy.minimumAnsweredPerDomain,
  },
  interactionPolicy: {
    selectionConfirmationMilliseconds: 350,
    persistBeforeAdvance: true,
    advanceOnPersistenceFailure: false,
  },
  preparationPolicy: {
    minimumVisibleMilliseconds: 4000,
    targetMaximumMilliseconds: 6000,
    slowStateAtMilliseconds: 6000,
    heading: "Building your Delivery DNA Snapshot",
    body: "We’re reviewing the patterns across your 15 responses.",
    ready: "Your Snapshot is ready",
    steps: [
      "Reviewing your Snapshot responses",
      "Building your five-domain profile",
      "Identifying positive signals",
      "Highlighting areas to explore",
      "Preparing your personalised Snapshot",
    ],
  },
  copy: {
    heading: "Your Delivery DNA Snapshot",
    caveat: deliveryDnaV2Catalogue.snapshotPolicy.mandatoryCaveat,
    saveHeading: "Keep your Delivery DNA Snapshot",
    saveBody:
      "Save your Snapshot for free to download your results, return at any time and continue to your complete Delivery DNA without starting again.",
    saveSupporting: "Download your results by saving your Snapshot",
    saveBenefits: [
      "Download a polished copy of your indicative results",
      "Return to your results at any time",
      "Keep your 15 answers securely saved",
      "Continue to your complete Delivery DNA without repeating questions",
    ],
    saveAction: "Save my Snapshot",
    saveAssurance: "Free to save. No payment required. Your results remain private.",
    commercialAction: "Unlock your complete Delivery DNA — £295",
  },
  analyticsAllowedEvents: [
    "snapshot_landing_viewed",
    "snapshot_started",
    "snapshot_step_progressed",
    "snapshot_completed",
    "snapshot_continue_selected",
    "snapshot_registration_completed",
    "snapshot_saved",
  ],
});

export const deliveryDnaSnapshotV2Questions = deliveryDnaV2SnapshotQuestions;

export function snapshotV2Level(mean: number): DeliveryDnaV2Level {
  if (mean < 1.75) return "emerging";
  if (mean < 2.5) return "developing";
  if (mean < 3.25) return "established";
  return "leading";
}

export function classifySnapshotV2Signals(profile: SnapshotV2DomainProfile[]) {
  const available = profile.filter(
    (domain): domain is SnapshotV2DomainProfile & { value: number; level: DeliveryDnaV2Level } =>
      domain.value !== null && domain.level !== null,
  );
  const positiveCandidates = available.filter((domain) =>
    available.some((other) => domain.value > other.value),
  );
  const positiveSignals = [...positiveCandidates]
    .sort((left, right) => right.value - left.value || left.axisNumber - right.axisNumber)
    .slice(0, deliveryDnaV2Catalogue.snapshotPolicy.maximumPositiveSignals)
    .map((item) => ({
      domainId: item.domainId,
      domainLabel: item.domainLabel,
      level: item.level,
      text: `${item.domainLabel} is showing the strongest practice signal in this Snapshot.`,
    }));
  const positiveIds = new Set(positiveSignals.map((item) => item.domainId));
  const areaCandidates = available.filter(
    (domain) =>
      !positiveIds.has(domain.domainId) && available.some((other) => domain.value < other.value),
  );
  const areasToExplore = [...areaCandidates]
    .sort((left, right) => left.value - right.value || left.axisNumber - right.axisNumber)
    .slice(0, deliveryDnaV2Catalogue.snapshotPolicy.maximumAreasToExplore)
    .map((item) => ({
      domainId: item.domainId,
      domainLabel: item.domainLabel,
      level: item.level,
      text: `${item.domainLabel} is an area to explore in the complete Delivery DNA.`,
    }));
  return { positiveSignals, areasToExplore };
}

/** Preserves the pre-amendment calculation-neutral context selector. */
export function snapshotV2ContextDomainId(profile: SnapshotV2DomainProfile[]): string | null {
  return (
    [...profile]
      .filter(
        (domain): domain is SnapshotV2DomainProfile & { value: number } => domain.value !== null,
      )
      .sort((left, right) => left.value - right.value || left.axisNumber - right.axisNumber)[0]
      ?.domainId ?? null
  );
}

export function normaliseSnapshotV2Response(input: {
  questionId: unknown;
  status: unknown;
  answer?: unknown;
  notApplicableReasonText?: unknown;
  respondedAt?: unknown;
}): SnapshotV2Response {
  const questionId = String(input.questionId);
  if (!deliveryDnaSnapshotV2Configuration.questionIds.includes(questionId)) {
    throw new Error("SNAPSHOT_RESPONSE_INVALID");
  }
  if (input.status === "not_applicable") {
    const reason =
      typeof input.notApplicableReasonText === "string" ? input.notApplicableReasonText.trim() : "";
    if (!reason || reason.length > 500) throw new Error("SNAPSHOT_NOT_APPLICABLE_REASON_REQUIRED");
    return {
      questionId,
      status: "not_applicable",
      answer: null,
      notApplicableReasonCode: DELIVERY_DNA_V2_NOT_APPLICABLE_REASON,
      notApplicableReasonText: reason,
      respondedAt:
        typeof input.respondedAt === "string" ? input.respondedAt : new Date().toISOString(),
    };
  }
  if (
    input.status !== "answered" ||
    !Number.isInteger(input.answer) ||
    Number(input.answer) < 1 ||
    Number(input.answer) > 4
  ) {
    throw new Error("SNAPSHOT_RESPONSE_INVALID");
  }
  return {
    questionId,
    status: "answered",
    answer: Number(input.answer),
    notApplicableReasonCode: null,
    notApplicableReasonText: null,
    respondedAt:
      typeof input.respondedAt === "string" ? input.respondedAt : new Date().toISOString(),
  };
}

export function snapshotV2ContinuationRecord(response: SnapshotV2Response) {
  if (
    !deliveryDnaSnapshotV2Configuration.questionIds.includes(response.questionId) ||
    !response.respondedAt ||
    !["answered", "not_applicable"].includes(response.status)
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
    provenance: "delivery-dna-snapshot@2.1.0" as const,
    fullAssessmentCompleted: false as const,
    analysisRunCreated: false as const,
  };
}

export function evaluateDeliveryDnaSnapshotV2(responses: SnapshotV2Response[]) {
  const byQuestion = new Map(responses.map((response) => [response.questionId, response]));
  const deliberate = deliveryDnaSnapshotV2Questions.every((item) => {
    const response = byQuestion.get(item.question.id);
    return response?.status === "answered" || response?.status === "not_applicable";
  });
  const answered = deliveryDnaSnapshotV2Questions.flatMap((item) => {
    const response = byQuestion.get(item.question.id);
    return response?.status === "answered" && response.answer !== null
      ? [{ ...item, answer: response.answer }]
      : [];
  });
  const profile: SnapshotV2DomainProfile[] = deliveryDnaV2Domains.map((domain, index) => {
    const values = answered
      .filter((item) => item.domainId === domain.id)
      .map((item) => item.answer);
    const value =
      values.length >= 2 ? values.reduce((sum, item) => sum + item, 0) / values.length : null;
    return {
      axisNumber: index + 1,
      domainId: domain.id,
      domainLabel: domain.label,
      value,
      level: value === null ? null : snapshotV2Level(value),
      answeredCount: values.length,
    };
  });
  const available =
    deliberate &&
    answered.length >= deliveryDnaSnapshotV2Configuration.responsePolicy.minimumAnsweredQuestions &&
    profile.every((domain) => domain.answeredCount >= 2);
  if (!available) {
    const reasonCode = !deliberate
      ? "SNAPSHOT_INCOMPLETE"
      : answered.length < deliveryDnaSnapshotV2Configuration.responsePolicy.minimumAnsweredQuestions
        ? "snapshot_requires_twelve_answers"
        : "every_snapshot_domain_requires_two_answers";
    return {
      available: false as const,
      reasonCode,
      answeredCount: answered.length,
      indicativeMaturityLevel: null,
      profile,
      positiveSignals: [],
      areasToExplore: [],
    };
  }
  const overallMean = answered.reduce((sum, item) => sum + item.answer, 0) / answered.length;
  const { positiveSignals, areasToExplore } = classifySnapshotV2Signals(profile);
  return {
    available: true as const,
    reasonCode: null,
    answeredCount: answered.length,
    indicativeMaturityLevel: snapshotV2Level(overallMean),
    profile,
    positiveSignals,
    areasToExplore,
  };
}

export function snapshotV2AnswerOptions(questionId: string) {
  return deliveryDnaV2AnswerOptions(questionId).map((option) => ({
    value: option.value,
    id: option.id,
    label: option.id[0].toUpperCase() + option.id.slice(1),
    description: option.text,
  }));
}

export function safeSnapshotV2AnalyticsEvent(event: string, stepNumber?: number | null) {
  if (!deliveryDnaSnapshotV2Configuration.analyticsAllowedEvents.includes(event)) {
    throw new Error("SNAPSHOT_ANALYTICS_INVALID");
  }
  const safeStep =
    Number.isInteger(stepNumber) && Number(stepNumber) >= 1 && Number(stepNumber) <= 15
      ? Number(stepNumber)
      : null;
  return { eventType: event, stepNumber: safeStep };
}
