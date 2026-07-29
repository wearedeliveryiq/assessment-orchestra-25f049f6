import type { KnowledgePackDocument, SignalDefinition } from "../knowledge-packs/schema";

/**
 * SignalValidator
 *
 * Single responsibility: prove that the signal definitions supplied by a
 * Knowledge Pack are internally consistent before the engine runs them.
 * Structural (type) validation already happened in the loader; this validates
 * semantics — unique codes, resolvable observation references, sane thresholds.
 */

export interface SignalValidationIssue {
  signalCode: string;
  message: string;
}

export interface SignalValidationResult {
  valid: SignalDefinition[];
  issues: SignalValidationIssue[];
}

export class SignalValidator {
  validate(pack: KnowledgePackDocument): SignalValidationResult {
    const definitions = pack.signals.definitions ?? [];
    const observationIds = new Set(pack.observations.definitions.map((d) => d.id));
    const categories = new Set(pack.signals.categories ?? []);

    const valid: SignalDefinition[] = [];
    const issues: SignalValidationIssue[] = [];
    const seenCodes = new Set<string>();

    for (const definition of definitions) {
      const problems: string[] = [];

      if (seenCodes.has(definition.code)) {
        problems.push("duplicate signal code");
      }

      const { observationIds: refs, definitionIdMatches, minMatches } = definition.match;
      const unknown = refs.filter((id) => !observationIds.has(id));
      if (unknown.length > 0) {
        problems.push(`unknown observation definition(s): ${unknown.join(", ")}`);
      }

      if (refs.length === 0 && !definitionIdMatches && !definition.match.severityIn && !definition.match.categoryIn) {
        problems.push("no observation selector declared");
      }

      if (definitionIdMatches) {
        try {
          new RegExp(definitionIdMatches);
        } catch {
          problems.push(`invalid definitionIdMatches regex: ${definitionIdMatches}`);
        }
      }

      if (refs.length > 0 && minMatches > refs.length && !definitionIdMatches) {
        problems.push(`minMatches (${minMatches}) exceeds the number of referenced observations`);
      }

      if (categories.size > 0 && !categories.has(definition.category)) {
        problems.push(`category "${definition.category}" is not declared by the pack`);
      }

      if (problems.length > 0) {
        issues.push({ signalCode: definition.code, message: problems.join("; ") });
        continue;
      }

      seenCodes.add(definition.code);
      valid.push(definition);
    }

    return { valid, issues };
  }
}

export const signalValidator = new SignalValidator();
