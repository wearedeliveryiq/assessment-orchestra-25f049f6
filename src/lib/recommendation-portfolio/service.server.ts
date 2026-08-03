import type { AssessmentAnalysisRun } from "../analysis/types";
import * as catalogueRepository from "../recommendation-catalogue/repository.server";
import type { CatalogueVersionRecord } from "../recommendation-catalogue/types";
import * as confidenceRepository from "../recommendation-confidence/repository.server";
import type { RecommendationConfidenceGateRecord } from "../recommendation-confidence/types";
import * as evaluationRepository from "../recommendation-evaluation/repository.server";
import { semanticHash } from "../recommendation-evaluation/evaluator";
import type { RecommendationEvaluationRecord } from "../recommendation-evaluation/types";
import * as priorityRepository from "../recommendation-priority/repository.server";
import type { RecommendationPriorityRecord } from "../recommendation-priority/types";
import * as sequenceRepository from "../recommendation-sequencing/repository.server";
import { recommendationSequenceService } from "../recommendation-sequencing/service.server";
import type { RecommendationSequenceRecord } from "../recommendation-sequencing/types";
import {
  buildRecommendationPortfolio,
  RECOMMENDATION_PORTFOLIO_POLICY_VERSION,
  RecommendationPortfolioError,
  type RecommendationPortfolioCandidateInput,
} from "./model";
import * as repository from "./repository.server";
import type { RecommendationPortfolioInput, RecommendationPortfolioRecord } from "./types";

