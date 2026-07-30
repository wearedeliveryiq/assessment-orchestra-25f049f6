import { loadEvidenceGraph } from "./graph-builder.server";
import { indexGraph, getNode, neighbourhood, originatingResponses, traverse } from "./graph";
import { resolveEntitySession } from "./entity-resolver.server";
import * as repo from "./repository.server";
import { AuditServiceError, assertSessionAccess, recordAuditAccess } from "./service.server";
import type {
  DecisionTrace,
  EvidenceEntityType,
  EvidenceGraph,
  EvidenceNeighbourhood,
  ExplanationResult,
} from "./types";

/**
 * ExplainabilityService + DecisionTraceService
 *
 * Single responsibility: answer "why does this exist?" for any entity, using
 * the persisted evidence graph plus the immutable execution events. The answers
 * are structured (not natural language) so a future conversational AI can
 * reason over them directly.
 */

async function resolveSession(
  entityType: EvidenceEntityType,
  entityId: string,
  ownerKey: string,
  hintedSessionId?: string,
): Promise<string> {
  const sessionId = hintedSessionId ?? (await resolveEntitySession(entityType, entityId));
  if (!sessionId) {
    throw new AuditServiceError(
      `An assessmentId is required to resolve a ${entityType} entity`,
      400,
    );
  }
  await assertSessionAccess(sessionId, ownerKey);
  return sessionId;
}

export async function getSessionGraph(
  sessionId: string,
  ownerKey: string,
): Promise<EvidenceGraph> {
  await assertSessionAccess(sessionId, ownerKey);
  recordAuditAccess({ ownerKey, resource: `evidence/graph`, assessmentSessionId: sessionId });
  return loadEvidenceGraph(sessionId);
}

/** GET /evidence/{entityType}/{entityId} — one hop in both directions. */
export async function getEvidence(
  entityType: EvidenceEntityType,
  entityId: string,
  ownerKey: string,
  hintedSessionId?: string,
): Promise<EvidenceNeighbourhood> {
  const sessionId = await resolveSession(entityType, entityId, ownerKey, hintedSessionId);
  const graph = indexGraph(await loadEvidenceGraph(sessionId));
  const node = getNode(graph, entityType, entityId);
  if (!node) throw new AuditServiceError(`${entityType} ${entityId} not found`, 404);
  recordAuditAccess({
    ownerKey,
    resource: `evidence/${entityType}/${entityId}`,
    assessmentSessionId: sessionId,
  });
  return neighbourhood(sessionId, graph, node);
}

/** GET /trace/{entityType}/{entityId} — full provenance chain. */
export async function getDecisionTrace(
  entityType: EvidenceEntityType,
  entityId: string,
  ownerKey: string,
  options: { direction?: "upstream" | "downstream"; assessmentId?: string } = {},
): Promise<DecisionTrace> {
  const direction = options.direction ?? "upstream";
  const sessionId = await resolveSession(entityType, entityId, ownerKey, options.assessmentId);
  const graph = indexGraph(await loadEvidenceGraph(sessionId));
  const node = getNode(graph, entityType, entityId);
  if (!node) throw new AuditServiceError(`${entityType} ${entityId} not found`, 404);

  const trace = traverse(sessionId, graph, node, { direction });
  const executionEvents = await repo.scanEvents(
    { assessmentSessionId: sessionId, entityType, entityId },
    50,
  );

  recordAuditAccess({
    ownerKey,
    resource: `trace/${entityType}/${entityId}`,
    assessmentSessionId: sessionId,
  });

  return { ...trace, executionEvents, generatedAt: new Date().toISOString() };
}

/** GET /explain/{entityType}/{entityId} — structured reasoning payload. */
export async function explainEntity(
  entityType: EvidenceEntityType,
  entityId: string,
  ownerKey: string,
  options: { assessmentId?: string; question?: string } = {},
): Promise<ExplanationResult> {
  const sessionId = await resolveSession(entityType, entityId, ownerKey, options.assessmentId);
  const graph = indexGraph(await loadEvidenceGraph(sessionId));
  const node = getNode(graph, entityType, entityId);
  if (!node) throw new AuditServiceError(`${entityType} ${entityId} not found`, 404);

  const local = neighbourhood(sessionId, graph, node);
  const executionEvents = await repo.scanEvents(
    { assessmentSessionId: sessionId, entityType, entityId },
    25,
  );

  recordAuditAccess({
    ownerKey,
    resource: `explain/${entityType}/${entityId}`,
    assessmentSessionId: sessionId,
  });

  return {
    assessmentSessionId: sessionId,
    entity: node,
    question: options.question ?? `Why does this ${entityType} exist?`,
    because: local.upstream.map(({ node: source, edge }) => ({
      entityType: source.type,
      entityId: source.id,
      label: source.label,
      detail: source.detail,
      confidence: source.confidence,
      relationshipType: edge.relationshipType,
    })),
    influences: local.downstream.map(({ node: target, edge }) => ({
      entityType: target.type,
      entityId: target.id,
      label: target.label,
      relationshipType: edge.relationshipType,
    })),
    originatingResponses: originatingResponses(sessionId, graph, node),
    confidence: node.confidence,
    executionEvents,
    generatedAt: new Date().toISOString(),
  };
}
