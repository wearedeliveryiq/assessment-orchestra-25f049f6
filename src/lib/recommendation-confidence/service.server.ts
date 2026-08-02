import type { AssessmentAnalysisRun } from "../analysis/types";
import * as catalogueRepository from "../recommendation-catalogue/repository.server";
import type { CatalogueVersionRecord } from "../recommendation-catalogue/types";
import {
  getResult,
  type StoredIntelligenceResult,
} from "../delivery-intelligence/result-repository.server";
import { getTrace } from "../delivery-intelligence/trace-repository.server";
import type { TraceNode } from "../delivery-intelligence/traceability";
import * as evaluationRepository from "../recommendation-evaluation/repository.server";
import { semanticHash } from "../recommendation-evaluation/evaluator";
import type { RecommendationEvaluationRecord } from "../recommendation-evaluation/types";
import {
  applyRecommendationConfidenceGate,
  RECOMMENDATION_CONFIDENCE_GATE_ENGINE_VERSION,
  RECOMMENDATION_CONFIDENCE_GATE_POLICY_VERSION,
  RECOMMENDATION_CONFIDENCE_VERSION,
  RecommendationConfidenceGateError,
} from "./gate";
import * as repository from "./repository.server";
import type {
  RecommendationConfidenceGateInput,
  RecommendationConfidenceGateRecord,
} from "./types";

