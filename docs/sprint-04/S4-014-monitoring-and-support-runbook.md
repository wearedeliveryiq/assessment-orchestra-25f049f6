# S4-014 Monitoring and Support Runbook

## Purpose and boundaries

This runbook supports the governed Sprint 04 recommendation capability. It does not author product rules, edit immutable records or bypass catalogue separation of duties. Corrections use the existing append-only decision, action, hand-off, feature-control and catalogue lifecycle paths.

Audit exports are disabled by default. Product Governance may enable `audit_exports` only through the governed feature-control endpoint after the applicable release gates are satisfied. A missing flag, lookup error or unknown key resolves to disabled.

## Health and alerting

The internal health endpoint is available only to `recommendation:govern` or `audit:read`. It reports queue depth, processing count, failures, oldest queued age, critical integrity failures, open critical operational alerts and the complete Section 20 alert-code manifest. Operational metadata is categorical and must never contain raw answers, notes, evidence, free text, prompts, tokens or secrets.

| Alert code            | Trigger/source                                               | First response                                                                                        |
| --------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `promotion_failure`   | catalogue promotion or rollback fails                        | keep the existing activation; inspect validation and lifecycle events; never edit the active snapshot |
| `invalid_catalogue`   | governed catalogue validation fails                          | prevent activation; compare the candidate to the active version using configuration diff              |
| `orphan_lineage`      | portfolio/export lineage or item reconciliation fails        | publication remains blocked; preserve the failed integrity result and inspect the source chain        |
| `dependency_cycle`    | recommendation dependency validation detects a cycle         | keep the previous catalogue/sequence active; inspect the returned bounded cycle path                  |
| `transition_conflict` | optimistic version or lifecycle transition conflict          | reload current state and replay only a still-valid command with a new semantic request                |
| `command_failure`     | governed decision/action/outcome command fails               | confirm source state and permission; do not mutate the immutable baseline or event history            |
| `export_failure`      | audit export worker fails                                    | use the failed job's safe code; retry only when `retryable=true` and attempts remain                  |
| `tenant_denial`       | cross-tenant or unauthorised access is rejected              | verify identity, active membership and workspace ownership; investigate repeated attempts             |
| `handoff_abuse`       | repeated invalid/expired Pack or TeamMate hand-off use       | revoke or expire the affected hand-off and review access telemetry; never expose token material       |
| `latency`             | PB-004 latency target or 60-second export target is exceeded | inspect queue age and task execution; scale or pause the affected feature without weakening bounds    |

Health is `unhealthy` when a failed integrity result or recent critical alert exists, `degraded` when exports have failed or the oldest queued job exceeds 60 seconds, and otherwise `healthy`.

## Audit export support

1. Confirm the requester has tenant audit permission and an active membership in the requested organisation/workspace.
2. Confirm `audit_exports` is enabled and the portfolio belongs to the same tenant.
3. A request is asynchronous and idempotent. The server permits five new requests per actor and organisation per hour; exact replay does not consume another slot.
4. The worker claims at most 25 jobs, uses a two-minute lease, permits no more than three attempts and contains each job failure so one bad export cannot block the batch.
5. A completed payload is available for 15 minutes. Status and download attempts are access logged. An expired payload is removed and cannot be replayed; request a fresh export.
6. Exports contain no more than 10,000 audit events and use an allow-listed, actor-redacted schema. Critical scope, count, lineage or overlay-linkage failure prevents completion.
7. Retry only a terminal `failed` job with `retryable=true`. Integrity failures are non-retryable and require the source defect to be corrected through its governed superseding workflow.

## Support procedures

### Catalogue rollback

Use the S4-001 lifecycle service with a Product Governance author and a different Product Governance approver. Rollback moves the activation pointer atomically and preserves every previous version and lifecycle event. Never update catalogue snapshots, definitions or activation rows directly.

### Command replay and transition conflicts

Use the original idempotency key only for a byte-equivalent semantic request. A conflicting replay must remain rejected. For an intentional new command, reload the current version, re-authorise the actor and issue a new idempotency key. Do not alter historic events.

### Supersession and corrupt overlays

Use the approved decision restore/supersede, action transition or hand-off revocation path. If an overlay fails reconciliation, block the affected projection/export, preserve the immutable generated baseline and append a correcting event. Never delete or rewrite the defective event.

### User deactivation

Deactivate the identity or membership through the identity service. Existing author, approver, decision, action and access references remain as audit history. Reassign active work through the approved action command; do not rewrite prior ownership.

### Incident response

Set the affected feature flag to disabled using reason `incident` or `rollback`; record the current application revision, active catalogue digest, health snapshot and safe correlation IDs; preserve immutable records; and follow the platform security/privacy incident process. Avoid copying customer payloads into tickets or logs.

## Retention and deletion

Audit jobs, integrity results and operational events follow the approved tenant/legal platform retention policy. S4-014 does not invent a retention duration. Until that policy supplies a governed purge/archive instruction, preserve immutable audit data and rely on the 15-minute payload expiry to remove downloadable export content. Tenant deletion must use the platform deletion process with legal-hold checks and an auditable service identity.
