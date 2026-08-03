# S4-014 Recovery Rehearsal Record

## Implementation rehearsal

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

## Approved recovery objectives

PDR-004-001 v1.0 sets Tier 1 RPO <=15 minutes and RTO <=4 hours for customer and governance systems of record, including recommendation outcome configurations, observations, status history, audit and idempotency state. Tier 2 projections must be rebuilt from a source no weaker than Tier 1 within eight hours. Tier 3 non-authoritative analytics permit RPO <=24 hours and RTO <=48 hours.

## Managed-environment rehearsal still required

A true backup/restore exercise requires a Lovable Cloud recovery point and an isolated restore target. It must record:

1. source revision and database recovery-point identifier;
2. start, restore-complete and verification timestamps;
3. restored migration inventory and pinned catalogue/configuration digests;
4. row-count reconciliation for governed recommendation objects;
5. immutable-trigger, RLS, privilege, tenant-denial and audit-export checks;
6. measured Tier 1 RPO <=15 minutes and RTO <=4 hours;
7. the actor and a `recovery_rehearsed` operational event containing only safe categorical metadata.

## Lovable Cloud capability assessment — 3 August 2026

A read-only assessment was completed after the S4-010 production deployment. No backup was selected, no restore target was created and production was not changed.

- Lovable's documented self-service control takes one database backup per day, retains roughly 14 days and restores schema and data in place. The restore permanently discards later database changes and makes the production database unavailable while it runs.
- Lovable explicitly documents that an arbitrary point-in-time restore is unavailable; only the daily snapshots can be selected. Daily recovery points cannot demonstrate the approved Tier 1 RPO <=15 minutes.
- The documented logical export contains database structure and data, is limited to 5 GB and one request per 24 hours, and excludes storage-bucket files, edge-function code, secrets and usable user passwords. It is a portability/compensating-control input, not evidence of an isolated managed restore.
- No documented self-service isolated/side-by-side restore target, clone or machine-readable restore job identifier is available for this Lovable Cloud project. A safe rehearsal therefore requires Lovable support to provide an isolated target and recoverable point, or a separately approved architecture/compensating control that can meet the locked objective.
- The production read-only watermark captured during the assessment was 3 August 2026 15:54 UTC, with 27 assessment sessions and 104 public tables. These facts do not substitute for source-backup, restore-start, restore-complete and isolated-target identifiers.

Authoritative platform references: [Lovable database backup and restore](https://docs.lovable.dev/features/database#backup-and-restore) and [Lovable Cloud data export](https://docs.lovable.dev/features/advanced-settings#export-lovable-cloud-data).

Status: **BLOCKED — EXTERNAL PLATFORM CAPABILITY**. The policy is approved, but the documented self-service platform exposes daily in-place restore rather than a <=15-minute point and isolated target. Automated state-machine tests are not represented as a platform restore. This remains a Sprint 04 release blocker until Lovable supplies a qualifying recovery point and isolated target, or Product Ownership approves a different architecture/compensating control, and the source point, timestamps, measured RPO/RTO and post-restore checks above are evidenced.
