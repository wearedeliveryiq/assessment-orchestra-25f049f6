# S4-001 — Recommendation Catalogue and Versioning

## Outcome

Implemented a governed, immutable recommendation catalogue lifecycle around the locked DIQ-203A recommendation definitions. Sprint 03 scoring, eligibility, confidence, ranking, roadmap and disclosure behaviour remains unchanged.

## Architecture and reuse

- Reuses the validated DIQ-203A loader as the authoritative initial catalogue source.
- Keeps catalogue governance separate from tenant availability and analysis results.
- Uses the existing identity platform and adds `recommendation:govern` only to `platform_admin`.
- Uses service-role-only database functions, deny-by-default RLS and existing immutable-audit triggers.

## Delivered

- Deterministic catalogue schema validation and canonical SHA-256 digest.
- Stable recommendation identity, semantic versions, dependency/conflict validation and cycle rejection.
- Immutable version snapshots, definitions, mappings, approvals and lifecycle events.
- Lifecycle states `draft`, `in_review`, `approved`, `active`, `retired`, `superseded`.
- Author/approver separation, optimistic idempotency and advisory-lock promotion concurrency.
- One active recommendation version per ID/environment with atomic activation and rollback.
- Authenticated product-governance APIs for version creation and lifecycle commands.
- Cloud-default-grant hardening migration.

## Security

- Catalogue storage has RLS enabled with no client policies.
- `anon` and `authenticated` receive no table, sequence or function privileges.
- Only server-side product-governance handlers can invoke service-role operations.
- Tenant data is not read by catalogue governance.

## Verification

- S4-001 focused domain and security suite: 22/22 passed.
- Full regression suite: 296/296 passed across 28 test files, including all 53 DIQ-203B fixtures.
- Static type checking: passed.
- Changed-file lint and formatting: passed.
- Production client/server/task build: passed.
- Live migration, grant and concurrent-promotion rehearsal: pending Lovable Cloud deployment.

## Deployment

Apply separately through Lovable Cloud:

1. `20260803010000_recommendation_catalogue_governance.sql`
2. `20260803011000_harden_recommendation_catalogue_permissions.sql`

Then regenerate Supabase types, verify grants and use two different authorised platform administrators to submit/approve the locked `1.0.0` snapshot before activation.

## Limitations and debt

- No catalogue-authoring UI is in scope.
- Activation requires an explicit governed API workflow after migration; the migration contains no seed data and activates nothing automatically.
- Sprint 04 evaluation and customer portfolio consumption begin in S4-002 and S4-007 respectively.
