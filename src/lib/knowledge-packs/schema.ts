import { z } from "zod";

/**
 * Knowledge Pack schema definitions.
 *
 * A Knowledge Pack is pure configuration: every piece of business logic used by
 * the reasoning pipeline (observations, signals, rules, patterns, scoring,
 * recommendations, narrative) is declared here rather than in engine code.
 * Adding a new pack means adding a folder under /knowledge-packs — no
 * application code changes.
 */

export const comparisonOperatorSchema = z.enum([
  "lt",
  "lte",
  "eq",
  "neq",
  "gte",
  "gt",
  "between",
  "any",
  "answered",
  "unanswered",
]);

export type ComparisonOperator = z.infer<typeof comparisonOperatorSchema>;

export const conditionSchema = z.object({
  operator: comparisonOperatorSchema,
  value: z.number().optional(),
  max: z.number().optional(),
});

export type PackCondition = z.infer<typeof conditionSchema>;

export const severitySchema = z.enum(["critical", "high", "medium", "low", "info"]);
export type ObservationSeverity = z.infer<typeof severitySchema>;

/** Lifecycle states a pack may declare. `active` is retained for compatibility. */
export const packStatusSchema = z.enum([
  "active",
  "draft",
  "published",
  "deprecated",
  "retired",
  "archived",
]);

export type PackStatus = z.infer<typeof packStatusSchema>;

/** A dependency on another knowledge pack, expressed with a semver range. */
export const packDependencySchema = z.object({
  packId: z.string().min(1),
  /** Semver range: exact ("1.2.0"), caret ("^1.2.0"), tilde ("~1.2.0"), or ">=1.2.0". */
  version: z.string().min(1),
  optional: z.boolean().default(false),
});

export type PackDependency = z.infer<typeof packDependencySchema>;

export const manifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  schemaVersion: z.number().int().positive(),
  status: packStatusSchema,
  description: z.string().min(1),
  owner: z.string().min(1),
  publishedAt: z.string().min(1),
  files: z.array(z.string().min(1)).min(1),
  /** Optional runtime metadata — additive, so existing packs stay valid. */
  assessmentType: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
  license: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)).default([]),
  /** Engines this pack is authored for; the runtime warns on unknown engines. */
  engines: z.array(z.string().min(1)).default([]),
  dependencies: z.array(packDependencySchema).default([]),
  /** Minimum runtime schema version this pack requires. */
  minSchemaVersion: z.number().int().positive().optional(),
});

export type PackManifest = z.infer<typeof manifestSchema>;


export const questionsSchema = z.object({
  sections: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        intent: z.string(),
        weight: z.number(),
      }),
    )
    .min(1),
  questions: z
    .array(
      z.object({
        id: z.string(),
        sectionId: z.string(),
        prompt: z.string(),
        helper: z.string().optional(),
        type: z.string(),
        options: z.array(z.object({ value: z.number(), label: z.string() })).min(1),
      }),
    )
    .min(1),
});

export const observationDefinitionSchema = z.object({
  id: z.string().min(1),
  questionId: z.string().min(1),
  category: z.string().min(1),
  when: conditionSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  evidenceTemplate: z.string().min(1),
  severity: severitySchema,
  confidence: z.number().min(0).max(1),
  weight: z.number().min(0),
});

export type ObservationDefinition = z.infer<typeof observationDefinitionSchema>;

export const observationsSchema = z.object({
  definitions: z.array(observationDefinitionSchema).min(1),
});

/**
 * Signal definitions. A signal is inferred purely from Observations, so a
 * definition selects supporting observations either by explicit definition id
 * or by a regular expression, and declares its own confidence/severity policy.
 */
