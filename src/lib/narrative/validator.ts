import type { NarrativeConfig } from "../knowledge-packs/schema";
import type {
  NarrativeSection,
  NarrativeValidationIssue,
  NarrativeValidationResult,
} from "./types";

/**
 * NarrativeValidator
 *
 * Single responsibility: enforce the pack's narrative quality policy —
 * required sections present, no unresolved template tokens, evidence attached,
 * word ranges respected, banned phrases absent and confidence above the floor.
 * Structural breaches invalidate the narrative; stylistic ones are warnings.
 */
export class NarrativeValidator {
  validate(
    sections: NarrativeSection[],
    config: NarrativeConfig,
    confidence: number,
  ): NarrativeValidationResult {
    const issues: NarrativeValidationIssue[] = [];
    const warnings: NarrativeValidationIssue[] = [];
    const policy = config.validation;
    const byKey = new Map(sections.map((section) => [section.key, section]));

    for (const key of policy.requiredSections) {
      if (!byKey.has(key)) {
        issues.push({ sectionKey: key, code: "missing_section", message: `Section "${key}" is missing` });
      }
    }

    for (const section of sections) {
      if (!section.body.trim()) {
        issues.push({
          sectionKey: section.key,
          code: "empty_section",
          message: `Section "${section.key}" produced no prose`,
        });
        continue;
      }

      const unresolved = section.body.match(/\{(\w+)\}/g);
      if (unresolved) {
        issues.push({
          sectionKey: section.key,
          code: "unresolved_token",
          message: `Unresolved template token(s): ${[...new Set(unresolved)].join(", ")}`,
        });
      }

      if (policy.requireEvidence && section.evidence.length === 0) {
        issues.push({
          sectionKey: section.key,
          code: "no_evidence",
          message: `Section "${section.key}" cites no evidence`,
        });
      }

      const definition = config.sections.find((d) => d.key === section.key);
      if (definition) {
        if (section.wordCount < definition.minWords) {
          warnings.push({
            sectionKey: section.key,
            code: "too_short",
            message: `${section.wordCount} words is below the ${definition.minWords} word minimum`,
          });
        }
        if (section.wordCount > definition.maxWords) {
          warnings.push({
            sectionKey: section.key,
            code: "too_long",
            message: `${section.wordCount} words exceeds the ${definition.maxWords} word maximum`,
          });
        }
      }

      const lower = section.body.toLowerCase();
      for (const phrase of policy.bannedPhrases) {
        if (lower.includes(phrase.toLowerCase())) {
          issues.push({
            sectionKey: section.key,
            code: "banned_phrase",
            message: `Contains banned phrase "${phrase}"`,
          });
        }
      }
    }

    if (confidence < policy.minConfidence) {
      warnings.push({
        sectionKey: null,
        code: "low_confidence",
        message: `Narrative confidence ${confidence.toFixed(2)} is below the ${policy.minConfidence} floor`,
      });
    }

    return { valid: issues.length === 0, issues, warnings };
  }
}

export const narrativeValidator = new NarrativeValidator();
