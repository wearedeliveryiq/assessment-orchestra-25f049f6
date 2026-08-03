# S4-005 Priority Model Deployment Runbook

## Preconditions

- GitHub `main` contains the approved S4-005 merge commit.
- S4-001 through S4-004 migrations are applied and verified.
- The active production catalogue remains `deliveryiq-recommendations` `1.0.0` for `sprint03-product-config-1.0.0`, with digest `0d35fb4d682e0817741454bd730f9fc2aeffe6a762ca03c0d2c093251712f2dc` and ten definitions.
- The normal Lovable Cloud recovery point is available.
- Recheck the five accepted warn-level Lovable security findings. Do not execute generic advisor fixes.

## Read-only preflight

Confirm:

1. The S4-001–004 tables, `delivery_intelligence_results`, `assessment_analysis_runs`, `organisations`, `workspaces`, `organisation_memberships`, `auth.users`, and `reject_audit_mutation()` exist.
2. `assessment_analysis_runs.configuration_snapshot` contains the pinned DIQ-203 `recommendationPolicy.rankFormula` and `effortEaseValues` used by the publisher.
3. The S4-005 enum, three tables, two functions, indexes and triggers do not exist.
4. Every referenced FK target and enum exists with compatible types.
5. Both S4-005 files contain no seed data, catalogue activation or customer-data mutation.
6. The publisher verifies run, tenant, result, gate, resolution, catalogue, source rank, formula, label, trace and generated-order scope.
7. The preference function verifies active tenant membership, workspace scope, full-permutation input, expected version and idempotency.

## Apply

Apply separately and in order:

1. `20260803050000_recommendation_priority_models.sql`
2. `20260803051000_harden_recommendation_priority_permissions.sql`

Run the hardening migration immediately after the schema migration. Do not publish or perform other work between them.

## Verification

Verify:

- priority label enum is exactly `critical`, `high`, `medium`, `low`;
- all three tables, immutable triggers, declared indexes and constraints exist;
- RLS is enabled with zero client policies;
- `PUBLIC`, `anon` and `authenticated` have no table, function or `MAINTAIN` privileges;
- `service_role` retains table reads, preference insertion and both function executions;
- both functions are `SECURITY DEFINER` with fixed `public, pg_temp` search paths;
- no existing analysis, evaluation, gate, resolution, catalogue, activation or customer row changed;
- regenerated Supabase types include every S4-005 table and enum;
- full tests, type checking, changed-file lint and production build pass after type regeneration.

If an eligible completed analysis exists, call the authorised S4-005 POST endpoint twice and verify the second call reuses the same immutable priority model. Apply a display preference with a valid idempotency key twice and verify one append-only preference record is returned. Verify generated rank remains unchanged, a stale expected version returns conflict, another tenant cannot read or write the model, normal customers cannot see numeric score/components/weights/traces/actors, and audit-authorised users can.

If no eligible analysis exists, record the live smoke as unavailable. Do not create synthetic production evidence.

## Rollback

Before S4-005 data exists, rollback may remove the two functions, triggers, preference table, item table, model table and enum in reverse dependency order through a separately reviewed migration. After any model or preference exists, preserve immutable history: disable invocation and deploy a versioned corrective migration instead of dropping or mutating records.
