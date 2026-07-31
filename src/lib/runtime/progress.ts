import { SECONDS_PER_QUESTION } from "./definition";
import { isVisible, isAnswered } from "./validation";
import type { AssessmentDefinition, ProgressSnapshot, ResponseValue } from "./types";

/** AssessmentProgressService — derives progress purely from metadata + answers. */
export function computeProgress(
  definition: AssessmentDefinition,
  responses: Record<string, ResponseValue>,
  currentSectionId: string | null,
): ProgressSnapshot {
  const sections = definition.sections.map((section) => {
    const questions = section.pages
      .flatMap((page) => page.questions)
      .filter((question) => isVisible(question, responses));
    const answered = questions.filter((question) =>
      isAnswered(responses[question.id] ?? null),
    ).length;
    return {
      sectionId: section.id,
      title: section.title,
      answered,
      total: questions.length,
      complete: questions.length > 0 && answered === questions.length,
    };
  });

  const total = sections.reduce((sum, section) => sum + section.total, 0);
  const answered = sections.reduce((sum, section) => sum + section.answered, 0);
  const remaining = Math.max(0, total - answered);

  return {
    percentComplete: total === 0 ? 0 : Math.round((answered / total) * 100),
    questionsAnswered: answered,
    questionsRemaining: remaining,
    totalQuestions: total,
    sectionsCompleted: sections.filter((section) => section.complete).length,
    totalSections: sections.length,
    currentSectionId,
    currentSectionTitle:
      sections.find((section) => section.sectionId === currentSectionId)?.title ?? null,
    estimatedMinutesRemaining: Math.ceil((remaining * SECONDS_PER_QUESTION) / 60),
    sections,
  };
}

export function toResponseMap(
  records: { questionId: string; value: ResponseValue }[],
): Record<string, ResponseValue> {
  return Object.fromEntries(records.map((record) => [record.questionId, record.value]));
}
