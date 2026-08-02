# Sprint 03 Acceptance Matrix

Status legend: `PASS`, `IN PROGRESS`, `NOT STARTED`, `BLOCKED`.

| Story  | Acceptance criteria | Status      | Evidence                                                              |
| ------ | ------------------- | ----------- | --------------------------------------------------------------------- |
| S3-001 | AC1–AC6             | IN PROGRESS | Existing run service and migration under PB-003 lifecycle remediation |
| S3-002 | AC1–AC5             | IN PROGRESS | Central config loader, pure scorer, golden tests                      |
| S3-003 | AC1–AC5             | IN PROGRESS | Independent confidence calculator, limitation codes, golden tests     |
| S3-004 | AC1–AC5             | IN PROGRESS | Configured deterministic narrative functions and golden tests         |
| S3-005 | AC1–AC5             | IN PROGRESS | Configured findings, deterministic ordering and golden tests          |
| S3-006 | AC1–AC5             | IN PROGRESS | Declarative patterns, fail-closed predicates and golden tests         |
| S3-007 | AC1–AC5             | IN PROGRESS | Eligibility/ranking/deduplication and golden tests                    |
| S3-008 | AC1–AC5             | IN PROGRESS | Dependency-aware roadmap and golden tests                             |
| S3-009 | AC1–AC5             | IN PROGRESS | Knowledge Pack mapping and golden tests                               |
| S3-010 | AC1–AC5             | IN PROGRESS | TeamMate mapping and golden tests                                     |
| S3-011 | AC1–AC5             | NOT STARTED | Immutable projection, tenant denial, accessibility and responsive E2E |
| S3-012 | AC1–AC5             | IN PROGRESS | Trace coverage and redaction policy implementation                    |
| S3-013 | AC1–AC5             | IN PROGRESS | Typed graph, traversal, integrity and golden tests                    |
| S3-014 | AC1–AC5             | IN PROGRESS | Exact deny-by-default projection and golden tests                     |

## Golden fixture register

DIQ-203B contains 52 locked fixtures. Every fixture is parameterised by identifier in `tests/sprint03-golden.test.ts`; expected values are not rewritten or normalised. Current result: **52/52 PASS**.

## Sprint-wide gates

| Gate                          | Status      | Current evidence / remaining work                                        |
| ----------------------------- | ----------- | ------------------------------------------------------------------------ |
| Configuration validation      | PASS        | Central Zod validation, uniqueness and weight-sum invariants             |
| Locked golden data            | PASS        | 52/52 fixtures                                                           |
| Static type checking          | PASS        | TypeScript `--noEmit`                                                    |
| Determinism                   | IN PROGRESS | Pure functions complete; persisted-result equivalence pending            |
| Idempotency/concurrency/retry | IN PROGRESS | S3-001 persistence remediation pending                                   |
| Tenant/workspace isolation    | IN PROGRESS | Repository and API adversarial tests pending                             |
| 100% visible lineage          | IN PROGRESS | Graph primitives complete; publication validator pending                 |
| Public schema leakage         | IN PROGRESS | Pure exact projection complete; API over-fetch tests pending             |
| Accessibility                 | NOT STARTED | Workspace/public journeys pending                                        |
| Performance                   | NOT STARTED | PB-003 reference-load measurements pending                               |
| Security                      | IN PROGRESS | Access-control, dependency and secret gates pending                      |
| Release                       | NOT STARTED | Migration rehearsal, clean full suite, release/rollback evidence pending |
