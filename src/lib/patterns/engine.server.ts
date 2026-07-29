import type { AssessmentSession } from "../assessment/types";
import type { KnowledgePackDocument } from "../knowledge-packs/schema";
import type { RuleResult } from "../rules/types";
import { PatternEvaluator, patternEvaluator } from "./evaluator";
import { PatternValidator, patternValidator } from "./validator";
import type { Pattern, PatternRunSummary } from "./types";

/**
 * PatternEngine
 *
 * Fourth stage of the DeliveryIQ reasoning pipeline. It consumes Rule Results
 * ONLY — never signals, observations or questionnaire responses — and evaluates
 * the declarative pattern definitions of the active Knowledge Pack.
 *
 * Pure and side-effect free: persistence belongs to the PatternExecutionService,
 * keeping the engine deterministic and trivially unit-testable.
 */

export interface PatternEngineInput {
  session: Pick<AssessmentSession, "id">;
  rules: RuleResult[];
  pack: KnowledgePackDocument;
  now?: () => string;
}

export interface PatternEngineResult {
  patterns: Pattern[];
  summary: PatternRunSummary;
}

export class PatternEngine {
  constructor(
    private readonly evaluator: PatternEvaluator = patternEvaluator,
    private readonly validator: PatternValidator = patternValidator,
  ) {}

  async run(input: PatternEngineInput): Promise<PatternEngineResult> {
    const startedAt = Date.now();
    const now = input.now ?? (() => new Date().toISOString());
    const { pack, rules, session } = input;

    const { valid, issues } = this.validator.validate(pack);
    for (const issue of issues) {
      console.error("[pattern-engine] invalid pattern definition", issue.patternCode, issue.message);
    }

    const definitions = [...valid].sort((a, b) => a.patternCode.localeCompare(b.patternCode));
    const errored: { patternCode: string; error: string }[] = [];
    const emitted = new Set<string>();
    const patterns: Pattern[] = [];
    let discarded = 0;

    // Patterns are independent — evaluate concurrently, then order by pattern
    // code so repeated executions are byte-identical. A failure in one pattern
    // never stops the remaining patterns from being generated.
    const evaluations = await Promise.all(
      definitions.map(async (definition) => {
        try {
          return this.evaluator.evaluate(definition, rules);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error("[pattern-engine] pattern failed", definition.patternCode, message);
          errored.push({ patternCode: definition.patternCode, error: message });
          return null;
        }
      }),
    );

    for (const evaluation of evaluations) {
      if (!evaluation) continue;
      const { definition } = evaluation;

      if (!evaluation.satisfied) {
        discarded += 1;
        continue;
      }
      if (emitted.has(definition.patternCode)) continue; // duplicate prevention
      emitted.add(definition.patternCode);

      patterns.push({
        id: `${session.id}:${definition.patternCode}`,
        sessionId: session.id,
        knowledgePack: pack.manifest.id,
        knowledgePackVersion: pack.manifest.version,
        patternCode: definition.patternCode,
        name: definition.name,
        category: definition.category,
        description: definition.description,
        businessImpact: definition.businessImpact,
        confidence: evaluation.confidence,
        severity: evaluation.severity,
        weight: definition.weight,
        supportingRuleIds: evaluation.matched.map((rule) => rule.id),
        supportingRuleCodes: evaluation.matched.map((rule) => rule.ruleCode),
        patternExpression: evaluation.expression,
        evaluationReason: evaluation.reason,
        createdAt: now(),
      });
    }

    patterns.sort((a, b) => a.patternCode.localeCompare(b.patternCode));

    return {
      patterns,
      summary: {
        sessionId: session.id,
        knowledgePack: pack.manifest.id,
        knowledgePackVersion: pack.manifest.version,
        rulesConsidered: rules.length,
        evaluated: definitions.length,
        matched: patterns.length,
        discarded,
        invalid: issues.map((issue) => ({
          patternCode: issue.patternCode,
          message: issue.message,
        })),
        errored,
        durationMs: Date.now() - startedAt,
      },
    };
  }
}

export const patternEngine = new PatternEngine();
