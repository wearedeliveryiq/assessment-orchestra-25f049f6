import {
  PACK_FILE_SCHEMAS,
  REQUIRED_PACK_FILES,
  type KnowledgePackDocument,
} from "./schema";
import {
  RUNTIME_SCHEMA_VERSION,
  SUPPORTED_ENGINES,
  type DiscoveredPack,
  type PackCounts,
  type ValidationIssue,
  type ValidationReport,
} from "./runtime-types";
import { isValidVersion } from "./version-manager";

/**
 * KnowledgePackValidator
 *
 * Runs three layers of validation, all framework agnostic:
 *  1. Manifest validation   — identity, semver, lifecycle, declared files.
 *  2. Schema validation     — every required file parsed with its Zod schema.
 *  3. Cross-reference checks — every id referenced across files must resolve.
 *
 * A pack with any `error` issue is never loaded into the registry as usable;
 * `warning` issues surface in the Explorer but do not block activation.
 */
export class KnowledgePackValidator {
  validate(pack: DiscoveredPack): {
    report: ValidationReport;
    document: KnowledgePackDocument | null;
    counts: PackCounts | null;
  } {
    const started = Date.now();
    const issues: ValidationIssue[] = [];

    // ---------- 1. required files ----------
    for (const file of REQUIRED_PACK_FILES) {
      if (pack.files[file] === undefined) {
        issues.push({
          severity: "error",
          code: "files.missing",
          file,
          message: `Required file "${file}" is missing from the pack`,
        });
      }
    }

    if (issues.length > 0) {
      return {
        report: this.report(pack.packId, pack.directoryVersion, issues, started),
        document: null,
        counts: null,
      };
    }

    // ---------- 2. schema validation ----------
    const parsed: Record<string, unknown> = {};
    for (const file of REQUIRED_PACK_FILES) {
      const result = PACK_FILE_SCHEMAS[file].safeParse(pack.files[file]);
      if (!result.success) {
        for (const issue of result.error.issues.slice(0, 25)) {
          issues.push({
            severity: "error",
            code: "schema.invalid",
            file,
            path: issue.path.join("."),
            message: issue.message,
          });
        }
        continue;
      }
      parsed[file.replace(".json", "")] = result.data;
    }

    if (issues.some((issue) => issue.severity === "error")) {
      return {
        report: this.report(pack.packId, pack.directoryVersion, issues, started),
        document: null,
        counts: null,
      };
    }

    const document = {
      manifest: parsed.manifest,
      questions: parsed.questions,
      observations: parsed.observations,
      signals: parsed.signals,
      rules: parsed.rules,
      patterns: parsed.patterns,
      recommendations: parsed.recommendations,
      narratives: parsed.narratives,
      scoring: parsed.scoring,
    } as KnowledgePackDocument;

    // ---------- 3. manifest semantics ----------
    const manifest = document.manifest;

    if (manifest.id !== pack.packId) {
      issues.push({
        severity: "error",
        code: "manifest.id-mismatch",
        file: "manifest.json",
        message: `Manifest declares id "${manifest.id}" but lives in directory "${pack.packId}"`,
      });
    }

    if (!isValidVersion(manifest.version)) {
      issues.push({
        severity: "error",
        code: "manifest.invalid-version",
        file: "manifest.json",
        message: `Version "${manifest.version}" is not a valid major.minor.patch version`,
      });
    }

    if (pack.directoryVersion && pack.directoryVersion !== manifest.version) {
      issues.push({
        severity: "error",
        code: "manifest.version-mismatch",
        file: "manifest.json",
        message: `Manifest version "${manifest.version}" does not match version directory "${pack.directoryVersion}"`,
      });
    }

    if (manifest.schemaVersion > RUNTIME_SCHEMA_VERSION) {
      issues.push({
        severity: "error",
        code: "manifest.unsupported-schema",
        file: "manifest.json",
        message: `Pack requires schema version ${manifest.schemaVersion}; this runtime supports ${RUNTIME_SCHEMA_VERSION}`,
      });
    }

    if (manifest.minSchemaVersion && manifest.minSchemaVersion > RUNTIME_SCHEMA_VERSION) {
      issues.push({
        severity: "error",
        code: "manifest.unsupported-schema",
        file: "manifest.json",
        message: `Pack requires runtime schema >= ${manifest.minSchemaVersion}`,
      });
    }

    for (const file of manifest.files) {
      if (pack.files[file] === undefined) {
        issues.push({
          severity: "warning",
          code: "manifest.declared-file-missing",
          file: "manifest.json",
          message: `Manifest declares "${file}" but the file was not discovered`,
        });
      }
    }

    for (const engine of manifest.engines) {
      if (!SUPPORTED_ENGINES.includes(engine as (typeof SUPPORTED_ENGINES)[number])) {
        issues.push({
          severity: "warning",
          code: "manifest.unknown-engine",
          file: "manifest.json",
          message: `Manifest declares unknown engine "${engine}"`,
        });
      }
    }

    for (const dependency of manifest.dependencies) {
      if (dependency.packId === manifest.id) {
        issues.push({
          severity: "error",
          code: "manifest.self-dependency",
          file: "manifest.json",
          message: `Pack declares a dependency on itself`,
        });
      }
    }

    // ---------- 4. cross references ----------
    issues.push(...this.crossReferences(document));

    return {
      report: this.report(pack.packId, manifest.version, issues, started),
      document,
      counts: countPack(document),
    };
  }

