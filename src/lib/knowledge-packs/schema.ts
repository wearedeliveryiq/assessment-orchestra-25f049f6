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

export const manifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  schemaVersion: z.number().int().positive(),
  status: z.enum(["active", "draft", "retired"]),
  description: z.string().min(1),
  owner: z.string().min(1),
  publishedAt: z.string().min(1),
  files: z.array(z.string().min(1)).min(1),
});

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

export const signalsSchema = z.object({ signals: z.array(z.record(z.unknown())).min(1) });
export const rulesSchema = z.object({ rules: z.array(z.record(z.unknown())).min(1) });
export const patternsSchema = z.object({ patterns: z.array(z.record(z.unknown())).min(1) });
export const recommendationsSchema = z.object({
  recommendations: z.array(z.record(z.unknown())).min(1),
});
export const narrativesSchema = z.object({
  headlines: z.array(z.record(z.unknown())).min(1),
  summaryTemplate: z.string().min(1),
  paragraphTemplates: z.array(z.string()).min(1),
});
export const scoringSchema = z.object({
  scale: z.object({ min: z.number(), max: z.number() }),
  sectionWeights: z.record(z.number()),
  bands: z.array(z.object({ min: z.number(), band: z.string() })).min(1),
  penalties: z.array(z.object({ severity: z.string(), points: z.number() })),
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
