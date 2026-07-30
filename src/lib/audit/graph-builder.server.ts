import { knowledgePackLoader } from "../knowledge-packs/loader.server";
import { listObservations } from "../observations/repository.server";
import { listPatterns } from "../patterns/repository.server";
import { getNarrativeForSession } from "../narrative/repository.server";
import { resolveRecommendations } from "../recommendations/resolver.server";
import { listRuleResults } from "../rules/repository.server";
import { listScores } from "../scores/repository.server";
import { listSignals } from "../signals/repository.server";
import { getResponses } from "../assessment/repository.server";
import * as repo from "./repository.server";
import type {
  EvidenceEntityType,
  EvidenceGraph,
  EvidenceNode,
  ExplainabilityRecord,
  ExplainabilityRecordInput,
} from "./types";
import { EVIDENCE_CHAIN } from "./types";

/**
 * EvidenceGraphBuilder
 *
 * Single responsibility: turn the persisted output of every intelligence
 * engine into an explainability graph
 * (Response -> Observation -> Signal -> Rule -> Pattern -> Score ->
 * Recommendation -> Narrative) and persist the relationships so the graph can
 * be traversed in both directions long after the run has finished.
 *
 * The builder is Knowledge-Pack agnostic: it only reads the `supporting*Ids`
 * provenance every engine already records.
 */

export interface SessionEntities {
  nodes: EvidenceNode[];
  edges: ExplainabilityRecordInput[];
}

function node(
  type: EvidenceEntityType,
  id: string,
  label: string,
  detail: string,
  extras: Partial<EvidenceNode> = {},
): EvidenceNode {
  return {
    type,
    id,
    label,
    detail,
    confidence: extras.confidence ?? null,
    severity: extras.severity ?? null,
    timestamp: extras.timestamp ?? null,
    attributes: extras.attributes ?? {},
  };
}

function edge(
  sessionId: string,
  source: EvidenceNode,
  target: EvidenceNode,
  relationshipType: string,
  confidence: number,
  metadata: Record<string, unknown> = {},
): ExplainabilityRecordInput {
  return {
    assessmentSessionId: sessionId,
    sourceType: source.type,
    sourceId: source.id,
    sourceLabel: source.label,
    targetType: target.type,
    targetId: target.id,
    targetLabel: target.label,
    relationshipType,
    confidence: Number(confidence.toFixed(4)),
    metadata,
  };
}