  /** Dependency resolution across the whole registry, run after every pack is parsed. */
  crossReferences(document: KnowledgePackDocument): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const add = (code: string, file: string, message: string, severity: "error" | "warning" = "error") =>
      issues.push({ severity, code, file, message });

    const sectionIds = new Set(document.questions.sections.map((s) => s.id));
    const questionIds = new Set(document.questions.questions.map((q) => q.id));
    const observationIds = new Set(document.observations.definitions.map((o) => o.id));
    const signalCodes = new Set(document.signals.definitions.map((s) => s.code));
    const ruleCodes = new Set(document.rules.definitions.map((r) => r.ruleCode));
    const patternCodes = new Set(document.patterns.definitions.map((p) => p.patternCode));
    const scoreCodes = new Set(document.scoring.dimensions.map((d) => d.scoreCode));

    for (const question of document.questions.questions) {
      if (!sectionIds.has(question.sectionId)) {
        add("crossref.missing-section", "questions.json", `Question "${question.id}" references unknown section "${question.sectionId}"`);
      }
    }

    for (const observation of document.observations.definitions) {
      if (!questionIds.has(observation.questionId)) {
        add("crossref.missing-question", "observations.json", `Observation "${observation.id}" references unknown question "${observation.questionId}"`);
      }
    }

    for (const signal of document.signals.definitions) {
      for (const id of signal.match.observationIds) {
        if (!observationIds.has(id)) {
          add("crossref.missing-observation", "signals.json", `Signal "${signal.code}" references unknown observation "${id}"`);
        }
      }
      if (signal.match.definitionIdMatches) {
        try {
          new RegExp(signal.match.definitionIdMatches);
        } catch {
          add("crossref.invalid-regex", "signals.json", `Signal "${signal.code}" has an invalid definitionIdMatches pattern`);
        }
      }
      if (signal.match.observationIds.length === 0 && !signal.match.definitionIdMatches && !signal.match.categoryIn?.length) {
        add("crossref.unbounded-signal", "signals.json", `Signal "${signal.code}" matches every observation`, "warning");
      }
    }

    for (const rule of document.rules.definitions) {
      for (const code of rule.signals) {
        if (!signalCodes.has(code)) {
          add("crossref.missing-signal", "rules.json", `Rule "${rule.ruleCode}" references unknown signal "${code}"`);
        }
      }
      if ((rule.logic === "AT_LEAST" || rule.logic === "EXACTLY") && rule.threshold === undefined) {
        add("crossref.missing-threshold", "rules.json", `Rule "${rule.ruleCode}" uses ${rule.logic} without a threshold`);
      }
    }

