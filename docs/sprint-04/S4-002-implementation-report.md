# S4-002 — Eligibility and Trigger Evaluation

## Status

Implemented on `agent/s4-002-eligibility-evaluation`. Database execution and live verification remain Lovable Cloud deployment gates.

## Architecture and reuse

- Reuses the immutable Sprint 03 `delivery_intelligence_results` and trace nodes as the only signal source.
- Reuses the active, immutable S4-001 catalogue snapshot and digest; no recommendation rule is copied into persistence or presentation code.
- Moves the existing Sprint 03 eligibility decision into one shared deterministic primitive used by both Sprint 03 result generation and S4-002 evaluation.
- Adds an immutable evaluation snapshot rather than mutating the analysis result or recalculating scoring, confidence, patterns, ranking or roadmap output.
- Runs automatically after a successfully published analysis as a non-blocking follow-on. Evaluation failure emits a safe event and cannot roll back or fail the completed analysis.

## Domain behaviour

The evaluator accepts only approved Sprint 03 priority-opportunity IDs, pattern IDs and a bounded confidence index. For every definition in the active pinned catalogue it records:

- terminal result: `eligible`, `ineligible` or `excluded`;
- matched and unmet triggers;
- unmet dependencies as prerequisites without changing eligibility;
- matched exclusions, evaluated before an otherwise matched trigger is accepted;
- confidence state using the unchanged DIQ-203 boundaries;
- decisive structured facts and source trace domains;
- catalogue, rule and evaluator versions plus deterministic semantic hashes.

Reordered signals or catalogue definitions produce the same semantic output. Unknown or duplicate signals fail closed with `RECOMMENDATION_EVALUATION_INVALID`. Re-evaluation against another catalogue version creates a new immutable record; an identical run/catalogue/policy request reuses the existing record.

## Data model

### `recommendation_evaluations`

One immutable evaluation snapshot per analysis run, catalogue version and policy version. It pins the intelligence result, tenant/workspace, configuration set, catalogue identity/digest, evaluator version, canonical input, canonical output and SHA-256 input/output hashes.

### `recommendation_candidate_evaluations`

One immutable terminal record per catalogue definition within an evaluation. It stores the rule result, facts, confidence state, semantic hash and trace references.

### `recommendation_evaluation_trace_links`

Immutable links from a candidate evaluation to existing Sprint 03 trace nodes. The publication function rejects cross-run, cross-organisation or cross-workspace nodes.

All three tables use RLS with no client policies. `anon` and `authenticated` receive no direct table or function access. The server-side service role receives read access and the single atomic publisher function.

## API

`GET /api/analysis-runs/{runId}/recommendation-evaluation`

- Requires an authenticated active workspace context and `assessment:read`.
- Returns only eligible rationale to normal customers.
- Returns all terminal evaluations, decisive facts, hashes and trace IDs only to callers with `audit:read`; catalogue governance alone never unlocks tenant evaluation audit detail.
- Uses non-enumerating analysis-run access checks.

`POST /api/analysis-runs/{runId}/recommendation-evaluation`

- Uses the same authorisation and tenant checks.
- Creates the evaluation atomically or returns the immutable idempotent replay.
- Does not accept customer-supplied rules, catalogue IDs, tenant IDs or signals.

## Files created

- `src/lib/recommendations/eligibility.ts`
- `src/lib/recommendation-evaluation/evaluator.ts`
- `src/lib/recommendation-evaluation/types.ts`
- `src/lib/recommendation-evaluation/repository.server.ts`
- `src/lib/recommendation-evaluation/service.server.ts`
- `src/lib/recommendation-evaluation/projection.ts`
- `src/lib/recommendation-evaluation/http.server.ts`
- `src/routes/api/analysis-runs.$id.recommendation-evaluation.ts`
- `supabase/migrations/20260803020000_recommendation_evaluations.sql`
- `supabase/migrations/20260803021000_harden_recommendation_evaluation_permissions.sql`
- `tests/recommendation-evaluation.test.ts`

## Files modified

- `src/lib/delivery-intelligence/recommendations.ts`
- `src/lib/analysis/executor.server.ts`
- `src/routeTree.gen.ts`
- `tests/analysis-executor.test.ts`
- `tests/migration-security.test.ts`
- `docs/sprint-04/acceptance-matrix.md`

## Security and tenant-isolation evidence

- Tenant/workspace scope is resolved from the authenticated request, never the request body.
- The service verifies run, result, catalogue configuration and trace scope before publication.
- The database publisher independently verifies the completed run, result scope, active catalogue, complete activation set and every trace link.
- Publication is advisory-locked and atomic; incomplete candidate sets or invalid trace links roll back fully.
- Storage is immutable and deny-by-default; the companion hardening migration removes Lovable Cloud default grants including `MAINTAIN`.
- Customer projection omits ineligible/excluded candidates, unmet triggers, exclusions, semantic hashes and trace IDs.

## Test evidence

Covered scenarios:

- trigger match and miss;
- exclusion precedence;
- every catalogue item receives one terminal result;
- reordered input and catalogue order;
- unknown opportunity, pattern and confidence inputs;
- confidence boundary preservation;
- unmet prerequisite recording without eligibility mutation;
- idempotent replay and catalogue pinning;
- cross-run trace rejection;
- customer/auditor redaction;
- non-blocking analysis-completion integration;
- 250-item performance guard;
- migration immutability, scope, RLS and least-privilege contracts;
- complete locked DIQ-203B regression suite.

Final verification results:

- formatting: S4-002 files formatted successfully;
- static type check: passed;
- changed-file ESLint: passed;
- full regression: 29 test files and 311 tests passed;
- locked DIQ-203B baseline: all 53 harness tests passed, covering the 52 locked fixtures plus baseline control;
- production Vite/Nitro build: passed;
- full-repository ESLint: not passed; it reports 4,819 inherited formatting errors and 15 warnings in files outside S4-002. S4-002 changed-file lint is clean and unrelated files were not reformatted.

## Known limitations and deployment gates

- The two migrations must be preflighted and applied separately through Lovable Cloud, followed immediately by the hardening migration.
- The production S4-001 catalogue must be governed and active before a live evaluation can be generated. No migration seeds or silently activates product configuration.
- Live SQL execution, privilege inspection, concurrency/idempotency rehearsal and a production API smoke test remain deployment evidence.
- Repository-wide formatting debt remains an accepted inherited limitation; S4-002 introduces no new lint finding in its changed scope.
- S4-003 will add the separate confidence-gate state. S4-002 records confidence but intentionally does not introduce a second gate or change Sprint 03 withholding behaviour.

## Technical debt

The analysis worker performs one best-effort evaluation attempt. Durable retries and operational alerting belong to S4-014; authorised idempotent POST recovery is available now.

## Product decisions required

None for the implemented story. Production activation requires two authorised governance identities under the already locked S4-001 separation-of-duties policy.