export const signalMatchSchema = z.object({
  /** Observation definition ids that can support this signal. */
  observationIds: z.array(z.string().min(1)).default([]),
  /** Optional regex matched against observation definition ids. */
  definitionIdMatches: z.string().min(1).optional(),
  /** Optional filter on the severity of supporting observations. */
  severityIn: z.array(severitySchema).optional(),
  /** Optional filter on the category of supporting observations. */
  categoryIn: z.array(z.string().min(1)).optional(),
  /** How many supporting observations must be present for the signal to fire. */
  minMatches: z.number().int().positive().default(1),
});

export const signalDefinitionSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  rationale: z.string().min(1),
  match: signalMatchSchema,
  /** Signal is discarded when calculated confidence falls below this floor. */
  minConfidence: z.number().min(0).max(1),
  severity: severitySchema,
  weight: z.number().min(0),
  /** Evidence count considered "complete" — drives the completeness factor. */
  expectedEvidence: z.number().int().positive(),
  /** Raise severity to the strongest supporting observation severity. */
  escalateWithEvidence: z.boolean().default(false),
});

export type SignalDefinition = z.infer<typeof signalDefinitionSchema>;
export type SignalMatch = z.infer<typeof signalMatchSchema>;

export const signalsSchema = z.object({
  /** Legacy section-benchmark signals consumed by the assessment runtime. */
  signals: z.array(z.record(z.string(), z.unknown())).min(1),
  /** Categories exposed by the pack; the Signal Explorer reads these. */
  categories: z.array(z.string().min(1)).default([]),
  /** Observation-driven signal definitions used by the Signal Engine. */
  definitions: z.array(signalDefinitionSchema).default([]),
});
/**
 * Rule definitions. A rule is a declarative business decision evaluated over
 * Signals only. New logical operators can be added to this union without any
 * change to the engine's public contract.
 */
export const ruleLogicSchema = z.enum(["ALL", "ANY", "NONE", "AT_LEAST", "EXACTLY"]);
export const ruleStatusSchema = z.enum(["passed", "failed", "warning", "not_evaluated"]);

export const ruleDefinitionSchema = z.object({
  ruleCode: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  rationale: z.string().min(1),
  logic: ruleLogicSchema,
  /** Signal codes the rule reasons over. */
  signals: z.array(z.string().min(1)).min(1),
  /** Required count for AT_LEAST / EXACTLY. */
  threshold: z.number().int().nonnegative().optional(),
  /** Signals below this confidence are ignored as evidence. */
  minimumConfidence: z.number().min(0).max(1),
  severity: severitySchema,
  weight: z.number().min(0).default(1),
  /** Status recorded when the logical condition is not satisfied. */
  statusOnFail: ruleStatusSchema.default("not_evaluated"),
  /** Template for the human-readable explanation ({count}, {signals}, {confidence}, {name}). */
  explanationTemplate: z.string().min(1),
});

export type RuleDefinition = z.infer<typeof ruleDefinitionSchema>;
export type RuleLogic = z.infer<typeof ruleLogicSchema>;
export type RuleStatus = z.infer<typeof ruleStatusSchema>;

export const rulesSchema = z.object({
  /** Legacy question-level rules consumed by the assessment runtime. */
  rules: z.array(z.record(z.string(), z.unknown())).min(1),
  /** Categories exposed by the pack; the Rule Explorer reads these. */
  categories: z.array(z.string().min(1)).default([]),
  /** Signal-driven rule definitions used by the Rule Engine. */
  definitions: z.array(ruleDefinitionSchema).default([]),
});
/**
 * Pattern definitions. A Pattern is a higher-order organisational behaviour
 * inferred from Rule Results ONLY. Like rules, patterns are pure configuration:
 * a future knowledge pack introduces new patterns with zero platform changes.
 */
export const patternLogicSchema = ruleLogicSchema;
export type PatternLogic = z.infer<typeof patternLogicSchema>;

/**
 * Confidence thresholds may be authored either as a fraction (0–1) or as a
 * percentage (0–100). Both are normalised to the platform's 0–1 scale so pack
 * authors can use whichever convention reads best.
 */
