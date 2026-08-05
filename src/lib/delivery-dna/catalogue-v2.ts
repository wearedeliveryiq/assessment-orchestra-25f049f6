import rawCatalogue from "../../../docs/01-product/delivery-dna/DIQ-100A v2.2.0 Delivery DNA Model Catalogue.json";

export const DELIVERY_DNA_V2_ASSESSMENT_TYPE = "delivery-dna";
export const DELIVERY_DNA_V2_VERSION = "2.2.0";
export const DELIVERY_DNA_V2_CATALOGUE_VERSION = "2.2.0";
export const DELIVERY_DNA_V2_PRESENTATION_POLICY_VERSION = "2.2.0";
export const DELIVERY_DNA_V2_CONFIGURATION_SET_ID = "delivery-dna-product-config-2.2.0";
/** Exact canonical question and anchor projection governed by DIQ-100E. */
export const DELIVERY_DNA_V2_CONFIGURATION_DIGEST =
  "405ac1f20558aff464c997bedc286fd921dd34e2fd4f0ad54e2501b68b3f37b4";
/** SHA-256 of the exact locked DIQ-100A v2.2.0 authority bytes. */
export const DELIVERY_DNA_V2_CATALOGUE_AUTHORITY_DIGEST =
  "52df143f0009620bb1909d350ba7aa073318ee86bc19e35f83f9282a4f90cd5f";
export const DELIVERY_DNA_V2_CANONICAL_CONTENT_DIGEST =
  "405ac1f20558aff464c997bedc286fd921dd34e2fd4f0ad54e2501b68b3f37b4";
export const DELIVERY_DNA_V2_NOT_APPLICABLE_REASON = "customer_declared_not_applicable";

export type DeliveryDnaV2Dimension = "snapshot" | "supporting_1" | "supporting_2";
export type DeliveryDnaV2Level = "emerging" | "developing" | "established" | "leading";

export interface DeliveryDnaV2AnswerOption {
  value: 1 | 2 | 3 | 4;
  id: DeliveryDnaV2Level;
  text: string;
}

export interface DeliveryDnaV2Question {
  id: string;
  role: DeliveryDnaV2Dimension;
  weight: number;
  required: boolean;
  snapshot: boolean;
  prompt: string;
}

export interface DeliveryDnaV2Capability {
  id: string;
  label: string;
  order: number;
  domainId: string;
  weight: number;
  definition: string;
  customerHelp: string;
  snapshotQuestionId: string;
  questions: DeliveryDnaV2Question[];
}

export interface DeliveryDnaV2Domain {
  id: string;
  label: string;
  order: number;
  executiveQuestion: string;
  capabilities: DeliveryDnaV2Capability[];
}

type RawCatalogue = typeof rawCatalogue;

