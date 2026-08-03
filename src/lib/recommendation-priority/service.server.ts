import type { AssessmentAnalysisRun } from "../analysis/types";
import * as catalogueRepository from "../recommendation-catalogue/repository.server";
import type { CatalogueVersionRecord } from "../recommendation-catalogue/types";
import * as confidenceRepository from "../recommendation-confidence/repository.server";
import type { RecommendationConfidenceGateRecord } from "../recommendation-confidence/types";
import {
  getResult,
  type StoredIntelligenceResult,
} from "../delivery-intelligence/result-repository.server";
import { semanticHash } from "../recommendation-evaluation/evaluator";
import * as resolutionRepository from "../recommendation-resolution/repository.server";
import type { RecommendationResolutionRecord } from "../recommendation-resolution/types";
import {
  applyDisplayOrderPreference,
  buildRecommendationPriority,
  RECOMMENDATION_PRIORITY_POLICY_VERSION,
  RecommendationPriorityError,
} from "./model";
import * as repository from "./repository.server";
import type {
  RecommendationPriorityInput,
  RecommendationPriorityPreferenceRecord,
  RecommendationPriorityRecord,
} from "./types";

export class RecommendationPriorityServiceError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface RecommendationPriorityRepository {
  getPriorityModel(
    conflictResolutionId: string,
    tenant: { organisationId: string; workspaceId: string },
    policyVersion?: string,
  ): Promise<RecommendationPriorityRecord | null>;
  getPriorityModelForRun(
    analysisRunId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationPriorityRecord | null>;
  publishPriorityModel(input: Record<string, unknown>): Promise<RecommendationPriorityRecord>;
  setDisplayPreference(
    input: Record<string, unknown>,
  ): Promise<RecommendationPriorityPreferenceRecord>;
}

export interface RecommendationPriorityDependencies {
  getResolutionForRun(
    analysisRunId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationResolutionRecord | null>;
  getConfidenceGateForRun(
    analysisRunId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationConfidenceGateRecord | null>;
  getResult(
    analysisRunId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<StoredIntelligenceResult | null>;
  getCatalogueVersion(id: string): Promise<CatalogueVersionRecord | null>;
}

const defaultDependencies: RecommendationPriorityDependencies = {
  getResolutionForRun: resolutionRepository.getResolutionForRun,
  getConfidenceGateForRun: confidenceRepository.getConfidenceGateForRun,
  getResult,
  getCatalogueVersion: catalogueRepository.getVersion,
};

export class RecommendationPriorityService {
  constructor(
    private readonly repo: RecommendationPriorityRepository = repository,
    private readonly deps: RecommendationPriorityDependencies = defaultDependencies,
  ) {}

  private tenant(run: AssessmentAnalysisRun) {
    return { organisationId: run.organisationId, workspaceId: run.workspaceId };
  }

  async prioritise(run: AssessmentAnalysisRun) {
    if (run.status !== "completed") {
      throw new RecommendationPriorityServiceError(
        "RECOMMENDATION_PRIORITY_INVALID",
        409,
        "Recommendation prioritisation requires a completed analysis.",
      );
    }
    const tenant = this.tenant(run);
    const resolution = await this.deps.getResolutionForRun(run.id, tenant);
    if (!resolution) {
      throw new RecommendationPriorityServiceError(
        "RECOMMENDATION_PRIORITY_INVALID",
        409,
        "The resolved recommendation set is unavailable.",
      );
    }
    const existing = await this.repo.getPriorityModel(
      resolution.id,
      tenant,
      RECOMMENDATION_PRIORITY_POLICY_VERSION,
    );
    if (existing) return { priority: existing, reused: true } as const;

    const [gate, result, catalogue] = await Promise.all([
      this.deps.getConfidenceGateForRun(run.id, tenant),
      this.deps.getResult(run.id, tenant),
      this.deps.getCatalogueVersion(resolution.catalogueVersionId),
    ]);
    if (
      !gate ||
      !result ||
      !catalogue ||
      resolution.analysisRunId !== run.id ||
      resolution.organisationId !== run.organisationId ||
      resolution.workspaceId !== run.workspaceId ||
      resolution.confidenceGateId !== gate.id ||
      resolution.recommendationEvaluationId !== gate.recommendationEvaluationId ||
      resolution.catalogueVersionId !== catalogue.id ||
      resolution.catalogueDigest !== catalogue.contentDigest ||
      result.analysisRunId !== run.id ||
      result.organisationId !== run.organisationId ||
      result.workspaceId !== run.workspaceId ||
      gate.organisationId !== run.organisationId ||
      gate.workspaceId !== run.workspaceId ||
      gate.configurationSetId !== run.configurationSetId ||
      catalogue.sourceConfigurationSetId !== run.configurationSetId
    ) {
      throw new RecommendationPriorityServiceError(
        "RECOMMENDATION_PRIORITY_INVALID",
        422,
        "Recommendation priority scope or pinned inputs are invalid.",
      );
    }

    try {
      const gateById = new Map(gate.candidates.map((candidate) => [candidate.id, candidate]));
      const sourceRankById = new Map(
        result.canonicalResult.recommendations.ranked.map((item) => [item.id, item]),
      );
      const canonicalCandidates = resolution.candidates.filter(
        (candidate) => candidate.resolutionResult === "canonical",
      );
      const output = buildRecommendationPriority({
        snapshot: catalogue.snapshot,
        analysisConfidence: gate.confidenceIndex,
        candidates: canonicalCandidates.map((candidate) => {
          const sourceRecommendationIds = candidate.sourceCandidateGateIds.map((id) => {
            const source = gateById.get(id);
            if (
              !source ||
              source.confidenceGateId !== gate.id ||
              source.postGateResult === "withheld"
            ) {
              throw new RecommendationPriorityError(
                `Priority source ${id} is unavailable or outside the confidence gate`,
              );
            }
            return source.recommendationId;
          });
          const sourceRanks = sourceRecommendationIds.map((id) => {
            const source = sourceRankById.get(id);
            if (!source) {
              throw new RecommendationPriorityError(`Locked rank input for ${id} is unavailable`);
            }
            return {
              recommendationId: id,
              rankScore: source.rankScore,
              impactBand: source.impact,
              effortBand: source.effort,
              impact: source.impactValue,
              urgency: source.urgency,
              confidence: gate.confidenceIndex,
              effortEase: source.effortEase,
              dependencyReadiness: source.dependencyReadiness,
            };
          });
          return {
            resolutionCandidateId: candidate.id,
            recommendationDefinitionId: candidate.recommendationDefinitionId,
            recommendationId: candidate.recommendationId,
            recommendationVersion: candidate.recommendationVersion,
            catalogueOrder: candidate.catalogueOrder,
            postConfidenceResult: candidate.postConfidenceResult,
            sourceRecommendationIds,
            sourceTraceNodeIds: candidate.sourceTraceNodeIds,
            sourceRanks,
          };
        }),
      });
      const items = await Promise.all(
        output.items.map(async (item) => ({ ...item, semanticHash: await semanticHash(item) })),
      );
      const canonicalInput: RecommendationPriorityInput = {
        analysisRunId: run.id,
        intelligenceResultId: result.id,
        intelligenceResultHash: result.resultHash,
        recommendationEvaluationId: resolution.recommendationEvaluationId,
        confidenceGateId: gate.id,
        conflictResolutionId: resolution.id,
        conflictResolutionHash: resolution.outputHash,
        organisationId: run.organisationId,
        workspaceId: run.workspaceId,
        configurationSetId: run.configurationSetId,
        catalogueVersionId: catalogue.id,
        catalogueId: catalogue.catalogueId,
        catalogueVersion: catalogue.version,
        catalogueDigest: catalogue.contentDigest,
        policyVersion: RECOMMENDATION_PRIORITY_POLICY_VERSION,
        analysisConfidence: gate.confidenceIndex,
      };
      const canonicalPriority = { ...output, items };
      const priority = await this.repo.publishPriorityModel({
        analysis_run_id: run.id,
        intelligence_result_id: result.id,
        recommendation_evaluation_id: resolution.recommendationEvaluationId,
        confidence_gate_id: gate.id,
        conflict_resolution_id: resolution.id,
        organisation_id: run.organisationId,
        workspace_id: run.workspaceId,
        configuration_set_id: run.configurationSetId,
        catalogue_version_id: catalogue.id,
        catalogue_id: catalogue.catalogueId,
        catalogue_version: catalogue.version,
        catalogue_digest: catalogue.contentDigest,
        policy_version: output.policyVersion,
        model_version: output.modelVersion,
        input_hash: await semanticHash(canonicalInput),
        output_hash: await semanticHash(canonicalPriority),
        canonical_input: canonicalInput,
        canonical_priority: canonicalPriority,
        items,
      });
      return { priority, reused: false } as const;
    } catch (error) {
      if (error instanceof RecommendationPriorityServiceError) throw error;
      if (error instanceof RecommendationPriorityError) {
        throw new RecommendationPriorityServiceError(error.code, 422, error.message);
      }
      throw new RecommendationPriorityServiceError(
        "RECOMMENDATION_PRIORITY_INVALID",
        500,
        "Recommendation prioritisation failed safely.",
      );
    }
  }

  async get(run: AssessmentAnalysisRun) {
    return this.repo.getPriorityModelForRun(run.id, this.tenant(run));
  }

  async setDisplayPreference(
    run: AssessmentAnalysisRun,
    input: {
      orderedRecommendationIds: string[];
      expectedVersion: number;
      idempotencyKey: string;
      actorUserId: string;
    },
  ) {
    const priority = await this.get(run);
    if (!priority) {
      throw new RecommendationPriorityServiceError(
        "RECOMMENDATION_PRIORITY_INVALID",
        409,
        "The generated recommendation priority is unavailable.",
      );
    }
    if (
      !Number.isInteger(input.expectedVersion) ||
      input.expectedVersion < 0 ||
      input.idempotencyKey.length < 16 ||
      input.idempotencyKey.length > 160
    ) {
      throw new RecommendationPriorityServiceError(
        "RECOMMENDATION_PRIORITY_INVALID",
        400,
        "A valid expected version and idempotency key are required.",
      );
    }
    try {
      applyDisplayOrderPreference(priority.items, input.orderedRecommendationIds);
      const preference = await this.repo.setDisplayPreference({
        priority_model_id: priority.id,
        organisation_id: run.organisationId,
        workspace_id: run.workspaceId,
        actor_user_id: input.actorUserId,
        expected_version: input.expectedVersion,
        idempotency_key: input.idempotencyKey,
        ordered_recommendation_ids: input.orderedRecommendationIds,
      });
      return {
        priority: { ...priority, preference },
        preference,
      };
    } catch (error) {
      if (error instanceof RecommendationPriorityError) {
        throw new RecommendationPriorityServiceError(error.code, 400, error.message);
      }
      const message = error instanceof Error ? error.message : "";
      if (message.includes("RECOMMENDATION_PRIORITY_VERSION_CONFLICT")) {
        throw new RecommendationPriorityServiceError(
          "RECOMMENDATION_PRIORITY_VERSION_CONFLICT",
          409,
          "The display preference changed. Refresh and try again.",
        );
      }
      throw error;
    }
  }
}

export const recommendationPriorityService = new RecommendationPriorityService();