const normalisedConfidenceSchema = z
  .number()
  .min(0)
  .max(100)
  .transform((value) => (value > 1 ? value / 100 : value));

export const patternDefinitionSchema = z.object({
  patternCode: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  /** Statement surfaced to users and later consumed by the Narrative Engine. */
  businessImpact: z.string().min(1),
  logic: patternLogicSchema,
  /** Rule codes the pattern reasons over. */
  requiredRules: z.array(z.string().min(1)).min(1),
  /** Required count for AT_LEAST / EXACTLY. */
  threshold: z.number().int().nonnegative().optional(),
  /** Rule results below this confidence are ignored as evidence. */
  minimumConfidence: normalisedConfidenceSchema,
  /** Rule statuses that count as supporting evidence. */
  statusIn: z.array(ruleStatusSchema).default(["passed"]),
  severity: severitySchema,
  weight: z.number().min(0).default(1),
  /** Rule count considered "complete" evidence — drives the completeness factor. */
  expectedEvidence: z.number().int().positive().default(1),
  /** Template for the explanation ({count}, {rules}, {confidence}, {name}). */
  explanationTemplate: z.string().min(1),
});

export type PatternDefinition = z.infer<typeof patternDefinitionSchema>;

export const patternsSchema = z.object({
  /** Legacy section-score patterns consumed by the assessment runtime. */
  patterns: z.array(z.record(z.string(), z.unknown())).min(1),
  /** Categories exposed by the pack; the Pattern Explorer reads these. */
  categories: z.array(z.string().min(1)).default([]),
  /** Rule-driven pattern definitions used by the Pattern Engine. */
  definitions: z.array(patternDefinitionSchema).default([]),
});
/**
 * Recommendation model. Interventions are declared by the pack and selected
 * (never invented) by the Recommendation resolver from matched Patterns.
 */
export const recommendationDefinitionSchema = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  rationale: z.string().min(1),
  category: z.string().min(1),
  /** Score code of the capability dimension the intervention improves. */
  dimension: z.string().min(1),
  /** Pattern codes that make this intervention relevant. */
  triggers: z.array(z.string().min(1)).min(1),
  priority: z.enum(["critical", "high", "medium", "low"]),
  horizon: z.enum(["now", "next", "later"]),
  impact: z.enum(["high", "medium", "low"]),
  effort: z.enum(["high", "medium", "low"]),
  expectedBenefit: z.string().min(1),
});

export type RecommendationDefinition = z.infer<typeof recommendationDefinitionSchema>;

export const recommendationsSchema = z.object({
  /** Legacy trigger-based recommendations consumed by the assessment runtime. */
  recommendations: z.array(z.record(z.string(), z.unknown())).min(1),
  /** Pattern-driven definitions consumed by the Recommendation resolver. */
  definitions: z.array(recommendationDefinitionSchema).default([]),
});

/**
 * Narrative model. Everything the Narrative Engine needs — generation mode,
 * provider, tone, prompt rules, per-section templates and validation policy —
 * is declared by the pack so narrative behaviour is configuration, not code.
 */
export const narrativeGenerationSchema = z.object({
  /** template = deterministic only, ai = model only, hybrid = ai with template fallback. */
  mode: z.enum(["template", "ai", "hybrid"]).default("template"),
  /** Provider id resolved by the LLM provider registry. */
  provider: z.string().min(1).default("lovable"),
  model: z.string().min(1).default("google/gemini-3.6-flash"),
  temperature: z.number().min(0).max(2).default(0.3),
  maxOutputTokens: z.number().int().positive().default(900),
  /** When AI generation fails or is unavailable, fall back to the template. */
  fallbackToTemplate: z.boolean().default(true),
});

export type NarrativeGenerationConfig = z.infer<typeof narrativeGenerationSchema>;