function validateCatalogue(value: RawCatalogue): RawCatalogue {
  if (
    value.document.id !== "DIQ-100A" ||
    value.document.version !== DELIVERY_DNA_V2_CATALOGUE_VERSION ||
    value.document.status !== "locked" ||
    value.identity.assessmentType !== DELIVERY_DNA_V2_ASSESSMENT_TYPE ||
    value.identity.knowledgePackVersion !== DELIVERY_DNA_V2_VERSION ||
    value.identity.questionSetVersion !== DELIVERY_DNA_V2_VERSION ||
    value.identity.configurationSetId !== DELIVERY_DNA_V2_CONFIGURATION_SET_ID ||
    value.snapshotPolicy.presentationPolicyVersion !==
      DELIVERY_DNA_V2_PRESENTATION_POLICY_VERSION ||
    value.snapshotPolicy.signalSelection.authority !== "DIQ-100D@1.0" ||
    value.snapshotPolicy.signalSelection.basis !== "unrounded_available_domain_mean" ||
    value.snapshotPolicy.signalSelection.positiveEligibility !==
      "strictly_greater_than_at_least_one_other_available_domain_mean" ||
    value.snapshotPolicy.signalSelection.areaToExploreEligibility !==
      "strictly_lower_than_at_least_one_other_available_domain_mean" ||
    value.snapshotPolicy.signalSelection.positiveSort.join(",") !== "mean_desc,domain_order_asc" ||
    value.snapshotPolicy.signalSelection.areaToExploreSort.join(",") !==
      "mean_asc,domain_order_asc" ||
    value.snapshotPolicy.signalSelection.setsDisjoint !== true ||
    value.snapshotPolicy.signalSelection.allAvailableMeansEqual !== "omit_both_lists" ||
    value.snapshotPolicy.signalSelection.unavailableDomains !== "excluded" ||
    value.snapshotPolicy.signalSelection.emptyListPresentation !==
      "omit_without_replacement_claim" ||
    value.document.amendmentAuthority !== "DIQ-100E@1.0" ||
    value.snapshotPolicy.languagePolicy.authority !== "DIQ-100E@1.0" ||
    value.snapshotPolicy.languagePolicy.nonEnumeratedContent !== "unchanged_from_DIQ-100A@2.1.1" ||
    value.snapshotPolicy.resultPresentation.areasOfStrength.selectionAuthority !== "DIQ-100D@1.0" ||
    value.snapshotPolicy.industryContextPresentation.scoringEffect !== "none" ||
    value.sourceReconciliation.authority !== "DIQ-100C@2.1" ||
    value.sourceReconciliation.exactSubmittedQuestionsRetained !== 37 ||
    value.sourceReconciliation.founderApprovedEditedQuestions !== 4 ||
    value.sourceReconciliation.founderApprovedNewQuestions !== 4 ||
    value.sourceReconciliation.exactSubmittedAnchorsRetained !== 163 ||
    value.sourceReconciliation.founderApprovedEditedAnchors !== 1 ||
    value.sourceReconciliation.founderApprovedNewAnchors !== 16 ||
    value.sourceReconciliation.languageExperienceAmendment.questionPromptReplacements !== 10 ||
    value.sourceReconciliation.languageExperienceAmendment.answerAnchorReplacements !== 5 ||
    value.sourceReconciliation.languageExperienceAmendment.allNonEnumeratedContentUnchanged !==
      true ||
    value.sourceReconciliation.canonicalContentDigest.value !==
      DELIVERY_DNA_V2_CANONICAL_CONTENT_DIGEST ||
    value.unresolvedFounderDecisions.length !== 0
  ) {
    throw new Error("DELIVERY_DNA_V2_CATALOGUE_INVALID: identity");
  }

  const domains = value.domains as DeliveryDnaV2Domain[];
  const capabilities = domains.flatMap((domain) => domain.capabilities);
  const questions = capabilities.flatMap((capability) => capability.questions);
  const questionIds = questions.map((question) => question.id);
  const snapshotIds = capabilities.map((capability) => capability.snapshotQuestionId);
  const answerSetIds = Object.keys(value.answerOptionsByQuestionId);
  const exactQuestionSets =
    [...questionIds].sort().every((id, index) => id === [...answerSetIds].sort()[index]) &&
    questionIds.length === answerSetIds.length;

  if (
    domains.length !== 5 ||
    capabilities.length !== 15 ||
    questions.length !== 45 ||
    new Set(questionIds).size !== 45 ||
    snapshotIds.length !== 15 ||
    new Set(snapshotIds).size !== 15 ||
    !questions.every((question) =>
      /^ddna2\.[a-z_]+\.(snapshot|supporting_1|supporting_2)$/.test(question.id),
    ) ||
    !capabilities.every(
      (capability) =>
        capability.questions.length === 3 &&
        capability.questions.filter((question) => question.snapshot).length === 1 &&
        capability.questions.map((question) => question.role).join(",") ===
          "snapshot,supporting_1,supporting_2" &&
        capability.questions.map((question) => question.weight).join(",") === "0.4,0.3,0.3" &&
        capability.questions.some(
          (question) =>
            question.id === capability.snapshotQuestionId && question.role === "snapshot",
        ),
    ) ||
    !exactQuestionSets ||
    !answerSetIds.every((id) => {
      const options =
        value.answerOptionsByQuestionId[id as keyof typeof value.answerOptionsByQuestionId];
      return (
        options.length === 4 &&
        options.every(
          (option, index) =>
            option.value === index + 1 &&
            ["emerging", "developing", "established", "leading"][index] === option.id &&
            option.text.trim().length > 0,
        )
      );
    })
  ) {
    throw new Error("DELIVERY_DNA_V2_CATALOGUE_INVALID: structure");
  }
  return value;
}

