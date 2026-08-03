import type { AssessmentAnalysisRun } from "../analysis/types";
import * as catalogueRepository from "../recommendation-catalogue/repository.server";
import type { CatalogueVersionRecord } from "../recommendation-catalogue/types";
import * as confidenceRepository from "../recommendation-confidence/repository.server";
import { semanticHash } from "../recommendation-evaluation/evaluator";
import type { RecommendationConfidenceGateRecord } from "../recommendation-confidence/types";
import * as repository from "./repository.server";
import {
  RECOMMENDATION_RESOLUTION_POLICY_VERSION,
  resolveRecommendationConflicts,
  RecommendationResolutionError,
} from "./resolver";
import type { RecommendationResolutionInput, RecommendationResolutionRecord } from "./types";

export class RecommendationResolutionServiceError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface RecommendationResolutionRepository {
  getResolution(
    confidenceGateId: string,
    tenant: { organisationId: string; workspaceId: string },
    policyVersion?: string,
  ): Promise<RecommendationResolutionRecord | null>;
  getResolutionForRun(
    analysisRunId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationResolutionRecord | null>;
  publishResolution(input: Record<string, unknown>): Promise<RecommendationResolutionRecord>;
}

export interface RecommendationResolutionDependencies {
  getConfidenceGateForRun(
    analysisRunId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationConfidenceGateRecord | null>;
  getCatalogueVersion(id: string): Promise<CatalogueVersionRecord | null>;
}

const defaultDependencies: RecommendationResolutionDependencies = {
  getConfidenceGateForRun: confidenceRepository.getConfidenceGateForRun,
  getCatalogueVersion: catalogueRepository.getVersion,
};

export class RecommendationResolutionService {
  constructor(
    private readonly repo: RecommendationResolutionRepository = repository,
    private readonly deps: RecommendationResolutionDependencies = defaultDependencies,
  ) {}

  private tenant(run: AssessmentAnalysisRun) {
    return { organisationId: run.organisationId, workspaceId: run.workspaceId };
  }

  async resolve(run: AssessmentAnalysisRun) {
    if (run.status !== "completed") {
      throw new RecommendationResolutionServiceError(
        "RECOMMENDATION_RESOLUTION_INVALID",
        409,
        "Conflict resolution requires a completed analysis.",
      );
    }
    const tenant = this.tenant(run);
    const gate = await this.deps.getConfidenceGateForRun(run.id, tenant);
    if (!gate) {
      throw new RecommendationResolutionServiceError(
        "RECOMMENDATION_RESOLUTION_INVALID",
        409,
        "The confidence-gated recommendation set is unavailable.",
      );
    }
    const existing = await this.repo.getResolution(
      gate.id,
      tenant,
      RECOMMENDATION_RESOLUTION_POLICY_VERSION,
    );
    if (existing) return { resolution: existing, reused: true } as const;

    const catalogue = await this.deps.getCatalogueVersion(gate.catalogueVersionId);
    if (
      !catalogue ||
      gate.analysisRunId !== run.id ||
      gate.organisationId !== run.organisationId ||
      gate.workspaceId !== run.workspaceId ||
      gate.configurationSetId !== run.configurationSetId ||
      gate.catalogueVersionId !== catalogue.id ||
      gate.catalogueId !== catalogue.catalogueId ||
      gate.catalogueVersion !== catalogue.version ||
      gate.catalogueDigest !== catalogue.contentDigest
    ) {
      throw new RecommendationResolutionServiceError(
        "RECOMMENDATION_RESOLUTION_INVALID",
        422,
        "Recommendation resolution scope or pinned inputs are invalid.",
      );
    }

    try {
      const visibleCandidates = gate.candidates.filter(
        (
          candidate,
        ): candidate is typeof candidate & {
          postGateResult: "presented" | "evidence_first";
        } => candidate.postGateResult !== "withheld",
      );
      const output = resolveRecommendationConflicts({
        snapshot: catalogue.snapshot,
        candidates: visibleCandidates.map((candidate) => ({
          candidateConfidenceGateId: candidate.id,
          recommendationDefinitionId: candidate.recommendationDefinitionId,
          recommendationId: candidate.recommendationId,
          recommendationVersion: candidate.recommendationVersion,
          catalogueOrder: candidate.catalogueOrder,
          postConfidenceResult: candidate.postGateResult,
          sourceTraceNodeIds: candidate.sourceTraceNodeIds,
        })),
      });
      const candidates = await Promise.all(
        output.candidates.map(async (candidate) => ({
          ...candidate,
          semanticHash: await semanticHash(candidate),
        })),
      );
      const canonicalInput: RecommendationResolutionInput = {
        analysisRunId: run.id,
        recommendationEvaluationId: gate.recommendationEvaluationId,
        confidenceGateId: gate.id,
        confidenceGateHash: gate.outputHash,
        organisationId: run.organisationId,
        workspaceId: run.workspaceId,
        configurationSetId: run.configurationSetId,
        catalogueVersionId: catalogue.id,
        catalogueId: catalogue.catalogueId,
        catalogueVersion: catalogue.version,
        catalogueDigest: catalogue.contentDigest,
        policyVersion: RECOMMENDATION_RESOLUTION_POLICY_VERSION,
      };
      const canonicalResolution = { ...output, candidates };
      const resolution = await this.repo.publishResolution({
        analysis_run_id: run.id,
        recommendation_evaluation_id: gate.recommendationEvaluationId,
        confidence_gate_id: gate.id,
        organisation_id: run.organisationId,
        workspace_id: run.workspaceId,
        configuration_set_id: run.configurationSetId,
        catalogue_version_id: catalogue.id,
        catalogue_id: catalogue.catalogueId,
        catalogue_version: catalogue.version,
        catalogue_digest: catalogue.contentDigest,
        policy_version: output.policyVersion,
        resolver_version: output.resolverVersion,
        input_hash: await semanticHash(canonicalInput),
        output_hash: await semanticHash(canonicalResolution),
        canonical_input: canonicalInput,
        canonical_resolution: canonicalResolution,
        candidates,
      });
      return { resolution, reused: false } as const;
    } catch (error) {
      if (error instanceof RecommendationResolutionServiceError) throw error;
      if (error instanceof RecommendationResolutionError) {
        throw new RecommendationResolutionServiceError(error.code, 422, error.message);
      }
      throw new RecommendationResolutionServiceError(
        "RECOMMENDATION_RESOLUTION_INVALID",
        500,
        "Recommendation conflict resolution failed safely.",
      );
    }
  }

  async get(run: AssessmentAnalysisRun) {
    return this.repo.getResolutionForRun(run.id, this.tenant(run));
  }
}

export const recommendationResolutionService = new RecommendationResolutionService();
