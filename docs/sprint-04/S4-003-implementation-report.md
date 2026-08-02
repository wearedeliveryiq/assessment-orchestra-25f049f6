# S4-003 — Confidence Gates and Evidence Sufficiency

## Status

Implemented on `agent/s4-003-confidence-gates`. Application verification is complete; Lovable Cloud migration execution and live API verification remain deployment gates.

## Architecture and reuse

- Reuses the immutable S4-002 recommendation evaluation as the pre-gate baseline. Eligibility, exclusions and prerequisites are never recalculated or mutated.
- Reuses the DIQ-203A confidence index, band boundaries, limitations, low-confidence caveat and approved effort classifications. S4-003 performs no confidence, capability-score or impact calculation.
- Adds a separate deterministic gate between eligibility and the future S4-004 conflict stage.
- Persists one immutable, idempotent gate snapshot per S4-002 evaluation and S4-003 policy version.
- Links every post-gate candidate to its S4-002 candidate evidence and to the Sprint 03 `confidence_result` trace node.
- Runs automatically only after S4-002 succeeds. Gate failure is recorded safely and cannot roll back a completed analysis or its immutable evaluation.

## Domain behaviour

The gate preserves the locked boundaries exactly:

- low: `<50`;
- moderate: `50–<75`;
- high: `≥75`.

Only S4-002 candidates with the immutable pre-gate result `eligible` enter the confidence gate:

- low-confidence medium/high-effort actions become `withheld` with reason `low_confidence_material_action`;
- low-confidence low-effort advice remains `presented`;
- the pinned low-confidence evidence-gathering catalogue item becomes the low-effort `evidence_first` action and is required at low confidence;
- moderate-confidence advice is `presented` with the exact ordered DIQ-203A limitation text;
- high-confidence advice is `presented` with no default caveat.

A withheld item remains eligible in S4-002 and is never changed to rejected. Unknown, duplicate, unavailable or inconsistent confidence evidence fails closed with `RECOMMENDATION_EVALUATION_INVALID`.

## Data model

### `recommendation_confidence_gates`

One immutable gate snapshot per recommendation evaluation and policy version. It pins the run, intelligence result, tenant/workspace, catalogue version/digest, confidence version, index, band, limitations, caveat, confidence trace node, canonical input/output and SHA-256 hashes.

### `recommendation_candidate_confidence_gates`

One immutable post-gate record per eligible S4-002 candidate. It preserves `pre_gate_result = eligible` and records `presented`, `withheld` or `evidence_first`, the approved reason code, pinned effort, caveat, limitation codes, lineage and semantic hash.

### `recommendation_confidence_gate_trace_links`

Immutable links to the original S4-002 evidence trace nodes and the single tenant/run-scoped Sprint 03 confidence-result node. Cross-run, cross-organisation, cross-workspace and unrelated extra nodes fail publication.

All three tables enable RLS with no client policies. `anon` and `authenticated` receive no direct access. The service role receives read access and execution of the single atomic publisher.

## API

`GET /api/analysis-runs/{runId}/recommendation-confidence`

- Requires authenticated tenant/workspace access and `assessment:read`.
- Normal workspace projection returns presented/evidence-first recommendation IDs and a generic withheld count/reason/caveat.
- It never returns withheld recommendation identities, semantic hashes, limitation arrays or trace IDs.
- Callers with `audit:read` receive the complete immutable gate and lineage projection.

`POST /api/analysis-runs/{runId}/recommendation-confidence`

- Uses the same non-enumerating tenant and permission checks.
- Ensures the immutable S4-002 evaluation exists, then creates or reuses the S4-003 gate atomically.
- Accepts no customer-supplied confidence, rules, catalogue, tenant scope or recommendation state.

The pure public projection exposes confidence copy and aggregate presented/evidence-first/withheld state only. It omits run, tenant, recommendation, hash and trace identifiers.

## Files created

- `src/lib/recommendation-confidence/gate.ts`
- `src/lib/recommendation-confidence/types.ts`
- `src/lib/recommendation-confidence/repository.server.ts`
- `src/lib/recommendation-confidence/service.server.ts`
- `src/lib/recommendation-confidence/projection.ts`
- `src/lib/recommendation-confidence/http.server.ts`
- `src/routes/api/analysis-runs.$id.recommendation-confidence.ts`
- `supabase/migrations/20260803030000_recommendation_confidence_gates.sql`
- `supabase/migrations/20260803031000_harden_recommendation_confidence_permissions.sql`
- `tests/recommendation-confidence-gate.test.ts`
- `docs/sprint-04/S4-003-deployment-runbook.md`

## Files modified

- `src/lib/analysis/executor.server.ts`
- `src/lib/delivery-intelligence/confidence.ts`
- `src/lib/recommendations/eligibility.ts`
- `src/routeTree.gen.ts`
- `tests/analysis-executor.test.ts`
- `tests/migration-security.test.ts`
- `docs/sprint-04/acceptance-matrix.md`
- `docs/sprint-04/S4-002-implementation-report.md`

## Acceptance and test evidence

- AC1: exact 49.999999, 50, 74.999999 and 75 boundary tests pass.
- AC2: low-confidence medium/high withholding, low-effort presentation and evidence-first tests pass.
- AC3: confidence-only changes preserve recommendation identity, version, order, effort and eligible pre-gate state; analysis completion remains non-blocking.
- AC4: low, multiple moderate limitation and high caveat outputs match locked DIQ-203A copy.
- AC5: public/workspace projections hide withheld identities and lineage; audit projection retains them.
- Failure and edge cases: unavailable/NaN confidence, missing moderate limitation, unknown and duplicate limitations, absent evidence-first action, missing/cross-scope confidence lineage and pinned-input mismatch fail closed.
- Performance: 250 eligible candidates pass the one-second test guard.
- Full regression: 32 test files and 347 tests passed, including all 53 Sprint 03 golden harness tests covering the 52 locked DIQ-203B fixtures.
- Static type check: passed.
- Changed-file ESLint and Prettier: passed.
- Production Vite/Nitro build: passed.

## Security and tenant-isolation evidence

- Authenticated context supplies the run and tenant scope; the request cannot nominate an organisation, workspace, catalogue or confidence value.
- The service independently verifies run, immutable evaluation, intelligence result, pinned catalogue/digest and confidence trace scope.
- The database publisher repeats scope and lineage checks under an advisory transaction lock and rejects incomplete eligible-candidate sets.
- Every table is immutable and deny-by-default. The hardening migration removes Lovable Cloud default table/function access and `MAINTAIN`.
- Customer/public projections redact withheld identities and all audit-only hashes, limitations and trace links.

## Known limitations and deployment gates

- Apply and verify both migrations through Lovable Cloud in timestamp order. Local CLI migration execution is not available for the Lovable-managed database.
- The production database has no completed eligible Delivery DNA analysis or delivery-intelligence result, so a live tenant-scoped S4-002/S4-003 API smoke test cannot yet be run without manufacturing customer evidence.
- Durable retries and operational alerting for evaluation/gate failures remain S4-014 scope; the authorised idempotent POST endpoint provides bounded recovery.
- S4-012 owns customer presentation UI. S4-003 adds accessible textual API contracts and introduces no new UI control.

## Technical debt

Repository-wide inherited lint/format debt remains outside the changed scope: the full lint command reports 5,070 pre-existing formatting errors. S4-003 introduces no changed-file lint finding.

## Product decisions required

None. The implementation uses only the locked DIQ-203A thresholds, effort policy, limitation copy and low-confidence caveat.
