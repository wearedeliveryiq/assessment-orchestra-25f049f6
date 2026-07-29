import type { AssessmentSession } from "../assessment/types";
import type { KnowledgePackDocument } from "../knowledge-packs/schema";
import type { Signal } from "../signals/types";
import { RuleEvaluator, ruleEvaluator } from "./evaluator";
import { RuleValidator, ruleValidator } from "./validator";
import type { RuleResult, RuleRunSummary } from "./types";

/**
 * RuleEngine
 *
 * Third stage of the DeliveryIQ reasoning pipeline. It consumes Signals only —
 * never observations or questionnaire responses — and evaluates the declarative
 * rule definitions of the active Knowledge Pack.
 *
 * Pure and side-effect free: persistence belongs to the RuleExecutionService,
 * keeping the engine deterministic and trivially unit-testable.
 */

export interface RuleEngineInput {
  session: Pick<AssessmentSession, "id">;
  signals: Signal[];
  pack: KnowledgePackDocument;
  now?: () => string;
}

export interface RuleEngineResult {
  results: RuleResult[];
  summary: RuleRunSummary;
}

export class RuleEngine {
  constructor(
    private readonly evaluator: RuleEvaluator = ruleEvaluator,
    private readonly validator: RuleValidator = ruleValidator,
  ) {}

  async run(input: RuleEngineInput): Promise<RuleEngineResult> {
    const startedAt = Date.now();
    const now = input.now ?? (() => new Date().toISOString());
    const { pack, signals, session } = input;

    const { valid, issues } = this.validator.validate(pack);
    for (const issue of issues) {
      console.error("[rule-engine] invalid rule definition", issue.ruleCode, issue.message);
    }

    const definitions = [...valid].sort((a, b) => a.ruleCode.localeCompare(b.ruleCode));
    const errored: { ruleCode: string; error: string }[] = [];
    const emitted = new Set<string>();
    const results: RuleResult[] = [];

    // Rules are independent — evaluate concurrently, then order by rule code so
    // repeated executions are byte-identical.
    const evaluations = await Promise.all(
      definitions.map(async (definition) => {
        try {
          return this.evaluator.evaluate(definition, signals);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error("[rule-engine] rule failed", definition.ruleCode, message);
          errored.push({ ruleCode: definition.ruleCode, error: message });
          return null;
        }
      }),
    );

    for (const evaluation of evaluations) {
      if (!evaluation) continue;
      const { definition } = evaluation;
      if (emitted.has(definition.ruleCode)) continue; // duplicate prevention
      emitted.add(definition.ruleCode);

      results.push({
        id: `${session.id}:${definition.ruleCode}`,
        sessionId: session.id,
        knowledgePack: pack.manifest.id,
        knowledgePackVersion: pack.manifest.version,
        ruleCode: definition.ruleCode,
        name: definition.name,
        description: definition.description,
        category: definition.category,
        status: evaluation.status,
        confidence: evaluation.confidence,
        severity: definition.severity,
        supportingSignalIds: evaluation.matched.map((signal) => signal.id),
        supportingSignalCodes: evaluation.matched.map((signal) => signal.signalCode),
        evaluationReason: evaluation.reason,
        ruleExpression: evaluation.expression,
        weight: definition.weight,
        executedAt: now(),
      });
    }

    results.sort((a, b) => a.ruleCode.localeCompare(b.ruleCode));
    const countBy = (status: string) => results.filter((r) => r.status === status).length;

    return {
      results,
      summary: {
        sessionId: session.id,
        knowledgePack: pack.manifest.id,
        knowledgePackVersion: pack.manifest.version,
        signalsConsidered: signals.length,
        evaluated: definitions.length,
        passed: countBy("passed"),
        failed: countBy("failed"),
        warning: countBy("warning"),
        notEvaluated: countBy("not_evaluated"),
        invalid: issues.map((issue) => ({ ruleCode: issue.ruleCode, message: issue.message })),
        errored,
        durationMs: Date.now() - startedAt,
      },
    };
  }
}

export const ruleEngine = new RuleEngine();
