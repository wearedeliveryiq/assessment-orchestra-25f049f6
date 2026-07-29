import type { AssessmentSession } from "../assessment/types";
import type { KnowledgePackDocument } from "../knowledge-packs/schema";
import type { Pattern } from "../patterns/types";
import { ScoreAggregator, scoreAggregator } from "./aggregator";
import { ScoreCalculator, scoreCalculator } from "./calculator";
import { ScoreValidator, scoreValidator } from "./validator";
import type { Score, ScoreRunSummary, ScoreSummaryEntity } from "./types";

/**
 * ScoringEngine
 *
 * Fifth stage of the DeliveryIQ reasoning pipeline. It consumes Patterns ONLY —
 * never rules, signals, observations or questionnaire responses — and applies
 * the declarative scoring model of the active Knowledge Pack.
 *
 * Pure and side-effect free: persistence belongs to the ScoreExecutionService,
 * keeping the engine deterministic and trivially unit-testable. Dimensions are
 * independent, so they are calculated concurrently; a failure in one dimension
 * never stops the remaining dimensions from being scored.
 */

export interface ScoringEngineInput {
  session: Pick<AssessmentSession, "id"> & { progress?: number };
  patterns: Pattern[];
  pack: KnowledgePackDocument;
  now?: () => string;
}

export interface ScoringEngineResult {
  scores: Score[];
  summary: ScoreSummaryEntity;
  runSummary: ScoreRunSummary;
}

export class ScoringEngine {
  constructor(
    private readonly calculator: ScoreCalculator = scoreCalculator,
    private readonly aggregator: ScoreAggregator = scoreAggregator,
    private readonly validator: ScoreValidator = scoreValidator,
  ) {}

  async run(input: ScoringEngineInput): Promise<ScoringEngineResult> {
    const startedAt = Date.now();
    const now = input.now ?? (() => new Date().toISOString());
    const { pack, patterns, session } = input;

    const { valid, issues } = this.validator.validate(pack);
    for (const issue of issues) {
      console.error("[scoring-engine] invalid score definition", issue.scoreCode, issue.message);
    }

    const definitions = [...valid].sort((a, b) => a.scoreCode.localeCompare(b.scoreCode));
    const defaults = pack.scoring.defaults ?? { severityMultipliers: {}, maturityBands: [] };
    const assessmentCompleteness = Math.min(1, Math.max(0, (session.progress ?? 100) / 100));

    const errored: { scoreCode: string; error: string }[] = [];
    const emitted = new Set<string>();
    const scores: Score[] = [];

    const calculations = await Promise.all(
      definitions.map(async (definition) => {
        try {
          return this.calculator.calculate({
            definition,
            patterns,
            defaultSeverityMultipliers: defaults.severityMultipliers,
            defaultMaturityBands: defaults.maturityBands,
            assessmentCompleteness,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error("[scoring-engine] score failed", definition.scoreCode, message);
          errored.push({ scoreCode: definition.scoreCode, error: message });
          return null;
        }
      }),
    );

    for (const calculation of calculations) {
      if (!calculation) continue;
      const { definition } = calculation;
      if (emitted.has(definition.scoreCode)) continue; // duplicate prevention
      emitted.add(definition.scoreCode);

      scores.push({
        id: `${session.id}:${definition.scoreCode}`,
        sessionId: session.id,
        knowledgePack: pack.manifest.id,
        knowledgePackVersion: pack.manifest.version,
        scoreCode: definition.scoreCode,
        dimension: definition.dimension,
        overallScore: calculation.overallScore,
        maximumScore: calculation.maximumScore,
        percentage: calculation.percentage,
        maturityLevel: calculation.maturityLevel,
        confidence: calculation.confidence,
        severity: calculation.severity,
        weight: definition.weight,
        supportingPatternIds: calculation.supporting.map((pattern) => pattern.id),
        supportingPatternCodes: calculation.supporting.map((pattern) => pattern.patternCode),
        calculationReason: calculation.reason,
        scoreExpression: calculation.expression,
        breakdown: calculation.breakdown,
        createdAt: now(),
      });
    }

    scores.sort((a, b) => a.scoreCode.localeCompare(b.scoreCode));

    const summary = this.aggregator.aggregate({
      sessionId: session.id,
      knowledgePack: pack.manifest.id,
      knowledgePackVersion: pack.manifest.version,
      scores,
      definition: pack.scoring.overall,
      defaultMaturityBands: defaults.maturityBands,
      patternCount: patterns.length,
      now,
    });

    return {
      scores,
      summary,
      runSummary: {
        sessionId: session.id,
        knowledgePack: pack.manifest.id,
        knowledgePackVersion: pack.manifest.version,
        patternsConsidered: patterns.length,
        evaluated: definitions.length,
        calculated: scores.length,
        invalid: issues.map((issue) => ({ scoreCode: issue.scoreCode, message: issue.message })),
        errored,
        durationMs: Date.now() - startedAt,
      },
    };
  }
}

export const scoringEngine = new ScoringEngine();
