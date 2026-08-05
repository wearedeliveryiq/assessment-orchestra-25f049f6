import {
  sprint03Configuration,
  SPRINT03_CONFIGURATION_SET_ID,
} from "../delivery-intelligence/config";
import {
  DELIVERY_DNA_V2_CONFIGURATION_SET_ID,
  DELIVERY_DNA_V2_VERSION,
  deliveryDnaV2QuestionManifest,
} from "../delivery-dna/catalogue-v2";

export const ANALYSIS_ELIGIBILITY_POLICY_ID = "PDR-003-002";
export const ANALYSIS_ELIGIBILITY_POLICY_VERSION = "1.0";
export const ANALYSIS_ELIGIBILITY_EVALUATOR_VERSION = "deliveryiq.analysis-eligibility/1.0.0";
export const DELIVERY_DNA_ID = "delivery-dna";
export const DELIVERY_DNA_VERSION = "1.0.0";

export const configuredQuestionIds = Object.freeze(
  sprint03Configuration.capabilities
    .flatMap((capability) => capability.questions.map((question) => question.id))
    .sort(),
);

export type AnalysisEligibilityReason =
  | "ANALYSIS_ELIGIBILITY_TENANT_MISMATCH"
  | "ANALYSIS_ELIGIBILITY_METADATA_MISSING"
  | "ANALYSIS_ASSESSMENT_TYPE_INELIGIBLE"
  | "ANALYSIS_PACK_ID_INELIGIBLE"
  | "ANALYSIS_PACK_VERSION_INELIGIBLE"
  | "ANALYSIS_QUESTION_SET_ID_INELIGIBLE"
  | "ANALYSIS_QUESTION_SET_VERSION_INELIGIBLE"
  | "ANALYSIS_QUESTION_SET_INCOMPATIBLE";

export interface EligibilityInput {
  assessmentId: string;
  assessmentRevision: number;
  organisationId: string;
  workspaceId: string;
  expectedOrganisationId: string;
  expectedWorkspaceId: string;
  completed: boolean;
  assessmentType: string | null;
  packId: string | null;
  packVersion: string | null;
  questionSetId: string | null;
  questionSetVersion: string | null;
  questionIds: string[];
  configurationSetId?: string;
}

export interface EligibilityEvaluation {
  status: "eligible" | "ineligible";
  primaryReason: AnalysisEligibilityReason | null;
  secondaryReasons: AnalysisEligibilityReason[];
  reasons: AnalysisEligibilityReason[];
  assessmentManifestDigest: string;
  configuredManifestDigest: string;
}

const precedence: AnalysisEligibilityReason[] = [
  "ANALYSIS_ELIGIBILITY_TENANT_MISMATCH",
  "ANALYSIS_ELIGIBILITY_METADATA_MISSING",
  "ANALYSIS_ASSESSMENT_TYPE_INELIGIBLE",
  "ANALYSIS_PACK_ID_INELIGIBLE",
  "ANALYSIS_PACK_VERSION_INELIGIBLE",
  "ANALYSIS_QUESTION_SET_ID_INELIGIBLE",
  "ANALYSIS_QUESTION_SET_VERSION_INELIGIBLE",
  "ANALYSIS_QUESTION_SET_INCOMPATIBLE",
];

async function sha256(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function evaluateAnalysisEligibility(
  input: EligibilityInput,
): Promise<EligibilityEvaluation> {
  const isV2 = input.configurationSetId === DELIVERY_DNA_V2_CONFIGURATION_SET_ID;
  const expectedVersion = isV2 ? DELIVERY_DNA_V2_VERSION : DELIVERY_DNA_VERSION;
  const expectedConfigurationSetId = isV2
    ? DELIVERY_DNA_V2_CONFIGURATION_SET_ID
    : SPRINT03_CONFIGURATION_SET_ID;
  const expectedQuestionIds = isV2 ? deliveryDnaV2QuestionManifest : configuredQuestionIds;
  const reasons = new Set<AnalysisEligibilityReason>();
  if (
    input.organisationId !== input.expectedOrganisationId ||
    input.workspaceId !== input.expectedWorkspaceId
  )
    reasons.add("ANALYSIS_ELIGIBILITY_TENANT_MISMATCH");
  if (
    !input.completed ||
    !input.assessmentType ||
    !input.packId ||
    !input.packVersion ||
    !input.questionSetId ||
    !input.questionSetVersion ||
    input.assessmentRevision < 1 ||
    input.configurationSetId !== expectedConfigurationSetId
  )
    reasons.add("ANALYSIS_ELIGIBILITY_METADATA_MISSING");
  if (input.assessmentType && input.assessmentType !== DELIVERY_DNA_ID)
    reasons.add("ANALYSIS_ASSESSMENT_TYPE_INELIGIBLE");
  if (input.packId && input.packId !== DELIVERY_DNA_ID) reasons.add("ANALYSIS_PACK_ID_INELIGIBLE");
  if (input.packVersion && input.packVersion !== expectedVersion)
    reasons.add("ANALYSIS_PACK_VERSION_INELIGIBLE");
  if (input.questionSetId && input.questionSetId !== DELIVERY_DNA_ID)
    reasons.add("ANALYSIS_QUESTION_SET_ID_INELIGIBLE");
  if (input.questionSetVersion && input.questionSetVersion !== expectedVersion)
    reasons.add("ANALYSIS_QUESTION_SET_VERSION_INELIGIBLE");

  const sorted = [...input.questionIds].sort();
  const exact =
    sorted.length === expectedQuestionIds.length &&
    new Set(sorted).size === sorted.length &&
    sorted.every((id, index) => id === expectedQuestionIds[index]);
  if (!exact) reasons.add("ANALYSIS_QUESTION_SET_INCOMPATIBLE");
  const ordered = precedence.filter((reason) => reasons.has(reason));
  return {
    status: ordered.length ? "ineligible" : "eligible",
    primaryReason: ordered[0] ?? null,
    secondaryReasons: ordered.slice(1),
    reasons: ordered,
    assessmentManifestDigest: await sha256(sorted),
    configuredManifestDigest: await sha256(expectedQuestionIds),
  };
}
