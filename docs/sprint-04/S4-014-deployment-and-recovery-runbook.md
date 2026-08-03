# S4-014 Deployment and Recovery Runbook

## Preconditions

1. Record the current application revision and a restorable database recovery point.
2. Confirm S4-001–S4-009 and S4-011–S4-013 objects exist and the production recommendation catalogue version/digest remain pinned.
3. Confirm `reject_audit_mutation`, `has_role`, tenant membership/workspace tables and recommendation portfolios exist with compatible signatures and keys.
4. Confirm neither S4-014 migration has already been applied under a Lovable-generated name.
5. Confirm there are no existing `recommendation_*governance*`, audit-export, integrity-result or operational-event name collisions.
6. Keep `audit_exports` disabled. The migration contains no seed flag or customer data.

## Apply and verify

1. Apply `20260803140000_recommendation_governance_operations.sql` as one managed migration.
2. Immediately apply `20260803141000_harden_recommendation_governance_permissions.sql` separately to remove Lovable Cloud default grants.
3. Verify three enums, four tables, five declared indexes, five immutability/transition/delete triggers and ten functions with their exact signatures.
4. Verify RLS is enabled on all four tables with zero client policies.
5. Verify `PUBLIC`, `anon` and `authenticated` have no table, sequence, `MAINTAIN` or function privilege.
6. Verify `service_role` has table read and only the governed function execution paths; direct mutation remains unavailable.
7. Confirm no catalogue, activation, recommendation, assessment, analysis, decision, action, hand-off, analytics, identity or customer row changed.
8. Regenerate Supabase types from the live schema and retain Lovable's generated migration records as the live migration authority.
9. Run the complete regression, type, changed-file lint/format and production-build gates.
10. Publish the application while leaving `audit_exports` disabled until release acceptance.

## Rehearsal

Use isolated non-production IDs and clean them up only through governed routines.

1. Verify absent feature state resolves to false and an unauthorised flag change is denied.
2. Append enable and disable flag events through two idempotent governed commands; confirm replay creates no duplicate and the latest version resolves.
3. Queue two export fixtures, claim both, complete one and fail the other; verify the completed payload and integrity result are immutable and the failed job does not block the first.
4. Retry the retryable failure, reclaim a stale lease, and verify the three-attempt ceiling.
5. Simulate lineage failure and confirm publication is blocked with a non-retryable integrity result and critical operational event.
6. Verify completed payload expiry removes the payload, status/download access is logged and an expired download returns the safe expiry response.
7. Verify configuration diff reports added/removed/changed definition IDs without exposing tenant data.
8. Verify a 10,000-event export completes within the asynchronous 60-second target and a 10,001-event export fails closed.
9. Exercise the health endpoint and confirm all ten Section 20 alert codes are present.
10. Record `recovery_rehearsed` with a safe recovery-point identifier after the platform backup has been restored into a non-production environment and integrity checks pass.

## Rollback

1. Disable `audit_exports` through a governed flag event using reason `rollback` before reverting application code.
2. Revert to the previous application revision without rewriting published Git history.
3. Do not drop the new tables, enums or functions during an incident. Preserve feature, export, integrity and operational audit history.
4. Allow already downloaded files to expire naturally; the worker clears database payloads at the 15-minute boundary.
5. If a migration fails, verify its transaction rolled back, correct the approved migration in source and reapply through Lovable's managed path. Never repair a partial schema by ad-hoc production DDL.
6. If restoration is required, restore the recorded platform backup into an isolated environment, compare the pinned catalogue/configuration digest and row counts, then perform tenant-scope, integrity and migration-version checks before traffic is restored.

## Release blockers outside S4-014

PDR-004-001 approves Tier 1 RPO <=15 minutes and RTO <=4 hours and resolves the S4-010 maintain/date policy. The operational code remains safe with `audit_exports` off, but Sprint 04 cannot be accepted for release until the measured isolated recovery rehearsal, authorised export evidence and superseding Product Acceptance are recorded. The complete genuine eligible Delivery DNA journey remains a separate general-availability gate.
