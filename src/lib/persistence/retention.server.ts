import { CacheTags, invalidateTag } from "./cache";
import type { PlatformRepositories } from "./repositories";
import type { TenantContext } from "./types";

/**
 * Retention execution.
 *
 * Policies are configuration, not code: each row in
 * `platform_retention_policies` names an entity, a mode and a horizon. Modes:
 *
 *   retain  — keep indefinitely (no action)
 *   archive — mark as archived/soft-deleted, record remains readable
 *   purge   — permanently remove; only permitted for non-business data
 *
 * Business records are never purged by default; the guard below refuses any
 * purge policy pointed at an aggregate that carries business meaning.
 */

const PURGEABLE = new Set(["notifications", "temporary_data", "login_attempts"]);

export interface RetentionRunResult {
  entity: string;
  mode: string;
  affected: number;
  skipped?: string;
}

function cutoff(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export async function applyRetentionPolicies(
  repos: PlatformRepositories,
  context: TenantContext,
): Promise<RetentionRunResult[]> {
  const policies = await repos.retention.active({ ...context, crossTenant: true });
  const results: RetentionRunResult[] = [];

  for (const policy of policies) {
    if (policy.mode === "retain" || !policy.retainDays) {
      results.push({ entity: policy.entity, mode: policy.mode, affected: 0 });
      continue;
    }

    if (policy.mode === "purge" && !PURGEABLE.has(policy.entity)) {
      results.push({
        entity: policy.entity,
        mode: policy.mode,
        affected: 0,
        skipped: "purge is not permitted for business records",
      });
      continue;
    }

    const horizon = cutoff(policy.retainDays);

    if (policy.entity === "audit_events") {
      const affected = await repos.audit.archiveOlderThan(horizon);
      results.push({ entity: policy.entity, mode: "archive", affected });
      continue;
    }

    if (policy.entity === "notifications") {
      const stale = await repos.notifications.findMany(
        { ...context, crossTenant: true },
        { filters: [{ column: "created_at", op: "lt", value: horizon }], pageSize: 200 },
      );
      let affected = 0;
      for (const notification of stale.items) {
        if (policy.mode === "purge") {
          affected += await repos.notifications.hardDeleteById(
            { ...context, crossTenant: true },
            notification.id,
          );
        } else {
          await repos.notifications.softDeleteById({ ...context, crossTenant: true }, notification.id);
          affected += 1;
        }
      }
      results.push({ entity: policy.entity, mode: policy.mode, affected });
      continue;
    }

    if (policy.entity === "assessment_sessions") {
      const stale = await repos.assessmentSessions.findMany(
        { ...context, crossTenant: true },
        {
          filters: [
            { column: "created_at", op: "lt", value: horizon },
            { column: "status", op: "eq", value: "completed" },
          ],
          pageSize: 200,
        },
      );
      for (const session of stale.items) {
        await repos.assessmentSessions.archive({ ...context, crossTenant: true }, session.id);
      }
      results.push({ entity: policy.entity, mode: "archive", affected: stale.items.length });
      continue;
    }

    results.push({ entity: policy.entity, mode: policy.mode, affected: 0, skipped: "no handler" });
  }

  invalidateTag(CacheTags.retention);
  return results;
}
