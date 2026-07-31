import { knowledgePackRegistry } from "@/lib/knowledge-packs/registry.server";
import type { KnowledgePackDocument } from "@/lib/knowledge-packs/schema";
import { normaliseDefinition, AssessmentDefinitionError } from "./definition";
import type { AssessmentCatalogueEntry, AssessmentDefinition } from "./types";

export { AssessmentDefinitionError };

/**
 * AssessmentLoaderService
 *
 * Loads and caches the assessment definition for any published Knowledge Pack.
 * A pack may ship a first-class `assessment.json`; when it does not, the pack's
 * `questions.json` is adapted. Either path produces the same validated,
 * fully-normalised metadata, so the runtime never learns anything about a
 * specific framework.
 */

const cache = new Map<string, AssessmentDefinition>();

type PackWithAssessment = KnowledgePackDocument & { assessment?: unknown };

function adaptQuestions(document: PackWithAssessment): unknown {
  const { manifest, questions } = document;
  return {
    assessmentId: manifest.assessmentType ?? manifest.id,
    name: manifest.name,
    description: manifest.description,
    metadata: { source: "questions.json", owner: manifest.owner, tags: manifest.tags },
    sections: questions.sections.map((section, index) => ({
      id: section.id,
      title: section.title,
      description: section.intent,
      order: index,
      questionsPerPage: 4,
      questions: questions.questions
        .filter((question) => question.sectionId === section.id)
        .map((question, questionIndex) => ({
          id: question.id,
          code: question.id,
          title: question.prompt,
          helpText: question.helper,
          type: question.type === "scale" ? "likert" : mapType(question.type),
          required: true,
          order: questionIndex,
          category: section.id,
          options: question.options.map((option) => ({
            value: option.value,
            label: option.label,
          })),
          validationRules: [{ type: "required" }],
          displayConditions: [{ mode: "always" }],
          tags: [],
        })),
    })),
  };
}

function mapType(type: string): string {
  const known: Record<string, string> = {
    scale: "likert",
    likert: "likert",
    single: "single_select",
    single_select: "single_select",
    multi: "multi_select",
    multi_select: "multi_select",
    boolean: "boolean",
    yesno: "boolean",
    number: "numeric",
    numeric: "numeric",
    text: "text",
    long_text: "long_text",
    date: "date",
    slider: "slider",
    percentage: "percentage",
    currency: "currency",
    matrix: "matrix",
    ranking: "ranking",
  };
  return known[type] ?? "single_select";
}

/** Loads the definition for a pack (defaults to the active pack). */
export function loadDefinition(packId?: string, version?: string): AssessmentDefinition {
  const loaded = packId
    ? knowledgePackRegistry.load(packId, version)
    : knowledgePackRegistry.loadActive();
  const key = `${loaded.packId}@${loaded.version}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const document = loaded.document as PackWithAssessment;
  const raw = document.assessment ?? adaptQuestions(document);
  const definition = normaliseDefinition(raw, {
    packId: loaded.packId,
    packVersion: loaded.version,
  });
  cache.set(key, definition);
  return definition;
}

/** Every pack that can be executed by the runtime. */
export function listAssessments(): AssessmentCatalogueEntry[] {
  return knowledgePackRegistry
    .list()
    .flatMap((summary) => {
      const version = summary.activeVersion ?? summary.latestVersion;
      if (!summary.valid || !version) return [];
      try {
        const definition = loadDefinition(summary.packId, version);
        return [
          {
            packId: definition.packId,
            packVersion: definition.packVersion,
            assessmentId: definition.assessmentId,
            name: definition.name,
            description: definition.description,
            estimatedMinutes: definition.estimatedMinutes,
            questionCount: definition.questionCount,
            sectionCount: definition.sections.length,
            status:
              summary.versions.find((entry) => entry.version === version)?.status ?? "unknown",
          } satisfies AssessmentCatalogueEntry,
        ];
      } catch (error) {
        console.error("[assessment-loader]", summary.packId, error);
        return [];
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function clearDefinitionCache(): void {
  cache.clear();
}
