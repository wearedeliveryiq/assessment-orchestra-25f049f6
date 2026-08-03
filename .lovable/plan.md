# Sprint 04 Recovery-Capability Assessment (read-only)

Assessment only. Nothing was created, cloned, restored, migrated, modified, published, or deleted.

## Verdict

PDR-004-001's measured isolated recovery rehearsal (Tier 1, RPO <= 15 min, RTO <= 4 h) **cannot be executed on this platform today**. The blocker is a platform capability gap, not a project configuration issue.

## 1. Can a recovery point be restored into an isolated target?

No. Lovable Cloud restore is **in-place only**: selecting a backup rolls this project's own database back to that snapshot. There is no isolated target, no clone-to-new-backend, and no side-by-side restore. Any rehearsal would therefore be a destructive production restore, which is outside the read-only and no-production-change constraint.

## 2. What the current plan/admin surface exposes

| Capability | Available |
| --- | --- |
| Daily automatic backups, ~14-day retention (schema + data) | Yes — Cloud tab -> Database -> Backups |
| Backup timestamps visible | Yes, per daily snapshot only |
| Point-in-time recovery (arbitrary timestamp) | No |
| Restore to an isolated/cloned target | No — in-place restore only, irreversible |
| Downloadable full database export | Yes — Cloud -> Overview -> Advanced settings -> Export project data; 1 per 24 h, 5 GB cap |
| Storage bucket files in backup/export | No — excluded |
| Edge function code / secrets in export | No — excluded |
| Support-assisted recovery | Not exposed as a self-serve or documented workflow in this surface |

Backend health checked: hosted backend responding normally.

## 3. Roles / permissions / external action required

- In-app restore and export require Lovable **project owner / workspace admin** access on this project; no database role (including `service_role`) can invoke a platform restore — it is not a SQL operation.
- Cloud is Lovable-managed, so there is no Supabase dashboard, no PITR toggle, no branching, and no `service_role` key or database password available for an out-of-band `pg_restore` into a separate target.
- An **isolated restore target is only obtainable via a Lovable support request**. That is an external, human-initiated action and cannot be performed autonomously from this session.

## 4. Measurable RPO/RTO evidence obtainable today

Capturable now (read-only): current UTC time `2026-08-03 15:54 UTC`, latest Tier 1 write watermark `assessment_sessions.max(updated_at) = 2026-08-02 00:30:13 UTC`, 27 sessions across 104 public tables, plus per-table max timestamps and row counts.

Not capturable: backup snapshot timestamp as a machine-readable identifier, restore job id, restore start/finish timestamps, restored-target endpoint. Without those, RPO and RTO can only be **bounded theoretically** (RPO <= 24 h from daily snapshot cadence, which already **fails the <= 15 min requirement**), never measured.

## 5. Autonomous execution

Not possible. Executing a rehearsal would require either (a) an in-place destructive restore of production, or (b) creating a new project / support-provisioned isolated target — both explicitly excluded.

## Exact blocker

**Lovable Cloud provides daily snapshot, in-place, irreversible restore only. There is no point-in-time recovery and no isolated restore target, so the RPO <= 15 min objective is unattainable by platform design and an isolated rehearsal cannot be staged without Lovable support provisioning a separate target.**

No recovery point was selected or invented; no rehearsal pass is claimed. Automated state-machine tests in this repository are not a platform restore and were not counted as evidence.

## Recommended next steps (require your decision, not executed here)

1. Raise a Lovable support request for an isolated restore target and written RPO/RTO commitments; record the ticket id as the PDR-004-001 evidence artefact.
2. Until then, record PDR-004-001 as an accepted, documented platform limitation with the measured bound (RPO <= 24 h) rather than a pass.
3. Optionally add a compensating control: scheduled logical export of Tier 1 tables to a customer-controlled store to narrow the effective RPO, plus a documented restore procedure.
