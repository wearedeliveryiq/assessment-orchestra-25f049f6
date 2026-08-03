# S4-005 — Impact, Effort and Priority Model

## Status

Implemented, migrated, verified, and published. Lovable Cloud applied the S4-005 schema and hardening migrations in order; live model creation remains unavailable because production has no eligible completed analysis result.

## Architecture and reuse

- Reuses the locked DIQ-203 rank inputs already persisted in the immutable Sprint 03 intelligence result. The shared `calculateRecommendationRankScore` primitive now serves Sprint 03 and Sprint 04, so formula weights are not duplicated in a presentation or orchestration layer.
- Consumes only canonical S4-004 candidates. Suppressed, excluded, ineligible and confidence-withheld advice cannot re-enter through S4-005.
- Recomputes and verifies the exact locked score from unrounded components, while retaining Sprint 03's six-decimal stored result contract. Ordering uses the unrounded score before the locked impact, urgency, effort-ease, catalogue-order and recommendation-ID tie-breakers.
- Persists one immutable, idempotent priority baseline per conflict resolution and policy version.
- Persists customer display ordering as append-only, tenant-scoped, versioned preference records. Generated rank never changes and every preference records actor, time, prior version and idempotency key.
- Runs automatically only after S4-004 succeeds. A priority failure records a safe event and never rolls back the completed analysis or any S4-001–004 record.

## Deterministic behaviour

- Formula: `0.40 impact + 0.25 urgency + 0.15 confidence + 0.10 effortEase + 0.10 dependencyReadiness`, loaded from the pinned DIQ-203 configuration snapshot.
- Customer labels: `critical` at `>=85`, `high` at `>=70`, `medium` at `>=50`, otherwise `low`.
- Deduplicated canonical items retain the highest governed source impact and urgency, the canonical definition's effort, the analysis confidence and the canonical source dependency readiness.
- Impact and effort remain catalogue assertions. Customer copy explicitly states that effort is not a delivery estimate.
- A complete customer display preference changes display rank only. Generated rank, score, components, hashes and lineage remain immutable.

## Data model

### `recommendation_priority_models`

Immutable tenant/run-scoped priority snapshot pinned to the intelligence result, evaluation, confidence gate, conflict resolution, catalogue digest, configuration set, policy and model versions.

### `recommendation_priority_items`

Immutable canonical item records containing generated rank, priority label, governed impact/effort, unrounded rank score, unrounded components, governed weights, safe component rationale and source recommendation/trace lineage.

### `recommendation_priority_display_preferences`

Append-only customer overlay. Each version is a full permutation of the immutable generated set and links to the previous preference. Advisory locking, expected-version checks and tenant-scoped idempotency prevent lost or duplicate updates.

All three tables use RLS with zero client policies. `PUBLIC`, `anon` and `authenticated` receive no direct access. The service role receives only the access required by the two governed server routines.

## API

`GET /api/analysis-runs/{runId}/recommendation-priority`

- Requires authenticated tenant/workspace access and `assessment:read`.
- Workspace customers receive generated/display rank, priority label, governed impact/effort, confidence state and safe component rationale.
- Numeric score, numeric components, weights, hashes, actor identity and trace IDs are audit-only.

`POST /api/analysis-runs/{runId}/recommendation-priority`

- Ensures S4-004 exists, then creates or reuses the immutable S4-005 baseline.
- Accepts no customer-supplied score, component, weight, catalogue, rule or tenant scope.

`PUT /api/analysis-runs/{runId}/recommendation-priority`

- Requires authenticated writable tenant/workspace access and the existing `assessment:submit` decision authority.
- Requires `Idempotency-Key`, `expectedVersion`, and one complete unique ordering of the generated recommendation IDs.
- Creates an append-only preference version. It never updates the generated baseline.

The public projection exposes only the existing aggregate recommendation count. It does not expose numeric rank, priority labels, recommendation IDs, tenant/run identifiers, traces or customer preference state.

## Files created

- `src/lib/recommendation-priority/model.ts`
- `src/lib/recommendation-priority/types.ts`
- `src/lib/recommendation-priority/repository.server.ts`
- `src/lib/recommendation-priority/service.server.ts`
- `src/lib/recommendation-priority/projection.ts`
- `src/lib/recommendation-priority/http.server.ts`
- `src/routes/api/analysis-runs.$id.recommendation-priority.ts`
- `supabase/migrations/20260803050000_recommendation_priority_models.sql`
- `supabase/migrations/20260803051000_harden_recommendation_priority_permissions.sql`
- `tests/recommendation-priority.test.ts`
- `docs/sprint-04/S4-005-deployment-runbook.md`

## Files modified

- `src/lib/delivery-intelligence/recommendations.ts`
- `src/lib/analysis/executor.server.ts`
- `src/routeTree.gen.ts`
- `tests/analysis-executor.test.ts`
- `tests/migration-security.test.ts`
- `docs/sprint-04/acceptance-matrix.md`
- `docs/sprint-04/S4-004-implementation-report.md`

## Acceptance evidence

- AC1: the complete locked DIQ-203B suite passes without fixture changes; the priority model verifies each source rank against the shared DIQ-203 primitive.
- AC2: exact `85`, `70`, `50` boundaries and values immediately below each boundary pass.
- AC3: exact ties follow the locked tie-breakers; a six-decimal display collision is ordered by the unrounded score.
- AC4: each workspace item contains approved, textual rationale for impact, urgency, confidence, effort and dependency readiness; audit adds exact numeric components and weights.
- AC5: a display preference changes only display rank and creates an append-only actor/version/idempotency record; generated rank remains unchanged.

## Security, isolation and traceability

- Authenticated context supplies the run and tenant; callers cannot nominate scope, catalogue, weights, scores or rule versions.
- The service checks run, result, gate, resolution and catalogue identity and tenant scope before deterministic modelling.
- The database publisher repeats run/result/gate/resolution/catalogue scope, canonical-candidate count, definition, formula, component, label, trace and source-rank validation under an advisory lock.
- The preference publisher verifies active tenant membership, exact workspace ownership, a complete recommendation permutation, expected version and tenant-scoped idempotency.
- Immutable baseline/item/preference triggers plus the immediate hardening migration prevent direct customer mutation and remove Lovable Cloud default grants and `MAINTAIN`.
- Workspace/public projections redact numeric scores, weights, trace IDs, hashes and preference actors.

## Verification completed

- Targeted S4-005, analysis-worker and migration-security suites passed.
- Full regression passed: 34 test files / 388 tests.
- Complete DIQ-203B fixture suite passed unchanged.
- Type checking passed.
- Changed-file ESLint and Prettier passed.
- Full-repository ESLint remains a recorded inherited limitation: 5,654 errors and 15 warnings outside the S4-005 changed scope.
- Production Vite/Nitro build passed.
- The 250-item deterministic priority test completed within the two-second portfolio target.

## Known limitations

- The production database has no eligible completed analysis, so live S4-005 creation, replay, preference and cross-tenant smoke tests remain unavailable rather than manufacturing customer evidence.
- S4-012 owns the interactive customer portfolio experience. S4-005 provides accessible textual API contracts and introduces no new UI control.

## Technical debt

- Repository-wide inherited lint debt remains outside the changed scope (5,654 errors and 15 warnings). S4-005 introduces no changed-file lint finding.
- S4-008 will formalise the broader customer decision workflow; S4-005 uses the existing authenticated `assessment:submit` permission for its narrowly scoped display-order overlay.

## Product decisions required

None.
