import type { AssessmentSession } from "../assessment/types";
import type { KnowledgePackDocument } from "../knowledge-packs/schema";
import type { Observation } from "../observations/types";
import { SignalEvaluator, signalEvaluator } from "./evaluator";
import { SignalValidator, signalValidator } from "./validator";
import type { Signal, SignalRunSummary } from "./types";

/**
 * SignalEngine
 *
 * Second stage of the DeliveryIQ reasoning pipeline. It consumes Observations
 * only — never questionnaire responses — and infers organisational Signals
 * using the definitions declared by the active Knowledge Pack.
 *
 * The engine is pure and side-effect free: persistence is the caller's job, so
 * it stays reusable, unit-testable and deterministic.
 */

export interface SignalEngineInput {
  session: Pick<AssessmentSession, "id">;
  observations: Observation[];
  pack: KnowledgePackDocument;
  now?: () => string;
}

export interface SignalEngineResult {
  signals: Signal[];
  summary: SignalRunSummary;
}

export class SignalEngine {
  constructor(
    private readonly evaluator: SignalEvaluator = signalEvaluator,
    private readonly validator: SignalValidator = signalValidator,
  ) {}

  async run(input: SignalEngineInput): Promise<SignalEngineResult> {
    const startedAt = Date.now();
    const now = input.now ?? (() => new Date().toISOString());
    const { pack, observations, session } = input;

    const { valid, issues } = this.validator.validate(pack);
    for (const issue of issues) {
      console.error("[signal-engine] invalid signal definition", issue.signalCode, issue.message);
    }

    const definitions = [...valid].sort((a, b) => a.code.localeCompare(b.code));
    const signals: Signal[] = [];
    const emitted = new Set<string>();
    const suppressed: { signalCode: string; reason: string }[] = issues.map((issue) => ({
      signalCode: issue.signalCode,
      message: issue.message,
      reason: `invalid definition: ${issue.message}`,
    })) as { signalCode: string; reason: string }[];
    const failed: { signalCode: string; error: string }[] = [];

    // Definitions are independent: evaluate concurrently, but keep the output
    // ordered by signal code so repeated runs are byte-identical.
    const evaluations = await Promise.all(
      definitions.map(async (definition) => {
        try {
          return { definition, evaluation: this.evaluator.evaluate(definition, observations) };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error("[signal-engine] signal failed", definition.code, message);
          failed.push({ signalCode: definition.code, error: message });
          return null;
        }
      }),
    );

    for (const entry of evaluations) {
      if (!entry) continue;
      const { definition, evaluation } = entry;

      if (!evaluation.met) {
        suppressed.push({ signalCode: definition.code, reason: evaluation.reason ?? "not met" });
        continue;
      }
      if (emitted.has(definition.code)) continue; // duplicate prevention
      emitted.add(definition.code);

      signals.push({
        id: `${session.id}:${definition.code}`,
        sessionId: session.id,
        knowledgePack: pack.manifest.id,
        knowledgePackVersion: pack.manifest.version,
        signalCode: definition.code,
        name: definition.name,
        category: definition.category,
        description: definition.description,
        supportingObservationIds: evaluation.matched.map((observation) => observation.id),
        supportingDefinitionIds: evaluation.matched.map((o) => o.definitionId),
        confidence: evaluation.confidence,
        severity: evaluation.severity,
        weight: definition.weight,
        ruleExpression: evaluation.expression,
        createdAt: now(),
      });
    }

    signals.sort((a, b) => a.signalCode.localeCompare(b.signalCode));
    suppressed.sort((a, b) => a.signalCode.localeCompare(b.signalCode));

    return {
      signals,
      summary: {
        sessionId: session.id,
        knowledgePack: pack.manifest.id,
        knowledgePackVersion: pack.manifest.version,
        observationsConsidered: observations.length,
        evaluated: definitions.length,
        generated: signals.length,
        suppressed,
        failed,
        durationMs: Date.now() - startedAt,
      },
    };
  }
}

export const signalEngine = new SignalEngine();
