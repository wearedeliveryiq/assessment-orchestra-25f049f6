# Sprint 03 Release and Rollback Plan

## Deployment

1. Back up the target database and record the current application release SHA.
2. Apply migrations `20260802020000` through `20260802050000` in order in a staging project.
3. Regenerate Supabase types, then rerun type checking, all tests and the production build.
4. Configure only approved Knowledge Pack and Team Mate availability/entitlements; do not add illustrative data.
5. Run authenticated cross-tenant tests, run creation through dashboard display, explanation redaction, public issue/read/expiry/rate/revoke journeys, and schema-leak comparison.
6. Measure processing and result API latency against PB-003 targets using representative data.
7. Deploy the application SHA, smoke test, then promote using the normal Lovable/GitHub release path.
8. Apply `20260802150000_analysis_handoff_outbox.sql`, regenerate Supabase types, and verify the
   completion trigger, outbox claim functions, append-only events and deny-by-default grants.
9. Immediately apply `20260802151000_harden_analysis_handoff_permissions.sql` separately and verify
   `anon`/`authenticated` have no table, sequence or function privileges while `service_role`
   retains the required lifecycle access.
10. Verify the deployed worker retained the generated `* * * * *` cron trigger for the bundled
    `analysis:reconcile` task. As an operational fallback, set `ANALYSIS_RECONCILER_SECRET` and invoke
    `POST /api/internal/analysis-handoffs/reconcile` every 60 seconds with its bearer token.
11. Confirm the migration's bounded backfill creates hand-offs for completed assessments without a
    Sprint 03 run, excludes legacy rows without complete tenant/owner scope, then verify queue age
    returns below 60 seconds.

## Rollback

Roll back the application to the recorded prior SHA first. The Sprint tables and columns are additive and may remain dormant; do not drop them during an incident. Revoke issued public links if disclosure is implicated. Restore data only from the verified backup if corruption is proven. Database object removal requires a separately reviewed forward migration because immutable customer intelligence and audit records must not be destroyed.

## Release acceptance

Release only when staging migrations, tenant isolation, public disclosure, accessibility journeys, performance targets and the full regression suite pass with no high-severity security finding.

## PDR-003-004/005 additive release

1. Apply `20260803200000_delivery_dna_action_entitlement.sql`, then `20260803210000_delivery_dna_snapshot.sql`, then `20260803211000_harden_delivery_dna_snapshot_permissions.sql` through the managed migration path.
2. Verify no availability, entitlement or customer workflow row was seeded; `anon` and `authenticated` retain no direct access to Snapshot or commercial-control objects/functions.
3. Regenerate Supabase types, run the focused Snapshot/commercial tests and publish the same application commit.
4. Smoke one anonymous 13-response result, expiry-safe resume and consented tenant-scoped continuation; verify the linked full draft has 13 exact provenance rows, remains incomplete and has no analysis run.
5. Verify the current free projection and unavailable commercial panel against an existing completed run. Do not create a commercial entitlement merely for release testing.

Rollback is application-first: restore the prior published build. The additive columns/tables and inactive entitlement key may remain dormant. Stop the Snapshot cleanup schedule with the application rollback; do not drop linked provenance or customer responses. Any database object removal requires a separately reviewed forward migration.

PDR-003-001 additionally requires one hosted journey from assessment completion through automatic
analysis to dashboard result, plus retryable and non-retryable failure checks. A deployed release is
not accepted if the one-minute reconciler trigger is absent.
