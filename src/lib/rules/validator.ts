import type { KnowledgePackDocument, RuleDefinition } from "../knowledge-packs/schema";

/**
 * RuleValidator
 *
 * Single responsibility: prove that the rule definitions supplied by a
 * Knowledge Pack are semantically usable before the engine executes them.
 * Structural validation already happened in the loader; this checks unique
 * codes, resolvable signal references, operator/threshold coherence and
 * declared categories.
 */

export interface RuleValidationIssue {
  ruleCode: string;
  message: string;
}

export interface RuleValidationResult {
  valid: RuleDefinition[];
  issues: RuleValidationIssue[];
}

const THRESHOLD_OPERATORS = new Set(["AT_LEAST", "EXACTLY"]);

export class RuleValidator {
  validate(pack: KnowledgePackDocument): RuleValidationResult {
    const definitions = pack.rules.definitions ?? [];
    const signalCodes = new Set((pack.signals.definitions ?? []).map((d) => d.code));
    const categories = new Set(pack.rules.categories ?? []);

    const valid: RuleDefinition[] = [];
    const issues: RuleValidationIssue[] = [];
    const seen = new Set<string>();

    for (const definition of definitions) {
      const problems: string[] = [];

      if (seen.has(definition.ruleCode)) problems.push("duplicate rule code");

      const unknown = definition.signals.filter((code) => !signalCodes.has(code));
      if (unknown.length > 0) {
        problems.push(`unknown signal code(s): ${unknown.join(", ")}`);
      }

      if (THRESHOLD_OPERATORS.has(definition.logic)) {
        if (definition.threshold === undefined) {
          problems.push(`${definition.logic} requires a threshold`);
        } else if (definition.threshold > definition.signals.length) {
          problems.push(
            `threshold (${definition.threshold}) exceeds the ${definition.signals.length} referenced signal(s)`,
          );
        }
      }

      if (categories.size > 0 && !categories.has(definition.category)) {
        problems.push(`category "${definition.category}" is not declared by the pack`);
      }

      if (problems.length > 0) {
        issues.push({ ruleCode: definition.ruleCode, message: problems.join("; ") });
        continue;
      }

      seen.add(definition.ruleCode);
      valid.push(definition);
    }

    return { valid, issues };
  }
}

export const ruleValidator = new RuleValidator();
