import type { FailureClass, RetryPolicy } from "./types";

/**
 * RetryManager (pure part).
 *
 * Classifies failures and computes backoff. Kept free of I/O so the retry
 * policy is unit-testable in isolation from the executor.
 */

const TRANSIENT_PATTERNS = [
  /timeout/i,
  /timed out/i,
  /etimedout/i,
  /econnreset/i,
  /econnrefused/i,
  /socket hang up/i,
  /network/i,
  /fetch failed/i,
  /temporarily unavailable/i,
  /rate limit/i,
  /too many requests/i,
  /\b429\b/,
  /\b50[234]\b/,
  /service unavailable/i,
  /upstream/i,
  /deadlock/i,
  /connection (?:closed|terminated|error)/i,
];

const PERMANENT_PATTERNS = [
  /invalid/i,
  /not found/i,
  /missing upstream artifact/i,
  /validation/i,
  /unauthori[sz]ed/i,
  /forbidden/i,
  /schema/i,
  /no engine registered/i,
  /unsupported/i,
];

/** Errors may opt in explicitly via a `failureClass` property. */
export function classifyFailure(error: unknown): FailureClass {
  const tagged = (error as { failureClass?: FailureClass } | null)?.failureClass;
  if (tagged === "transient" || tagged === "permanent") return tagged;

  const message = error instanceof Error ? error.message : String(error ?? "");
  if (PERMANENT_PATTERNS.some((p) => p.test(message))) return "permanent";
  if (TRANSIENT_PATTERNS.some((p) => p.test(message))) return "transient";
  return "permanent";
}

/** Exponential backoff, capped by the policy. `attempt` is 1-based. */
export function backoffDelay(attempt: number, policy: RetryPolicy): number {
  if (attempt <= 1) return 0;
  const raw = policy.backoffMs * Math.pow(policy.factor, attempt - 2);
  return Math.min(Math.round(raw), policy.maxBackoffMs);
}

export function shouldRetry(
  failureClass: FailureClass,
  attempt: number,
  policy: RetryPolicy,
): boolean {
  return failureClass === "transient" && attempt < policy.maxAttempts;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown engine failure";
}

export function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
