# S4-003 Confidence Gate Deployment Runbook

## Preconditions

- GitHub `main` contains the approved S4-003 merge commit.
- S4-001 catalogue and S4-002 evaluation migrations are applied.
- The active production catalogue remains `deliveryiq-recommendations` `1.0.0` for `sprint03-product-config-1.0.0`.
- Take the normal Lovable Cloud data export before migration execution.

## Read-only preflight

Confirm:

1. `recommendation_evaluations`, `recommendation_candidate_evaluations`, `recommendation_evaluation_trace_links`, `delivery_intelligence_results` and `delivery_intelligence_trace_nodes` exist.
2. `reject_audit_mutation()` exists and returns `trigger`.
3. `recommendation_confidence_gate_result`, the three S4-003 tables, publisher function, indexes and triggers do not exist.
4. Every referenced FK target and enum exists with compatible types.
5. Both S4-003 files contain no seed data, catalogue activation or customer-data mutation.
6. The publisher validates run, tenant, result, evaluation, catalogue and trace scope.

## Apply

Apply separately and in order:

1. `20260803030000_recommendation_confidence_gates.sql`
2. `20260803031000_harden_recommendation_confidence_permissions.sql`

Run the hardening migration immediately after the schema migration to close Lovable Cloud default-grant behaviour. Do not publish between migrations.

## Verification

Verify:

- enum values are `presented`, `withheld`, `evidence_first`;
- all three tables, three immutable triggers and declared indexes/constraints exist;
- RLS is enabled with zero client policies;
- `anon` and `authenticated` have no table, function or `MAINTAIN` privileges;
- `service_role` has table read access and publisher execution;
- the publisher is `SECURITY DEFINER` with a fixed `public, pg_temp` search path;
- no existing analysis, evaluation, catalogue or customer row changed;
- regenerated Supabase types include the three S4-003 tables and gate enum;
- full tests, type checking and production build pass after type regeneration.

If an eligible completed analysis exists, call the authorised S4-003 POST endpoint twice and verify the second call reuses the same immutable gate. Verify a user from another tenant cannot read it and a normal customer cannot see withheld recommendation identities or trace details.

If no eligible analysis exists, record live smoke as unavailable. Do not create synthetic production evidence.

## Rollback

Before customer S4-003 data exists, rollback may remove the S4-003 publisher, triggers, tables and enum in reverse dependency order using a separately reviewed Lovable migration. After a gate row exists, do not drop or mutate immutable history; disable the application invocation and deploy a versioned corrective migration instead.
