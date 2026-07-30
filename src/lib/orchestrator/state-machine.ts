import { OrchestratorError, type ExecutionStatus } from "./types";

/**
 * ExecutionStateManager (pure part).
 *
 * A single source of truth for legal execution state transitions. Every state
 * change in the orchestrator goes through `assertTransition`, so an execution
 * can never reach an inconsistent state — even after a service restart.
 */
export const EXECUTION_TRANSITIONS: Record<ExecutionStatus, ExecutionStatus[]> = {
  queued: ["starting", "cancelled", "failed"],
  starting: ["running", "failed", "cancelled"],
  running: ["running", "paused", "completed", "failed", "cancelled"],
  paused: ["running", "cancelled", "failed"],
  completed: [],
  failed: ["queued", "starting", "running"],
  cancelled: ["queued", "starting", "running"],
};

export const TERMINAL_STATUSES: ExecutionStatus[] = ["completed", "failed", "cancelled"];

export function isTerminal(status: ExecutionStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function isActive(status: ExecutionStatus): boolean {
  return status === "queued" || status === "starting" || status === "running";
}

export function canTransition(from: ExecutionStatus, to: ExecutionStatus): boolean {
  return EXECUTION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: ExecutionStatus, to: ExecutionStatus): void {
  if (!canTransition(from, to)) {
    throw new OrchestratorError(
      `Illegal execution transition: ${from} → ${to}`,
      409,
      "illegal_transition",
    );
  }
}
