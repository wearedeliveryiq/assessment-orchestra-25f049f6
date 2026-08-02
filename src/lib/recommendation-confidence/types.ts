import type {
  RecommendationConfidenceGateCandidate,
  RecommendationConfidenceGateOutput,
} from "./gate";

export interface RecommendationConfidenceGateInput {
  analysisRunId: string;
  intelligenceResultId: string;
  intelligenceResultHash: string;
  recommendationEvaluationId: string;
  recommendationEvaluationHash: string;
  organisationId: string;
  workspaceId: string;
  configurationSetId: string;
  catalogueVersionId: string;
  catalogueId: string;
  catalogueVersion: string;
  catalogueDigest: string;
  policyVersion: string;
  confidenceVersion: string;
  analysisConfidence: number;
  confidenceState: "low" | "moderate" | "high";
  limitationCodes: string[];
  confidenceTraceNodeId: string;
}

export interface PersistedRecommendationConfidenceGateCandidate extends RecommendationConfidenceGateCandidate {
  id: string;
  confidenceGateId: string;
  candidateEvaluationId: string;
  recommendationDefinitionId: string;
  organisationId: string;
  workspaceId: string;
  semanticHash: string;
}

export interface RecommendationConfidenceGateRecord {
  id: string;
  recommendationEvaluationId: string;
  analysisRunId: string;
  intelligenceResultId: string;
  organisationId: string;
  workspaceId: string;
  configurationSetId: string;
  catalogueVersionId: string;
  catalogueId: string;
  catalogueVersion: string;
  catalogueDigest: string;
  policyVersion: string;
  confidenceVersion: string;
  gateEngineVersion: string;
  confidenceIndex: number;
  confidenceState: "low" | "moderate" | "high";
  limitationCodes: string[];
  caveat: string | null;
  confidenceTraceNodeId: string;
  inputHash: string;
  outputHash: string;
  canonicalInput: RecommendationConfidenceGateInput;
  canonicalGate: RecommendationConfidenceGateOutput;
  candidates: PersistedRecommendationConfidenceGateCandidate[];
  createdAt: string;
}
