# S3-001 — Assessment Analysis Pipeline

Status: IMPLEMENTED — integration migration rehearsal pending

## Summary

S3-001 now provides the approved asynchronous `POST /api/analysis-runs` and tenant-scoped `GET /api/analysis-runs/{id}` contracts. A request validates an accessible completed session and its pinned Knowledge Pack, creates a deterministic canonical evidence snapshot, derives the approved idempotency key, stores the locked configuration snapshot/digest, and creates one queued run. This story performs no scoring, narrative or recommendation calculation.

## Architecture and reuse

Reused: assessment repository, authenticated request context, completed execution/version pin, Knowledge Pack loader, Supabase service repository and generated TanStack routes.

Replaced: the synchronous assessment analysis endpoint and completed-only run row. The new boundary separates request validation/normalisation, persistence, lifecycle rules and HTTP projection.

## Files

- `src/lib/analysis/{types,normalizer,service.server,repository.server,http.server}.ts`
- `src/routes/api/analysis-runs.ts`
- `src/routes/api/analysis-runs.$id.ts`
- `src/lib/delivery-intelligence/{config,lifecycle}.ts`
- `src/lib/assessment/{types,repository.server}.ts`
- `supabase/migrations/20260802020000_assessment_analysis_runs.sql`
- `tests/assessment-analysis.test.ts`
- `tests/sprint03-golden.test.ts`

## Acceptance evidence

| Criterion | Implementation evidence | Test evidence |
|---|---|---|
| AC1 | Authenticated tenant context, session scope checks, one queued run | creates one queued immutable snapshot |
| AC2 | Stable DIQ-203 error taxonomy for incomplete, invalid, missing version and access denial | failure-path test covers incomplete/version/cross-tenant |
| AC3 | Approved SHA-256 material, unique database key and race reconciliation | replay and conflict tests; locked lifecycle fixtures |
| AC4 | Answer ID/version, question ID/version, status, exclusion, group and evidence timestamp retained | canonical reference test |
| AC5 | Database trigger freezes input/configuration after running and all fields after completion | migration contract; database execution pending local Supabase gate |
| AC6 | Append-only tenant/run/correlation events with atomic per-run sequence | queued/reused event tests; database concurrency gate pending |

## Security and isolation

All server-side run reads bind organisation and workspace. The API uses the existing verified identity context and returns non-enumerating `ANALYSIS_ACCESS_DENIED`. Run and event RLS require active organisation membership and a matching live workspace. Canonical input has a database tenant-consistency constraint.

## Tests and gates

- S3-001 and locked golden tests: 58/58 passed.
- Full regression: 233/233 passed.
- Static type checking: passed.
- Production build: passed.
- Changed-file lint: passed.
- Repository-wide lint: blocked by 3,500+ pre-existing formatting violations outside this slice; no new-slice lint violations.

## Limitations and remaining gates

- Apply/revert migration tests require a configured local Supabase database.
- Worker claim, lease-expiry recovery and retry integration remain part of the next persistence slice.
- The existing UI submission journey must be switched to the asynchronous endpoint in the experience slice.

No product question remains for S3-001.
