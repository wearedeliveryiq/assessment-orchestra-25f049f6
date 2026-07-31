import type { Report, ReportDistributionTarget, ReportSchedule } from "./types";

/**
 * Export queue + scheduling helpers (pure).
 *
 * Generation runs inline by default. Queued reports are persisted with
 * `status = "queued"` and drained by `processQueue` in `service.server.ts`,
 * so scheduled delivery can be added later without touching renderers.
 */

export const DEFAULT_MAX_ATTEMPTS = 3;

export interface QueueSnapshot {
  queued: number;
  generating: number;
  completed: number;
  failed: number;
  oldestQueuedAt: string | null;
  averageDurationMs: number;
}

export function summariseQueue(reports: Report[]): QueueSnapshot {
  const completed = reports.filter((item) => item.status === "completed");
  const queued = reports.filter((item) => item.status === "queued");
  const durations = completed.map((item) => item.durationMs).filter((value) => value > 0);
  const oldest = queued
    .map((item) => item.queuedAt)
    .sort((a, b) => a.localeCompare(b))
    .at(0);

  return {
    queued: queued.length,
    generating: reports.filter((item) => item.status === "generating").length,
    completed: completed.length,
    failed: reports.filter((item) => item.status === "failed").length,
    oldestQueuedAt: oldest ?? null,
    averageDurationMs: durations.length
      ? Math.round(durations.reduce((total, value) => total + value, 0) / durations.length)
      : 0,
  };
}

export function canRetry(report: Report): boolean {
  return report.status === "failed" && report.attempts < report.maxAttempts;
}

/** Exponential backoff (1s, 4s, 9s …) used when a queued render fails. */
export function retryDelayMs(attempt: number): number {
  return Math.min(attempt * attempt * 1000, 60_000);
}

export function isExpired(report: Report, now = new Date()): boolean {
  return Boolean(report.expiresAt && new Date(report.expiresAt).getTime() <= now.getTime());
}

export function hoursUntilExpiry(report: Report, now = new Date()): number | null {
  if (!report.expiresAt) return null;
  const diff = new Date(report.expiresAt).getTime() - now.getTime();
  return Math.max(0, Math.round(diff / 3_600_000));
}

/** Next run for a schedule — future scheduled reports build on this. */
export function nextRunAt(schedule: ReportSchedule, from = new Date()): string | null {
  if (!schedule.enabled) return null;
  const next = new Date(from.getTime());
  switch (schedule.frequency) {
    case "once":
      return null;
    case "daily":
      next.setUTCDate(next.getUTCDate() + 1);
      break;
    case "weekly":
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case "monthly":
      next.setUTCMonth(next.getUTCMonth() + 1);
      break;
    case "quarterly":
      next.setUTCMonth(next.getUTCMonth() + 3);
      break;
  }
  return next.toISOString();
}

export function describeDistribution(targets: ReportDistributionTarget[]): string {
  if (!targets.length) return "Download only";
  return targets.map((target) => `${target.channel}: ${target.address}`).join(", ");
}
