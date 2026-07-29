import type { AssessmentResponse, AssessmentSession } from "../assessment/types";
import type {
  KnowledgePackDocument,
  ObservationDefinition,
  PackCondition,
} from "../knowledge-packs/schema";
import type { Observation, ObservationRunSummary } from "./types";

/**
 * ObservationEngine
 *
 * Converts assessment responses into structured Observations using only the
 * configuration supplied by the active Knowledge Pack. There is no hard-coded
 * business logic in this file: thresholds, wording, severity, confidence and
 * weighting all come from observations.json.
 */

export interface ObservationEngineInput {
  session: Pick<AssessmentSession, "id">;
  responses: AssessmentResponse[];
  pack: KnowledgePackDocument;
  now?: () => string;
}

export interface ObservationEngineResult {
  observations: Observation[];
  summary: ObservationRunSummary;
}

interface Answer {
  value: number | string | null;
  label: string | null;
  numeric: number | null;
  answered: boolean;
}

export function describeCondition(condition: PackCondition): string {
  switch (condition.operator) {
    case "between":
      return `value between ${condition.value} and ${condition.max}`;
    case "any":
      return "any answer";
    case "answered":
      return "question answered";
    case "unanswered":
      return "question not answered";
    default:
      return `value ${condition.operator} ${condition.value}`;
  }
}

export function evaluateCondition(condition: PackCondition, answer: Answer): boolean {
  if (condition.operator === "unanswered") return !answer.answered;
  if (condition.operator === "answered") return answer.answered;
  if (!answer.answered) return false;
  if (condition.operator === "any") return true;

  const actual = answer.numeric;
  if (actual === null) return false;
  const expected = condition.value ?? 0;

  switch (condition.operator) {
    case "lt":
      return actual < expected;
    case "lte":
      return actual <= expected;
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "gte":
      return actual >= expected;
    case "gt":
      return actual > expected;
    case "between":
      return actual >= expected && actual <= (condition.max ?? expected);
    default:
      return false;
  }
}

function renderTemplate(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => tokens[key] ?? `{${key}}`);
}

export class ObservationEngine {
  /**
   * Deterministic, side-effect free generation. Persistence is the caller's
   * responsibility so the engine stays reusable and unit-testable.
   */
  async run(input: ObservationEngineInput): Promise<ObservationEngineResult> {
    const startedAt = Date.now();
    const now = input.now ?? (() => new Date().toISOString());
    const { pack, responses, session } = input;
    const packId = pack.manifest.id;
    const packVersion = pack.manifest.version;

    const questionIndex = new Map(pack.questions.questions.map((q) => [q.id, q]));
    const responseIndex = new Map(responses.map((r) => [r.questionId, r]));

    const observations: Observation[] = [];
    const seen = new Set<string>();
    const failed: { definitionId: string; error: string }[] = [];
    let skipped = 0;

    const definitions = [...pack.observations.definitions].sort((a, b) =>
      a.id.localeCompare(b.id),
    );

    for (const definition of definitions) {
      try {
        const question = questionIndex.get(definition.questionId);
        const response = responseIndex.get(definition.questionId);
        const numeric =
          typeof response?.score === "number"
            ? response.score
            : typeof response?.value === "number"
              ? response.value
              : null;
        const answer: Answer = {
          value: response?.value ?? null,
          numeric,
          label:
            question?.options.find((option) => option.value === numeric)?.label ??
            (response?.value != null ? String(response.value) : null),
          answered: response !== undefined && response.value !== null,
        };

        if (!evaluateCondition(definition.when, answer)) {
          skipped += 1;
          continue;
        }

        const key = `${session.id}::${definition.id}`;
        if (seen.has(key)) {
          skipped += 1;
          continue;
        }
        seen.add(key);

        observations.push(
          this.buildObservation({ definition, packId, packVersion, session, question, answer, now }),
        );
      } catch (error) {
        // A single bad definition must never stop the run.
        const message = error instanceof Error ? error.message : "Unknown observation failure";
        failed.push({ definitionId: definition.id, error: message });
        console.error("[observation-engine] definition failed", definition.id, message);
      }
    }

    observations.sort(
      (a, b) =>
        a.category.localeCompare(b.category) ||
        a.questionId.localeCompare(b.questionId) ||
        a.definitionId.localeCompare(b.definitionId),
    );

    return {
      observations,
      summary: {
        sessionId: session.id,
        knowledgePack: packId,
        knowledgePackVersion: packVersion,
        generated: observations.length,
        skipped,
        failed,
        durationMs: Date.now() - startedAt,
      },
    };
  }

  private buildObservation(args: {
    definition: ObservationDefinition;
    packId: string;
    packVersion: string;
    session: Pick<AssessmentSession, "id">;
    question: { id: string; prompt: string } | undefined;
    answer: Answer;
    now: () => string;
  }): Observation {
    const { definition, packId, packVersion, session, question, answer, now } = args;
    const evidence = renderTemplate(definition.evidenceTemplate, {
      prompt: question?.prompt ?? definition.questionId,
      question: question?.prompt ?? definition.questionId,
      questionId: definition.questionId,
      answerLabel: answer.label ?? "no answer",
      value: answer.numeric === null ? "–" : String(answer.numeric),
      category: definition.category,
    });

    return {
      id: `${session.id}::${definition.id}`,
      sessionId: session.id,
      knowledgePack: packId,
      knowledgePackVersion: packVersion,
      definitionId: definition.id,
      questionId: definition.questionId,
      category: definition.category,
      title: definition.title,
      description: definition.description,
      evidence,
      severity: definition.severity,
      confidence: definition.confidence,
      weight: definition.weight,
      sourceValue: answer.numeric ?? answer.value,
      sourceLabel: answer.label,
      ruleExpression: `${definition.id}: ${definition.questionId} where ${describeCondition(definition.when)}`,
      createdAt: now(),
    };
  }
}

export const observationEngine = new ObservationEngine();
