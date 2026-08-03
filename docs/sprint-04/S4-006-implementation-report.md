# S4-006 — Dependency and Sequencing Engine

## Status

Deployed from `agent/s4-006-dependency-sequencing`. Application verification, Lovable Cloud migration execution, live schema inspection, and production publication are complete. Live data-path smoke testing remains unavailable because production has no eligible completed Delivery DNA analysis.

## Architecture and reuse

- Reuses the locked Sprint 03 `buildRoadmap` and topological ordering primitives. S4-006 does not duplicate or reinterpret the DIQ-203 30/60/90 capacity rules.
- Consumes only the immutable S4-004 conflict resolution and S4-005 priority baseline pinned to the completed analysis run and active catalogue digest.
- Loads dependency type and identity from the governed S4-001 catalogue mappings. Customer input cannot nominate dependencies, horizons, ranks, capacities, catalogue versions, policy versions, or tenant scope.
- Resolves direct, superseded and deduplicated dependencies through the immutable S4-004 candidate graph. Missing, mutually excluded, or otherwise unavailable dependencies fail closed to an explicit unavailable state.
- Persists one immutable, idempotent generated sequence per priority model and policy version. A customer sequence is an append-only overlay and never changes generated rank, generated sequence, horizon, dependency state, or hashes.
- Runs automatically only after S4-005 succeeds. A sequencing or cycle failure records a safe event and never rolls back the completed analysis or any S4-001–005 record.

## Deterministic behaviour

- Required dependencies precede their dependants. An unavailable or blocked required dependency produces `blocked_dependency`, including transitive required dependants.
- Recommended dependencies precede their dependants when available. If unavailable or blocked, the dependant remains schedulable and receives a concise governed caveat.
- DIQ-203 capacities remain exactly three day-30, three day-60, and four day-90 recommendations, loaded from the pinned configuration snapshot.
- Topological ordering is stable under generated rank, catalogue order, and recommendation ID. The exact locked cycle code is `ROADMAP_DEPENDENCY_CYCLE`, accompanied by the bounded cycle path for authorised callers.
- Traversal rejects inputs exceeding 250 recommendations or 1,000 dependency edges. The 250-node / 986-edge performance fixture completes under both the one-second graph and two-second portfolio limits.

## Data model

### `recommendation_sequence_models`

Immutable tenant/run-scoped generated sequence pinned to priority, conflict resolution, catalogue digest, configuration set, policy, engine, input hash, and output hash.

### `recommendation_sequence_items`

Immutable generated sequence, horizon, state, reason, blocking dependency IDs, caveats, effort, source trace IDs, and semantic hash for every S4-005 priority item.

### `recommendation_sequence_dependencies`

Immutable typed graph edge retaining source dependency ID, resolved dependency ID, direct/superseded/deduplicated/unavailable resolution, required/recommended type, state, reason, and semantic hash.

### `recommendation_sequence_overrides`

Append-only customer overlay. Each version stores a complete scheduled-item permutation, reason, explicit risk acknowledgement, server-calculated dependency risks, actor, prior version, and tenant-scoped idempotency key.

All four tables use RLS with zero client policies. `PUBLIC`, `anon`, and `authenticated` receive no direct access. The service role receives only the reads and governed routine execution required by the server workflow.

## API

`GET /api/analysis-runs/{runId}/recommendation-sequence`

- Requires authenticated tenant/workspace access and `assessment:read`.
- Workspace customers receive generated/customer sequence, horizon, state, reason, dependency ID/type/state/reason, block IDs, and safe caveats.
- Hashes, actors, full persisted edges, source traces, configuration scope, and tenant identifiers are audit-only.

`POST /api/analysis-runs/{runId}/recommendation-sequence`

- Ensures the upstream immutable S4-005 baseline, then creates or reuses S4-006.
- Accepts no customer-supplied dependency graph, rank, capacity, horizon, catalogue, rule, hash, trace, or tenant data.

`PUT /api/analysis-runs/{runId}/recommendation-sequence`

- Requires authenticated writable tenant/workspace access and the existing `assessment:submit` decision authority.
- Requires `Idempotency-Key`, current `expectedVersion`, a complete scheduled-item ordering, a non-empty reason, and explicit risk acknowledgement.
- The database recalculates dependency-order risks and rejects any client mismatch under an advisory lock.

The public projection exposes only an aggregate recommendation count. It does not expose IDs, dependency graph, sequence, horizons, tenant/run scope, traces, hashes, actors, or override state.

## Files created

