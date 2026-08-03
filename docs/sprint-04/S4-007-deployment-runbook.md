# S4-007 Recommendation Portfolio Deployment Runbook

## Preconditions

- GitHub `main` contains the approved S4-007 merge commit.
- S4-001 through S4-006 migrations are applied and verified.
- The active production catalogue remains `deliveryiq-recommendations` `1.0.0` for `sprint03-product-config-1.0.0`, with digest `0d35fb4d682e0817741454bd730f9fc2aeffe6a762ca03c0d2c093251712f2dc` and ten definitions.
- The normal Lovable Cloud recovery point is available.
- Recheck accepted warn-level Lovable security findings by severity, rule, and object. Do not execute generic advisor fixes.

## Read-only preflight

Confirm:

1. S4-001–006 tables, `assessment_analysis_runs`, `delivery_intelligence_trace_nodes`, `organisations`, `workspaces`, and `reject_audit_mutation()` exist.
2. The active catalogue digest and immutable definitions match the S4-001 activation.
3. The S4-007 enums, two tables, publisher function, two indexes, and two immutable triggers do not exist.
4. Every referenced FK target and enum exists with compatible types.
5. Neither migration contains seed data, catalogue activation, customer-data mutation, or a product-rule change.
6. The publisher verifies run, tenant, evaluation, confidence, resolution, priority, sequence, catalogue, source identities, classes, ordering, summary, trace coverage, and semantic hashes.
7. Immediate-attention validation uses the locked critical/high priority and DIQ-203 urgency values of 90 or 100; no invented score is present.

## Apply

Apply separately and in order:

1. `20260803070000_recommendation_portfolios.sql`
2. `20260803071000_harden_recommendation_portfolio_permissions.sql`

Run the hardening migration immediately after the schema migration. Do not publish or perform other work between them.

## Verification

Verify:

- both enums contain only their declared values;
- both tables, immutable triggers, declared indexes, checks, uniqueness constraints, and FKs exist;
- RLS is enabled with zero client policies;
- `PUBLIC`, `anon`, and `authenticated` have no table, function, sequence, or `MAINTAIN` privileges;
- `service_role` retains table reads and governed publisher execution;
- `publish_recommendation_portfolio(jsonb)` is `SECURITY DEFINER` with fixed `public, pg_temp` search path;
- portfolios and items reject direct update and delete;
- no existing analysis, intelligence, evaluation, gate, resolution, priority, sequence, catalogue, activation, acceptance, or customer row changed;
- regenerated Supabase types include both S4-007 tables and enums;
- full tests, type checking, changed-file lint/format, and production build pass after type regeneration.

If an eligible completed analysis exists, call the authorised S4-007 POST endpoint twice and verify the second call returns the same immutable portfolio and ETag. Verify every source recommendation appears exactly once, classification precedence is correct, trace coverage is 100%, the run and ID endpoints agree, `If-None-Match` returns `304`, another tenant cannot read the resource, workspace users see only safe fields, and audit-authorised users see full lineage.

If no eligible completed analysis exists, record the live smoke as unavailable. Do not create synthetic production evidence.

## Rollback

Before S4-007 data exists, rollback may remove the publisher, triggers, item table, portfolio table, and two enums in reverse dependency order through a separately reviewed migration. After a portfolio exists, preserve immutable history: disable invocation and deploy a versioned corrective migration instead of dropping or mutating records.
