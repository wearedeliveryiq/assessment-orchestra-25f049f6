import type { ExecutionStage, ExecutionProgress } from "./types";

/**
 * Progress reporting (pure).
 *
 * Percentage completion is derived from persisted stage state, so a refresh,
 * a new browser or a restarted service all report identical progress.
 */
export function computeProgress(stages: ExecutionStage[], now = Date.now()): ExecutionProgress {
  const total = stages.length;
  const finished = stages.filter((s) => s.status === "completed" || s.status === "skipped");
  const running = stages.find((s) => s.status === "running");
  const next = stages.find((s) => s.status === "pending");

  const percentage = total === 0 ? 0 : Math.round((finished.length / total) * 100);

  const measured = finished.filter((s) => s.durationMs > 0);
  const averageMs =
    measured.length > 0
      ? measured.reduce((sum, s) => sum + s.durationMs, 0) / measured.length
      : null;

  const remaining = total - finished.length;
  let estimatedRemainingMs: number | null = null;
  if (averageMs !== null && remaining > 0) {
    const elapsedOnCurrent =
      running?.startedAt != null ? Math.max(0, now - Date.parse(running.startedAt)) : 0;
    estimatedRemainingMs = Math.max(0, Math.round(remaining * averageMs - elapsedOnCurrent));
  }

  return {
    percentage,
    completed: finished.length,
    total,
    currentStage: running?.stageId ?? next?.stageId ?? null,
    estimatedRemainingMs,
    estimatedCompletionAt:
      estimatedRemainingMs === null ? null : new Date(now + estimatedRemainingMs).toISOString(),
  };
}

/** Human-readable single-line progress, used by the monitor and logs. */
export function describeStage(stage: ExecutionStage): string {
  switch (stage.status) {
    case "completed":
      return "Completed";
    case "running":
      return stage.attempt > 1 ? `Running (retry ${stage.attempt - 1})` : "Running";
    case "failed":
      return `Failed — ${stage.errorMessage ?? "unknown error"}`;
    case "skipped":
      return "Skipped";
    case "cancelled":
      return "Cancelled";
    default:
      return "Waiting";
  }
}
