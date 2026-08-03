import { semanticHash } from "../recommendation-evaluation/evaluator";
import {
  buildRecommendationAuditExport,
  configurationDiff,
  RecommendationGovernanceError,
} from "./model";
import { recommendationGovernanceRepository } from "./repository.server";
import type {
  RecommendationAuditExport,
  RecommendationAuditExportJob,
  RecommendationAuditSource,
  RecommendationOperationalHealth,
} from "./types";

export interface RecommendationGovernanceRepository {
  requestExport(input: Record<string, unknown>): Promise<RecommendationAuditExportJob>;
  getExport(
    id: string,
    scope: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationAuditExportJob | null>;
  claimExports(limit?: number): Promise<RecommendationAuditExportJob[]>;
  completeExport(
    id: string,
    leaseOwner: string,
    payload: RecommendationAuditExport,
    payloadHash: string,
  ): Promise<RecommendationAuditExportJob>;
  failExport(
    id: string,
    leaseOwner: string,
    failureCode: string,
  ): Promise<RecommendationAuditExportJob>;
  retryExport(
    id: string,
    scope: { organisationId: string; workspaceId: string },
  ): Promise<RecommendationAuditExportJob>;
  recordExportAccess(input: {
    id: string;
    organisationId: string;
    workspaceId: string;
    actorUserId: string;
    mode: "status" | "download";
  }): Promise<void>;
  loadAuditSource(input: {
    portfolioId: string;
    organisationId: string;
    workspaceId: string;
  }): Promise<RecommendationAuditSource | null>;
  featureEnabled(featureKey: string): Promise<boolean>;
  setFeatureFlag(input: Record<string, unknown>): Promise<Record<string, unknown>>;
  getCatalogueVersionForDiff(id: string): Promise<{
    id: string;
    version: string;
    contentDigest: string;
    snapshot: Record<string, unknown>;
  } | null>;
  operationalHealth(): Promise<RecommendationOperationalHealth>;
}

function validToken(value: string, minimum = 8, maximum = 160) {
  return value.length >= minimum && value.length <= maximum && /^[A-Za-z0-9._:-]+$/.test(value);
}

export class RecommendationGovernanceService {
  constructor(
    private readonly repo: RecommendationGovernanceRepository = recommendationGovernanceRepository,
  ) {}

  async requestExport(input: {
    portfolioId: string;
    organisationId: string;
    workspaceId: string;
    requestedBy: string;
    idempotencyKey: string;
  }) {
    if (!validToken(input.portfolioId, 1) || !validToken(input.idempotencyKey, 16)) {
      throw new RecommendationGovernanceError(
        "RECOMMENDATION_AUDIT_EXPORT_INVALID",
        400,
        "A valid bounded audit export request is required.",
      );
    }
    if (!(await this.repo.featureEnabled("audit_exports"))) {
      throw new RecommendationGovernanceError(
        "RECOMMENDATION_FEATURE_DISABLED",
        503,
        "Recommendation audit export is not currently available.",
      );
    }
    const source = await this.repo.loadAuditSource(input);
    if (!source) {
      throw new RecommendationGovernanceError(
        "RECOMMENDATION_ACCESS_DENIED",
        404,
        "The recommendation portfolio is not available.",
      );
    }
    buildRecommendationAuditExport(source, "2000-01-01T00:00:00.000Z");
    const requestHash = await semanticHash({
      portfolioId: input.portfolioId,
      organisationId: input.organisationId,
      workspaceId: input.workspaceId,
      requestedBy: input.requestedBy,
      projection: "tenant_audit",
    });
    return this.repo.requestExport({
      portfolioId: input.portfolioId,
      organisationId: input.organisationId,
      workspaceId: input.workspaceId,
      requestedBy: input.requestedBy,
      projection: "tenant_audit",
      idempotencyKey: input.idempotencyKey,
      requestHash,
    });
  }

  async getExport(
    id: string,
    scope: { organisationId: string; workspaceId: string },
    actorUserId: string,
    includePayload = false,
  ) {
    const found = await this.repo.getExport(id, scope);
    if (!found) {
      throw new RecommendationGovernanceError(
        "RECOMMENDATION_ACCESS_DENIED",
        404,
        "The recommendation audit export is not available.",
      );
    }
    const expired = found.availableUntil !== null && Date.parse(found.availableUntil) <= Date.now();
    await this.repo.recordExportAccess({
      id,
      ...scope,
      actorUserId,
      mode: includePayload ? "download" : "status",
    });
    if (includePayload && (found.status !== "completed" || expired || !found.payload)) {
      throw new RecommendationGovernanceError(
        expired ? "RECOMMENDATION_AUDIT_EXPORT_EXPIRED" : "RECOMMENDATION_AUDIT_EXPORT_NOT_READY",
        expired ? 410 : 409,
        expired
          ? "This audit export has expired. Request a fresh export."
          : "The audit export is not ready yet.",
      );
    }
    return includePayload ? found : { ...found, payload: null };
  }

  retryExport(id: string, scope: { organisationId: string; workspaceId: string }) {
    return this.repo.retryExport(id, scope);
  }

  async processExports(limit = 10) {
    const jobs = await this.repo.claimExports(Math.min(Math.max(limit, 1), 25));
    const results: Array<{ id: string; status: string }> = [];
    for (const current of jobs) {
      if (!current.leaseOwner) continue;
      try {
        const source = await this.repo.loadAuditSource(current);
        if (!source) {
          throw new RecommendationGovernanceError(
            "RECOMMENDATION_AUDIT_INTEGRITY_FAILED",
            422,
            "The source portfolio is unavailable.",
          );
        }
        const payload = buildRecommendationAuditExport(source);
        const payloadHash = await semanticHash(payload);
        const completed = await this.repo.completeExport(
          current.id,
          current.leaseOwner,
          payload,
          payloadHash,
        );
        results.push({ id: completed.id, status: completed.status });
      } catch (error) {
        const code =
          error instanceof RecommendationGovernanceError
            ? error.code
            : "RECOMMENDATION_AUDIT_EXPORT_FAILED";
        const failed = await this.repo.failExport(current.id, current.leaseOwner, code);
        results.push({ id: failed.id, status: failed.status });
      }
    }
    return { claimed: jobs.length, results };
  }

  async diffConfiguration(fromId: string, toId: string) {
    const [from, to] = await Promise.all([
      this.repo.getCatalogueVersionForDiff(fromId),
      this.repo.getCatalogueVersionForDiff(toId),
    ]);
    if (!from || !to) {
      throw new RecommendationGovernanceError(
        "CATALOGUE_NOT_FOUND",
        404,
        "Catalogue version not found.",
      );
    }
    return configurationDiff(from, to);
  }

  async setFeatureFlag(input: {
    featureKey: "audit_exports";
    enabled: boolean;
    actorId: string;
    reasonCategory: "release_gate" | "incident" | "rollback" | "recovery";
    idempotencyKey: string;
  }) {
    if (!validToken(input.idempotencyKey, 16)) {
      throw new RecommendationGovernanceError(
        "RECOMMENDATION_FEATURE_FLAG_INVALID",
        400,
        "A valid feature-control request is required.",
      );
    }
    return this.repo.setFeatureFlag({
      ...input,
      requestHash: await semanticHash(input),
    });
  }

  health() {
    return this.repo.operationalHealth();
  }
}

export const recommendationGovernanceService = new RecommendationGovernanceService();