/** Reads every persisted engine output for a session and derives the graph. */
export async function buildSessionGraph(sessionId: string): Promise<SessionEntities> {
  const [responses, observations, signals, rules, patterns, scores, narrative] = await Promise.all([
    getResponses(sessionId),
    listObservations(sessionId),
    listSignals(sessionId),
    listRuleResults(sessionId),
    listPatterns(sessionId),
    listScores(sessionId),
    getNarrativeForSession(sessionId),
  ]);

  const nodes: EvidenceNode[] = [];
  const edges: ExplainabilityRecordInput[] = [];
  const index = new Map<string, EvidenceNode>();

  const register = (value: EvidenceNode) => {
    const key = `${value.type}:${value.id}`;
    if (!index.has(key)) {
      index.set(key, value);
      nodes.push(value);
    }
    return index.get(key)!;
  };

  const find = (type: EvidenceEntityType, id: string) => index.get(`${type}:${id}`);

  for (const response of responses) {
    register(
      node("response", response.questionId, response.questionId, String(response.value ?? "—"), {
        timestamp: response.answeredAt,
        attributes: {
          sectionId: response.sectionId,
          value: response.value,
          score: response.score,
          notes: response.notes,
        },
      }),
    );
  }

  for (const observation of observations) {
    const target = register(
      node("observation", observation.id, observation.title, observation.evidence, {
        confidence: observation.confidence,
        severity: observation.severity,
        timestamp: observation.createdAt,
        attributes: { definitionId: observation.definitionId, questionId: observation.questionId },
      }),
    );
    const source = find("response", observation.questionId);
    if (source) {
      edges.push(
        edge(sessionId, source, target, "answered-by", observation.confidence, {
          definitionId: observation.definitionId,
        }),
      );
    }
  }

  for (const signal of signals) {
    const target = register(
      node("signal", signal.id, signal.name, signal.description, {
        confidence: signal.confidence,
        severity: signal.severity,
        timestamp: signal.createdAt,
        attributes: { signalCode: signal.signalCode, category: signal.category },
      }),
    );
    for (const observationId of signal.supportingObservationIds) {
      const source = find("observation", observationId);
      if (source) edges.push(edge(sessionId, source, target, "supports", signal.confidence));
    }
  }

  for (const rule of rules) {
    const target = register(
      node("rule", rule.id, rule.name, rule.evaluationReason, {
        confidence: rule.confidence,
        severity: rule.severity,
        timestamp: rule.executedAt,
        attributes: { ruleCode: rule.ruleCode, status: rule.status },
      }),
    );
    for (const signalId of rule.supportingSignalIds) {
      const source = find("signal", signalId);
      if (source) edges.push(edge(sessionId, source, target, "evaluated-by", rule.confidence));
    }
  }

  for (const pattern of patterns) {
    const target = register(
      node("pattern", pattern.id, pattern.name, pattern.businessImpact, {
        confidence: pattern.confidence,
        severity: pattern.severity,
        timestamp: pattern.createdAt,
        attributes: { patternCode: pattern.patternCode, category: pattern.category },
      }),
    );
    for (const ruleId of pattern.supportingRuleIds) {
      const source = find("rule", ruleId);
      if (source) edges.push(edge(sessionId, source, target, "detected-by", pattern.confidence));
    }
  }

  for (const score of scores) {
    const target = register(
      node("score", score.id, score.dimension, score.calculationReason, {
        confidence: score.confidence,
        severity: score.severity,
        timestamp: score.createdAt,
        attributes: {
          scoreCode: score.scoreCode,
          percentage: score.percentage,
          maturityLevel: score.maturityLevel,
        },
      }),
    );
    for (const patternId of score.supportingPatternIds) {
      const source = find("pattern", patternId);
      if (source) edges.push(edge(sessionId, source, target, "scored-by", score.confidence));
    }
  }

  // Recommendations are resolved deterministically from the active pack and the
  // persisted patterns, so their node ids are the stable pack codes.
  let recommendations: ReturnType<typeof resolveRecommendations> = [];
  try {
    recommendations = resolveRecommendations(knowledgePackLoader.loadActive(), patterns, scores);
  } catch (error) {
    console.error("[evidence-graph] recommendation resolution failed", error);
  }

  for (const recommendation of recommendations) {
    const target = register(
      node("recommendation", recommendation.code, recommendation.title, recommendation.rationale, {
        confidence: recommendation.confidence,
        severity: recommendation.severity,
        attributes: {
          priority: recommendation.priority,
          horizon: recommendation.horizon,
          dimension: recommendation.dimension,
        },
      }),
    );
    for (const patternId of recommendation.supportingPatternIds) {
      const source = find("pattern", patternId);
      if (source) {
        edges.push(edge(sessionId, source, target, "recommends", recommendation.confidence));
      }
    }
    const scoreNode = scores.find((score) => score.scoreCode === recommendation.dimension);
    if (scoreNode) {
      const source = find("score", scoreNode.id);
      if (source) {
        edges.push(edge(sessionId, source, target, "prioritised-by", recommendation.confidence));
      }
    }
  }

  if (narrative) {
    const target = register(
      node("narrative", narrative.id, narrative.headline || "Executive narrative", narrative.summary, {
        confidence: narrative.confidence,
        timestamp: narrative.createdAt,
        attributes: { mode: narrative.mode, provider: narrative.provider },
      }),
    );

    const cited = new Set<string>();
    for (const section of narrative.sections) {
      for (const reference of section.evidence) {
        if (!reference.entityId) continue;
        const type: EvidenceEntityType | null =
          reference.kind === "score" ? "score" : reference.kind === "pattern" ? "pattern" : null;
        if (!type) continue;
        const key = `${type}:${reference.entityId}`;
        if (cited.has(key)) continue;
        cited.add(key);
        const source = find(type, reference.entityId);
        if (source) {
          edges.push(
            edge(sessionId, source, target, "cited-by", reference.confidence, {
              sectionKey: section.key,
            }),
          );
        }
      }
    }

    // A narrative with no explicit citations is still bound to its scores.
    if (cited.size === 0) {
      for (const score of scores) {
        const source = find("score", score.id);
        if (source) edges.push(edge(sessionId, source, target, "cited-by", score.confidence));
      }
    }
  }

  return { nodes, edges };
}

/** Builds and persists the graph. Idempotent — safe to call after every stage. */
export async function persistSessionGraph(sessionId: string): Promise<{
  nodes: number;
  edges: number;
}> {
  const { nodes, edges } = await buildSessionGraph(sessionId);
  await repo.upsertEdges(edges);
  return { nodes: nodes.length, edges: edges.length };
}

function emptyCounts(): Record<EvidenceEntityType, number> {
  return Object.fromEntries(EVIDENCE_CHAIN.map((type) => [type, 0])) as Record<
    EvidenceEntityType,
    number
  >;
}

/**
 * Reads the graph for a session. Persisted edges are authoritative; derived
 * edges are used when the graph has not been persisted yet (e.g. historical
 * assessments completed before the audit service existed).
 */
export async function loadEvidenceGraph(sessionId: string): Promise<EvidenceGraph> {
  const [{ nodes, edges: derived }, persisted] = await Promise.all([
    buildSessionGraph(sessionId),
    repo.listEdges(sessionId),
  ]);

  const known = new Set(nodes.map((value) => `${value.type}:${value.id}`));
  const edges: ExplainabilityRecord[] =
    persisted.length > 0
      ? persisted.filter(
          (record) =>
            known.has(`${record.sourceType}:${record.sourceId}`) &&
            known.has(`${record.targetType}:${record.targetId}`),
        )
      : derived.map((record, position) => ({
          ...record,
          id: `derived-${position}`,
          createdAt: new Date().toISOString(),
        }));

  const counts = emptyCounts();
  for (const value of nodes) counts[value.type] += 1;

  return { assessmentSessionId: sessionId, nodes, edges, counts, builtAt: new Date().toISOString() };
}
