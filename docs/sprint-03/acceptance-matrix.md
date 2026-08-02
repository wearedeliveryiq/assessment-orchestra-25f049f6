# Sprint 03 Acceptance Matrix

## PDR-003-002 — Analysis Eligibility Policy

| Requirement                                                  | Implementation evidence                                                         | Test evidence                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Exact completed Delivery DNA / pack / question-set identity  | `src/lib/analysis/eligibility.ts`, `src/lib/analysis/handoff-service.server.ts` | `tests/analysis-eligibility.test.ts`                      |
| Exact 39-ID manifest; missing/extra/duplicate/alias rejected | DIQ-203A-derived `configuredQuestionIds`                                        | manifest cases in `tests/analysis-eligibility.test.ts`    |
| Explicit evidence semantics preserved                        | `src/lib/analysis/normalizer.ts`, `src/lib/analysis/types.ts`                   | analysis normalizer and golden regression suites          |
| Immutable tenant-scoped decision                             | `20260802161000_analysis_eligibility_decisions.sql`                             | migration/security contract tests                         |
| Terminal ineligible; no run and no retry                     | hand-off service, repository RPC and UI state                                   | `tests/analysis-handoff.test.ts`                          |
| Locked reasons, precedence, copy and actions                 | evaluator and Delivery Intelligence dashboard                                   | eligibility and dashboard source-contract tests           |
| Legacy 1.4.0 remains outside Sprint 03                       | deterministic identity checks                                                   | legacy hand-off integration case                          |
| Named failed-run remediation without history mutation        | `20260802161500_remediate_locked_ineligible_analysis.sql`                       | migration contract and verified Lovable Cloud remediation |
| Least privilege, privacy and tenant isolation                | RLS, service-role-only RPCs, digest-only decision                               | migration/security and cross-tenant tests                 |

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

## PDR-003-001 automatic analysis trigger

| Criterion                   | Status               | Evidence                                                                                                                                                 |
| --------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Automatic durable hand-off  | PASS                 | Completion transition trigger writes a unique tenant-scoped outbox record in the completion transaction; runtime schedules processing only after commit. |
| Duplicate/concurrent safety | PASS                 | Unique revision/configuration/mode key, `FOR UPDATE SKIP LOCKED`, locked DIQ-203 derived idempotency key and double-click tests.                         |
| Completion durability       | PASS                 | Hand-off processing is separate and failure updates only the outbox; completed assessment rows are never rolled back.                                    |
| Reconciliation              | PASS                 | Native one-minute Nitro task and generated Cloudflare cron trigger, protected operational endpoint and bounded database reconciliation function.         |
| UX states                   | PASS                 | Accessible preparing, queued/running, completed, retryable failure, non-retryable failure and missing-after-15s states; no normal-path generate action.  |
| Authorised retry            | PASS                 | Tenant-scoped write context, same idempotent request contract, atomic failed-run retry and disabled in-flight button.                                    |
| Audit and redaction         | PASS                 | Append-only tenant-scoped hand-off events contain IDs, versions, correlation and safe codes only; no raw evidence.                                       |
| Hosted completion-to-result | PASS WITH LIMITATION | Published authenticated ineligible journey passed. Eligible customer E2E awaits an approved Delivery DNA 1.0.0 collection journey.                       |

## Golden fixture register

All 53 locked DIQ-203B fixtures execute by identifier in `tests/sprint03-golden.test.ts`. Ordering is preserved and expected projections are unmodified: **53/53 PASS**.

## Sprint-wide gates

| Gate                                      | Status               | Evidence                                                                                                                                    |
| ----------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Locked configuration and golden data      | PASS                 | Central Zod validation and digest; 53/53 locked fixtures                                                                                    |
| Formatting, lint and type checking        | PASS                 | Changed-file Prettier/ESLint and TypeScript `--noEmit`                                                                                      |
| Unit, integration, failure and edge cases | PASS                 | 27 files, 282 tests                                                                                                                         |
| Determinism and immutability              | PASS                 | Ordering-invariance, immutable result publication and database mutation triggers                                                            |
| Idempotency, concurrency and retry        | PASS                 | Unique idempotency key, atomic claim/lease, retry cap and approved backoff tests                                                            |
| Tenant/workspace isolation                | PASS                 | Tenant-bound API/service/repository queries and cross-scope trace rejection                                                                 |
| Visible lineage                           | PASS                 | Publication rejects incomplete trace; every visible trace node requires evidence path                                                       |
| Public schema leakage                     | PASS                 | Exact allow-list projection and forbidden-key recursive tests                                                                               |
| Accessibility                             | PASS                 | Semantic headings/lists, labelled states, keyboard-sized controls and live/error regions                                                    |
| Performance                               | PASS                 | Deterministic local engine/narrative performance tests remain well below PB-003 processing limits                                           |
| Production build                          | PASS                 | Vite/Nitro client and server build                                                                                                          |
| Hosted migration/E2E rehearsal            | PASS WITH LIMITATION | Migrations, RLS, remediation and authenticated ineligible smoke verified; eligible E2E awaits the governed Delivery DNA collection journey. |

## Final Product Owner Decision

Sprint 03 is **ACCEPTED WITH RECORDED LIMITATIONS** under `docs/07-release/SAR-003 Sprint 03 Product Acceptance.md`. The inherited repository-wide lint baseline and unavailable Delivery DNA 1.0.0 collection journey are recorded limitations. Neither permits weakening PDR-003-002 or enabling the future collection journey before its production end-to-end gate passes.
