import type { AssessmentAnalysisRun } from "../analysis/types";
import * as catalogueRepository from "../recommendation-catalogue/repository.server";
import type { CatalogueVersionRecord } from "../recommendation-catalogue/types";
import { semanticHash } from "../recommendation-evaluation/evaluator";
import * as priorityRepository from "../recommendation-priority/repository.server";
import { recommendationPriorityService } from "../recommendation-priority/service.server";
import type { RecommendationPriorityRecord } from "../recommendation-priority/types";
import * as resolutionRepository from "../recommendation-resolution/repository.server";
import type { RecommendationResolutionRecord } from "../recommendation-resolution/types";
import {
  buildRecommendationSequence,
  RECOMMENDATION_SEQUENCE_POLICY_VERSION,
  RecommendationSequenceCycleError,
  RecommendationSequenceError,
  sequenceOverrideRisks,
  type RecommendationDependencyInput,
} from "./model";
import * as repository from "./repository.server";
import type { RecommendationDependencyMappingRecord } from "./repository.server";
import type {
  RecommendationSequenceInput,
  RecommendationSequenceOverrideRecord,
  RecommendationSequenceRecord,
} from "./types";

export class RecommendationSequenceServiceError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export interface RecommendationSequenceRepository {
  getSequenceModel(
    priorityModelId: string,
    tenant: { organisationId: string; workspaceId: string },
    policyVersion?: string,
  ): Promise<RecommendationSequenceRecord | null>;
  getSequenceModelForRun(
    analysisRunId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationSequenceRecord | null>;
  getDependencyMappings(
    catalogueVersionId: string,
  ): Promise<RecommendationDependencyMappingRecord[]>;
  publishSequenceModel(input: Record<string, unknown>): Promise<RecommendationSequenceRecord>;
  setSequenceOverride(
    input: Record<string, unknown>,
  ): Promise<RecommendationSequenceOverrideRecord>;
}

export interface RecommendationSequenceDependencies {
  getPriorityModelForRun(
    analysisRunId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationPriorityRecord | null>;
  getResolutionForRun(
    analysisRunId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationResolutionRecord | null>;
  getCatalogueVersion(id: string): Promise<CatalogueVersionRecord | null>;
}

const defaultDependencies: RecommendationSequenceDependencies = {
  getPriorityModelForRun: priorityRepository.getPriorityModelForRun,
  getResolutionForRun: resolutionRepository.getResolutionForRun,
  getCatalogueVersion: catalogueRepository.getVersion,
};

function dependencyResolution(
  dependencyId: string,
  priorityIds: Set<string>,
  resolution: RecommendationResolutionRecord,
): Pick<RecommendationDependencyInput, "resolvedDependencyId" | "resolution"> {
  if (priorityIds.has(dependencyId)) {
    return { resolvedDependencyId: dependencyId, resolution: "direct" };
  }
  const seen = new Set<string>();
  let current = dependencyId;
  let mappedAs: "superseded" | "deduplicated" | null = null;
  while (!seen.has(current)) {
    seen.add(current);
    const candidate = resolution.candidates.find((item) => item.recommendationId === current);
    if (
      !candidate ||
      candidate.resolutionResult !== "suppressed" ||
      !candidate.winnerRecommendationId ||
      !["superseded", "deduplicated"].includes(candidate.reasonCode)
    ) {
      return { resolvedDependencyId: null, resolution: "unavailable" };
    }
    mappedAs = candidate.reasonCode as "superseded" | "deduplicated";
    current = candidate.winnerRecommendationId;
    if (priorityIds.has(current)) return { resolvedDependencyId: current, resolution: mappedAs };
  }
  throw new RecommendationSequenceError(`Dependency resolution cycle at ${dependencyId}`);
}

function validateMappings(
  catalogue: CatalogueVersionRecord,
  mappings: RecommendationDependencyMappingRecord[],
) {
  const expected = new Set(
    catalogue.snapshot.definitions.flatMap((definition) =>
      definition.dependencies.map((dependencyId) => `${definition.id}:${dependencyId}`),
    ),
  );
  const actual = new Set(mappings.map((item) => `${item.recommendationId}:${item.dependencyId}`));
  if (
    expected.size !== actual.size ||
    [...expected].some((key) => !actual.has(key)) ||
    mappings.some((item) => !["required", "recommended"].includes(item.dependencyType))
  ) {
    throw new RecommendationSequenceError(
      "Catalogue dependency mappings do not match the pinned catalogue snapshot",
    );
  }
}

export class RecommendationSequenceService {
  constructor(
    private readonly repo: RecommendationSequenceRepository = repository,
    private readonly deps: RecommendationSequenceDependencies = defaultDependencies,
  ) {}

  private tenant(run: AssessmentAnalysisRun) {
    return { organisationId: run.organisationId, workspaceId: run.workspaceId };
  }

  async sequence(run: AssessmentAnalysisRun) {
    if (run.status !== "completed") {
      throw new RecommendationSequenceServiceError(
        "RECOMMENDATION_SEQUENCE_INVALID",
        409,
        "Recommendation sequencing requires a completed analysis.",
      );
    }
    const tenant = this.tenant(run);
    const priority = await this.deps.getPriorityModelForRun(run.id, tenant);
    if (!priority) {
      throw new RecommendationSequenceServiceError(
        "RECOMMENDATION_SEQUENCE_INVALID",
        409,
        "The generated recommendation priority is unavailable.",
      );
    }
    const existing = await this.repo.getSequenceModel(
      priority.id,
      tenant,
      RECOMMENDATION_SEQUENCE_POLICY_VERSION,
    );
    if (existing) return { sequence: existing, reused: true } as const;

    const [resolution, catalogue, mappings] = await Promise.all([
      this.deps.getResolutionForRun(run.id, tenant),
      this.deps.getCatalogueVersion(priority.catalogueVersionId),
      this.repo.getDependencyMappings(priority.catalogueVersionId),
    ]);
    if (
      !resolution ||
      !catalogue ||
      priority.analysisRunId !== run.id ||
      priority.organisationId !== run.organisationId ||
      priority.workspaceId !== run.workspaceId ||
      priority.configurationSetId !== run.configurationSetId ||
      priority.conflictResolutionId !== resolution.id ||
      priority.catalogueVersionId !== catalogue.id ||
      priority.catalogueDigest !== catalogue.contentDigest ||
      resolution.catalogueVersionId !== catalogue.id ||
      catalogue.sourceConfigurationSetId !== run.configurationSetId
    ) {
      throw new RecommendationSequenceServiceError(
        "RECOMMENDATION_SEQUENCE_INVALID",
        422,
        "Recommendation sequence scope or pinned inputs are invalid.",
      );
    }

    try {
      validateMappings(catalogue, mappings);
      const priorityIds = new Set(priority.items.map((item) => item.recommendationId));
      const mappingsByRecommendation = new Map<string, RecommendationDependencyMappingRecord[]>();
      for (const mapping of mappings) {
        mappingsByRecommendation.set(mapping.recommendationId, [
          ...(mappingsByRecommendation.get(mapping.recommendationId) ?? []),
          mapping,
        ]);
      }
      const output = buildRecommendationSequence({
        candidates: priority.items.map((item) => ({
          priorityItemId: item.id,
          recommendationId: item.recommendationId,
          recommendationVersion: item.recommendationVersion,
          catalogueOrder: item.catalogueOrder,
          generatedRank: item.generatedRank,
          effort: item.effort,
          sourceTraceNodeIds: item.sourceTraceNodeIds,
          dependencies: (mappingsByRecommendation.get(item.recommendationId) ?? []).map(
            (mapping) => ({
              sourceDependencyId: mapping.dependencyId,
              dependencyType: mapping.dependencyType,
              ...dependencyResolution(mapping.dependencyId, priorityIds, resolution),
            }),
          ),
        })),
      });
      const items = await Promise.all(
        output.items.map(async (item) => ({ ...item, semanticHash: await semanticHash(item) })),
      );
      const dependencies = await Promise.all(
        output.dependencies.map(async (item) => ({
          ...item,
          semanticHash: await semanticHash(item),
        })),
      );
      const canonicalInput: RecommendationSequenceInput = {
        analysisRunId: run.id,
        priorityModelId: priority.id,
        priorityModelHash: priority.outputHash,
        conflictResolutionId: resolution.id,
        organisationId: run.organisationId,
        workspaceId: run.workspaceId,
        configurationSetId: run.configurationSetId,
        catalogueVersionId: catalogue.id,
        catalogueId: catalogue.catalogueId,
        catalogueVersion: catalogue.version,
        catalogueDigest: catalogue.contentDigest,
        policyVersion: output.policyVersion,
      };
      const canonicalSequence = { ...output, items, dependencies };
      const sequence = await this.repo.publishSequenceModel({
        analysis_run_id: run.id,
        priority_model_id: priority.id,
        conflict_resolution_id: resolution.id,
        organisation_id: run.organisationId,
        workspace_id: run.workspaceId,
        configuration_set_id: run.configurationSetId,
        catalogue_version_id: catalogue.id,
        catalogue_id: catalogue.catalogueId,
        catalogue_version: catalogue.version,
        catalogue_digest: catalogue.contentDigest,
        policy_version: output.policyVersion,
        engine_version: output.engineVersion,
        input_hash: await semanticHash(canonicalInput),
        output_hash: await semanticHash(canonicalSequence),
        canonical_input: canonicalInput,
        canonical_sequence: canonicalSequence,
        items,
        dependencies,
      });
      return { sequence, reused: false } as const;
    } catch (error) {
      if (error instanceof RecommendationSequenceCycleError) {
        throw new RecommendationSequenceServiceError(error.code, 422, error.message, {
          cycle: error.cycle,
        });
      }
      if (error instanceof RecommendationSequenceError) {
        throw new RecommendationSequenceServiceError(error.code, 422, error.message);
      }
      throw new RecommendationSequenceServiceError(
        "RECOMMENDATION_SEQUENCE_INVALID",
        500,
        "Recommendation sequencing failed safely.",
      );
    }
  }

  async ensure(run: AssessmentAnalysisRun) {
    await recommendationPriorityService.prioritise(run);
    return this.sequence(run);
  }

  async get(run: AssessmentAnalysisRun) {
    return this.repo.getSequenceModelForRun(run.id, this.tenant(run));
  }

  async setOverride(
    run: AssessmentAnalysisRun,
    input: {
      orderedRecommendationIds: string[];
      expectedVersion: number;
      idempotencyKey: string;
      reason: string;
      acknowledgedRisk: boolean;
      actorUserId: string;
    },
  ) {
    const sequence = await this.get(run);
    if (!sequence) {
      throw new RecommendationSequenceServiceError(
        "RECOMMENDATION_SEQUENCE_INVALID",
        409,
        "The generated recommendation sequence is unavailable.",
      );
    }
    const reason = input.reason.trim();
    if (
      !Number.isInteger(input.expectedVersion) ||
      input.expectedVersion < 0 ||
      input.idempotencyKey.length < 16 ||
      input.idempotencyKey.length > 160 ||
      !reason ||
      reason.length > 1000 ||
      input.acknowledgedRisk !== true
    ) {
      throw new RecommendationSequenceServiceError(
        "RECOMMENDATION_SEQUENCE_INVALID",
        400,
        "A complete sequence, reason, risk acknowledgement and valid version are required.",
      );
    }
    try {
      const risks = sequenceOverrideRisks(
        sequence.items,
        sequence.dependencies,
        input.orderedRecommendationIds,
      );
      const override = await this.repo.setSequenceOverride({
        sequence_model_id: sequence.id,
        organisation_id: run.organisationId,
        workspace_id: run.workspaceId,
        actor_user_id: input.actorUserId,
        expected_version: input.expectedVersion,
        idempotency_key: input.idempotencyKey,
        ordered_recommendation_ids: input.orderedRecommendationIds,
        reason,
        acknowledged_risk: true,
        dependency_risks: risks,
      });
      return { sequence: { ...sequence, override }, override };
    } catch (error) {
      if (error instanceof RecommendationSequenceError) {
        throw new RecommendationSequenceServiceError(error.code, 400, error.message);
      }
      const message = error instanceof Error ? error.message : "";
      if (message.includes("RECOMMENDATION_SEQUENCE_VERSION_CONFLICT")) {
        throw new RecommendationSequenceServiceError(
          "RECOMMENDATION_SEQUENCE_VERSION_CONFLICT",
          409,
          "The sequence override changed. Refresh and try again.",
        );
      }
      throw error;
    }
  }
}

export const recommendationSequenceService = new RecommendationSequenceService();
