import { allPages } from "./definition";
import { isVisible, isAnswered } from "./validation";
import type {
  AssessmentDefinition,
  NavigationState,
  ResponseValue,
  RuntimeSession,
} from "./types";

/**
 * AssessmentNavigationService — resolves the page sequence for a session.
 * Pages whose questions are all hidden by display conditions are skipped, so
 * Sprint 2 branching logic needs no change here.
 */

type Responses = Record<string, ResponseValue>;

export function visiblePages(definition: AssessmentDefinition, responses: Responses) {
  return allPages(definition).filter(({ page }) =>
    page.questions.some((question) => isVisible(question, responses)),
  );
}

export function resolveNavigation(
  definition: AssessmentDefinition,
  session: RuntimeSession,
  responses: Responses,
): NavigationState {
  const pages = visiblePages(definition, responses);
  const index = Math.max(
    0,
    pages.findIndex(({ page }) => page.id === session.currentPageId),
  );
  const current = pages[index] ?? pages[0] ?? null;

  const answeredAll = definition.sections
    .flatMap((section) => section.pages)
    .flatMap((page) => page.questions)
    .filter((question) => isVisible(question, responses) && question.required)
    .every((question) => isAnswered(responses[question.id] ?? null));

  return {
    currentPage: current?.page ?? null,
    currentSectionId: current?.sectionId ?? null,
    pageIndex: index,
    pageCount: pages.length,
    canGoPrevious: index > 0,
    canGoNext: index < pages.length - 1,
    canComplete: definition.navigation.requireCompleteToFinish ? answeredAll : true,
    previousPageId: pages[index - 1]?.page.id ?? null,
    nextPageId: pages[index + 1]?.page.id ?? null,
  };
}

export type NavigationCommand =
  | { direction: "next" }
  | { direction: "previous" }
  | { direction: "goto"; pageId: string }
  | { direction: "section"; sectionId: string };

/** Returns the page id a command resolves to, or null when it is not allowed. */
export function resolveTarget(
  definition: AssessmentDefinition,
  session: RuntimeSession,
  responses: Responses,
  command: NavigationCommand,
): string | null {
  const pages = visiblePages(definition, responses);
  const index = Math.max(
    0,
    pages.findIndex(({ page }) => page.id === session.currentPageId),
  );

  switch (command.direction) {
    case "next":
      return pages[index + 1]?.page.id ?? null;
    case "previous":
      return pages[index - 1]?.page.id ?? null;
    case "goto": {
      const target = pages.find(({ page }) => page.id === command.pageId);
      if (!target) return null;
      if (definition.navigation.mode === "linear") {
        const targetIndex = pages.indexOf(target);
        if (targetIndex > index + 1) return null;
      }
      return target.page.id;
    }
    case "section": {
      const target = pages.find(({ sectionId }) => sectionId === command.sectionId);
      return target?.page.id ?? null;
    }
    default:
      return null;
  }
}

export function sectionOfPage(definition: AssessmentDefinition, pageId: string): string | null {
  return (
    allPages(definition).find(({ page }) => page.id === pageId)?.sectionId ?? null
  );
}
