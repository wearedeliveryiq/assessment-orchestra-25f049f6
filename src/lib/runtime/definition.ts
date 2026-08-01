import { z } from "zod";
import { QUESTION_TYPES, type AssessmentDefinition } from "./types";

/**
 * Zod contract for an assessment definition. A Knowledge Pack may ship an
 * `assessment.json` matching this schema; when it does not, the loader adapts
 * the pack's `questions.json` through {@link normaliseDefinition}. Either way
 * the runtime only ever executes validated metadata.
 */

const optionSchema = z.object({
  value: z.union([z.string(), z.number()]),
  label: z.string().min(1),
  description: z.string().optional(),
});

const validationRuleSchema = z.object({
  type: z.enum([
    "required",
    "min",
    "max",
    "minLength",
    "maxLength",
    "regex",
    "minSelections",
    "maxSelections",
    "dateMin",
    "dateMax",
  ]),
  value: z.union([z.string(), z.number()]).optional(),
  message: z.string().optional(),
});

const displayConditionSchema = z.object({
  mode: z.enum(["always", "hidden", "when"]).default("always"),
  questionId: z.string().optional(),
  operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in", "answered"]).optional(),
  value: z.union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))]).optional(),
});

export const questionDefinitionSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1).optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  helpText: z.string().optional(),
  type: z.enum(QUESTION_TYPES),
  required: z.boolean().default(true),
  defaultValue: z.unknown().optional(),
  placeholder: z.string().optional(),
  options: z.array(optionSchema).default([]),
  scale: z
    .object({
      min: z.number(),
      max: z.number(),
      step: z.number().positive().default(1),
      minLabel: z.string().optional(),
      maxLabel: z.string().optional(),
      unit: z.string().optional(),
    })
    .optional(),
  matrix: z
    .object({
      rows: z.array(z.object({ id: z.string(), label: z.string() })).min(1),
      columns: z.array(optionSchema).min(1),
    })
    .optional(),
  validationRules: z.array(validationRuleSchema).default([]),
  displayConditions: z.array(displayConditionSchema).default([]),
  order: z.number().int().nonnegative().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const pageDefinitionSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  order: z.number().int().nonnegative().optional(),
  questions: z.array(questionDefinitionSchema).min(1),
});

export const sectionDefinitionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  order: z.number().int().nonnegative().optional(),
  /** Pages are optional: a section without pages is paginated automatically. */
  pages: z.array(pageDefinitionSchema).optional(),
  questions: z.array(questionDefinitionSchema).optional(),
  questionsPerPage: z.number().int().positive().optional(),
});

export const navigationRulesSchema = z.object({
  mode: z.enum(["linear", "free"]).default("free"),
  allowExit: z.boolean().default(true),
  allowResume: z.boolean().default(true),
  allowRestart: z.boolean().default(false),
  autoSaveIntervalMs: z.number().int().positive().default(20_000),
  requireCompleteToFinish: z.boolean().default(true),
});

export const assessmentDefinitionSchema = z.object({
  assessmentId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  estimatedMinutes: z.number().int().positive().optional(),
  navigation: navigationRulesSchema.default({
    mode: "free",
    allowExit: true,
    allowResume: true,
    allowRestart: false,
    autoSaveIntervalMs: 20_000,
    requireCompleteToFinish: true,
  }),
  sections: z.array(sectionDefinitionSchema).min(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type RawAssessmentDefinition = z.input<typeof assessmentDefinitionSchema>;

export class AssessmentDefinitionError extends Error {
  constructor(
    message: string,
    readonly issues: string[] = [],
  ) {
    super(message);
    this.name = "AssessmentDefinitionError";
  }
}

/** Average seconds a respondent spends per question, used for time estimates. */
export const SECONDS_PER_QUESTION = 25;
const DEFAULT_QUESTIONS_PER_PAGE = 4;

/**
 * Validates raw metadata and normalises it into the fully-resolved shape the
 * runtime executes: explicit pages, explicit ordering, derived counts.
 */
export function normaliseDefinition(
  raw: unknown,
  context: { packId: string; packVersion: string },
): AssessmentDefinition {
  const parsed = assessmentDefinitionSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AssessmentDefinitionError(
      `Assessment definition for pack "${context.packId}" is invalid`,
      parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
    );
  }

  const seen = new Set<string>();
  const sections = parsed.data.sections
    .map((section, sectionIndex) => {
      const perPage = section.questionsPerPage ?? DEFAULT_QUESTIONS_PER_PAGE;
      const rawPages: z.infer<typeof pageDefinitionSchema>[] =
        section.pages ??
        chunk(section.questions ?? [], perPage).map((questions, pageIndex) => ({
          id: `${section.id}.p${pageIndex + 1}`,
          order: pageIndex,
          questions,
        }));


      if (rawPages.length === 0) {
        throw new AssessmentDefinitionError(
          `Section "${section.id}" declares no questions`,
        );
      }

      const pages = rawPages
        .map((page, pageIndex) => ({
          id: page.id,
          title: page.title,
          description: page.description,
          order: page.order ?? pageIndex,
          questions: page.questions
            .map((question, questionIndex) => {
              if (seen.has(question.id)) {
                throw new AssessmentDefinitionError(`Duplicate question id "${question.id}"`);
              }
              seen.add(question.id);
              return {
                ...question,
                code: question.code ?? question.id,
                order: question.order ?? questionIndex,
                displayConditions:
                  question.displayConditions.length > 0
                    ? question.displayConditions
                    : [{ mode: "always" as const }],
                defaultValue: (question.defaultValue ?? null) as never,
              };
            })
            .sort((a, b) => a.order - b.order),
        }))
        .sort((a, b) => a.order - b.order);

      return {
        id: section.id,
        title: section.title,
        description: section.description,
        order: section.order ?? sectionIndex,
        pages,
      };
    })
    .sort((a, b) => a.order - b.order);

  const questionCount = sections.reduce(
    (total, section) =>
      total + section.pages.reduce((pageTotal, page) => pageTotal + page.questions.length, 0),
    0,
  );

  return {
    packId: context.packId,
    packVersion: context.packVersion,
    assessmentId: parsed.data.assessmentId,
    name: parsed.data.name,
    description: parsed.data.description,
    estimatedMinutes:
      parsed.data.estimatedMinutes ??
      Math.max(1, Math.round((questionCount * SECONDS_PER_QUESTION) / 60)),
    questionCount,
    navigation: parsed.data.navigation,
    sections,
    metadata: parsed.data.metadata,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/* ------------------------------ helper accessors ----------------------------- */

export function allQuestions(definition: AssessmentDefinition) {
  return definition.sections.flatMap((section) =>
    section.pages.flatMap((page) =>
      page.questions.map((question) => ({
        question,
        sectionId: section.id,
        pageId: page.id,
      })),
    ),
  );
}

export function allPages(definition: AssessmentDefinition) {
  return definition.sections.flatMap((section) =>
    section.pages.map((page) => ({ page, sectionId: section.id })),
  );
}

export function findQuestion(definition: AssessmentDefinition, questionId: string) {
  return allQuestions(definition).find((entry) => entry.question.id === questionId) ?? null;
}
