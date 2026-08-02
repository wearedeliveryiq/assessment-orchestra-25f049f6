# Sprint 04 Acceptance Matrix

## S4-001 — Recommendation Catalogue and Versioning

| Acceptance criterion                                       | Implementation evidence                                                             | Test evidence                                                    | Status                              |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------- |
| AC1 valid versions promote atomically                      | advisory-locked `transition_recommendation_catalogue`; atomic activation projection | catalogue and migration-security tests                           | PASS                                |
| AC2 invalid references, cycles and copy fail closed        | `validateCatalogueSnapshot`                                                         | malformed, dependency, conflict, cycle and copy cases            | PASS                                |
| AC3 active versions cannot mutate                          | immutable snapshot/definition/mapping triggers                                      | migration-security contract                                      | PASS                                |
| AC4 historical portfolios resolve exact snapshots          | immutable version snapshot, digest and definition rows                              | deterministic digest/replay tests                                | PASS                                |
| AC5 activation, retirement and rollback are audited        | append-only lifecycle event and approval tables                                     | migration-security contract                                      | PASS                                |
| AC6 concurrent promotion cannot create two active versions | advisory transaction lock and environment/recommendation primary key                | migration-security contract; live concurrency rehearsal required | PASS — deployment rehearsal pending |

## Quality gates

Actual command results are recorded in the S4-001 engineering hand-off. Migration execution and live concurrency remain Lovable Cloud deployment gates.
