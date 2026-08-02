import type { AssessmentAnalysisRun } from "../analysis/types";
import type { CatalogueVersionRecord } from "../recommendation-catalogue/types";
import * as catalogueRepository from "../recommendation-catalogue/repository.server";
import {
  getResult,
  type StoredIntelligenceResult,
} from "../delivery-intelligence/result-repository.server";
import { getTrace } from "../delivery-intelligence/trace-repository.server";
import type { TraceNode } from "../delivery-intelligence/traceability";
import { RecommendationEvaluationError } from "../recommendations/eligibility";
import { evaluatePinnedCatalogue, semanticHash } from "./evaluator";
import * as repository from "./repository.server";
import {
  RECOMMENDATION_EVALUATION_ENGINE_VERSION,
  RECOMMENDATION_EVALUATION_POLICY_VERSION,
  type RecommendationEvaluationRecord,
} from "./types";

export class RecommendationEvaluationServiceError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface RecommendationEvaluationRepository {
  getEvaluation(
    analysisRunId: string,
    tenant: { organisationId: string; workspaceId: string },
    catalogueVersionId?: string,
  ): Promise<RecommendationEvaluationRecord | null>;
  publishEvaluation(input: Record<string, unknown>): Promise<RecommendationEvaluationRecord>;
}

export interface RecommendationEvaluationDependencies {
  getActiveCatalogue(environment?: string): Promise<CatalogueVersionRecord | null>;
  getResult(
    analysisRunId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<StoredIntelligenceResult | null>;
  getTrace(
    analysisRunId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<{ nodes: TraceNode[] }>;
}

const defaultDependencies: RecommendationEvaluationDependencies = {
  getActiveCatalogue: catalogueRepository.getActiveVersion,
  getResult,
  getTrace,
};

export class RecommendationEvaluationService {
  constructor(
    private readonly repo: RecommendationEvaluationRepository = repository,
    private readonly deps: RecommendationEvaluationDependencies = defaultDependencies,
  ) {}

  private tenant(run: AssessmentAnalysisRun) {
    return { organisationId: run.organisationId, workspaceId: run.workspaceId };
  }

  async evaluate(run: AssessmentAnalysisRun) {
    if (run.status !== "completed") {
      throw new RecommendationEvaluationServiceError(
        "RECOMMENDATION_EVALUATION_INVALID",
        409,
        "Recommendation evaluation requires a completed analysis.",
      );
    }
    const tenant = this.tenant(run);
    const [catalogue, result, trace] = await Promise.all([
      this.deps.getActiveCatalogue("production"),
      this.deps.getResult(run.id, tenant),
      this.deps.getTrace(run.id, tenant),
    ]);
    if (!catalogue || catalogue.state !== "active" || !result) {
      throw new RecommendationEvaluationServiceError(
        "RECOMMENDATION_EVALUATION_INVALID",
        503,
        "The active recommendation catalogue or intelligence result is unavailable.",
      );
    }
    if (
      catalogue.sourceConfigurationSetId !== run.configurationSetId ||
      result.organisationId !== run.organisationId ||
      result.workspaceId !== run.workspaceId ||
      result.analysisRunId !== run.id
    ) {
      throw new RecommendationEvaluationServiceError(
        "RECOMMENDATION_EVALUATION_INVALID",
        422,
        "Recommendation evaluation scope or configuration is invalid.",
      );
    }
    const existing = await this.repo.getEvaluation(run.id, tenant, catalogue.id);
    if (existing) return { evaluation: existing, reused: true } as const;

    try {
      const core = result.canonicalResult;
      const signals = {
        opportunities: core.findings.priorityOpportunities,
        patterns: core.patterns.detected.map((item) => item.id),
        analysisConfidence: core.confidence.result.index,
      };
      const evaluated = evaluatePinnedCatalogue(catalogue.snapshot, signals);
      const nodeByDomain = new Map(trace.nodes.map((node) => [node.domainId, node]));
      const candidates = await Promise.all(
        evaluated.candidates.map(async (candidate) => {
          const nodes = candidate.sourceDomainIds.map((id) => nodeByDomain.get(id));
          if (
            nodes.some(
              (node) =>
                !node ||
                node.analysisRunId !== run.id ||
                node.tenantId !== run.organisationId ||
                node.workspaceId !== run.workspaceId,
            )
          ) {
            throw new RecommendationEvaluationError(
              `Missing or cross-scope trace for ${candidate.recommendationId}`,
            );
          }
          return {
            ...candidate,
            sourceTraceNodeIds: nodes.map((node) => node!.id).sort(),
            semanticHash: await semanticHash(candidate),
          };
        }),
      );
      const canonicalInput = {
        analysisRunId: run.id,
        intelligenceResultId: result.id,
        intelligenceResultHash: result.resultHash,
        organisationId: run.organisationId,
        workspaceId: run.workspaceId,
        configurationSetId: run.configurationSetId,
        catalogueVersionId: catalogue.id,
        catalogueId: catalogue.catalogueId,
        catalogueVersion: catalogue.version,
        catalogueDigest: catalogue.contentDigest,
        policyVersion: RECOMMENDATION_EVALUATION_POLICY_VERSION,
        opportunities: [...signals.opportunities].sort(),
        patterns: [...signals.patterns].sort(),
        analysisConfidence: signals.analysisConfidence,
      };
      const output = { ...evaluated, candidates };
      const evaluation = await this.repo.publishEvaluation({
        analysis_run_id: run.id,
        intelligence_result_id: result.id,
        organisation_id: run.organisationId,
        workspace_id: run.workspaceId,
        configuration_set_id: run.configurationSetId,
        catalogue_version_id: catalogue.id,
        catalogue_id: catalogue.catalogueId,
        catalogue_version: catalogue.version,
        catalogue_digest: catalogue.contentDigest,
        policy_version: RECOMMENDATION_EVALUATION_POLICY_VERSION,
        evaluator_version: RECOMMENDATION_EVALUATION_ENGINE_VERSION,
        input_hash: await semanticHash(canonicalInput),
        output_hash: await semanticHash(output),
        canonical_input: canonicalInput,
        canonical_evaluation: output,
        candidates,
      });
      return { evaluation, reused: false } as const;
    } catch (error) {
      if (error instanceof RecommendationEvaluationServiceError) throw error;
      if (error instanceof RecommendationEvaluationError) {
        throw new RecommendationEvaluationServiceError(error.code, 422, error.message);
      }
      throw new RecommendationEvaluationServiceError(
        "RECOMMENDATION_EVALUATION_INVALID",
        500,
        "Recommendation evaluation failed safely.",
      );
    }
  }

  async get(run: AssessmentAnalysisRun) {
    return this.repo.getEvaluation(run.id, this.tenant(run));
  }
}

export const recommendationEvaluationService = new RecommendationEvaluationService();
