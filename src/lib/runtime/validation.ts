import { findQuestion } from "./definition";
import type {
  AssessmentDefinition,
  DisplayCondition,
  QuestionDefinition,
  ResponseValue,
  ValidationIssue,
  ValidationOutcome,
} from "./types";

/**
 * AssessmentValidationService — entirely metadata driven. Every rule comes from
 * the question definition; the runtime contains no assessment-specific checks.
 */

type Responses = Record<string, ResponseValue>;

export function isAnswered(value: ResponseValue): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

/* ------------------------------ display rules ------------------------------- */

function conditionMet(condition: DisplayCondition, responses: Responses): boolean {
  if (condition.mode === "always") return true;
  if (condition.mode === "hidden") return false;
  if (!condition.questionId) return true;

  const actual = responses[condition.questionId] ?? null;
  const expected = condition.value;

  switch (condition.operator ?? "eq") {
    case "answered":
      return isAnswered(actual);
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "in":
      return Array.isArray(expected) && expected.includes(actual as string | number);
    case "gt":
      return Number(actual) > Number(expected);
    case "gte":
      return Number(actual) >= Number(expected);
    case "lt":
      return Number(actual) < Number(expected);
    case "lte":
      return Number(actual) <= Number(expected);
    default:
      return true;
  }
}

/** A question is visible when every one of its display conditions is met. */
export function isVisible(question: QuestionDefinition, responses: Responses): boolean {
  return question.displayConditions.every((condition) => conditionMet(condition, responses));
}

/* -------------------------------- validation -------------------------------- */

function selectionCount(value: ResponseValue): number {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value).length;
  return isAnswered(value) ? 1 : 0;
}

export function validateQuestion(
  question: QuestionDefinition,
  value: ResponseValue,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (rule: ValidationIssue["rule"], fallback: string, message?: string) =>
    issues.push({ questionId: question.id, rule, message: message ?? fallback });

  const answered = isAnswered(value);
  const rules = [...question.validationRules];
  if (question.required && !rules.some((rule) => rule.type === "required")) {
    rules.unshift({ type: "required" });
  }

  for (const rule of rules) {
    switch (rule.type) {
      case "required":
        if (!answered) push("required", "This question is required.", rule.message);
        break;
      case "min":
        if (answered && Number(value) < Number(rule.value))
          push("min", `Must be at least ${rule.value}.`, rule.message);
        break;
      case "max":
        if (answered && Number(value) > Number(rule.value))
          push("max", `Must be at most ${rule.value}.`, rule.message);
        break;
      case "minLength":
        if (answered && String(value).trim().length < Number(rule.value))
          push("minLength", `Use at least ${rule.value} characters.`, rule.message);
        break;
      case "maxLength":
        if (answered && String(value).trim().length > Number(rule.value))
          push("maxLength", `Use at most ${rule.value} characters.`, rule.message);
        break;
      case "regex":
        if (answered && !new RegExp(String(rule.value)).test(String(value)))
          push("regex", "The value is not in the expected format.", rule.message);
        break;
      case "minSelections":
        if (answered && selectionCount(value) < Number(rule.value))
          push("minSelections", `Select at least ${rule.value} options.`, rule.message);
        break;
      case "maxSelections":
        if (answered && selectionCount(value) > Number(rule.value))
          push("maxSelections", `Select no more than ${rule.value} options.`, rule.message);
        break;
      case "dateMin":
        if (answered && new Date(String(value)) < new Date(String(rule.value)))
          push("dateMin", `Must be on or after ${rule.value}.`, rule.message);
        break;
      case "dateMax":
        if (answered && new Date(String(value)) > new Date(String(rule.value)))
          push("dateMax", `Must be on or before ${rule.value}.`, rule.message);
        break;
    }
  }

  return issues;
}

export function validatePage(
  definition: AssessmentDefinition,
  pageId: string,
  responses: Responses,
): ValidationOutcome {
  const page = definition.sections
    .flatMap((section) => section.pages)
    .find((candidate) => candidate.id === pageId);
  if (!page) return { valid: true, issues: [] };

  const issues = page.questions
    .filter((question) => isVisible(question, responses))
    .flatMap((question) => validateQuestion(question, responses[question.id] ?? null));

  return { valid: issues.length === 0, issues };
}

export function validateAssessment(
  definition: AssessmentDefinition,
  responses: Responses,
): ValidationOutcome {
  const issues = definition.sections
    .flatMap((section) => section.pages)
    .flatMap((page) => page.questions)
    .filter((question) => isVisible(question, responses))
    .flatMap((question) => validateQuestion(question, responses[question.id] ?? null));

  return { valid: issues.length === 0, issues };
}

export function validateSingle(
  definition: AssessmentDefinition,
  questionId: string,
  value: ResponseValue,
): ValidationOutcome {
  const entry = findQuestion(definition, questionId);
  if (!entry) {
    return {
      valid: false,
      issues: [
        { questionId, rule: "required", message: "Unknown question for this assessment." },
      ],
    };
  }
  const issues = validateQuestion(entry.question, value);
  return { valid: issues.length === 0, issues };
}