    for (const pattern of document.patterns.definitions) {
      for (const code of pattern.requiredRules) {
        if (!ruleCodes.has(code)) {
          add("crossref.missing-rule", "patterns.json", `Pattern "${pattern.patternCode}" references unknown rule "${code}"`);
        }
      }
      if ((pattern.logic === "AT_LEAST" || pattern.logic === "EXACTLY") && pattern.threshold === undefined) {
        add("crossref.missing-threshold", "patterns.json", `Pattern "${pattern.patternCode}" uses ${pattern.logic} without a threshold`);
      }
    }

    for (const dimension of document.scoring.dimensions) {
      for (const code of dimension.patterns) {
        if (!patternCodes.has(code)) {
          add("crossref.missing-pattern", "scoring.json", `Score "${dimension.scoreCode}" references unknown pattern "${code}"`);
        }
      }
      for (const code of Object.keys(dimension.patternImpacts)) {
        if (!patternCodes.has(code)) {
          add("crossref.missing-pattern", "scoring.json", `Score "${dimension.scoreCode}" declares an impact for unknown pattern "${code}"`, "warning");
        }
      }
    }

    for (const recommendation of document.recommendations.definitions) {
      for (const trigger of recommendation.triggers) {
        if (!patternCodes.has(trigger)) {
          add("crossref.missing-pattern", "recommendations.json", `Recommendation "${recommendation.code}" is triggered by unknown pattern "${trigger}"`);
        }
      }
      if (scoreCodes.size > 0 && !scoreCodes.has(recommendation.dimension)) {
        add("crossref.missing-score", "recommendations.json", `Recommendation "${recommendation.code}" targets unknown score dimension "${recommendation.dimension}"`, "warning");
      }
    }

    const narrative = document.narratives.narrative;
    if (narrative) {
      const sectionKeys = new Set(narrative.sections.map((section) => section.key));
      for (const key of narrative.validation.requiredSections) {
        if (!sectionKeys.has(key)) {
          add("crossref.missing-narrative-section", "narratives.json", `Narrative validation requires unknown section "${key}"`);
        }
      }
    } else {
      add("crossref.narrative-missing", "narratives.json", "Pack does not declare a narrative configuration; the Narrative Engine will fall back to legacy templates", "warning");
    }

    // Reachability warnings — useful when authoring a new pack.
    const referencedSignals = new Set(document.rules.definitions.flatMap((r) => r.signals));
    for (const code of signalCodes) {
      if (!referencedSignals.has(code)) {
        add("crossref.orphan-signal", "signals.json", `Signal "${code}" is not referenced by any rule`, "warning");
      }
    }
    const referencedRules = new Set(document.patterns.definitions.flatMap((p) => p.requiredRules));
    for (const code of ruleCodes) {
      if (!referencedRules.has(code)) {
        add("crossref.orphan-rule", "rules.json", `Rule "${code}" is not referenced by any pattern`, "warning");
      }
    }
    const referencedPatterns = new Set(document.scoring.dimensions.flatMap((d) => d.patterns));
    for (const code of patternCodes) {
      if (!referencedPatterns.has(code)) {
        add("crossref.orphan-pattern", "patterns.json", `Pattern "${code}" is not referenced by any score dimension`, "warning");
      }
    }

    return issues;
  }

  private report(
    packId: string,
    version: string | null,
    issues: ValidationIssue[],
    started: number,
  ): ValidationReport {
    const errorCount = issues.filter((issue) => issue.severity === "error").length;
    const warningCount = issues.length - errorCount;
    return {
      packId,
      version,
      valid: errorCount === 0,
      issues,
      errorCount,
      warningCount,
      validatedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
    };
  }
}

export function countPack(document: KnowledgePackDocument): PackCounts {
  return {
    sections: document.questions.sections.length,
    questions: document.questions.questions.length,
    observations: document.observations.definitions.length,
    signals: document.signals.definitions.length,
    rules: document.rules.definitions.length,
    patterns: document.patterns.definitions.length,
    scores: document.scoring.dimensions.length,
    recommendations: document.recommendations.definitions.length,
    narrativeSections: document.narratives.narrative?.sections.length ?? 0,
  };
}

export const knowledgePackValidator = new KnowledgePackValidator();
