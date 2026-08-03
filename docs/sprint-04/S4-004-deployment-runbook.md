# S4-004 Conflict Resolution Deployment Runbook

## Preconditions

- GitHub `main` contains the approved S4-004 merge commit.
- S4-001, S4-002 and S4-003 migrations are applied and verified.
- The active production catalogue remains `deliveryiq-recommendations` `1.0.0` for `sprint03-product-config-1.0.0` with its existing digest and ten definitions.
- The normal Lovable Cloud recovery point is available.
- Classify every currently displayed Lovable security-advisor finding by severity, rule and affected object. Do not execute generic advisor fixes.

## Read-only preflight

Confirm:

1. `recommendation_confidence_gates`, `recommendation_candidate_confidence_gates`, `recommendation_evaluations`, `recommendation_catalogue_versions`, `recommendation_definitions`, dependency/conflict mappings and delivery-intelligence trace nodes exist.
2. `reject_audit_mutation()` exists and returns `trigger`.
3. The S4-004 enums, three tables, publisher, indexes and triggers do not exist.
4. Every referenced FK target and enum exists with compatible types.
5. Both S4-004 files contain no seed data, catalogue activation or customer-data mutation.
6. The publisher validates run, tenant, gate, evaluation, catalogue, relationship, dependency and trace scope.

## Apply

Apply separately and in order:

1. `20260803040000_recommendation_conflict_resolutions.sql`
2. `20260803041000_harden_recommendation_resolution_permissions.sql`

Run the hardening migration immediately after the schema migration. Do not publish or perform other work between them.

## Verification

Verify:

- resolution result enum is exactly `canonical`, `suppressed`;
- reason enum is exactly `retained`, `mutual_exclusion`, `superseded`, `deduplicated`;
- all three tables, immutable triggers and declared indexes/constraints exist;
- RLS is enabled with zero client policies;
- `PUBLIC`, `anon` and `authenticated` have no table, function or `MAINTAIN` privileges;
- `service_role` retains table read access and publisher execution;
- the publisher is `SECURITY DEFINER` with fixed `public, pg_temp` search path;
- no existing analysis, evaluation, gate, catalogue, activation or customer row changed;
- regenerated Supabase types include all S4-004 tables and enums;
- full tests, type checking and production build pass after type regeneration.

If an eligible completed analysis exists, call the authorised S4-004 POST endpoint twice and verify the second call reuses the same immutable resolution. Verify another tenant cannot read it, normal customers receive canonical items only, and an audit-authorised identity can see suppressed reason/winner/lineage.

If no eligible analysis exists, record the live smoke as unavailable. Do not create synthetic production evidence.

## Rollback

Before S4-004 data exists, rollback may remove the publisher, triggers, trace table, candidate table, resolution table and enums in reverse dependency order through a separately reviewed migration. After a resolution exists, preserve immutable history: disable invocation and deploy a versioned corrective migration instead of dropping or mutating records.
