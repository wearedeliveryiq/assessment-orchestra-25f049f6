# S4-006 Dependency and Sequencing Deployment Runbook

## Preconditions

- GitHub `main` contains the approved S4-006 merge commit.
- S4-001 through S4-005 migrations are applied and verified.
- The active production catalogue remains `deliveryiq-recommendations` `1.0.0` for `sprint03-product-config-1.0.0`, with digest `0d35fb4d682e0817741454bd730f9fc2aeffe6a762ca03c0d2c093251712f2dc` and ten definitions.
- The pinned analysis configuration retains the locked roadmap capacities: day 30 = 3, day 60 = 3, day 90 = 4.
- The normal Lovable Cloud recovery point is available.
- Recheck accepted warn-level Lovable security findings by severity, rule, and object. Do not execute generic advisor fixes.

## Read-only preflight

Confirm:

1. S4-001–005 tables, `assessment_analysis_runs`, `organisations`, `workspaces`, `organisation_memberships`, `auth.users`, and `reject_audit_mutation()` exist.
2. The active catalogue dependency mappings match its immutable snapshot and contain only `required` or `recommended` types.
3. `assessment_analysis_runs.configuration_snapshot.roadmap.capacity` contains the exact locked 3/3/4 values used by the publisher.
4. The four S4-006 enums, four tables, two functions, four indexes, and four triggers do not exist.
5. Every referenced FK target and enum exists with compatible types.
6. Neither migration contains seed data, catalogue activation, customer-data mutation, or a product-rule change.
7. The publisher verifies run, tenant, priority, conflict resolution, catalogue, dependency mapping/resolution, continuous sequence, horizon capacity, required blocking, and precedence.
8. The override function verifies active tenant membership, workspace scope, full scheduled-item permutation, reason, acknowledged risk, server-calculated dependency risks, expected version, and idempotency.

## Apply

Apply separately and in order:

1. `20260803060000_recommendation_dependency_sequences.sql`
2. `20260803061000_harden_recommendation_sequence_permissions.sql`

Run the hardening migration immediately after the schema migration. Do not publish or perform other work between them.

## Verification

Verify:

- all four enums contain only their declared values;
- all four tables, immutable triggers, declared indexes, checks, uniqueness constraints, and FKs exist;
- RLS is enabled with zero client policies;
- `PUBLIC`, `anon`, and `authenticated` have no table, function, sequence, or `MAINTAIN` privileges;
- `service_role` retains table reads, override insertion, and both governed routine executions;
- both functions are `SECURITY DEFINER` with fixed `public, pg_temp` search paths;
- generated models/items/dependencies and override versions reject direct update and delete;
- no existing analysis, evaluation, gate, resolution, priority, catalogue, activation, or customer row changed;
- regenerated Supabase types include every S4-006 table and enum;
- full tests, type checking, changed-file lint/format, and production build pass after type regeneration.

If an eligible completed analysis exists, call the authorised S4-006 POST endpoint twice and verify the second call reuses the same immutable model. Verify dependency precedence and 3/3/4 horizon capacity against its pinned input. Apply one valid override twice with the same idempotency key and verify one append-only override is returned. Confirm generated sequence remains unchanged, dependency risks are recorded, missing reason or acknowledgement is rejected, stale version returns conflict, another tenant cannot read or write, normal customers see only safe dependency state/reason/caveat, and audit-authorised users can see lineage.

If no eligible completed analysis exists, record the live smoke as unavailable. Do not create synthetic production evidence.

## Cycle and repair procedure

1. Do not retry or publish a portfolio when `ROADMAP_DEPENDENCY_CYCLE` is returned.
2. Record the bounded cycle path and pinned catalogue version/digest without raw customer evidence.
3. Product Governance corrects the dependency graph in a new semantic catalogue version. Never mutate the active or historical version.
4. Run catalogue validation, separation-of-duties approval, and activation through S4-001.
5. Re-evaluate from S4-002 against the new pinned catalogue version; do not alter the failed sequence attempt or prior analysis history.
6. Verify the repaired graph, immutable prior audit, and one active catalogue version before publishing.

## Rollback

Before S4-006 data exists, rollback may remove the two functions, triggers, override table, dependency table, item table, model table, and four enums in reverse dependency order through a separately reviewed migration. After any model or override exists, preserve immutable history: disable invocation and deploy a versioned corrective migration instead of dropping or mutating records.
