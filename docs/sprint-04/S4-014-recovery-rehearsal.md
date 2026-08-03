# S4-014 Recovery Capability and Historical Rehearsal Record

## Automated resilience checks — not a platform recovery rehearsal

Automated tests exercise the recoverable state machine without customer data:

- absent feature configuration fails safe;
- immutable source data remains untouched;
- two claimed export jobs are isolated so one integrity failure does not roll back the successful job;
- exact request replay reuses one job and conflicting reuse is rejected;
- retry is limited to retryable failures and no more than three claims;
- stale processing leases are reclaimable after two minutes;
- completed payloads expire after 15 minutes and are no longer downloadable;
- integrity failure blocks export completion and records a non-retryable result;
- every authorised access attempt is logged;
- configuration comparison is deterministic and redacted;
- the full ten-code alert manifest is returned by health monitoring;
- 10,000 audit events project within the 60-second target while 10,001 fail closed.

## Historical recovery objectives — superseded

PDR-004-001 v1.0 sets Tier 1 RPO <=15 minutes and RTO <=4 hours for customer and governance systems of record, including recommendation outcome configurations, observations, status history, audit and idempotency state. Tier 2 projections must be rebuilt from a source no weaker than Tier 1 within eight hours. Tier 3 non-authoritative analytics permit RPO <=24 hours and RTO <=48 hours.

PB-004A v1.0 and PDR-004-001 v1.1 superseded these current-stage objectives on 3 August 2026 following Matt Prust's explicit founder risk-and-cost decision. This paragraph is retained as historical evidence and must not be represented as the current policy.

## Historical managed-environment rehearsal gate — superseded

A true backup/restore exercise requires a Lovable Cloud recovery point and an isolated restore target. It must record:

1. source revision and database recovery-point identifier;
2. start, restore-complete and verification timestamps;
3. restored migration inventory and pinned catalogue/configuration digests;
4. row-count reconciliation for governed recommendation objects;
5. immutable-trigger, RLS, privilege, tenant-denial and audit-export checks;
6. measured Tier 1 RPO <=15 minutes and RTO <=4 hours;
7. the actor and a `recovery_rehearsed` operational event containing only safe categorical metadata.

This was the PDR-004-001 v1.0 acceptance gate. PB-004A and PDR-004-001 v1.1 remove it for the current product stage. No exercise satisfying this historical gate occurred.

## Lovable Cloud capability assessment — 3 August 2026

A read-only assessment was completed after the S4-010 production deployment. No backup was selected, no restore target was created and production was not changed.

- Lovable's documented self-service control takes one database backup per day, retains roughly 14 days and restores schema and data in place. The restore permanently discards later database changes and makes the production database unavailable while it runs.
- Lovable explicitly documents that an arbitrary point-in-time restore is unavailable; only the daily snapshots can be selected. Daily recovery points could not demonstrate the historical PDR-004-001 v1.0 Tier 1 RPO <=15 minutes.
- The documented logical export contains database structure and data, is limited to 5 GB and one request per 24 hours, and excludes storage-bucket files, edge-function code, secrets and usable user passwords. It is a portability/compensating-control input, not evidence of an isolated managed restore.
- No documented self-service isolated/side-by-side restore target, clone or machine-readable restore job identifier is available for this Lovable Cloud project. Under the historical v1.0 policy, a safe rehearsal would therefore have required Lovable support or a different architecture. PB-004A/PDR-004-001 v1.1 no longer require that capability for the current product stage.
- The production read-only watermark captured during the assessment was 3 August 2026 15:54 UTC, with 27 assessment sessions and 104 public tables. These facts do not substitute for source-backup, restore-start, restore-complete and isolated-target identifiers.

Authoritative platform references: [Lovable database backup and restore](https://docs.lovable.dev/features/database#backup-and-restore) and [Lovable Cloud data export](https://docs.lovable.dev/features/advanced-settings#export-lovable-cloud-data).

## Founder-approved current-stage policy — 3 August 2026

PB-004A v1.0 and PDR-004-001 v1.1 approve the documented current Lovable control as proportionate for the present product stage:

- daily database backup with roughly 14-day retention;
- in-place restore to a selected available snapshot;
- no fixed RPO or RTO promise;
- no point-in-time or isolated-restore claim;
- explicit acceptance that database changes since the snapshot may be lost;
- explicit acceptance of restore downtime and possible application/schema reconciliation;
- separate treatment for storage, secrets, runtime configuration and other excluded components; and
- no destructive production restore solely to manufacture evidence.

PDR-004-002 v1.0 is superseded. Its Route A/Route B recovery architecture work is no longer required for Sprint 04 acceptance.

## Controlled recovery tabletop

The controlled-document review performed on 3 August 2026 covered the following recovery sequence without invoking a restore:

1. identify the incident or approved reason and place affected service into maintenance/fail-closed operation;
2. identify the latest suitable available snapshot and disclose the expected loss cutoff;
3. record Product Owner/Head of Software or incident-command authorisation;
4. invoke the documented in-place restore only when operationally necessary;
5. reconcile application revision, migration inventory, schema and governed configuration;
6. verify RLS, client-role denial, tenant isolation, immutable controls, audit continuity, idempotency and safe feature flags;
7. reopen service only after recorded verification; and
8. retain actual snapshot, actor, timing, loss and verification evidence if a restore occurs.

This was a documentary tabletop and capability assessment. No backup was selected, no restore was invoked, no data was changed, no recovery duration was measured and no `recovery_rehearsed` event was created.

## Current operational status

Status: **ACCEPTED DOCUMENTARY CONTROL — NO RESTORE PERFORMED OR CLAIMED**.

The filed platform assessment, current-stage policy, tabletop, named operational ownership and explicit founder residual-risk acceptance satisfy PB-004A/PDR-004-001 v1.1 Sprint evidence. Before customer enablement under the accepted Sprint 04 release, the Head of Software must record that a recent project backup is visible and the recovery runbook is accessible. Monthly visibility checks apply while customer data is present. Any real restore must record the actual snapshot, actors, invocation/completion times, data-loss cutoff and post-restore verification; it must not be retroactively described as a Sprint rehearsal unless separately governed.