export class RecommendationConfidenceGateServiceError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface RecommendationConfidenceGateRepository {
  getConfidenceGate(
    recommendationEvaluationId: string,
    tenant: { organisationId: string; workspaceId: string },
    policyVersion?: string,
  ): Promise<RecommendationConfidenceGateRecord | null>;
  getConfidenceGateForRun(
    analysisRunId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationConfidenceGateRecord | null>;
  publishConfidenceGate(
    input: Record<string, unknown>,
  ): Promise<RecommendationConfidenceGateRecord>;
}

export interface RecommendationConfidenceGateDependencies {
  getEvaluation(
    analysisRunId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationEvaluationRecord | null>;
  getResult(
    analysisRunId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<StoredIntelligenceResult | null>;
  getCatalogueVersion(id: string): Promise<CatalogueVersionRecord | null>;
  getTrace(
    analysisRunId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<{ nodes: TraceNode[] }>;
}

const defaultDependencies: RecommendationConfidenceGateDependencies = {
  getEvaluation: evaluationRepository.getEvaluation,
  getResult,
  getCatalogueVersion: catalogueRepository.getVersion,
  getTrace,
};

export class RecommendationConfidenceGateService {
  constructor(
    private readonly repo: RecommendationConfidenceGateRepository = repository,
    private readonly deps: RecommendationConfidenceGateDependencies = defaultDependencies,
  ) {}

  private tenant(run: AssessmentAnalysisRun) {
    return { organisationId: run.organisationId, workspaceId: run.workspaceId };
  }

  async evaluate(run: AssessmentAnalysisRun) {
    if (run.status !== "completed") {
      throw new RecommendationConfidenceGateServiceError(
        "RECOMMENDATION_EVALUATION_INVALID",
        409,
        "Confidence gating requires a completed analysis.",
      );
    }
    const tenant = this.tenant(run);
    const evaluation = await this.deps.getEvaluation(run.id, tenant);
    if (!evaluation) {
      throw new RecommendationConfidenceGateServiceError(
        "RECOMMENDATION_EVALUATION_INVALID",
        409,
        "The base recommendation evaluation is unavailable.",
      );
    }
    const existing = await this.repo.getConfidenceGate(
      evaluation.id,
      tenant,
      RECOMMENDATION_CONFIDENCE_GATE_POLICY_VERSION,
    );
    if (existing) return { gate: existing, reused: true } as const;

    const [result, catalogue, trace] = await Promise.all([
      this.deps.getResult(run.id, tenant),
      this.deps.getCatalogueVersion(evaluation.catalogueVersionId),
      this.deps.getTrace(run.id, tenant),
    ]);
    if (!result || !catalogue) {
      throw new RecommendationConfidenceGateServiceError(
        "RECOMMENDATION_EVALUATION_INVALID",
        503,
        "The pinned intelligence result or catalogue is unavailable.",
      );
    }
    if (
      evaluation.analysisRunId !== run.id ||
      evaluation.organisationId !== run.organisationId ||
      evaluation.workspaceId !== run.workspaceId ||
      evaluation.intelligenceResultId !== result.id ||
      evaluation.catalogueVersionId !== catalogue.id ||
      evaluation.catalogueDigest !== catalogue.contentDigest ||
      evaluation.configurationSetId !== run.configurationSetId ||
      result.analysisRunId !== run.id ||
      result.organisationId !== run.organisationId ||
      result.workspaceId !== run.workspaceId
    ) {
      throw new RecommendationConfidenceGateServiceError(
        "RECOMMENDATION_EVALUATION_INVALID",
        422,
        "Recommendation confidence scope or pinned inputs are invalid.",
      );
    }

    const confidenceNodes = trace.nodes.filter(
      (node) =>
        node.domainId === "confidence" &&
        node.nodeType === "confidence_result" &&
        node.analysisRunId === run.id &&
        node.tenantId === run.organisationId &&
        node.workspaceId === run.workspaceId,
    );
    if (confidenceNodes.length !== 1) {
      throw new RecommendationConfidenceGateServiceError(
        "RECOMMENDATION_EVALUATION_INVALID",
        422,
        "The confidence lineage node is unavailable or ambiguous.",
      );
    }

    try {
      const confidence = result.canonicalResult.confidence.result;
      const confidenceTraceNodeId = confidenceNodes[0].id;
      const candidateByRecommendationId = new Map(
        evaluation.candidates.map((candidate) => [candidate.recommendationId, candidate]),
      );
      const output = applyRecommendationConfidenceGate({
        analysisConfidence: confidence.index,
        limitationCodes: confidence.limitations,
        definitions: catalogue.snapshot.definitions,
        candidates: evaluation.candidates.map((candidate) => ({
          ...candidate,
          sourceTraceNodeIds: [
            ...new Set([...candidate.sourceTraceNodeIds, confidenceTraceNodeId]),
          ].sort(),
        })),
      });
      const candidates = await Promise.all(
        output.candidates.map(async (candidate) => {
          const evaluated = candidateByRecommendationId.get(candidate.recommendationId);
          if (!evaluated || evaluated.result !== "eligible") {
            throw new RecommendationConfidenceGateError(
              `Missing eligible base evaluation for ${candidate.recommendationId}`,
            );
          }
          return {
            ...candidate,
            candidateEvaluationId: evaluated.id,
            recommendationDefinitionId: evaluated.recommendationDefinitionId,
            semanticHash: await semanticHash(candidate),
          };
        }),
      );
      const canonicalInput: RecommendationConfidenceGateInput = {
        analysisRunId: run.id,
        intelligenceResultId: result.id,
        intelligenceResultHash: result.resultHash,
        recommendationEvaluationId: evaluation.id,
        recommendationEvaluationHash: evaluation.outputHash,
        organisationId: run.organisationId,
        workspaceId: run.workspaceId,
        configurationSetId: run.configurationSetId,
        catalogueVersionId: catalogue.id,
        catalogueId: catalogue.catalogueId,
        catalogueVersion: catalogue.version,
        catalogueDigest: catalogue.contentDigest,
        policyVersion: RECOMMENDATION_CONFIDENCE_GATE_POLICY_VERSION,
        confidenceVersion: RECOMMENDATION_CONFIDENCE_VERSION,
        analysisConfidence: confidence.index,
        confidenceState: output.confidence.state,
        limitationCodes: output.confidence.limitationCodes,
        confidenceTraceNodeId,
      };
      const canonicalGate = { ...output, candidates };
      const gate = await this.repo.publishConfidenceGate({
        recommendation_evaluation_id: evaluation.id,
        analysis_run_id: run.id,
        intelligence_result_id: result.id,
        organisation_id: run.organisationId,
        workspace_id: run.workspaceId,
        configuration_set_id: run.configurationSetId,
        catalogue_version_id: catalogue.id,
        catalogue_id: catalogue.catalogueId,
        catalogue_version: catalogue.version,
        catalogue_digest: catalogue.contentDigest,
        policy_version: RECOMMENDATION_CONFIDENCE_GATE_POLICY_VERSION,
        confidence_version: RECOMMENDATION_CONFIDENCE_VERSION,
        gate_engine_version: RECOMMENDATION_CONFIDENCE_GATE_ENGINE_VERSION,
        confidence_index: confidence.index,
        confidence_state: output.confidence.state,
        limitation_codes: output.confidence.limitationCodes,
        caveat: output.confidence.caveat,
        confidence_trace_node_id: confidenceTraceNodeId,
        input_hash: await semanticHash(canonicalInput),
        output_hash: await semanticHash(canonicalGate),
        canonical_input: canonicalInput,
        canonical_gate: canonicalGate,
        candidates,
      });
      return { gate, reused: false } as const;
    } catch (error) {
      if (error instanceof RecommendationConfidenceGateServiceError) throw error;
      if (error instanceof RecommendationConfidenceGateError) {
        throw new RecommendationConfidenceGateServiceError(error.code, 422, error.message);
      }
      throw new RecommendationConfidenceGateServiceError(
        "RECOMMENDATION_EVALUATION_INVALID",
        500,
        "Recommendation confidence gating failed safely.",
      );
    }
  }

  async get(run: AssessmentAnalysisRun) {
    return this.repo.getConfidenceGateForRun(run.id, this.tenant(run));
  }
}

export const recommendationConfidenceGateService = new RecommendationConfidenceGateService();
