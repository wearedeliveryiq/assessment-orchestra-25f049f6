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

Completed on 3 August 2026:

1. Lovable Cloud applied the commercial entitlement, Snapshot and hardening migrations in order and regenerated Supabase types. A forward correction for Snapshot response JSONB serialisation was then applied with least-privilege grants preserved.
2. Verification confirmed no availability, entitlement or customer workflow row was seeded and client roles have no direct Snapshot or commercial-control access.
3. PRs #35 and #36 were merged and the production application published.
4. Snapshot `51ae3877-ee7d-4df0-a265-59473ed4c7d9` completed anonymously; explicit consent created tenant-scoped full draft `47de0803-48e7-41ac-acda-4c97350e628d` with 13 exact provenance rows. It remains incomplete at 13/39 and has no analysis run or hand-off.
5. Assessment `d09c51a3-2af8-4283-9b98-4cc1d53a1c93` served the authenticated free projection and unavailable commercial panel. No entitlement was manufactured for release testing; the entitled production smoke is deferred until the first authorised `delivery_dna_action` grant.

Rollback is application-first: restore the prior published build. The additive columns/tables and inactive entitlement key may remain dormant. Stop the Snapshot cleanup schedule with the application rollback; do not drop linked provenance or customer responses. Any database object removal requires a separately reviewed forward migration.

PDR-003-001 additionally requires one hosted journey from assessment completion through automatic
analysis to dashboard result, plus retryable and non-retryable failure checks. A deployed release is
not accepted if the one-minute reconciler trigger is absent.
