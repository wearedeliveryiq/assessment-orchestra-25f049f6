# Sprint 04 Acceptance Matrix

## S4-001 — Recommendation Catalogue and Versioning

| Acceptance criterion                                       | Implementation evidence                                                             | Test evidence                                                           | Status |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------ |
| AC1 valid versions promote atomically                      | advisory-locked `transition_recommendation_catalogue`; atomic activation projection | catalogue and migration-security tests                                  | PASS   |
| AC2 invalid references, cycles and copy fail closed        | `validateCatalogueSnapshot`                                                         | malformed, dependency, conflict, cycle and copy cases                   | PASS   |
| AC3 active versions cannot mutate                          | immutable snapshot/definition/mapping triggers                                      | migration-security contract                                             | PASS   |
| AC4 historical portfolios resolve exact snapshots          | immutable version snapshot, digest and definition rows                              | deterministic digest/replay tests                                       | PASS   |
| AC5 activation, retirement and rollback are audited        | append-only lifecycle event and approval tables                                     | migration-security contract                                             | PASS   |
| AC6 concurrent promotion cannot create two active versions | advisory transaction lock and environment/recommendation primary key                | migration-security contract; Lovable Cloud promotion/rollback rehearsal | PASS   |

## S4-002 — Eligibility and Trigger Evaluation

| Acceptance criterion                                  | Implementation evidence                                                                                                                 | Test evidence                                                                                 | Status                                     |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------ |
| AC1 DIQ-203B recommendation fixtures remain unchanged | Sprint 03 resolver delegates to the shared deterministic eligibility primitive                                                          | complete DIQ-203B suite, including eligibility, exclusion, confidence and dependency fixtures | PASS                                       |
| AC2 every catalogue item has one terminal evaluation  | `evaluateRecommendationCandidates`; atomic publisher validates candidate count against pinned definitions and unique candidate identity | terminal coverage, trigger match/miss, exclusion and migration contract tests                 | PASS                                       |
| AC3 ordering/input order does not alter results       | sorted signals and catalogue-order/ID evaluation; semantic hashes use canonical key ordering                                            | reversed input and reversed catalogue tests                                                   | PASS                                       |
| AC4 unknown signals fail closed                       | approved capability/pattern allow-lists and bounded confidence validation                                                               | unknown opportunity, pattern and invalid confidence tests                                     | PASS                                       |
| AC5 evaluation is tenant/run scoped and traceable     | immutable result/catalogue FKs, tenant keys, source trace links and database scope checks                                               | service scope, cross-run trace, redaction and migration-security tests                        | PASS — live migration verification pending |

## S4-002 quality gates

| Gate                            | Evidence                                                                   | Status                                                      |
| ------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Deterministic domain/unit       | `tests/recommendation-evaluation.test.ts`                                  | PASS                                                        |
| Integration/idempotency/failure | mocked persistent service and non-blocking analysis lifecycle tests        | PASS                                                        |
| Tenant isolation/traceability   | service and database contract tests                                        | PASS — live verification pending                            |
| Permission/redaction            | customer versus auditor projection tests; deny-by-default migrations       | PASS — live verification pending                            |
| Performance                     | 250-candidate deterministic evaluation under the 2-second portfolio budget | PASS                                                        |
| Sprint 03 regression            | all locked DIQ-203B fixtures                                               | PASS                                                        |
| Type checking                   | `tsc --noEmit`                                                             | PASS                                                        |
| Changed-file lint               | ESLint over all S4-002 application and test files                          | PASS                                                        |
| Full-repository lint            | existing repository formatting baseline                                    | RECORDED LIMITATION — 4,819 inherited errors outside S4-002 |
| Full regression                 | 29 files / 311 tests                                                       | PASS                                                        |
| Production build                | Vite/Nitro production build                                                | PASS                                                        |

## Quality gates

Actual command results are recorded in the S4-001 engineering hand-off. Migration execution and live concurrency remain Lovable Cloud deployment gates.
