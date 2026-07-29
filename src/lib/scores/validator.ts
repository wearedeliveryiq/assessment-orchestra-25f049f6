import type { KnowledgePackDocument, ScoreDefinition } from "../knowledge-packs/schema";

/**
 * ScoreValidator
 *
 * Single responsibility: prove the scoring model supplied by a Knowledge Pack
 * is semantically usable before the engine executes it. Structural validation
 * already happened in the loader; this checks unique score codes, resolvable
 * pattern references, coherent score ranges and usable maturity bands.
 */

export interface ScoreValidationIssue {
  scoreCode: string;
  message: string;
}

export interface ScoreValidationResult {
  valid: ScoreDefinition[];
  issues: ScoreValidationIssue[];
}

export class ScoreValidator {
  validate(pack: KnowledgePackDocument): ScoreValidationResult {
    const definitions = pack.scoring.dimensions ?? [];
    const patternCodes = new Set((pack.patterns.definitions ?? []).map((d) => d.patternCode));
    const defaultBands = pack.scoring.defaults?.maturityBands ?? [];

    const valid: ScoreDefinition[] = [];
    const issues: ScoreValidationIssue[] = [];
    const seen = new Set<string>();

    for (const definition of definitions) {
      const problems: string[] = [];

      if (seen.has(definition.scoreCode)) problems.push("duplicate score code");

      const unknown = definition.patterns.filter((code) => !patternCodes.has(code));
      if (unknown.length > 0) problems.push(`unknown pattern code(s): ${unknown.join(", ")}`);

      if (definition.maximumScore <= 0) problems.push("maximumScore must be greater than zero");

      if (definition.baseScore !== undefined) {
        if (definition.baseScore < 0 || definition.baseScore > definition.maximumScore) {
          problems.push(
            `baseScore (${definition.baseScore}) must sit between 0 and maximumScore (${definition.maximumScore})`,
          );
        }
      }

      const bands =
        definition.maturityBands && definition.maturityBands.length > 0
          ? definition.maturityBands
          : defaultBands;
      if (bands.length === 0) {
        problems.push("no maturity bands declared on the dimension or pack defaults");
      }

      const impactCodes = Object.keys(definition.patternImpacts);
      const orphanImpacts = impactCodes.filter((code) => !definition.patterns.includes(code));
      if (orphanImpacts.length > 0) {
        problems.push(`patternImpacts reference undeclared pattern(s): ${orphanImpacts.join(", ")}`);
      }

      if (problems.length > 0) {
        issues.push({ scoreCode: definition.scoreCode, message: problems.join("; ") });
        continue;
      }

      seen.add(definition.scoreCode);
      valid.push(definition);
    }

    return { valid, issues };
  }
}

export const scoreValidator = new ScoreValidator();
