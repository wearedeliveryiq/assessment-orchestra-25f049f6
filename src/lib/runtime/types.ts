/**
 * Assessment Runtime Foundation — shared, client-safe contracts.
 *
 * The runtime is a *generic execution engine*: nothing in this file (or in any
 * runtime service) may encode knowledge of a specific assessment, question set,
 * scoring model or framework. Everything is described by metadata loaded from a
 * Knowledge Pack at runtime.
 */

/* --------------------------------- questions -------------------------------- */

export const QUESTION_TYPES = [
  "single_select",
  "multi_select",
  "likert",
  "slider",
  "numeric",
  "currency",
  "percentage",
  "date",
  "text",
  "long_text",
  "boolean",
  "matrix",
  "ranking",
  "file_upload",
  "evidence",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export interface QuestionOption {
  value: string | number;
  label: string;
  description?: string;
}

export interface ScaleConfig {
  min: number;
  max: number;
  step: number;
  minLabel?: string;
  maxLabel?: string;
  unit?: string;
}

export interface MatrixConfig {
  rows: { id: string; label: string }[];
  columns: QuestionOption[];
}

export type ValidationRuleType =
  | "required"
  | "min"
  | "max"
  | "minLength"
  | "maxLength"
  | "regex"
  | "minSelections"
  | "maxSelections"
  | "dateMin"
  | "dateMax";

export interface ValidationRule {
  type: ValidationRuleType;
  value?: string | number;
  message?: string;
}

/**
 * Display rules are deliberately three-state today (`always` / `hidden` /
 * `when`). Sprint 2 rule evaluation can populate `when` conditions without any
 * runtime code change — the evaluator already resolves them against responses.
 */
export interface DisplayCondition {
  mode: "always" | "hidden" | "when";
  questionId?: string;
  operator?: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "answered";
  value?: string | number | (string | number)[];
}

export interface QuestionDefinition {
  id: string;
  code: string;
  title: string;
  description?: string;
  helpText?: string;
  type: QuestionType;
  required: boolean;
  defaultValue?: ResponseValue;
  placeholder?: string;
  options: QuestionOption[];
  scale?: ScaleConfig;
  matrix?: MatrixConfig;
  validationRules: ValidationRule[];
  displayConditions: DisplayCondition[];
  order: number;
  category?: string;
  tags: string[];
}

/* --------------------------------- structure -------------------------------- */

export interface PageDefinition {
  id: string;
  title?: string;
  description?: string;
  order: number;
  questions: QuestionDefinition[];
}

export interface SectionDefinition {
  id: string;
  title: string;
  description?: string;
  order: number;
  pages: PageDefinition[];
}

export interface NavigationRules {
  mode: "linear" | "free";
  allowExit: boolean;
  allowResume: boolean;
  allowRestart: boolean;
  autoSaveIntervalMs: number;
  requireCompleteToFinish: boolean;
}

export interface AssessmentDefinition {
  packId: string;
  packVersion: string;
  assessmentId: string;
  name: string;
  description: string;
  estimatedMinutes: number;
  questionCount: number;
  navigation: NavigationRules;
  sections: SectionDefinition[];
  metadata: Record<string, unknown>;
}

/** Lightweight catalogue entry used by the welcome / launcher screen. */
export interface AssessmentCatalogueEntry {
  packId: string;
  packVersion: string;
  assessmentId: string;
  name: string;
  description: string;
  estimatedMinutes: number;
  questionCount: number;
  sectionCount: number;
  status: string;
}

/* ---------------------------------- session --------------------------------- */

export type RuntimeSessionStatus =
  | "created"
  | "in_progress"
  | "paused"
  | "completed"
  | "abandoned";

export type ResponseValue =
  | string
  | number
  | boolean
  | (string | number)[]
  | Record<string, string | number>
  | null;

export interface ResponseRecord {
  questionId: string;
  sectionId: string;
  pageId: string;
  value: ResponseValue;
  valid: boolean;
  updatedAt: string;
}

export interface RuntimeSession {
  id: string;
  packId: string;
  packVersion: string;
  assessmentId: string;
  name: string;
  status: RuntimeSessionStatus;
  currentSectionId: string | null;
  currentPageId: string | null;
  answeredCount: number;
  totalQuestions: number;
  progress: number;
  locked: boolean;
  startedAt: string;
  lastSavedAt: string | null;
  completedAt: string | null;
  metadata: Record<string, unknown>;
}

export interface ProgressSnapshot {
  percentComplete: number;
  questionsAnswered: number;
  questionsRemaining: number;
  totalQuestions: number;
  sectionsCompleted: number;
  totalSections: number;
  currentSectionId: string | null;
  currentSectionTitle: string | null;
  estimatedMinutesRemaining: number;
  sections: {
    sectionId: string;
    title: string;
    answered: number;
    total: number;
    complete: boolean;
  }[];
}

export interface NavigationState {
  currentPage: PageDefinition | null;
  currentSectionId: string | null;
  pageIndex: number;
  pageCount: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  canComplete: boolean;
  previousPageId: string | null;
  nextPageId: string | null;
}

export interface ValidationIssue {
  questionId: string;
  rule: ValidationRuleType;
  message: string;
}

export interface ValidationOutcome {
  valid: boolean;
  issues: ValidationIssue[];
}

/* ----------------------------------- events --------------------------------- */

export type RuntimeEventType =
  | "assessment.started"
  | "assessment.question_answered"
  | "assessment.section_completed"
  | "assessment.saved"
  | "assessment.paused"
  | "assessment.resumed"
  | "assessment.completed"
  | "assessment.validation_failed"
  | "assessment.error";

export interface RuntimeEvent {
  id: string;
  sessionId: string;
  type: RuntimeEventType;
  payload: Record<string, unknown>;
  createdAt: string;
}

/* ---------------------------------- payloads -------------------------------- */

export interface RuntimeSnapshot {
  session: RuntimeSession;
  definition: AssessmentDefinition;
  responses: ResponseRecord[];
  progress: ProgressSnapshot;
  navigation: NavigationState;
}

/** The contract Sprint 2's Intelligence Runtime subscribes to. */
export interface AssessmentPublishedPayload {
  sessionId: string;
  packId: string;
  packVersion: string;
  assessmentId: string;
  completedAt: string;
  durationMs: number;
  responses: {
    questionId: string;
    sectionId: string;
    code: string;
    type: QuestionType;
    value: ResponseValue;
  }[];
}

export interface AssessmentSummary {
  session: RuntimeSession;
  progress: ProgressSnapshot;
  payload: AssessmentPublishedPayload | null;
  events: RuntimeEvent[];
}
