# Sprint 03 Acceptance Matrix

Evidence baseline: branch `agent/sprint-03-foundation`, 2 August 2026.

| Story  | Status | Implementation and acceptance evidence                                                                                                                                                     |
| ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S3-001 | PASS   | Canonical snapshot, locked config digest, immutable/idempotent run, event lifecycle, lease/concurrency and bounded 5s/30s retries. `assessment-analysis`, `analysis-executor` tests.       |
| S3-002 | PASS   | Pure weighted capability scorer, missing/NA/exclusion rules, half-up rounding and bands. Golden scoring fixtures.                                                                          |
| S3-003 | PASS   | Independent confidence factors, bands, limitations and low-confidence controls. Golden confidence fixtures.                                                                                |
| S3-004 | PASS   | Deterministic versioned executive narrative with confidence caveat and approved templates. Narrative and golden tests.                                                                     |
| S3-005 | PASS   | Deterministic strengths, opportunities, insufficient-evidence classification and limits. Golden finding fixtures.                                                                          |
| S3-006 | PASS   | Declarative fail-closed pattern predicates, exclusivity, suppression and explanations. Golden pattern fixtures.                                                                            |
| S3-007 | PASS   | Eligibility, exclusions, ranking, dependencies and deduplication from one engine. Golden recommendation fixtures.                                                                          |
| S3-008 | PASS   | Dependency-aware 30/60/90 roadmap, capacity limits and withheld state. Golden roadmap fixtures.                                                                                            |
| S3-009 | PASS   | Governed Knowledge Pack mapping plus server-side active/entitlement resolution; unavailable packs denied by default. Golden and product recommendation tests.                              |
| S3-010 | PASS   | Accepted-recommendation prerequisite, availability, entitlement and `teammate.activate` permission; no activation side effect. Golden and product recommendation tests.                    |
| S3-011 | PASS   | Responsive immutable-result dashboard with loading, empty, error, low-evidence and action states; presentation performs no calculations. Production build and shell regression tests.      |
| S3-012 | PASS   | Workspace explanation journey over governed trace, depth cap and role-based raw-evidence restriction. Explainability tests.                                                                |
| S3-013 | PASS   | Trace generated at publication, typed nodes/edges, cross-scope/orphan detection and evidence path for every visible conclusion. Traceability tests.                                        |
| S3-014 | PASS   | Shared canonical result, exact server-side allow-list, high-entropy hashed token, consent, expiry, rate limiting, no-store response and tenant-scoped revocation. Public disclosure tests. |

## Golden fixture register

All 52 locked DIQ-203B fixtures execute by identifier in `tests/sprint03-golden.test.ts`. Ordering is preserved and expected projections are unmodified: **52/52 PASS**.

## Sprint-wide gates

| Gate                                      | Status          | Evidence                                                                                          |
| ----------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------- |
| Locked configuration and golden data      | PASS            | Central Zod validation and digest; 52/52 locked fixtures                                          |
| Formatting, lint and type checking        | PASS            | Changed-file Prettier/ESLint and TypeScript `--noEmit`                                            |
| Unit, integration, failure and edge cases | PASS            | 24 files, 251 tests                                                                               |
| Determinism and immutability              | PASS            | Ordering-invariance, immutable result publication and database mutation triggers                  |
| Idempotency, concurrency and retry        | PASS            | Unique idempotency key, atomic claim/lease, retry cap and approved backoff tests                  |
| Tenant/workspace isolation                | PASS            | Tenant-bound API/service/repository queries and cross-scope trace rejection                       |
| Visible lineage                           | PASS            | Publication rejects incomplete trace; every visible trace node requires evidence path             |
| Public schema leakage                     | PASS            | Exact allow-list projection and forbidden-key recursive tests                                     |
| Accessibility                             | PASS            | Semantic headings/lists, labelled states, keyboard-sized controls and live/error regions          |
| Performance                               | PASS            | Deterministic local engine/narrative performance tests remain well below PB-003 processing limits |
| Production build                          | PASS            | Vite/Nitro client and server build                                                                |
| Hosted migration/E2E rehearsal            | DEPLOYMENT GATE | Requires the target Supabase project and deployed branch; follow `release-plan.md`                |