export const deliveryDnaV2Catalogue = Object.freeze(validateCatalogue(rawCatalogue));
export const deliveryDnaV2Domains = Object.freeze(
  [...(deliveryDnaV2Catalogue.domains as DeliveryDnaV2Domain[])].sort(
    (left, right) => left.order - right.order,
  ),
);
export const deliveryDnaV2Capabilities = Object.freeze(
  deliveryDnaV2Domains.flatMap((domain) =>
    [...domain.capabilities].sort((left, right) => left.order - right.order),
  ),
);
export const deliveryDnaV2Questions = Object.freeze(
  deliveryDnaV2Capabilities.flatMap((capability) => capability.questions),
);
export const deliveryDnaV2SnapshotQuestions = Object.freeze(
  deliveryDnaV2Capabilities.map((capability) => ({
    domainId: capability.domainId,
    domainLabel: deliveryDnaV2Domains.find((domain) => domain.id === capability.domainId)!.label,
    capabilityId: capability.id,
    capabilityLabel: capability.label,
    capabilityOrder: capability.order,
    customerHelp: capability.customerHelp,
    question: capability.questions.find(
      (question) => question.id === capability.snapshotQuestionId,
    )!,
  })),
);
export const deliveryDnaV2QuestionManifest = Object.freeze(
  deliveryDnaV2Questions.map((question) => question.id).sort(),
);

export function deliveryDnaV2AnswerOptions(questionId: string): DeliveryDnaV2AnswerOption[] {
  const options =
    deliveryDnaV2Catalogue.answerOptionsByQuestionId[
      questionId as keyof typeof deliveryDnaV2Catalogue.answerOptionsByQuestionId
    ];
  if (!options) throw new Error("DELIVERY_DNA_V2_QUESTION_INVALID");
  return options as DeliveryDnaV2AnswerOption[];
}

export async function deliveryDnaV2ManifestDigest(): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(deliveryDnaV2QuestionManifest)),
  );
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function assertDeliveryDnaV2ManifestDigest(value: string): Promise<void> {
  if (value !== (await deliveryDnaV2ManifestDigest())) {
    throw new Error("DELIVERY_DNA_IDENTITY_INVALID");
  }
}

export function deliveryDnaV2SessionMetadata(manifestDigest: string) {
  const identity = deliveryDnaV2Catalogue.identity;
  return {
    deliveryDna: {
      assessmentType: identity.assessmentType,
      knowledgePackId: identity.knowledgePackId,
      knowledgePackVersion: identity.knowledgePackVersion,
      questionSetId: identity.questionSetId,
      questionSetVersion: identity.questionSetVersion,
      configurationSetId: identity.configurationSetId,
      questionManifest: [...deliveryDnaV2QuestionManifest],
      questionManifestDigest: manifestDigest,
    },
  };
}

/** Explicit clean-cutover boundary: historical evidence is retained, never translated. */
export function deliveryDnaV2CutoverDecision(input: {
  sourceQuestionSetVersion: string;
  targetQuestionSetVersion: string;
  requestedAction: string;
}) {
  if (
    input.sourceQuestionSetVersion !== DELIVERY_DNA_V2_VERSION &&
    input.targetQuestionSetVersion === DELIVERY_DNA_V2_VERSION &&
    ["translate_responses", "translate_or_analyse_responses"].includes(input.requestedAction)
  ) {
    return {
      allowed: false as const,
      reasonCode: "DELIVERY_DNA_VERSION_TRANSLATION_PROHIBITED" as const,
      restartTarget: "delivery-dna-snapshot-2.2.0" as const,
      historyMutated: false as const,
      ...(input.requestedAction === "translate_or_analyse_responses"
        ? { analysisRunCreated: false as const }
        : {}),
    };
  }
  return { allowed: input.sourceQuestionSetVersion === input.targetQuestionSetVersion };
}
