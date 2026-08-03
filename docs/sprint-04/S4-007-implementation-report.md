# S4-007 — Recommendation Portfolio Generation

## Status

Implemented on `agent/s4-007-recommendation-portfolio`. Application verification is complete; Lovable Cloud migration execution and live schema verification remain deployment gates.

## Architecture and reuse

- Consumes the immutable S4-002 recommendation evaluation, S4-003 confidence gate, S4-004 conflict resolution, S4-005 priority model, S4-006 generated sequence, active S4-001 catalogue, and their pinned tenant/configuration/catalogue digests.
- Adds only a deterministic projection layer. It does not duplicate or alter scoring, confidence, eligibility, conflict, priority, dependency, sequencing, recommendation, or roadmap rules.
- Uses the locked class order `immediate_attention`, `foundation`, `quick_win`, `strategic_initiative`, then `watch`. Each item receives exactly one primary class and any other matching classes as ordered secondary tags.
- Uses the locked DIQ-203 urgency derivation: critical-pattern urgency is 100 and score-below-25 urgency is 90. Immediate attention therefore requires critical/high priority and urgency at least 90; no new scoring threshold is introduced.
- Publishes one immutable, idempotent portfolio for a sequence model and policy version. Stable ordering is class precedence, generated sequence, generated rank, catalogue order, and recommendation ID.
- Runs automatically only after S4-006 succeeds. Portfolio failure emits a safe event and never rolls back the completed analysis or any S4-001–006 result.

## Data model

### `recommendation_portfolios`

Immutable tenant/run-scoped portfolio pinned to evaluation, confidence, resolution, priority, sequence, catalogue, configuration, policy, projector, canonical input, canonical output, and semantic hashes. Explicit state is `empty`, `partial`, or `complete`.

### `recommendation_portfolio_items`

Immutable ordered projection of every governed recommendation with one primary class, secondary tags, source identity, safe customer content, priority and sequence state, confidence, dependencies, caveats, trace IDs, and semantic hash.

Both tables use RLS with zero client policies. `PUBLIC`, `anon`, and `authenticated` receive no direct access. Publication is service-role-only through one governed security-definer routine.

## API

`GET /api/analysis-runs/{runId}/recommendation-portfolio`

- Requires authenticated tenant/workspace access and `assessment:read`.
- Returns an accessible five-group customer projection with state, summary, safe why, confidence, dependency status, outcome, and success measures.
- Supports a strong immutable ETag and conditional `If-None-Match` returning `304`.

`POST /api/analysis-runs/{runId}/recommendation-portfolio`

- Ensures the upstream immutable S4-006 sequence, then creates or reuses S4-007.
- Accepts no customer-supplied class, rank, sequence, dependency, catalogue, rule, hash, trace, or tenant data.

`GET /api/recommendation-portfolios/{portfolioId}`

- Resolves the exact story resource under authenticated tenant/workspace scope.
- Uses the same permission, audience, redaction, cache, and ETag contract as the run endpoint.

The public projection contains only portfolio state and recommendation count. It exposes no recommendation IDs, classes, dependencies, tenant/run scope, traces, hashes, or internal rules. Audit-only lineage requires the existing audit permission.

## Files created

- `src/lib/recommendation-portfolio/model.ts`
- `src/lib/recommendation-portfolio/types.ts`
- `src/lib/recommendation-portfolio/projection.ts`
- `src/lib/recommendation-portfolio/repository.server.ts`
- `src/lib/recommendation-portfolio/service.server.ts`
- `src/lib/recommendation-portfolio/http.server.ts`
- `src/routes/api/analysis-runs.$id.recommendation-portfolio.ts`
- `src/routes/api/recommendation-portfolios.$id.ts`
- `supabase/migrations/20260803070000_recommendation_portfolios.sql`
- `supabase/migrations/20260803071000_harden_recommendation_portfolio_permissions.sql`
- `tests/recommendation-portfolio.test.ts`
- `docs/sprint-04/S4-007-deployment-runbook.md`

## Files modified

- `src/lib/analysis/executor.server.ts`
- `src/routeTree.gen.ts`
- `tests/analysis-executor.test.ts`
- `tests/migration-security.test.ts`
- `docs/sprint-04/acceptance-matrix.md`
- `docs/sprint-04/S4-006-implementation-report.md`

## Acceptance evidence

- AC1: every unique S4-006 item is reconciled to priority, evaluation, catalogue, dependency, and trace sources before all items are assigned exactly one primary class.
- AC2: tests cover all five classes, exact precedence, multi-class secondary tags, urgency 90/100 boundaries, required-dependency readiness, effort/impact and day-90 rules.
- AC3: reversed input produces the same stable portfolio; one immutable version is reused under the same sequence and policy; changed or cross-scoped inputs fail closed.
- AC4: workspace output contains safe explanatory content and complete trace coverage while separate public and audit projections enforce field-level disclosure.
- AC5: the 250-item bounded fixture completes inside the two-second portfolio target; item 251 is rejected; tenant-scoped resource lookup and ETag contracts are tested.

## Security, isolation and traceability

- Authenticated context supplies the run and tenant scope; callers cannot nominate organisation, workspace, source model, catalogue, configuration, rules, classification, hash, or trace.
- The service verifies completed run status and exact tenant/workspace/configuration/catalogue linkage across all immutable S4-001–006 inputs before classification.
- The database publisher repeats run, evaluation, confidence, resolution, priority, sequence, catalogue, source-item, classification, ordering, summary, trace-coverage, hash, and tenant checks under an advisory lock.
- Two immutable triggers plus the immediate hardening migration remove direct client grants and Lovable Cloud `MAINTAIN` defaults.
- All customer-visible portfolio conclusions carry one or more authorised source trace node IDs. The workspace response exposes safe evidence wording, not internal trace IDs or hashes.

## Verification completed

- Targeted S4-007, analysis-worker, and migration-security suites passed: 3 files / 45 tests.
- Full regression passed: 36 files / 424 tests.
- Complete DIQ-203B fixture suite passed unchanged: 53 tests.
- Type checking passed.
- Changed-file ESLint and Prettier passed.
- Full-repository ESLint remains a recorded inherited limitation: 6,336 errors and 15 warnings outside the S4-007 changed scope.
- Production Vite/Nitro build passed after final documentation.
- The 250-item performance fixture completed inside the two-second portfolio target.

## Known limitations and deployment gates

- Apply and verify both migrations through Lovable Cloud in timestamp order; local CLI migration execution remains unavailable for the Lovable-managed database.
- Production has no eligible completed analysis/intelligence result, so live portfolio creation, replay, ETag, redaction, and cross-tenant smoke tests remain unavailable rather than manufacturing customer evidence.
- S4-012 owns the interactive recommendation experience. S4-007 supplies accessible semantic response structures but introduces no new visual workflow.

## Technical debt

- Repository-wide inherited lint debt remains outside the changed scope (6,336 errors and 15 warnings). S4-007 introduces no changed-file lint finding.

## Product decisions required

None.
