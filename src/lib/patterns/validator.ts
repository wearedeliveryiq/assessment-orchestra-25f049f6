import type { KnowledgePackDocument, PatternDefinition } from "../knowledge-packs/schema";

/**
 * PatternValidator
 *
 * Single responsibility: prove that the pattern definitions supplied by a
 * Knowledge Pack are semantically usable before the engine executes them.
 * Structural validation already happened in the loader; this checks unique
 * codes, resolvable rule references, operator/threshold coherence and declared
 * categories.
 */

export interface PatternValidationIssue {
  patternCode: string;
  message: string;
}

export interface PatternValidationResult {
  valid: PatternDefinition[];
  issues: PatternValidationIssue[];
}

const THRESHOLD_OPERATORS = new Set(["AT_LEAST", "EXACTLY"]);

export class PatternValidator {
  validate(pack: KnowledgePackDocument): PatternValidationResult {
    const definitions = pack.patterns.definitions ?? [];
    const ruleCodes = new Set((pack.rules.definitions ?? []).map((d) => d.ruleCode));
    const categories = new Set(pack.patterns.categories ?? []);

    const valid: PatternDefinition[] = [];
    const issues: PatternValidationIssue[] = [];
    const seen = new Set<string>();

    for (const definition of definitions) {
      const problems: string[] = [];

      if (seen.has(definition.patternCode)) problems.push("duplicate pattern code");

      const unknown = definition.requiredRules.filter((code) => !ruleCodes.has(code));
      if (unknown.length > 0) {
        problems.push(`unknown rule code(s): ${unknown.join(", ")}`);
      }

      if (THRESHOLD_OPERATORS.has(definition.logic)) {
        if (definition.threshold === undefined) {
          problems.push(`${definition.logic} requires a threshold`);
        } else if (definition.threshold > definition.requiredRules.length) {
          problems.push(
            `threshold (${definition.threshold}) exceeds the ${definition.requiredRules.length} referenced rule(s)`,
          );
        }
      }

      if (definition.businessImpact.trim().length === 0) {
        problems.push("businessImpact must not be empty");
      }

      if (categories.size > 0 && !categories.has(definition.category)) {
        problems.push(`category "${definition.category}" is not declared by the pack`);
      }

      if (problems.length > 0) {
        issues.push({ patternCode: definition.patternCode, message: problems.join("; ") });
        continue;
      }

      seen.add(definition.patternCode);
      valid.push(definition);
    }

    return { valid, issues };
  }
}

export const patternValidator = new PatternValidator();
