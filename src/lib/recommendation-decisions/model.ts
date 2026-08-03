export const recommendationDecisionStates = [
  "undecided",
  "accepted",
  "deferred",
  "rejected",
  "superseded",
] as const;

export const recommendationDecisionCommands = [
  "accepted",
  "deferred",
  "rejected",
  "restored",
  "superseded",
] as const;

export const recommendationDecisionReasonCategories = [
  "not_relevant",
  "already_addressed",
  "not_feasible",
  "wrong_timing",
  "insufficient_evidence",
  "other",
] as const;

export type RecommendationDecisionState = (typeof recommendationDecisionStates)[number];
export type RecommendationDecisionCommand = (typeof recommendationDecisionCommands)[number];
export type RecommendationDecisionReasonCategory =
  (typeof recommendationDecisionReasonCategories)[number];

export interface RecommendationDecisionTransitionInput {
  currentState: RecommendationDecisionState;
  command: RecommendationDecisionCommand;
  acknowledged: boolean;
  reasonCategory: RecommendationDecisionReasonCategory | null;
  reviewAt: string | null;
  actorType?: "user" | "system";
}

export interface RecommendationDecisionTransition {
  previousState: RecommendationDecisionState;
  currentState: RecommendationDecisionState;
  command: RecommendationDecisionCommand;
  acknowledged: boolean;
  reasonCategory: RecommendationDecisionReasonCategory | null;
  reviewAt: string | null;
}

export interface NormalizedRecommendationDecisionFields {
  acknowledged: boolean;
  reasonCategory: RecommendationDecisionReasonCategory | null;
  reviewAt: string | null;
}

export class RecommendationDecisionError extends Error {
  readonly code = "RECOMMENDATION_DECISION_INVALID";
}

const userTransitions: Record<
  Exclude<RecommendationDecisionCommand, "superseded">,
  readonly RecommendationDecisionState[]
> = {
  accepted: ["undecided", "deferred", "rejected"],
  deferred: ["undecided", "accepted", "rejected"],
  rejected: ["undecided", "accepted", "deferred"],
  restored: ["deferred", "rejected"],
};

function validReviewAt(value: string | null) {
  return value !== null && value.trim() === value && !Number.isNaN(Date.parse(value));
}

export function normalizeRecommendationDecisionFields(input: {
  command: RecommendationDecisionCommand;
  acknowledged: boolean;
  reasonCategory: RecommendationDecisionReasonCategory | null;
  reviewAt: string | null;
}): NormalizedRecommendationDecisionFields {
  if (!recommendationDecisionCommands.includes(input.command)) {
    throw new RecommendationDecisionError("The requested recommendation decision is invalid");
  }
  if (
    input.reasonCategory !== null &&
    !recommendationDecisionReasonCategories.includes(input.reasonCategory)
  ) {
    throw new RecommendationDecisionError("Choose an approved recommendation decision reason");
  }
  if (
    input.command === "accepted" &&
    (input.acknowledged !== true || input.reasonCategory !== null || input.reviewAt !== null)
  ) {
    throw new RecommendationDecisionError(
      "Accepting advice requires acknowledgement and no defer or reject fields",
    );
  }
  if (input.command === "deferred" && (!validReviewAt(input.reviewAt) || input.acknowledged)) {
    throw new RecommendationDecisionError("Deferring advice requires a valid review date");
  }
  if (
    input.command === "rejected" &&
    (input.reasonCategory === null || input.reviewAt !== null || input.acknowledged)
  ) {
    throw new RecommendationDecisionError("Rejecting advice requires an approved reason category");
  }
  if (
    ["restored", "superseded"].includes(input.command) &&
    (input.reasonCategory !== null || input.reviewAt !== null || input.acknowledged)
  ) {
    throw new RecommendationDecisionError(
      "Restore and supersede commands cannot carry decision fields",
    );
  }
  return {
    acknowledged: input.command === "accepted",
    reasonCategory:
      input.command === "rejected" || input.command === "deferred" ? input.reasonCategory : null,
    reviewAt: input.command === "deferred" ? input.reviewAt : null,
  };
}

export function transitionRecommendationDecision(
  input: RecommendationDecisionTransitionInput,
): RecommendationDecisionTransition {
  const actorType = input.actorType ?? "user";
  if (!recommendationDecisionStates.includes(input.currentState)) {
    throw new RecommendationDecisionError("The current recommendation decision is invalid");
  }
  if (!recommendationDecisionCommands.includes(input.command)) {
    throw new RecommendationDecisionError("The requested recommendation decision is invalid");
  }
  if (input.command === "superseded") {
    if (actorType !== "system" || input.currentState === "superseded") {
      throw new RecommendationDecisionError("Only the governed system may supersede advice");
    }
  } else if (
    actorType !== "user" ||
    input.currentState === "superseded" ||
    !userTransitions[input.command].includes(input.currentState)
  ) {
    throw new RecommendationDecisionError(
      "That recommendation decision is no longer available from its current state",
    );
  }

  const normalized = normalizeRecommendationDecisionFields(input);

  return {
    previousState: input.currentState,
    currentState: input.command === "restored" ? "undecided" : input.command,
    command: input.command,
    ...normalized,
  };
}

export function availableRecommendationDecisionCommands(state: RecommendationDecisionState) {
  if (state === "superseded") return [];
  return (["accepted", "deferred", "rejected", "restored"] as const).filter((command) =>
    userTransitions[command].includes(state),
  );
}
