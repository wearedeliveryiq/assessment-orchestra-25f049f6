# S4-014 — Governance, Audit and Operational Readiness

## Status

Implemented on `agent/s4-014-governance-readiness`. Application, database-contract, security, resilience, performance and documentation gates are complete. Managed migration execution and live ACL/schema verification remain deployment evidence until Lovable applies the two migrations.

The implementation is fail safe: audit export is disabled unless Product Governance appends an enabled feature event. S4-010 outcome observations remain explicitly unavailable and platform RPO/RTO is not yet approved, so Sprint 04 production release remains blocked independently of this implementation.

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
- AC2: the versioned export reconciles catalogue, evaluation, confidence, resolution, priority, sequence, portfolio, decision, action and hand-off records, with actor/evidence redaction. Outcome is empty and explicitly limited pending S4-010.
- AC3: tenant, count, trace and overlay integrity checks run before queueing and again at publication scope; a failure produces no payload and is terminal/non-retryable.
- AC4: state-machine, partial-failure, stale-lease, replay, retry, expiry and configuration rollback tests pass. Live backup restoration remains tied to the missing platform RPO/RTO policy.
- AC5: the health contract covers every Section 20 alert code; structured operational metadata rejects prohibited fields.
- AC6: authentication, authorisation, RLS, least privilege, bounded work, idempotency, performance and production-build gates pass. Full Sprint release remains blocked by the recorded authorities below.

## Test and quality evidence

- Focused S4-014 tests cover feature fail-safe behaviour, tenant denial, export/redaction, integrity failure, partial job failure, idempotency, retry, expiry/access logging, 10,000-event performance, over-limit rejection, configuration diff, alert coverage, immutable controls and scheduled execution.
- Existing catalogue tests retain self-approval denial, atomic activation and rollback evidence.
- Full regression: 42 files / 522 tests passed, including all 53 unchanged DIQ-203B fixtures.
- Type checking, changed-file ESLint/Prettier and the production build passed. The build contains both one-minute server tasks, including `_tasks/process-exports.mjs`.
- Full-repository lint remains inherited debt: 613 errors and 15 warnings outside the S4-014 changed-file gate.

## Files created

- `src/lib/recommendation-governance/{types,model,repository.server,service.server,http.server}.ts`
- recommendation audit export and internal governance API routes
- `tasks/recommendation-governance/process-exports.ts`
- `supabase/migrations/20260803140000_recommendation_governance_operations.sql`
- `supabase/migrations/20260803141000_harden_recommendation_governance_permissions.sql`
- `tests/recommendation-governance.test.ts`
- S4-014 monitoring, deployment/recovery and rehearsal documents

## Files modified

- `vite.config.ts`, generated route tree and Sprint 04 acceptance/release reports.

## Known limitations and hard blockers

- S4-010 lacks locked maintain/date-policy rules. Outcome observations are not fabricated and the export identifies that source as unavailable.
- An approved platform RPO/RTO policy is absent. PB-004 declares this a production-release blocker, not an implementation blocker.
- A live restore rehearsal needs an isolated Lovable recovery target and must be evaluated against that future RPO/RTO policy.
- The complete live journey requires a genuine eligible Delivery DNA analysis and portfolio; no customer evidence is manufactured for testing.
- Existing repository-wide lint debt remains outside S4-014; changed files must remain clean.