- `src/lib/recommendation-sequencing/model.ts`
- `src/lib/recommendation-sequencing/types.ts`
- `src/lib/recommendation-sequencing/repository.server.ts`
- `src/lib/recommendation-sequencing/service.server.ts`
- `src/lib/recommendation-sequencing/projection.ts`
- `src/lib/recommendation-sequencing/http.server.ts`
- `src/routes/api/analysis-runs.$id.recommendation-sequence.ts`
- `supabase/migrations/20260803060000_recommendation_dependency_sequences.sql`
- `supabase/migrations/20260803061000_harden_recommendation_sequence_permissions.sql`
- `tests/recommendation-sequencing.test.ts`
- `docs/sprint-04/S4-006-deployment-runbook.md`

## Files modified

- `src/lib/delivery-intelligence/roadmap.ts`
- `src/lib/analysis/executor.server.ts`
- `src/routeTree.gen.ts`
- `tests/analysis-executor.test.ts`
- `tests/migration-security.test.ts`
- `docs/sprint-04/acceptance-matrix.md`
- `docs/sprint-04/S4-005-implementation-report.md`

## Acceptance evidence

- AC1: all locked DIQ-203B fixtures pass unchanged; an S4-006 projection test reproduces the exact dependency sequence and capacity outputs using the shared roadmap primitive.
- AC2: direct, unavailable, blocked, transitive, recommended-warning, superseded, deduplicated-ready, and capacity states are modelled separately; required blocks while recommended warns.
- AC3: cycles fail before publication with exact `ROADMAP_DEPENDENCY_CYCLE` and deterministic cycle path; the worker stores only the safe code.
- AC4: an override requires authorisation, full permutation, reason, acknowledged risk, idempotency, and expected version; generated sequence remains byte-for-byte unchanged and the database recalculates risks.
- AC5: the bounded 250-node / 986-edge fixture completes under one second and the publisher rejects more than 250 items or 1,000 edges.

## Security, isolation and traceability

- Authenticated context supplies run and tenant scope; callers cannot nominate organisation, workspace, catalogue, configuration, dependency mapping, rule version, or actor.
- The service verifies the completed run, S4-004 resolution, S4-005 priority model, active pinned catalogue, digest, configuration set, and tenant/workspace scope before modelling.
- The database publisher repeats run, resolution, priority, catalogue, item, mapping, dependency-resolution, capacity, continuous-order, precedence, required-block, hash, and tenant checks under an advisory lock.
- The override routine re-authorises active organisation membership and workspace ownership, then validates exact permutation, expected version, idempotency, reason, acknowledgement, and server-derived risk detail.
- Four immutable triggers and the immediate hardening migration prevent direct customer mutation and remove Lovable Cloud default grants and `MAINTAIN`.
- Workspace/public projections redact audit-only hashes, actors, source traces, configuration scope, and tenant identifiers.

## Verification completed

- Targeted S4-006, analysis-worker, and migration-security suites passed: 3 files / 46 tests.
- Full regression passed: 35 files / 408 tests.
- Complete DIQ-203B fixture suite passed unchanged: 53 tests.
- Type checking passed.
- Changed-file ESLint and Prettier passed.
- Full-repository ESLint remains a recorded inherited limitation: 5,965 errors and 15 warnings outside the S4-006 changed scope.
- Production Vite/Nitro build passed before final documentation; it is rerun in the final quality gate.
- The 250-item / 986-edge graph test completed inside the one-second dependency target.

## Deployment evidence and known limitations

- Lovable Cloud applied the schema and hardening migrations separately and in order as `20260803102050_7a8a201f-7b7b-44b2-a2a7-1cfc3114655b.sql` and `20260803102155_8a2b531b-c0e4-43d3-b034-ed5b948771b7.sql`.
- All four S4-006 tables, enums, indexes, immutable triggers, constraints, RLS controls, zero-policy posture, and service-role-only routines were verified live. `anon` and `authenticated` retained no direct table or function access.
- The production build was published at Lovable commit `a41ec0f2b557ae342955bdc89e1639d76be2e3a2`, and the public application returned HTTP 200.
- The production database has no eligible completed analysis result, so live S4-006 creation, replay, override, stale-version, cycle, and cross-tenant smoke tests remain unavailable rather than manufacturing customer evidence.
- S4-007 owns the customer-ready grouped recommendation portfolio, and S4-012 owns the interactive experience. S4-006 provides accessible textual contracts and introduces no new UI control.

## Technical debt

- Repository-wide inherited lint debt remains outside the changed scope (5,965 errors and 15 warnings). S4-006 introduces no changed-file lint finding.
- S4-008 will formalise the broader customer decision workflow. S4-006 uses the existing authenticated `assessment:submit` permission for the narrowly scoped sequence overlay.

## Product decisions required

None.
