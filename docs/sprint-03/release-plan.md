# Sprint 03 Release and Rollback Plan

## Deployment

1. Back up the target database and record the current application release SHA.
2. Apply migrations `20260802020000` through `20260802050000` in order in a staging project.
3. Regenerate Supabase types, then rerun type checking, all tests and the production build.
4. Configure only approved Knowledge Pack and Team Mate availability/entitlements; do not add illustrative data.
5. Run authenticated cross-tenant tests, run creation through dashboard display, explanation redaction, public issue/read/expiry/rate/revoke journeys, and schema-leak comparison.
6. Measure processing and result API latency against PB-003 targets using representative data.
7. Deploy the application SHA, smoke test, then promote using the normal Lovable/GitHub release path.

## Rollback

Roll back the application to the recorded prior SHA first. The Sprint tables and columns are additive and may remain dormant; do not drop them during an incident. Revoke issued public links if disclosure is implicated. Restore data only from the verified backup if corruption is proven. Database object removal requires a separately reviewed forward migration because immutable customer intelligence and audit records must not be destroyed.

## Release acceptance

Release only when staging migrations, tenant isolation, public disclosure, accessibility journeys, performance targets and the full regression suite pass with no high-severity security finding.
