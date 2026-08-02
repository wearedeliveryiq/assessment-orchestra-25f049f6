import { z } from "zod";
import rawConfiguration from "../../../config/delivery-intelligence/sprint03-product-config-1.0.0.json";

export const SPRINT03_CONFIGURATION_SET_ID = "sprint03-product-config-1.0.0";
export const SPRINT03_CONFIGURATION_DIGEST =
  "ca8736cf4ed6d0d72e31f6c4d0ff3f3c1c40ee075652fb4f69593b078cd767b2";

const bandSchema = z.object({
  id: z.string().min(1),
  minimumInclusive: z.number(),
  maximumExclusive: z.number().optional(),
  maximumInclusive: z.number().optional(),
});

const questionSchema = z.object({
  id: z.string().min(1),
  weight: z.number().positive(),
  required: z.boolean(),
});

const capabilitySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  order: z.number().int().positive(),
  weight: z.number().positive(),
  questions: z.array(questionSchema).min(1),
});

const configurationSchema = z.object({
  document: z.object({
    id: z.literal("DIQ-203A"),
    version: z.literal("1.0.0"),
    status: z.literal("locked"),
    configurationSetId: z.literal(SPRINT03_CONFIGURATION_SET_ID),
    approvedBy: z.literal("Matt Prust"),
    approvedAt: z.literal("2026-08-02"),
  }),
  scoring: z.object({
    answerScale: z.object({
      type: z.literal("integer"),
      minimum: z.literal(1),
      maximum: z.literal(5),
    }),
    eligibleStatuses: z.array(z.string()).min(1),
    approvedExclusionReasons: z.array(z.string()),
    minimumEligibleQuestionsPerCapability: z.number().int().positive(),
    minimumEligibleWeightPerCapability: z.number().positive(),
    minimumAvailableCapabilitiesForOverall: z.number().int().positive(),
    storagePrecisionDecimals: z.number().int().nonnegative(),
    displayPrecisionDecimals: z.number().int().nonnegative(),
    roundingMode: z.literal("half_up"),
    bands: z.array(bandSchema).min(1),
  }),
  capabilities: z.array(capabilitySchema).min(1),
  confidence: z.object({
    storagePrecisionDecimals: z.number().int().nonnegative(),
    displayPrecisionDecimals: z.number().int().nonnegative(),
    factors: z.array(z.object({ id: z.string(), weight: z.number().nonnegative() })).min(1),
    bands: z.array(bandSchema).min(1),
    limitationThresholdExclusive: z.number(),
    limitations: z.record(z.string(), z.object({ text: z.string(), prompt: z.string() })),
  }),
  findings: z.object({
    strength: z.object({
      scoreMinimumInclusive: z.number(),
      capabilityConfidenceMinimumInclusive: z.number(),
      maximumWorkspace: z.number().int(),
      maximumPublic: z.number().int(),
    }),
    priorityOpportunity: z.object({
      scoreMaximumExclusive: z.number(),
      capabilityConfidenceMinimumInclusive: z.number(),
      maximumWorkspace: z.number().int(),
      maximumPublic: z.number().int(),
    }),
    insufficientEvidence: z.object({ capabilityConfidenceMaximumExclusive: z.number() }),
  }),
  patterns: z.array(z.object({ id: z.string(), version: z.string(), order: z.number() })).min(1),
  recommendations: z.array(z.object({ id: z.string(), order: z.number() })).min(1),
  analysisLifecycle: z.object({
    states: z.array(z.enum(["queued", "running", "completed", "failed"])),
    maximumAttempts: z.literal(3),
    apiMode: z.literal("asynchronous_only"),
  }),
  publicDisclosure: z.object({ allowList: z.array(z.string()).min(1) }),
  traceability: z.object({
    nodeTypes: z.array(z.string()).min(1),
    edgeTypes: z.array(z.string()).min(1),
  }),
});

export type Sprint03Configuration = typeof rawConfiguration;

function assertUnique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) throw new Error(`${label} contains duplicate IDs`);
}

export function validateSprint03Configuration(value: unknown): Sprint03Configuration {
  const result = configurationSchema.safeParse(value);
  if (!result.success) {
    throw new Error(`ANALYSIS_CONFIGURATION_INVALID: ${z.prettifyError(result.error)}`);
  }
  const config = value as Sprint03Configuration;
  assertUnique(
    config.capabilities.map((item) => item.id),
    "capabilities",
  );
  assertUnique(
    config.capabilities.flatMap((item) => item.questions.map((question) => question.id)),
    "questions",
  );
  assertUnique(
    config.patterns.map((item) => item.id),
    "patterns",
  );
  assertUnique(
    config.recommendations.map((item) => item.id),
    "recommendations",
  );

  const questionWeightsValid = config.capabilities.every(
    (capability) =>
      Math.abs(capability.questions.reduce((sum, question) => sum + question.weight, 0) - 1) < 1e-9,
  );
  if (!questionWeightsValid)
    throw new Error("ANALYSIS_CONFIGURATION_INVALID: question weights must sum to one");

  const factorWeight = config.confidence.factors.reduce((sum, factor) => sum + factor.weight, 0);
  if (Math.abs(factorWeight - 1) >= 1e-9) {
    throw new Error("ANALYSIS_CONFIGURATION_INVALID: confidence weights must sum to one");
  }
  return config;
}

export const sprint03Configuration = Object.freeze(validateSprint03Configuration(rawConfiguration));

export function componentDigests() {
  return {
    configurationSetId: SPRINT03_CONFIGURATION_SET_ID,
    configurationDigest: SPRINT03_CONFIGURATION_DIGEST,
    configurationVersion: sprint03Configuration.document.version,
  } as const;
}