export class RecommendationPortfolioServiceError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface RecommendationPortfolioRepository {
  getPortfolio(
    sequenceModelId: string,
    tenant: { organisationId: string; workspaceId: string },
    policyVersion?: string,
  ): Promise<RecommendationPortfolioRecord | null>;
  getPortfolioForRun(
    analysisRunId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationPortfolioRecord | null>;
  getPortfolioById(
    portfolioId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationPortfolioRecord | null>;
  publishPortfolio(input: Record<string, unknown>): Promise<RecommendationPortfolioRecord>;
}

export interface RecommendationPortfolioDependencies {
  getPriorityModelForRun(
    analysisRunId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationPriorityRecord | null>;
  getSequenceModelForRun(
    analysisRunId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationSequenceRecord | null>;
  getEvaluation(
    analysisRunId: string,
    tenant: { organisationId: string; workspaceId: string },
    catalogueVersionId?: string,
  ): Promise<RecommendationEvaluationRecord | null>;
  getConfidenceGateForRun(
    analysisRunId: string,
    tenant: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationConfidenceGateRecord | null>;
  getCatalogueVersion(id: string): Promise<CatalogueVersionRecord | null>;
}

const defaultDependencies: RecommendationPortfolioDependencies = {
  getPriorityModelForRun: priorityRepository.getPriorityModelForRun,
  getSequenceModelForRun: sequenceRepository.getSequenceModelForRun,
  getEvaluation: evaluationRepository.getEvaluation,
  getConfidenceGateForRun: confidenceRepository.getConfidenceGateForRun,
  getCatalogueVersion: catalogueRepository.getVersion,
};

function sameStrings(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const sortedRight = [...right].sort();
  return [...left].sort().every((value, index) => value === sortedRight[index]);
}

export class RecommendationPortfolioService {
  constructor(
    private readonly repo: RecommendationPortfolioRepository = repository,
    private readonly deps: RecommendationPortfolioDependencies = defaultDependencies,
  ) {}

  private tenant(run: AssessmentAnalysisRun) {
    return { organisationId: run.organisationId, workspaceId: run.workspaceId };
  }

  async publish(run: AssessmentAnalysisRun) {
    if (run.status !== "completed") {
      throw new RecommendationPortfolioServiceError(
        "PORTFOLIO_PUBLICATION_FAILED",
        409,
        "Recommendation portfolio publication requires a completed analysis.",
      );
    }
    const tenant = this.tenant(run);
    const [priority, sequence] = await Promise.all([
      this.deps.getPriorityModelForRun(run.id, tenant),
      this.deps.getSequenceModelForRun(run.id, tenant),
    ]);
    if (!priority || !sequence) {
      throw new RecommendationPortfolioServiceError(
        "PORTFOLIO_PUBLICATION_FAILED",
        409,
        "The generated recommendation priority or sequence is unavailable.",
      );
    }
    const existing = await this.repo.getPortfolio(
      sequence.id,
      tenant,
      RECOMMENDATION_PORTFOLIO_POLICY_VERSION,
    );
    if (existing) return { portfolio: existing, reused: true } as const;

    const [evaluation, gate, catalogue] = await Promise.all([
      this.deps.getEvaluation(run.id, tenant, priority.catalogueVersionId),
      this.deps.getConfidenceGateForRun(run.id, tenant),
      this.deps.getCatalogueVersion(priority.catalogueVersionId),
    ]);
    if (
      !evaluation ||
      !gate ||
      !catalogue ||
      priority.analysisRunId !== run.id ||
      sequence.analysisRunId !== run.id ||
      sequence.priorityModelId !== priority.id ||
      priority.recommendationEvaluationId !== evaluation.id ||
      priority.confidenceGateId !== gate.id ||
      priority.conflictResolutionId !== sequence.conflictResolutionId ||
      evaluation.catalogueVersionId !== catalogue.id ||
      gate.catalogueVersionId !== catalogue.id ||
      priority.catalogueVersionId !== catalogue.id ||
      sequence.catalogueVersionId !== catalogue.id ||
      evaluation.catalogueDigest !== catalogue.contentDigest ||
      gate.catalogueDigest !== catalogue.contentDigest ||
      priority.catalogueDigest !== catalogue.contentDigest ||
      sequence.catalogueDigest !== catalogue.contentDigest ||
      [evaluation, gate, priority, sequence].some(
        (record) =>
          record.organisationId !== run.organisationId ||
          record.workspaceId !== run.workspaceId ||
          record.configurationSetId !== run.configurationSetId,
      ) ||
      catalogue.sourceConfigurationSetId !== run.configurationSetId
    ) {
      throw new RecommendationPortfolioServiceError(
        "PORTFOLIO_PUBLICATION_FAILED",
        422,
        "Recommendation portfolio scope or pinned inputs are invalid.",
      );
    }

    try {
      const priorityById = new Map(priority.items.map((item) => [item.recommendationId, item]));
      const evaluationById = new Map(
        evaluation.candidates.map((item) => [item.recommendationId, item]),
      );
      const definitionById = new Map(catalogue.snapshot.definitions.map((item) => [item.id, item]));
      if (
        sequence.items.length !== priority.items.length ||
        new Set(sequence.items.map((item) => item.recommendationId)).size !== sequence.items.length
      ) {
        throw new RecommendationPortfolioError(
          "Sequence and priority recommendation sets do not reconcile",
        );
      }
      const candidates: RecommendationPortfolioCandidateInput[] = sequence.items.map(
        (sequenceItem) => {
          const priorityItem = priorityById.get(sequenceItem.recommendationId);
          const definition = definitionById.get(sequenceItem.recommendationId);
          if (
            !priorityItem ||
            !definition ||
            priorityItem.id !== sequenceItem.priorityItemId ||
            priorityItem.recommendationVersion !== sequenceItem.recommendationVersion ||
            priorityItem.catalogueOrder !== sequenceItem.catalogueOrder ||
            priorityItem.generatedRank !== sequenceItem.generatedRank ||
            priorityItem.effort !== sequenceItem.effort ||
            definition.version !== priorityItem.recommendationVersion ||
            definition.order !== priorityItem.catalogueOrder ||
            !sameStrings(priorityItem.sourceTraceNodeIds, sequenceItem.sourceTraceNodeIds)
          ) {
            throw new RecommendationPortfolioError(
              `Portfolio source ${sequenceItem.recommendationId} does not reconcile`,
            );
          }
          const sourceEvaluations = priorityItem.sourceRecommendationIds.map((id) => {
            const candidate = evaluationById.get(id);
            if (!candidate || candidate.result !== "eligible") {
              throw new RecommendationPortfolioError(
                `Eligible evaluation source ${id} is unavailable`,
              );
            }
            return candidate;
          });
          const matchedTriggers = [
            ...new Set(sourceEvaluations.flatMap((item) => item.matchedTriggers)),
          ].sort();
          const dependencies = sequence.dependencies
            .filter(
              (dependency) =>
                dependency.dependantRecommendationId === sequenceItem.recommendationId,
            )
            .map((dependency) => ({
              recommendationId: dependency.resolvedDependencyId ?? dependency.sourceDependencyId,
              sourceDependencyId: dependency.sourceDependencyId,
              type: dependency.dependencyType,
              state: dependency.state,
              resolution: dependency.resolution,
              reasonCode: dependency.reasonCode,
            }))
            .sort(
              (left, right) =>
                left.sourceDependencyId.localeCompare(right.sourceDependencyId) ||
                left.type.localeCompare(right.type),
            );
          return {
            priorityItemId: priorityItem.id,
            sequenceItemId: sequenceItem.id,
            resolutionCandidateId: priorityItem.resolutionCandidateId,
            recommendationDefinitionId: priorityItem.recommendationDefinitionId,
            recommendationId: priorityItem.recommendationId,
            recommendationVersion: priorityItem.recommendationVersion,
            catalogueOrder: priorityItem.catalogueOrder,
            title: definition.title,
            outcome: definition.outcome,
            successMeasures: [...definition.successMeasures],
            matchedTriggers,
            generatedRank: priorityItem.generatedRank,
            priorityLabel: priorityItem.priorityLabel,
            impact: priorityItem.impact,
            effort: priorityItem.effort,
            urgency: priorityItem.components.urgency,
            confidenceState: gate.confidenceState,
            confidenceResult: priorityItem.postConfidenceResult,
            confidenceCaveat: gate.caveat,
            generatedSequence: sequenceItem.generatedSequence,
            generatedHorizon: sequenceItem.generatedHorizon,
            sequenceState: sequenceItem.sequenceState,
            sequenceReasonCode: sequenceItem.reasonCode,
            blockingDependencyIds: [...sequenceItem.blockingDependencyIds],
            dependencies,
            caveats: [...sequenceItem.caveats],
            rationale: [...priorityItem.rationale],
            sourceTraceNodeIds: [...priorityItem.sourceTraceNodeIds].sort(),
          };
        },
      );
      const output = buildRecommendationPortfolio({ candidates });
      const items = await Promise.all(
        output.items.map(async (item) => ({ ...item, semanticHash: await semanticHash(item) })),
      );
      const canonicalInput: RecommendationPortfolioInput = {
        analysisRunId: run.id,
        recommendationEvaluationId: evaluation.id,
        confidenceGateId: gate.id,
        conflictResolutionId: priority.conflictResolutionId,
        priorityModelId: priority.id,
        priorityModelHash: priority.outputHash,
        sequenceModelId: sequence.id,
        sequenceModelHash: sequence.outputHash,
        organisationId: run.organisationId,
        workspaceId: run.workspaceId,
        configurationSetId: run.configurationSetId,
        catalogueVersionId: catalogue.id,
        catalogueId: catalogue.catalogueId,
        catalogueVersion: catalogue.version,
        catalogueDigest: catalogue.contentDigest,
        policyVersion: output.policyVersion,
      };
      const canonicalPortfolio = { ...output, items };
      const portfolio = await this.repo.publishPortfolio({
        analysis_run_id: run.id,
        recommendation_evaluation_id: evaluation.id,
        confidence_gate_id: gate.id,
        conflict_resolution_id: priority.conflictResolutionId,
        priority_model_id: priority.id,
        sequence_model_id: sequence.id,
        organisation_id: run.organisationId,
        workspace_id: run.workspaceId,
        configuration_set_id: run.configurationSetId,
        catalogue_version_id: catalogue.id,
        catalogue_id: catalogue.catalogueId,
        catalogue_version: catalogue.version,
        catalogue_digest: catalogue.contentDigest,
        policy_version: output.policyVersion,
        projector_version: output.projectorVersion,
        portfolio_state: output.summary.state,
        item_count: output.summary.itemCount,
        scheduled_count: output.summary.scheduledCount,
        input_hash: await semanticHash(canonicalInput),
        output_hash: await semanticHash(canonicalPortfolio),
        canonical_input: canonicalInput,
        canonical_portfolio: canonicalPortfolio,
        items,
      });
      return { portfolio, reused: false } as const;
    } catch (error) {
      if (error instanceof RecommendationPortfolioServiceError) throw error;
      if (error instanceof RecommendationPortfolioError) {
        throw new RecommendationPortfolioServiceError(error.code, 422, error.message);
      }
      throw new RecommendationPortfolioServiceError(
        "PORTFOLIO_PUBLICATION_FAILED",
        500,
        "Recommendation portfolio publication failed safely.",
      );
    }
  }

  async ensure(run: AssessmentAnalysisRun) {
    await recommendationSequenceService.ensure(run);
    return this.publish(run);
  }

  async getForRun(run: AssessmentAnalysisRun) {
    return this.repo.getPortfolioForRun(run.id, this.tenant(run));
  }

  async getById(portfolioId: string, tenant: { organisationId: string; workspaceId: string }) {
    return this.repo.getPortfolioById(portfolioId, tenant);
  }
}

export const recommendationPortfolioService = new RecommendationPortfolioService();