export const narrativeToneSchema = z.object({
  voice: z.string().min(1).default("Direct, measured, consulting-grade"),
  audience: z.string().min(1).default("Executive leadership"),
  register: z.string().min(1).default("formal"),
  perspective: z.string().min(1).default("third-person"),
});

export const narrativePromptRulesSchema = z.object({
  system: z.string().min(1),
  must: z.array(z.string().min(1)).default([]),
  mustNot: z.array(z.string().min(1)).default([]),
});

/** Evidence families a section is permitted to reason over. */
export const narrativeEvidenceKindSchema = z.enum([
  "summary",
  "scores",
  "patterns",
  "recommendations",
  "counts",
]);

export type NarrativeEvidenceKind = z.infer<typeof narrativeEvidenceKindSchema>;

export const narrativeSectionSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  order: z.number().int().nonnegative(),
  evidence: z.array(narrativeEvidenceKindSchema).min(1),
  aiEnabled: z.boolean().default(true),
  minWords: z.number().int().nonnegative().default(0),
  maxWords: z.number().int().positive().default(250),
  guidance: z.string().default(""),
  /** Deterministic template with {placeholder} tokens. */
  template: z.string().min(1),
  /** Used when the section has no supporting evidence at all. */
  emptyTemplate: z.string().optional(),
});

export type NarrativeSectionDefinition = z.infer<typeof narrativeSectionSchema>;

export const narrativeValidationSchema = z.object({
  requiredSections: z.array(z.string().min(1)).default([]),
  bannedPhrases: z.array(z.string().min(1)).default([]),
  requireEvidence: z.boolean().default(true),
  minConfidence: z.number().min(0).max(1).default(0),
});

export const narrativeConfigSchema = z.object({
  generation: narrativeGenerationSchema.default({
    mode: "template",
    provider: "lovable",
    model: "google/gemini-3.6-flash",
    temperature: 0.3,
    maxOutputTokens: 900,
    fallbackToTemplate: true,
  }),
  tone: narrativeToneSchema.default({
    voice: "Direct, measured, consulting-grade",
    audience: "Executive leadership",
    register: "formal",
    perspective: "third-person",
  }),
  promptRules: narrativePromptRulesSchema,
  headline: z
    .object({ template: z.string().min(1), aiEnabled: z.boolean().default(false) })
    .default({ template: "{organisation}: {maturityLevel}", aiEnabled: false }),
  sections: z.array(narrativeSectionSchema).min(1),
  validation: narrativeValidationSchema.default({
    requiredSections: [],
    bannedPhrases: [],
    requireEvidence: true,
    minConfidence: 0,
  }),
});

export type NarrativeConfig = z.infer<typeof narrativeConfigSchema>;

export const narrativesSchema = z.object({
  /** Legacy runtime narrative fields consumed by the assessment pipeline. */
  headlines: z.array(z.record(z.string(), z.unknown())).min(1),
  summaryTemplate: z.string().min(1),
  paragraphTemplates: z.array(z.string()).min(1),
  /** Declarative configuration for the Narrative Engine. */
  narrative: narrativeConfigSchema.optional(),
});

/**
 * Scoring model. A Score quantifies organisational capability for one
 * assessment dimension and is derived from Patterns ONLY. Everything the
 * Scoring Engine needs — dimensions, pattern weightings, impacts, maturity
 * bands and the overall aggregation model — is declared here, so a future pack
 * can ship a completely different scoring methodology with zero code changes.
 */
export const maturityBandSchema = z
  .object({
    name: z.string().min(1),
    min: z.number(),
    max: z.number(),
    /** Optional severity surfaced with the score; defaults to informational. */
    severity: severitySchema.default("info"),
  })
  .refine((band) => band.max >= band.min, {
    message: "maturity band max must be greater than or equal to min",
  });

export type MaturityBand = z.infer<typeof maturityBandSchema>;

/** How a dimension turns matched patterns into a score. */
export const scoreDirectionSchema = z.enum(["deduct", "accrue"]);
export type ScoreDirection = z.infer<typeof scoreDirectionSchema>;

