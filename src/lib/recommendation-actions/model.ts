export const recommendationActionStates = [
  "not_started",
  "in_progress",
  "blocked",
  "completed",
  "cancelled",
] as const;

export const recommendationActionCommands = [
  "created",
  "updated",
  "started",
  "blocked",
  "completed",
  "cancelled",
] as const;

export type RecommendationActionState = (typeof recommendationActionStates)[number];
export type RecommendationActionCommand = (typeof recommendationActionCommands)[number];

export interface RecommendationActionFields {
  accountableOwnerId: string | null;
  contributorIds: string[];
  targetDate: string | null;
  note: string | null;
  completionNote: string | null;
  evidenceReferences: string[];
  evidenceNotAvailableReason: string | null;
  dependencyOverride: boolean;
  dependencyOverrideReason: string | null;
  dependencyOverrideAcknowledged: boolean;
}

export interface RecommendationActionTransitionInput extends RecommendationActionFields {
  currentState: RecommendationActionState | null;
  command: RecommendationActionCommand;
  cancelAcknowledged?: boolean;
  blockingDependencyIds?: string[];
}

export interface RecommendationActionTransition extends RecommendationActionFields {
  previousState: RecommendationActionState | null;
  currentState: RecommendationActionState;
  command: RecommendationActionCommand;
}

export class RecommendationActionError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const terminal = new Set<RecommendationActionState>(["completed", "cancelled"]);

function boundedText(value: string | null, label: string, maximum: number) {
  if (value === null) return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) {
    throw new RecommendationActionError(
      "RECOMMENDATION_ACTION_INVALID",
      `${label} must contain between 1 and ${maximum} characters`,
    );
  }
  return normalized;
}

function validDate(value: string | null) {
  if (value === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new RecommendationActionError(
      "RECOMMENDATION_ACTION_INVALID",
      "Target date must be a valid calendar date",
    );
  }
  return value;
}

export function normalizeRecommendationActionFields(
  input: RecommendationActionFields,
): RecommendationActionFields {
  if (input.accountableOwnerId !== null && !uuid.test(input.accountableOwnerId)) {
    throw new RecommendationActionError(
      "RECOMMENDATION_ACTION_INVALID",
      "Accountable owner must be a valid workspace member",
    );
  }
  if (
    input.contributorIds.length > 50 ||
    input.contributorIds.some((id) => !uuid.test(id)) ||
    new Set(input.contributorIds).size !== input.contributorIds.length
  ) {
    throw new RecommendationActionError(
      "RECOMMENDATION_ACTION_INVALID",
      "Contributors must be unique valid workspace members",
    );
  }
  if (input.accountableOwnerId && input.contributorIds.includes(input.accountableOwnerId)) {
    throw new RecommendationActionError(
      "RECOMMENDATION_ACTION_INVALID",
      "The accountable owner cannot also be a contributor",
    );
  }
  if (input.evidenceReferences.length > 20) {
    throw new RecommendationActionError(
      "RECOMMENDATION_ACTION_INVALID",
      "An action can contain at most 20 evidence references",
    );
  }
  const evidenceReferences = input.evidenceReferences.map((reference) => {
    const normalized = reference.trim();
    if (!normalized || normalized.length > 500) {
      throw new RecommendationActionError(
        "RECOMMENDATION_ACTION_INVALID",
        "Evidence references must contain between 1 and 500 characters",
      );
    }
    return normalized;
  });
  if (new Set(evidenceReferences).size !== evidenceReferences.length) {
    throw new RecommendationActionError(
      "RECOMMENDATION_ACTION_INVALID",
      "Evidence references must be unique",
    );
  }
  return {
    accountableOwnerId: input.accountableOwnerId,
    contributorIds: [...input.contributorIds],
    targetDate: validDate(input.targetDate),
    note: boundedText(input.note, "Action note", 2_000),
    completionNote: boundedText(input.completionNote, "Completion note", 2_000),
    evidenceReferences,
    evidenceNotAvailableReason: boundedText(
      input.evidenceNotAvailableReason,
      "Evidence-not-available reason",
      1_000,
    ),
    dependencyOverride: input.dependencyOverride,
    dependencyOverrideReason: boundedText(
      input.dependencyOverrideReason,
      "Dependency override reason",
      1_000,
    ),
    dependencyOverrideAcknowledged: input.dependencyOverrideAcknowledged,
  };
}

