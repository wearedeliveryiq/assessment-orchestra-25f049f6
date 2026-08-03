# S4-014 — Governance, Audit and Operational Readiness

## Status

Implemented through PR #24 and deployed from merge commit `98b30d9`. Application, managed migrations, live schema/ACL verification, security, resilience, performance, documentation and publication gates are complete.

The implementation is fail safe: audit export is disabled unless Product Governance appends an enabled feature event. S4-010 outcome evidence is now included through an integrity-checked governed source. PDR-004-001 approves the recovery objectives; a measured isolated recovery rehearsal and authorised live export remain release gates.

## Architecture and reuse

- Reuses the S4-001 two-person catalogue lifecycle; self-approval and direct immutable writes remain denied.
- Reuses authenticated tenant request context, existing RBAC, service-role repositories, semantic hashing, recommendation lineage and the S4-007–S4-013 immutable records.
- Adds a single asynchronous audit-export pipeline separated into allow-listed projection, orchestration, persistence and HTTP boundaries.
- Adds versioned append-only feature events, immutable integrity results, categorical operational events and a governed health projection.
- Adds Product Governance configuration diff without granting that platform role tenant access.
- Stores customer export payloads for 15 minutes only; jobs, integrity results and access events remain auditable under platform retention/legal policy.

## Application and API changes

- `POST /api/recommendation-audit-exports` creates an idempotent tenant-scoped job after permission, feature, source and integrity checks.
- `GET /api/recommendation-audit-exports/:id` returns status without payload or an expiring JSON download; both modes are access logged.
- `POST /api/recommendation-audit-exports/:id` retries only a terminal retryable failure.
- `GET /api/internal/recommendation-governance/configuration-diff` returns only Product Governance catalogue changes.
- `POST /api/internal/recommendation-governance/feature-flags` appends an idempotent feature event through the isolated `recommendation:govern` role.
- `GET /api/internal/recommendation-governance/health` requires governance or audit permission and returns bounded metrics plus Section 20 alert coverage.
- The scheduled `recommendation-governance:exports` task processes bounded jobs every minute with independent failure containment.

## Data and security

- Adds `recommendation_feature_flag_events`, `recommendation_audit_export_jobs`, `recommendation_integrity_results` and `recommendation_operational_events`.
- Adds exact status/severity enums, terminal-state checks, tenant indexes, append-only triggers, atomic claim/complete/fail/retry/access routines and a health routine.
- RLS is enabled with zero client policies. `PUBLIC`, `anon` and `authenticated` privileges—including `MAINTAIN`—are revoked. Governed server functions are `service_role` only.
- Tenant and workspace scope is checked in the request boundary, source queries, projector and publication transaction. Cross-tenant misses return safe denials.
- Export fields are explicitly allow-listed. Actor IDs, notes, evidence references, token hashes, raw trace payloads and internal rules are excluded.
- Five new requests per actor/organisation/hour, 25-job maximum claim, three-attempt ceiling, two-minute lease, 10,000-event maximum and 15-minute download expiry are enforced server-side.

## Acceptance evidence

- AC1: the existing S4-001 author/approver separation and immutable lifecycle remain executable regression tests; S4-014 feature changes require the isolated Product Governance role.
- AC2: the versioned export reconciles catalogue, evaluation, confidence, resolution, priority, sequence, portfolio, decision, action, outcome snapshots, measure versions, observations, status history and hand-off records, with actor/raw evidence/internal-rule redaction. Outcome-source availability is integrity-gated rather than represented by an empty placeholder.
- AC3: tenant, count, trace and overlay integrity checks run before queueing and again at publication scope; a failure produces no payload and is terminal/non-retryable.
- AC4: state-machine, partial-failure, stale-lease, replay, retry, expiry and configuration rollback tests pass. PDR-004-001 Tier 1 RPO <=15 minutes and RTO <=4 hours are approved; a measured isolated platform restore remains outstanding.
- AC5: the health contract covers every Section 20 alert code; structured operational metadata rejects prohibited fields.
- AC6: authentication, authorisation, RLS, least privilege, bounded work, idempotency, performance and production-build gates pass. Full Sprint release remains blocked by the recorded authorities below.

## Test and quality evidence

- Focused S4-014 tests cover feature fail-safe behaviour, tenant denial, export/redaction, integrity failure, partial job failure, idempotency, retry, expiry/access logging, 10,000-event performance, over-limit rejection, configuration diff, alert coverage, immutable controls and scheduled execution.
- Existing catalogue tests retain self-approval denial, atomic activation and rollback evidence.
- Full remediation regression: 43 files / 564 tests passed, including all 53 unchanged DIQ-203B fixtures and all 37 PDR-004-001 fixtures.
- Type checking, changed-file ESLint/Prettier and the production build passed. The build contains both one-minute server tasks, including `_tasks/process-exports.mjs`.
- Full-repository lint remains inherited debt: 613 errors and 15 warnings outside the S4-014 changed-file gate.

## Live deployment evidence

- Lovable applied the core, permission-hardening and Cloud-default-helper correction as managed migrations `20260803142324`, `20260803142414` and `20260803142618`.
- Live schema contains three enums, four tables, five declared indexes, five triggers and ten functions with the expected state, lease, attempt, expiry and rate-limit contracts.
- RLS is enabled with zero policies on all four tables. `PUBLIC`, `anon` and `authenticated` have no table, sequence, `MAINTAIN` or function access. `service_role` has table `SELECT` and nine governed routines only; the internal trigger helper is not executable.
- All four tables contain zero rows, no feature event exists, and `audit_exports` resolves to false. Existing catalogue, tenant, assessment, analysis and recommendation data remained unchanged.
- Lovable reran 42 files / 522 tests, all 53 DIQ-203B fixtures, type checking, changed-file lint/format, production build and security scan. The scan reported zero critical findings and 16 pre-existing warnings.
- The application was published at `https://assessment-orchestra.lovable.app` with audit export disabled.

## Files created

- `src/lib/recommendation-governance/{types,model,repository.server,service.server,http.server}.ts`
- recommendation audit export and internal governance API routes
- `tasks/recommendation-governance/process-exports.ts`
- `supabase/migrations/20260803140000_recommendation_governance_operations.sql`
- `supabase/migrations/20260803141000_harden_recommendation_governance_permissions.sql`
- Lovable-managed deployment records `20260803142324_d6870a3a-e4b5-4ecd-9765-e9ee71c6bd49.sql`, `20260803142414_b9748178-424f-4a31-8012-252c7740b5ed.sql` and `20260803142618_aa8b7b77-0f03-4973-ae8b-bfdd43c3843f.sql`
- `tests/recommendation-governance.test.ts`
- S4-014 monitoring, deployment/recovery and rehearsal documents

## Files modified

- `vite.config.ts`, generated route tree, generated Supabase types and Sprint 04 acceptance/release reports.

## Known limitations and hard blockers

- S4-010 is implemented locally; its managed Cloud migrations and live ACL/type verification remain deployment gates.
- A live restore rehearsal needs an isolated Lovable recovery target and must demonstrate the approved Tier 1 RPO <=15 minutes and RTO <=4 hours.
- Audit export remains disabled by default; authorised export/redaction/expiry/access-log evidence is still required before release enablement.
- The complete live journey requires a genuine eligible Delivery DNA analysis and portfolio; no customer evidence is manufactured for testing.
- Existing repository-wide lint debt remains outside S4-014; changed files must remain clean.
