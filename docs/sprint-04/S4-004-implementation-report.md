# S4-004 — Conflict Resolution and Deduplication

## Status

Implemented, migrated and published. Lovable Cloud schema, RLS, privileges and the five warn-level security-advisor findings were verified; live API verification remains unavailable because production has no eligible completed analysis.

## Architecture and reuse

- Reuses the immutable S4-002 evaluation and S4-003 confidence gate. Only `presented` and `evidence_first` candidates enter S4-004; excluded, ineligible and withheld records remain unchanged in their authoritative prior stages.
- Extends the governed S4-001 catalogue schema with optional versioned canonical and supersession references plus explicit conflict priority. No priority, canonical mapping or supersession value is invented for the active production catalogue.
- Applies the locked stage order: prior exclusion, mutual exclusion, supersession, then dedupe groups.
- Persists one immutable, idempotent resolution per confidence gate and S4-004 policy version.
- Preserves every suppressed candidate for audit and aggregates every deduplicated source candidate and trace into the canonical item.
- Runs automatically after S4-003 succeeds. Failure is recorded safely and cannot roll back completed analysis, S4-002 evaluation or S4-003 gating.

## Governed catalogue metadata

The active `deliveryiq-recommendations` v1.0.0 catalogue contains no conflicts, repeated dedupe groups, canonical overrides or supersession declarations, so its production resolution is intentionally a no-op.
Its governed digest remains exactly `0d35fb4d682e0817741454bd730f9fc2aeffe6a762ca03c0d2c093251712f2dc`, protected by regression test.

Future governed versions may provide:

- `conflictPriority`: a non-negative integer required for every mutually exclusive item;
- `canonicalRecommendation`: a versioned `{id, version}` reference within the same dedupe group;
- `supersedes`: versioned `{id, version}` references within the pinned catalogue.

Promotion fails closed for non-mutual conflicts, missing conflict priority, unknown or cyclic supersession, multiple superseders, conflicting canonical declarations, invalid versions and any relationship that would let a recommendation suppress its own dependency.

## Deterministic behaviour

- Mutual exclusion: higher governed conflict priority wins; ties use catalogue order then recommendation ID.
- Supersession: the active root wins across an acyclic chain.
- Deduplication: the governed versioned canonical wins when supplied; otherwise lowest catalogue order then ID wins.
- Dedupe canonical items aggregate all member candidate IDs and trace evidence. Mutual-exclusion and supersession evidence is retained on the suppressed audit record but is not presented as supporting the winner.
- A winner that depends on the candidate it would suppress fails the whole resolution with `RECOMMENDATION_RESOLUTION_INVALID`.
- Input order never changes the result.

## Data model

### `recommendation_conflict_resolutions`

Immutable tenant/run-scoped resolution snapshot pinned to the S4-003 gate, S4-002 evaluation, catalogue version/digest, policy and resolver versions, canonical input/output and hashes.

### `recommendation_resolution_candidates`

One immutable row per visible S4-003 candidate. Canonical rows use `retained`; suppressed rows record `mutual_exclusion`, `superseded` or `deduplicated` plus the winning candidate and version.

### `recommendation_resolution_trace_links`

Immutable self-evidence and deduplicated-evidence links. The publisher verifies every trace belongs to the same analysis run, organisation and workspace.

All three tables use RLS with zero client policies. `anon` and `authenticated` receive no direct access. The service role receives read access and execution of the atomic publisher only.

## API

`GET /api/analysis-runs/{runId}/recommendation-resolution`

- Requires authenticated tenant/workspace access and `assessment:read`.
- Workspace customers receive canonical recommendation IDs only, plus aggregate counts indicating related actions were combined.
- Suppressed identities, reasons, winner links, semantic hashes and trace IDs remain audit-only.

`POST /api/analysis-runs/{runId}/recommendation-resolution`

- Ensures the immutable S4-003 gate exists, then creates or reuses the S4-004 resolution atomically.
- Accepts no customer-supplied conflict rules, catalogue, tenant scope or recommendation state.

The public projection exposes counts only and contains no tenant, run, recommendation, hash or trace identifier.

## Files created

- `src/lib/recommendation-resolution/resolver.ts`
- `src/lib/recommendation-resolution/types.ts`
- `src/lib/recommendation-resolution/repository.server.ts`
- `src/lib/recommendation-resolution/service.server.ts`
- `src/lib/recommendation-resolution/projection.ts`
- `src/lib/recommendation-resolution/http.server.ts`
- `src/routes/api/analysis-runs.$id.recommendation-resolution.ts`
- `supabase/migrations/20260803040000_recommendation_conflict_resolutions.sql`
- `supabase/migrations/20260803041000_harden_recommendation_resolution_permissions.sql`
- `tests/recommendation-resolution.test.ts`
- `docs/sprint-04/S4-004-deployment-runbook.md`

## Files modified

- `src/lib/recommendation-catalogue/catalogue.ts`
- `src/lib/recommendation-catalogue/types.ts`
- `src/lib/analysis/executor.server.ts`
- `src/routeTree.gen.ts`
- `tests/recommendation-catalogue.test.ts`
- `tests/analysis-executor.test.ts`
- `tests/migration-security.test.ts`
- `docs/sprint-04/S4-003-implementation-report.md`
- `docs/sprint-04/acceptance-matrix.md`

## Acceptance and test evidence

- AC1: duplicate, explicit canonical, priority conflict, tie, supersession chain and invalid-graph fixtures pass.
- AC2: canonical dedupe output contains the stable union of source candidate IDs and trace IDs.
- AC3: suppressed candidates persist with exact reason and winner while customer/public projections omit their identities.
- AC4: promotion and resolution reject any winner that would suppress its dependency; the database publisher repeats the dependency check.
- AC5: reversed candidate order produces byte-equivalent canonical output.
- Performance: 1,000 candidates resolve inside the one-second engine test guard.
- Full regression, static analysis and production-build evidence is recorded in the Sprint 04 acceptance matrix.

## Security and tenant-isolation evidence

- Authenticated context supplies the analysis run and tenant; requests cannot nominate scope or rules.
- The service verifies the run, gate, evaluation, catalogue version and digest before deterministic resolution.
- The atomic database publisher repeats tenant, run, gate, catalogue, candidate, relationship, dependency and trace checks under an advisory lock.
- Immutable deny-by-default tables and the immediate hardening migration remove Lovable Cloud client/default grants and `MAINTAIN`.
- Public and workspace projections redact suppressed identities and audit lineage.

## Known limitations and deployment gates

- Apply and verify both migrations through Lovable Cloud in timestamp order; local CLI migration execution is unavailable for the Lovable-managed database.
- The production database currently has no eligible analysis result, so a live S4-004 smoke test must remain unavailable rather than manufacturing customer evidence.
- Lovable displayed five security-advisor findings after S4-003 deployment without their detail. Classify each finding by severity, rule and object before S4-004 publication; do not auto-apply generic fixes.
- S4-012 owns customer presentation UI. S4-004 introduces accessible textual API contracts and no new UI control.

## Technical debt

Repository-wide inherited lint/format debt remains outside the changed scope. S4-004 introduces no changed-file lint finding.

## Product decisions required

None for the active catalogue. Future catalogue authors must explicitly govern conflict priority, canonical override and supersession metadata before those behaviours can activate.
