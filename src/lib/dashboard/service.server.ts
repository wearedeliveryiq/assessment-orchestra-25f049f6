import { knowledgePackLoader } from "../knowledge-packs/loader.server";
import * as assessmentRepo from "../assessment/repository.server";
import * as observationRepo from "../observations/repository.server";
import * as signalRepo from "../signals/repository.server";
import * as ruleRepo from "../rules/repository.server";
import * as patternRepo from "../patterns/repository.server";
import * as scoreRepo from "../scores/repository.server";
import * as narrativeRepo from "../narrative/repository.server";
import { resolveRecommendations } from "../recommendations/resolver.server";
import { SEVERITY_ORDER, type ObservationSeverity } from "../observations/types";
import type { Pattern } from "../patterns/types";
import type { Recommendation } from "../recommendations/types";
import type { Score } from "../scores/types";
import type {
  CapabilityCard,
  DashboardFilterOptions,
  DashboardHealth,
  DashboardPayload,
} from "./types";

/**
 * DashboardService — the consolidated read model behind
 * `GET /assessment/{id}/dashboard`.
 *
 * It aggregates the persisted output of every Intelligence Runtime engine into
 * a single payload. It performs no calculation: scores, confidences, patterns
 * and narrative text are copied verbatim from the engines that produced them.
 * The only derivation here is *selection* (which pack recommendation applies)
 * and *projection* (flattening a score into a capability card).
 */

export class DashboardServiceError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "DashboardServiceError";
  }
}

type Warning = { area: string; message: string };

async function safe<T>(
  area: string,
  warnings: Warning[],
  fallback: T,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[dashboard:${area}]`, error);
    warnings.push({
      area,
      message: error instanceof Error ? error.message : `Failed to load ${area}`,
    });
    return fallback;
  }
}

function strongest<T extends { confidence: number }>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items.reduce((best, item) => (item.confidence > best.confidence ? item : best));
}

function toCapabilityCard(
  score: Score,
  patterns: Pattern[],
  recommendations: Recommendation[],
): CapabilityCard {
  const supporting = patterns.filter((pattern) =>
    score.supportingPatternCodes.includes(pattern.patternCode),
  );
  const topPattern = strongest(supporting);
  const topRecommendation =
    recommendations.find((item) => item.dimension === score.scoreCode) ?? null;

  return {
    scoreId: score.id,
    scoreCode: score.scoreCode,
    dimension: score.dimension,
    percentage: score.percentage,
    overallScore: score.overallScore,
    maximumScore: score.maximumScore,
    maturityLevel: score.maturityLevel,
    confidence: score.confidence,
    evidenceCoverage: score.breakdown?.confidence?.coverage ?? 0,
    severity: score.severity,
    weight: score.weight,
    supportingPatternCodes: score.supportingPatternCodes,
    topPatternCode: topPattern?.patternCode ?? null,
    topPatternName: topPattern?.name ?? null,
    topRecommendationCode: topRecommendation?.code ?? null,
    topRecommendationTitle: topRecommendation?.title ?? null,
  };
}

function buildFilterOptions(
  capabilities: CapabilityCard[],
  patterns: Pattern[],
  recommendations: Recommendation[],
  severitiesPresent: Set<ObservationSeverity>,
): DashboardFilterOptions {
  const categories = new Set<string>();
  for (const pattern of patterns) categories.add(pattern.category);
  for (const item of recommendations) categories.add(item.category);

  return {
    capabilities: capabilities.map((card) => ({
      value: card.scoreCode,
      label: card.dimension,
    })),
    severities: SEVERITY_ORDER.filter((severity) => severitiesPresent.has(severity)),
    categories: [...categories].sort((a, b) => a.localeCompare(b)),
    priorities: (["critical", "high", "medium", "low"] as const).filter((priority) =>
      recommendations.some((item) => item.priority === priority),
    ),
    horizons: (["now", "next", "later"] as const).filter((horizon) =>
      recommendations.some((item) => item.horizon === horizon),
    ),
  };
}

/** Build the consolidated dashboard payload for one assessment. */
export async function getDashboard(
  assessmentId: string,
  ownerKey: string,
): Promise<DashboardPayload> {
  const session = await assessmentRepo.getSession(assessmentId, ownerKey);
  if (!session) throw new DashboardServiceError("Assessment not found", 404);

  const warnings: Warning[] = [];

  const [responses, stageRows, observations, signals, rules, patterns, scores, summary, narrative] =
    await Promise.all([
      safe("responses", warnings, [], () => assessmentRepo.getResponses(assessmentId)),
      safe("stages", warnings, [], () => assessmentRepo.getStageRows(assessmentId)),
      safe("observations", warnings, [], () => observationRepo.listObservations(assessmentId)),
      safe("signals", warnings, [], () => signalRepo.listSignals(assessmentId)),
      safe("rules", warnings, [], () => ruleRepo.listRuleResults(assessmentId)),
      safe("patterns", warnings, [], () => patternRepo.listPatterns(assessmentId)),
      safe("scores", warnings, [], () => scoreRepo.listScores(assessmentId)),
      safe("summary", warnings, null, () => scoreRepo.getSummary(assessmentId)),
      safe("narrative", warnings, null, () => narrativeRepo.getNarrativeForSession(assessmentId)),
    ]);

  const pack = knowledgePackLoader.loadActive();
  const recommendations = resolveRecommendations(pack, patterns, scores);
  const capabilities = scores
    .map((score) => toCapabilityCard(score, patterns, recommendations))
    .sort((a, b) => a.percentage - b.percentage);

  const severitiesPresent = new Set<ObservationSeverity>();
  for (const pattern of patterns) severitiesPresent.add(pattern.severity);
  for (const card of capabilities) severitiesPresent.add(card.severity);

  const health: DashboardHealth = {
    responses: responses.length,
    observations: observations.length,
    signals: signals.length,
    rules: rules.length,
    patterns: patterns.length,
    recommendations: recommendations.length,
    dimensions: scores.length,
    confidence: summary?.confidence ?? narrative?.confidence ?? 0,
  };

  return {
    generatedAt: new Date().toISOString(),
    assessment: {
      id: session.id,
      organisationName: session.organisationName,
      contactName: session.contactName,
      assessmentType: session.assessmentType,
      status: session.status,
      progress: session.progress,
      createdAt: session.createdAt,
      submittedAt: session.submittedAt,
      completedAt: session.completedAt,
    },
    knowledgePack: {
      id: pack.manifest.id,
      name: pack.manifest.name,
      version: pack.manifest.version,
    },
    stages: stageRows.map(assessmentRepo.toStageRun),
    narrative,
    overall: summary,
    capabilities,
    scores,
    patterns: [...patterns].sort((a, b) => b.confidence - a.confidence),
    rules,
    signals,
    observations,
    responses,
    recommendations,
    health,
    filterOptions: buildFilterOptions(capabilities, patterns, recommendations, severitiesPresent),
    warnings,
  };
}