export const scoreDefinitionSchema = z.object({
  scoreCode: z.string().min(1),
  dimension: z.string().min(1),
  description: z.string().default(""),
  /** Pattern codes this dimension reasons over. */
  patterns: z.array(z.string().min(1)).min(1),
  /** Relative contribution to the overall assessment score. */
  weight: z.number().min(0).default(1),
  maximumScore: z.number().positive().default(100),
  /** Starting score before pattern impacts are applied. */
  baseScore: z.number().min(0).optional(),
  direction: scoreDirectionSchema.default("deduct"),
  /** Points applied when a pattern has no explicit impact configured. */
  defaultImpact: z.number().default(0),
  /** Per-pattern impact in points; negative values credit the dimension. */
  patternImpacts: z.record(z.string(), z.number()).default({}),
  /** Multiplies a pattern's impact by the severity it was raised at. */
  severityMultipliers: z.record(z.string(), z.number()).optional(),
  /** Pattern count considered complete evidence for this dimension. */
  expectedEvidence: z.number().int().positive().default(1),
  /** Dimension-specific bands; falls back to `defaults.maturityBands`. */
  maturityBands: z.array(maturityBandSchema).optional(),
});

export type ScoreDefinition = z.infer<typeof scoreDefinitionSchema>;

export const overallScoreSchema = z.object({
  scoreCode: z.string().min(1).default("SCR-OVERALL"),
  dimension: z.string().min(1).default("Overall Assessment"),
  maximumScore: z.number().positive().default(100),
  weightingModel: z.enum(["weighted-average", "simple-average"]).default("weighted-average"),
  maturityBands: z.array(maturityBandSchema).optional(),
});

export type OverallScoreDefinition = z.infer<typeof overallScoreSchema>;

export const scoringSchema = z.object({
  /** Legacy section scoring consumed by the assessment runtime. */
  scale: z.object({ min: z.number(), max: z.number() }),
  sectionWeights: z.record(z.string(), z.number()),
  bands: z.array(z.object({ min: z.number(), band: z.string() })).min(1),
  penalties: z.array(z.object({ severity: z.string(), points: z.number() })),

  /** Pack-wide scoring defaults. */
  defaults: z
    .object({
      severityMultipliers: z.record(z.string(), z.number()).default({}),
      maturityBands: z.array(maturityBandSchema).default([]),
    })
    .default({ severityMultipliers: {}, maturityBands: [] }),
  /** Pattern-driven scoring dimensions used by the Scoring Engine. */
  dimensions: z.array(scoreDefinitionSchema).default([]),
  /** Overall assessment aggregation model. */
  overall: overallScoreSchema.default({}),
});


/** Every file a pack must ship, mapped to the schema that validates it. */
export const PACK_FILE_SCHEMAS = {
  "manifest.json": manifestSchema,
  "questions.json": questionsSchema,
  "observations.json": observationsSchema,
  "signals.json": signalsSchema,
  "rules.json": rulesSchema,
  "patterns.json": patternsSchema,
  "recommendations.json": recommendationsSchema,
  "narratives.json": narrativesSchema,
  "scoring.json": scoringSchema,
} as const;

export const REQUIRED_PACK_FILES = Object.keys(PACK_FILE_SCHEMAS) as (keyof typeof PACK_FILE_SCHEMAS)[];

export interface KnowledgePackDocument {
  manifest: z.infer<typeof manifestSchema>;
  questions: z.infer<typeof questionsSchema>;
  observations: z.infer<typeof observationsSchema>;
  signals: z.infer<typeof signalsSchema>;
  rules: z.infer<typeof rulesSchema>;
  patterns: z.infer<typeof patternsSchema>;
  recommendations: z.infer<typeof recommendationsSchema>;
  narratives: z.infer<typeof narrativesSchema>;
  scoring: z.infer<typeof scoringSchema>;
}
