/**
 * Audit & Explainability Service — shared domain model.
 *
 * These types are transport-safe (no server imports) so the same shapes can be
 * used by server services, the REST layer and the browser explorers.
 */

export type AuditSeverity = "debug" | "info" | "warning" | "error" | "critical";

export const AUDIT_SEVERITIES: AuditSeverity[] = [
  "debug",
  "info",
  "warning",
  "error",
  "critical",
];

/** Every producer of audit events. Engines map 1:1 onto runtime stages. */
export type AuditEngine =
  | "runtime"
  | "knowledge-pack"
  | "observations"
  | "signals"
  | "rules"
  | "patterns"
  | "scores"
  | "recommendations"
  | "narrative"
  | "dashboard"
  | "reports"
  | "audit"
  | "user";

export const AUDIT_ENGINES: AuditEngine[] = [
  "runtime",
  "knowledge-pack",
  "observations",
  "signals",
  "rules",
  "patterns",
  "scores",
  "recommendations",
  "narrative",
  "dashboard",
  "reports",
  "audit",
  "user",
];

export type AuditEventType =
  | "engine.started"
  | "engine.completed"
  | "engine.failed"
  | "entity.created"
  | "entity.updated"
  | "validation.failed"
  | "rule.evaluated"
  | "pattern.detected"
  | "recommendation.generated"
  | "narrative.generated"
  | "assessment.created"
  | "assessment.saved"
  | "assessment.submitted"
  | "assessment.completed"
  | "assessment.archived"
  | "assessment.retried"
  | "knowledge-pack.activated"
  | "report.generated"
  | "dashboard.accessed"
  | "export.performed"
  | "user.login"
  | "audit.accessed"
  | "retention.applied";

/** Node kinds in the evidence graph, ordered from raw input to narrative. */
export type EvidenceEntityType =
  | "response"
  | "observation"
  | "signal"
  | "rule"
  | "pattern"
  | "score"
  | "recommendation"
  | "narrative";

export const EVIDENCE_CHAIN: EvidenceEntityType[] = [
  "response",
  "observation",
  "signal",
  "rule",
  "pattern",
  "score",
  "recommendation",
  "narrative",
];

export function isEvidenceEntityType(value: string): value is EvidenceEntityType {
  return (EVIDENCE_CHAIN as string[]).includes(value);
}

/** Immutable audit record. */
export interface AuditEvent {
  id: string;
  timestamp: string;
  assessmentSessionId: string | null;
  organisationId: string;
  knowledgePackId: string;
  knowledgePackVersion: string;
  engine: AuditEngine;
  eventType: AuditEventType | string;
  entityType: string;
  entityId: string | null;
  userId: string;
  correlationId: string;
  executionId: string;
  severity: AuditSeverity;
  durationMs: number | null;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  archivedAt: string | null;
  createdAt: string;
}

/** Everything a producer supplies; the service fills in the rest. */
export interface AuditEventInput {
  assessmentSessionId?: string | null;
  organisationId?: string;
  knowledgePackId?: string;
  knowledgePackVersion?: string;
  engine: AuditEngine;
  eventType: AuditEventType | string;
  entityType?: string;
  entityId?: string | null;
  userId?: string;
  correlationId?: string;
  executionId?: string;
  severity?: AuditSeverity;
  durationMs?: number | null;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export interface AuditQuery {
  assessmentSessionId?: string;
  organisationId?: string;
  knowledgePackId?: string;
  engine?: AuditEngine | string;
  eventType?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  correlationId?: string;
  severity?: AuditSeverity | string;
  from?: string;
  to?: string;
  search?: string;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

export interface AuditEventPage {
  events: AuditEvent[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/** A persisted edge of the explainability graph. */
export interface ExplainabilityRecord {
  id: string;
  assessmentSessionId: string;
  sourceType: EvidenceEntityType;
  sourceId: string;
  sourceLabel: string;
  targetType: EvidenceEntityType;
  targetId: string;
  targetLabel: string;
  relationshipType: string;
  confidence: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type ExplainabilityRecordInput = Omit<ExplainabilityRecord, "id" | "createdAt">;

export interface EvidenceNode {
  type: EvidenceEntityType;
  id: string;
  label: string;
  detail: string;
  confidence: number | null;
  severity: string | null;
  timestamp: string | null;
  attributes: Record<string, unknown>;
}

export interface EvidenceGraph {
  assessmentSessionId: string;
  nodes: EvidenceNode[];
  edges: ExplainabilityRecord[];
  counts: Record<EvidenceEntityType, number>;
  builtAt: string;
}

/** Neighbourhood of one entity, traversable in both directions. */
export interface EvidenceNeighbourhood {
  assessmentSessionId: string;
  entity: EvidenceNode;
  upstream: { node: EvidenceNode; edge: ExplainabilityRecord }[];
  downstream: { node: EvidenceNode; edge: ExplainabilityRecord }[];
}

export interface DecisionTraceStep {
  depth: number;
  node: EvidenceNode;
  via: {
    relationshipType: string;
    confidence: number;
    fromType: EvidenceEntityType;
    fromId: string;
  } | null;
}

export interface DecisionTrace {
  assessmentSessionId: string;
  direction: "upstream" | "downstream";
  root: EvidenceNode;
  steps: DecisionTraceStep[];
  paths: EvidenceNode[][];
  executionEvents: AuditEvent[];
  generatedAt: string;
}

/** Structured (non-natural-language) answer surface for future AI reasoning. */
export interface ExplanationResult {
  assessmentSessionId: string;
  entity: EvidenceNode;
  question: string;
  because: {
    entityType: EvidenceEntityType;
    entityId: string;
    label: string;
    detail: string;
    confidence: number | null;
    relationshipType: string;
  }[];
  influences: {
    entityType: EvidenceEntityType;
    entityId: string;
    label: string;
    relationshipType: string;
  }[];
  originatingResponses: EvidenceNode[];
  confidence: number | null;
  executionEvents: AuditEvent[];
  generatedAt: string;
}

export interface AuditDashboardFilters {
  organisationId?: string;
  assessmentSessionId?: string;
  knowledgePackId?: string;
  userId?: string;
  engine?: string;
  from?: string;
  to?: string;
}

export interface AuditDashboard {
  filters: AuditDashboardFilters;
  totals: {
    events: number;
    validationFailures: number;
    engineFailures: number;
    assessments: number;
    averageDurationMs: number;
  };
  bySeverity: { severity: AuditSeverity; count: number }[];
  byEngine: { engine: string; count: number; failures: number; averageDurationMs: number }[];
  byEventType: { eventType: string; count: number }[];
  executions: {
    executionId: string;
    assessmentSessionId: string | null;
    organisationId: string;
    startedAt: string;
    completedAt: string | null;
    durationMs: number;
    engines: string[];
    failed: boolean;
  }[];
  recentEvents: AuditEvent[];
  generatedAt: string;
}

export type RetentionMode = "indefinite" | "archive" | "purge";

export interface RetentionPolicy {
  id: string;
  name: string;
  scope: "all" | "engine" | "severity" | "organisation";
  scopeValue: string;
  mode: RetentionMode;
  retainDays: number | null;
  enabled: boolean;
  description: string;
  lastAppliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RetentionRunResult {
  appliedAt: string;
  policies: { policy: string; mode: RetentionMode; affected: number }[];
  archived: number;
  purged: number;
}