export function transitionRecommendationAction(
  input: RecommendationActionTransitionInput,
): RecommendationActionTransition {
  const fields = normalizeRecommendationActionFields(input);
  const previousState = input.currentState;
  if (previousState !== null && !recommendationActionStates.includes(previousState)) {
    throw new RecommendationActionError(
      "RECOMMENDATION_ACTION_INVALID",
      "The current action state is invalid",
    );
  }
  if (!recommendationActionCommands.includes(input.command)) {
    throw new RecommendationActionError(
      "RECOMMENDATION_ACTION_INVALID",
      "The requested action command is invalid",
    );
  }
  if (previousState && terminal.has(previousState)) {
    throw new RecommendationActionError(
      "RECOMMENDATION_ACTION_INVALID",
      "Completed and cancelled actions cannot be changed",
    );
  }

  let currentState: RecommendationActionState;
  switch (input.command) {
    case "created":
      if (previousState !== null)
        throw new RecommendationActionError(
          "RECOMMENDATION_ACTION_INVALID",
          "The action already exists",
        );
      currentState = "not_started";
      break;
    case "updated":
      if (previousState === null)
        throw new RecommendationActionError(
          "RECOMMENDATION_ACTION_INVALID",
          "The action does not exist",
        );
      currentState = previousState;
      break;
    case "started":
      if (!previousState || !["not_started", "blocked"].includes(previousState)) {
        throw new RecommendationActionError(
          "RECOMMENDATION_ACTION_INVALID",
          "Only a not-started or blocked action can be started",
        );
      }
      if (!fields.accountableOwnerId || !fields.targetDate) {
        throw new RecommendationActionError(
          "RECOMMENDATION_ACTION_INVALID",
          "Starting an action requires one accountable owner and a target date",
        );
      }
      if ((input.blockingDependencyIds?.length ?? 0) > 0) {
        if (
          !fields.dependencyOverride ||
          !fields.dependencyOverrideAcknowledged ||
          !fields.dependencyOverrideReason
        ) {
          throw new RecommendationActionError(
            "ACTION_DEPENDENCY_BLOCKED",
            "A required dependency must be completed before this action can start",
          );
        }
      } else if (
        fields.dependencyOverride ||
        fields.dependencyOverrideAcknowledged ||
        fields.dependencyOverrideReason
      ) {
        throw new RecommendationActionError(
          "RECOMMENDATION_ACTION_INVALID",
          "A dependency override is only valid when a required dependency is incomplete",
        );
      }
      currentState = "in_progress";
      break;
    case "blocked":
      if (!previousState || !["not_started", "in_progress"].includes(previousState)) {
        throw new RecommendationActionError(
          "RECOMMENDATION_ACTION_INVALID",
          "This action cannot be blocked from its current state",
        );
      }
      currentState = "blocked";
      break;
    case "completed":
      if (previousState !== "in_progress") {
        throw new RecommendationActionError(
          "RECOMMENDATION_ACTION_INVALID",
          "Only an in-progress action can be completed",
        );
      }
      if (
        !fields.completionNote ||
        (fields.evidenceReferences.length === 0 && !fields.evidenceNotAvailableReason) ||
        (fields.evidenceReferences.length > 0 && fields.evidenceNotAvailableReason)
      ) {
        throw new RecommendationActionError(
          "RECOMMENDATION_ACTION_INVALID",
          "Completion requires a note and either evidence references or an evidence-not-available reason",
        );
      }
      currentState = "completed";
      break;
    case "cancelled":
      if (previousState === null || input.cancelAcknowledged !== true) {
        throw new RecommendationActionError(
          "RECOMMENDATION_ACTION_INVALID",
          "Cancelling an action requires explicit confirmation",
        );
      }
      currentState = "cancelled";
      break;
  }

  if (currentState !== "completed") {
    fields.completionNote = null;
    fields.evidenceReferences = [];
    fields.evidenceNotAvailableReason = null;
  }
  if (input.command !== "started") {
    fields.dependencyOverride = false;
    fields.dependencyOverrideReason = null;
    fields.dependencyOverrideAcknowledged = false;
  }
  return { previousState, currentState, command: input.command, ...fields };
}

export function incompleteRequiredActionDependencies(
  dependencies: Array<{ recommendationId: string; type: "required" | "recommended" }>,
  states: ReadonlyMap<string, RecommendationActionState>,
) {
  return dependencies
    .filter((dependency) => dependency.type === "required")
    .filter((dependency) => states.get(dependency.recommendationId) !== "completed")
    .map((dependency) => dependency.recommendationId)
    .sort();
}
