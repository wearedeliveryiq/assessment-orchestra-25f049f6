export type RecommendationAuditExportStatus =
  "queued" | "processing" | "completed" | "failed" | "expired";

export type RecommendationIntegrityStatus = "passed" | "failed";

export interface RecommendationAuditExportJob {
  id: string;
  organisationId: string;
  workspaceId: string;
  portfolioId: string;
  requestedBy: string;
  status: RecommendationAuditExportStatus;
  attempt: number;
  retryable: boolean;
  failureCode: string | null;
  leaseOwner: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  availableUntil: string | null;
  payloadHash: string | null;
  payload: RecommendationAuditExport | null;
}

export interface RecommendationAuditSource {
  portfolio: Record<string, unknown>;
  portfolioItems: Record<string, unknown>[];
  catalogueVersion: Record<string, unknown>;
  catalogueDefinitions: Record<string, unknown>[];
  catalogueApprovals: Record<string, unknown>[];
  catalogueLifecycle: Record<string, unknown>[];
  evaluation: Record<string, unknown>;
  evaluationCandidates: Record<string, unknown>[];
  confidenceGate: Record<string, unknown>;
  confidenceCandidates: Record<string, unknown>[];
  resolution: Record<string, unknown>;
  resolutionCandidates: Record<string, unknown>[];
  priorityModel: Record<string, unknown>;
  priorityItems: Record<string, unknown>[];
  sequenceModel: Record<string, unknown>;
  sequenceItems: Record<string, unknown>[];
  sequenceDependencies: Record<string, unknown>[];
  decisionEvents: Record<string, unknown>[];
  decisions: Record<string, unknown>[];
  plans: Record<string, unknown>[];
  actionEvents: Record<string, unknown>[];
  actions: Record<string, unknown>[];
  handoffs: Record<string, unknown>[];
  handoffEvents: Record<string, unknown>[];
}

export interface RecommendationAuditExport {
  schemaVersion: "deliveryiq.recommendation-audit-export/1.0.0";
  generatedAt: string;
  scope: { organisationId: string; workspaceId: string; portfolioId: string };
  catalogue: {
    version: Record<string, unknown>;
    definitions: Record<string, unknown>[];
    approvals: Record<string, unknown>[];
    lifecycle: Record<string, unknown>[];
  };
  intelligence: {
    evaluation: Record<string, unknown>;
    candidates: Record<string, unknown>[];
    confidence: Record<string, unknown>;
    confidenceCandidates: Record<string, unknown>[];
    resolution: Record<string, unknown>;
    resolutionCandidates: Record<string, unknown>[];
    priority: Record<string, unknown>;
    priorityItems: Record<string, unknown>[];
    sequence: Record<string, unknown>;
    sequenceItems: Record<string, unknown>[];
    dependencies: Record<string, unknown>[];
  };
  portfolio: { version: Record<string, unknown>; items: Record<string, unknown>[] };
  customerOverlay: {
    decisions: Record<string, unknown>[];
    decisionEvents: Record<string, unknown>[];
    plans: Record<string, unknown>[];
    actions: Record<string, unknown>[];
    actionEvents: Record<string, unknown>[];
    outcomes: Record<string, unknown>[];
    handoffs: Record<string, unknown>[];
    handoffEvents: Record<string, unknown>[];
  };
  integrity: { status: RecommendationIntegrityStatus; checks: Record<string, boolean> };
  limitations: string[];
}

export interface RecommendationOperationalHealth {
  generatedAt: string;
  status: "healthy" | "degraded" | "unhealthy";
  metrics: {
    queuedExports: number;
    processingExports: number;
    failedExports: number;
    oldestQueuedSeconds: number;
    criticalIntegrityFailures: number;
    openCriticalAlerts: number;
  };
  alertCoverage: string[];
}
