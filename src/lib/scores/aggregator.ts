import type { OverallScoreDefinition } from "../knowledge-packs/schema";
import { maturityCalculator, MaturityCalculator, type MaturityBand } from "./maturity-calculator";
import type { Score, ScoreSummaryEntity } from "./types";

/**
 * ScoreAggregator
 *
 * Single responsibility: roll the dimension scores up into the overall
 * assessment score using the weighting model declared by the Knowledge Pack
 * (`weighted-average` or `simple-average`). Adding a further model is a change
 * to this class alone; no other service is aware of aggregation.
 */

export interface AggregationInput {
  sessionId: string;
  knowledgePack: string;
  knowledgePackVersion: string;
  scores: Score[];
  definition: OverallScoreDefinition;
  defaultMaturityBands: MaturityBand[];
  patternCount: number;
  now: () => string;
}

const round2 = (value: number) => Math.round(value * 100) / 100;
const round4 = (value: number) => Math.round(value * 10_000) / 10_000;

export class ScoreAggregator {
  constructor(private readonly maturity: MaturityCalculator = maturityCalculator) {}

  aggregate(input: AggregationInput): ScoreSummaryEntity {
    const { definition, scores } = input;
    const simple = definition.weightingModel === "simple-average";

    const weightOf = (score: Score) => (simple ? 1 : score.weight || 0);
    const totalWeight = scores.reduce((sum, score) => sum + weightOf(score), 0);

    const percentage =
      totalWeight > 0
        ? round2(
            scores.reduce((sum, score) => sum + score.percentage * weightOf(score), 0) /
              totalWeight,
          )
        : 0;

    const overallScore = round2((percentage / 100) * definition.maximumScore);

    // Confidence in the aggregate follows the same weighting so a low-confidence
    // heavyweight dimension cannot be masked by confident minor dimensions.
    const confidence =
      totalWeight > 0
        ? round4(
            scores.reduce((sum, score) => sum + score.confidence * weightOf(score), 0) /
              totalWeight,
          )
        : 0;

    const bands = this.maturity.resolveBands(
      definition.maturityBands,
      input.defaultMaturityBands,
    );
    const maturity = this.maturity.calculate(percentage, bands);

    return {
      id: `${input.sessionId}:${definition.scoreCode}`,
      sessionId: input.sessionId,
      knowledgePack: input.knowledgePack,
      knowledgePackVersion: input.knowledgePackVersion,
      overallScore,
      maximumScore: definition.maximumScore,
      percentage,
      maturityLevel: maturity.level,
      confidence,
      dimensionCount: scores.length,
      patternCount: input.patternCount,
      breakdown: {
        weightingModel: definition.weightingModel,
        totalWeight: round4(totalWeight),
        dimensions: scores.map((score) => ({
          scoreCode: score.scoreCode,
          dimension: score.dimension,
          percentage: score.percentage,
          weight: score.weight,
          maturityLevel: score.maturityLevel,
          confidence: score.confidence,
        })),
      },
      createdAt: input.now(),
    };
  }
}

export const scoreAggregator = new ScoreAggregator();
