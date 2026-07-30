import * as repo from "./repository.server";
import { record } from "./service.server";
import type { AuditQuery, RetentionPolicy, RetentionRunResult } from "./types";

/**
 * AuditRetentionManager
 *
 * Single responsibility: apply configurable retention policies to the immutable
 * audit log. Records are never edited — a policy either archives them (setting
 * the archive marker) or purges them entirely.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function listRetentionPolicies(): Promise<RetentionPolicy[]> {
  return repo.listPolicies();
}

export function saveRetentionPolicy(input: {
  name: string;
  scope?: RetentionPolicy["scope"];
  scopeValue?: string;
  mode: RetentionPolicy["mode"];
  retainDays?: number | null;
  enabled?: boolean;
  description?: string;
}): Promise<RetentionPolicy> {
  return repo.upsertPolicy(input);
}

/** Translates a policy's scope into a repository filter. */
export function policyFilter(policy: RetentionPolicy): AuditQuery {
  switch (policy.scope) {
    case "engine":
      return { engine: policy.scopeValue };
    case "severity":
      return { severity: policy.scopeValue };
    case "organisation":
      return { organisationId: policy.scopeValue };
    default:
      return {};
  }
}

/** The cutoff timestamp a policy applies from, or null when it never expires. */
export function policyCutoff(policy: RetentionPolicy, now = Date.now()): string | null {
  if (policy.mode === "indefinite") return null;
  if (!policy.retainDays || policy.retainDays <= 0) return null;
  return new Date(now - policy.retainDays * DAY_MS).toISOString();
}

export async function applyRetention(now = Date.now()): Promise<RetentionRunResult> {
  const policies = await repo.listPolicies();
  const applied: RetentionRunResult["policies"] = [];
  let archived = 0;
  let purged = 0;

  for (const policy of policies) {
    if (!policy.enabled) continue;
    const cutoff = policyCutoff(policy, now);
    if (!cutoff) {
      applied.push({ policy: policy.name, mode: policy.mode, affected: 0 });
      continue;
    }

    const filter = policyFilter(policy);
    let affected = 0;
    try {
      if (policy.mode === "archive") {
        affected = await repo.archiveExpired(cutoff, filter);
        archived += affected;
      } else if (policy.mode === "purge") {
        affected = await repo.purgeExpired(cutoff, filter);
        purged += affected;
      }
      await repo.markPolicyApplied(policy.id);
    } catch (error) {
      console.error(`[audit-retention] policy "${policy.name}" failed`, error);
    }

    applied.push({ policy: policy.name, mode: policy.mode, affected });
  }

  const appliedAt = new Date(now).toISOString();
  record({
    engine: "audit",
    eventType: "retention.applied",
    entityType: "retention",
    severity: "info",
    payload: { archived, purged, policies: applied },
  });

  return { appliedAt, policies: applied, archived, purged };
}
