import { z } from "zod";

import rawCatalogue from "../../../docs/01-product/delivery-intelligence/configuration/DIQ-203C Delivery DNA 1.0.0 Question Catalogue.json";

export const DELIVERY_DNA_ASSESSMENT_TYPE = "delivery-dna";
export const DELIVERY_DNA_VERSION = "1.0.0";
export const DELIVERY_DNA_CONFIGURATION_SET_ID = "sprint03-product-config-1.0.0";
export const DELIVERY_DNA_NOT_APPLICABLE_REASON = "customer_declared_not_applicable";

const responseOptionSchema = z.object({
  value: z.number().int().min(1).max(5),
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
});

const questionSchema = z.object({
  id: z.string().min(1),
  dimension: z.enum(["foundation", "practice", "evidence"]),
  weight: z.number().positive(),
  required: z.boolean(),
  prompt: z.string().min(1),
});

const catalogueSchema = z.object({
  document: z.object({
    id: z.literal("DIQ-203C"),
    version: z.literal(DELIVERY_DNA_VERSION),
    status: z.literal("locked"),
    locale: z.literal("en-GB"),
    configurationSetId: z.literal(DELIVERY_DNA_CONFIGURATION_SET_ID),
  }),
  identity: z.object({
    assessmentType: z.literal(DELIVERY_DNA_ASSESSMENT_TYPE),
    knowledgePackId: z.literal(DELIVERY_DNA_ASSESSMENT_TYPE),
    knowledgePackVersion: z.literal(DELIVERY_DNA_VERSION),
    questionSetId: z.literal(DELIVERY_DNA_ASSESSMENT_TYPE),
    questionSetVersion: z.literal(DELIVERY_DNA_VERSION),
    questionCount: z.literal(39),
  }),
  journey: z.object({
    title: z.string().min(1),
    introduction: z.string().min(1),
    instructions: z.string().min(1),
    dimensionLabels: z.record(z.string(), z.string().min(1)),
    dimensionInstructions: z.record(z.string(), z.string().min(1)),
    responseScale: z.object({
      type: z.literal("integer"),
      minimum: z.literal(1),
      maximum: z.literal(5),
      options: z.array(responseOptionSchema).length(5),
    }),
    evidenceStatusPresentation: z.object({
      answered: z.object({ customerSelectable: z.literal(true) }).passthrough(),
      not_applicable: z
        .object({
          customerSelectable: z.literal(true),
          label: z.string().min(1),
          reasonCode: z.literal(DELIVERY_DNA_NOT_APPLICABLE_REASON),
          reasonTextRequired: z.literal(true),
          reasonPrompt: z.string().min(1),
          customerHelp: z.string().min(1),
        })
        .passthrough(),
      missing: z
        .object({ customerSelectable: z.literal(false), label: z.string().min(1) })
        .passthrough(),
      excluded: z
        .object({ customerSelectable: z.literal(false), label: z.string().min(1) })
        .passthrough(),
    }),
    completionPolicy: z.object({
      exactManifestRequired: z.literal(true),
      allowCompletionWithMissingEvidence: z.literal(true),
      missingAcknowledgementRequired: z.literal(true),
      missingAcknowledgement: z.string().min(1),
      notApplicableReasonRequired: z.literal(true),
      excludedIsCustomerSelectable: z.literal(false),
      reviewAnswersBeforeCompletion: z.literal(true),
    }),
  }),
  capabilities: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        order: z.number().int().positive(),
        weight: z.number().positive(),
        questions: z.array(questionSchema).length(3),
      }),
    )
    .length(13),
});

export type DeliveryDnaCatalogue = z.infer<typeof catalogueSchema>;
export type DeliveryDnaQuestion = DeliveryDnaCatalogue["capabilities"][number]["questions"][number];

export function validateDeliveryDnaCatalogue(value: unknown): DeliveryDnaCatalogue {
  const parsed = catalogueSchema.parse(value);
  const catalogueCapabilities = [...parsed.capabilities].sort((a, b) => a.order - b.order);
  const ids = catalogueCapabilities.flatMap((capability) =>
    capability.questions.map((question) => question.id),
  );
  if (ids.length !== 39 || new Set(ids).size !== 39) {
    throw new Error("DELIVERY_DNA_CATALOGUE_INVALID: question manifest must contain 39 unique IDs");
  }
  return parsed;
}

export const deliveryDnaCatalogue = Object.freeze(validateDeliveryDnaCatalogue(rawCatalogue));

export const deliveryDnaQuestionManifest = Object.freeze(
  deliveryDnaCatalogue.capabilities
    .flatMap((capability) => capability.questions.map((question) => question.id))
    .sort(),
);

export async function deliveryDnaManifestDigest(): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(deliveryDnaQuestionManifest)),
  );
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function assertDeliveryDnaManifestDigest(value: string): Promise<void> {
  if (value !== (await deliveryDnaManifestDigest())) {
    throw new Error("DELIVERY_DNA_IDENTITY_INVALID");
  }
}

export function deliveryDnaSessionMetadata(manifestDigest: string) {
  const { identity } = deliveryDnaCatalogue;
  return {
    deliveryDna: {
      assessmentType: identity.assessmentType,
      knowledgePackId: identity.knowledgePackId,
      knowledgePackVersion: identity.knowledgePackVersion,
      questionSetId: identity.questionSetId,
      questionSetVersion: identity.questionSetVersion,
      configurationSetId: DELIVERY_DNA_CONFIGURATION_SET_ID,
      questionManifest: [...deliveryDnaQuestionManifest],
      questionManifestDigest: manifestDigest,
    },
  };
}

export function isDeliveryDnaAssessment(assessmentType: string): boolean {
  return assessmentType === DELIVERY_DNA_ASSESSMENT_TYPE;
}
