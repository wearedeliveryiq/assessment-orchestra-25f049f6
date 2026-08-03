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

### S4-001 Product Governance isolation remediation

| Locked requirement                                         | Implementation evidence                                                                                                                | Test evidence                                                                             | Status |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------ |
| Product Governance has no tenant data by default           | dedicated platform-scoped `product_governance` role grants only `recommendation:govern`; tenant evaluation audit requires `audit:read` | Product Governance role and recommendation-evaluation permission tests                    | PASS   |
| Platform and tenant administration do not govern catalogue | `recommendation:govern` removed from `platform_admin`; catalogue routes retain the explicit permission check                           | exact-permission RBAC test                                                                | PASS   |
| Governance role cannot become a tenant role                | application assignment guard plus database checks on organisation/workspace memberships and invitations                                | Product Governance role and migration-security tests                                      | PASS   |
| Author and approver are different genuine identities       | existing service/database self-approval denial; updated promotion runbook                                                              | catalogue lifecycle tests; live production activation by two distinct verified identities | PASS   |

## S4-002 — Eligibility and Trigger Evaluation

| Acceptance criterion                                  | Implementation evidence                                                                                                                 | Test evidence                                                                                 | Status |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------ |
| AC1 DIQ-203B recommendation fixtures remain unchanged | Sprint 03 resolver delegates to the shared deterministic eligibility primitive                                                          | complete DIQ-203B suite, including eligibility, exclusion, confidence and dependency fixtures | PASS   |
| AC2 every catalogue item has one terminal evaluation  | `evaluateRecommendationCandidates`; atomic publisher validates candidate count against pinned definitions and unique candidate identity | terminal coverage, trigger match/miss, exclusion and migration contract tests                 | PASS   |
| AC3 ordering/input order does not alter results       | sorted signals and catalogue-order/ID evaluation; semantic hashes use canonical key ordering                                            | reversed input and reversed catalogue tests                                                   | PASS   |
| AC4 unknown signals fail closed                       | approved capability/pattern allow-lists and bounded confidence validation                                                               | unknown opportunity, pattern and invalid confidence tests                                     | PASS   |
| AC5 evaluation is tenant/run scoped and traceable     | immutable result/catalogue FKs, tenant keys, source trace links and database scope checks                                               | service scope, cross-run trace, redaction, migration-security and live Lovable verification   | PASS   |

## S4-002 quality gates

| Gate                            | Evidence                                                                   | Status                                                                             |
| ------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Deterministic domain/unit       | `tests/recommendation-evaluation.test.ts`                                  | PASS                                                                               |
| Integration/idempotency/failure | mocked persistent service and non-blocking analysis lifecycle tests        | PASS                                                                               |
| Tenant isolation/traceability   | service, database contract tests and live Lovable verification             | PASS                                                                               |
| Permission/redaction            | customer versus auditor projection tests; deny-by-default live migrations  | PASS                                                                               |
| Performance                     | 250-candidate deterministic evaluation under the 2-second portfolio budget | PASS                                                                               |
| Sprint 03 regression            | all locked DIQ-203B fixtures                                               | PASS                                                                               |
| Type checking                   | `tsc --noEmit`                                                             | PASS                                                                               |
| Changed-file lint               | ESLint over all S4-002 application and test files                          | PASS                                                                               |
| Full-repository lint            | existing repository formatting baseline                                    | RECORDED LIMITATION — 615 inherited errors and 15 warnings outside the remediation |
| Full regression                 | 30 files / 317 tests                                                       | PASS                                                                               |
| Production build                | Vite/Nitro production build                                                | PASS                                                                               |

## S4-003 — Confidence Gates and Evidence Sufficiency

| Acceptance criterion                                          | Implementation evidence                                                                                                          | Test evidence                                                      | Status |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------ |
| AC1 exact confidence boundaries                               | `applyRecommendationConfidenceGate` delegates to the unchanged DIQ-203 confidence boundaries                                     | 49.999999, 50, 74.999999 and 75 fixtures                           | PASS   |
| AC2 low-confidence material action is withheld                | immutable post-gate state preserves the eligible pre-gate result; medium/high effort uses `low_confidence_material_action`       | material-action, low-effort and evidence-first cases               | PASS   |
| AC3 confidence changes affect only gate/confidence components | separate S4-003 record linked to immutable S4-002 candidates; no score, impact, effort or base-evaluation mutation               | moderate/high invariant projection and analysis non-rollback tests | PASS   |
| AC4 caveats match locked copy                                 | low uses the DIQ-203A caveat verbatim; moderate composes only ordered DIQ-203A limitation sentences; high has no default caveat  | exact low, moderate/multiple-limitation and high-copy assertions   | PASS   |
| AC5 withheld details are restricted appropriately             | public/workspace projections return counts and safe reasons but omit withheld identities, hashes and lineage; audit is permitted | public/workspace/audit schema-leakage and redaction assertions     | PASS   |

## S4-003 quality gates

| Gate                              | Evidence                                                                                     | Status                                                                        |
| --------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Deterministic domain/unit         | `tests/recommendation-confidence-gate.test.ts`                                               | PASS                                                                          |
| Integration/idempotency/failure   | immutable service replay, cross-scope failure and non-blocking analysis-worker tests         | PASS                                                                          |
| Tenant isolation/traceability     | service scope checks, confidence-node lineage and database publication contract              | PASS — including live Lovable verification                                    |
| Permission/redaction              | public/workspace/audit projections and deny-by-default migration contract                    | PASS — including live privilege inspection                                    |
| Accessibility/copy                | textual status, reason and caveat contracts; exact locked-copy tests; no new presentation UI | PASS                                                                          |
| Performance                       | 250 eligible candidates gated under the one-second test guard                                | PASS                                                                          |
| Sprint 03 and S4-002 regression   | complete DIQ-203B and recommendation-evaluation suites                                       | PASS                                                                          |
| Type checking                     | `tsc --noEmit`                                                                               | PASS                                                                          |
| Changed-file lint/format          | ESLint and Prettier over all S4-003 application, route, generated-route and test files       | PASS                                                                          |
| Full-repository lint              | Existing repository formatting baseline                                                      | RECORDED LIMITATION — 5,070 inherited errors outside the S4-003 changed scope |
| Full regression                   | 32 files / 347 tests                                                                         | PASS                                                                          |
| Production build                  | Vite/Nitro production build                                                                  | PASS                                                                          |
| Lovable Cloud migration execution | `20260803030000` followed by `20260803031000`; live schema and ACL verification              | PASS — live smoke unavailable because no eligible analysis exists             |

## S4-004 — Conflict Resolution and Deduplication

| Acceptance criterion                          | Implementation evidence                                                                                                             | Test evidence                                                   | Status |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------ |
| AC1 approved conflict/dedupe fixtures pass    | `resolveRecommendationConflicts` applies mutual exclusion, supersession and dedupe in locked order                                  | duplicate, canonical override, priority, tie and chain fixtures | PASS   |
| AC2 aggregate evidence is preserved           | canonical candidate stores the stable union of every deduplicated source candidate and trace; immutable trace links preserve origin | exact candidate/trace union assertions                          | PASS   |
| AC3 suppressed items remain auditable         | immutable candidate rows retain reason and winner; workspace/public projections expose canonical items and aggregate counts only    | workspace/public/audit schema-leakage tests                     | PASS   |
| AC4 dependency suppression blocks publication | catalogue promotion, pure resolver and atomic publisher reject a winner that depends on the candidate it would suppress             | dependency collision and migration-security tests               | PASS   |
| AC5 input order does not alter resolution     | candidates and evidence are canonically sorted; stable priority/order/ID comparators                                                | forward versus reversed input equality                          | PASS   |

## S4-004 quality gates

| Gate                                | Evidence                                                                                | Status                                                                  |
| ----------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Deterministic domain/unit           | `tests/recommendation-resolution.test.ts`                                               | PASS                                                                    |
| Catalogue promotion safety          | mutual conflict, priority, canonical, supersession and dependency graph validation      | PASS                                                                    |
| Integration/idempotency/failure     | immutable service replay, cross-scope rejection and non-blocking worker sequencing      | PASS                                                                    |
| Tenant isolation/traceability       | service scope checks and database relationship/dependency/trace contract                | PASS — including live Lovable verification                              |
| Permission/redaction                | public/workspace/audit projections and deny-by-default migration contract               | PASS — including live privilege inspection                              |
| Accessibility/copy                  | textual state/count contracts; no colour-only or interactive UI introduced              | PASS                                                                    |
| Performance                         | 1,000 governed candidates resolve inside the one-second test guard                      | PASS                                                                    |
| Sprint 03 and S4-001–003 regression | complete DIQ-203B, catalogue, evaluation and confidence suites                          | PASS                                                                    |
| Type checking                       | `tsc --noEmit`                                                                          | PASS                                                                    |
| Changed-file lint/format            | ESLint and Prettier over every S4-004 application, route, generated-route and test file | PASS                                                                    |
| Full-repository lint                | inherited repository baseline                                                           | RECORDED LIMITATION — 5,370 errors and 15 warnings outside S4-004 scope |
| Full regression                     | 33 files / 367 tests                                                                    | PASS                                                                    |
| Production build                    | Vite/Nitro production build                                                             | PASS                                                                    |
| Lovable Cloud migration execution   | `20260803040000` followed by `20260803041000`; schema, ACL and idempotency verification | PASS — live smoke unavailable because no eligible analysis exists       |
| Security-advisor classification     | five findings classified by severity, rule and object without broad automatic fixes     | PASS — five warn-level findings accepted with evidence                  |

## S4-005 — Impact, Effort and Priority Model

| Acceptance criterion                               | Implementation evidence                                                                                                            | Test evidence                                                   | Status |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------ |
| AC1 DIQ-203 rank fixtures pass                     | shared `calculateRecommendationRankScore` primitive serves Sprint 03 and S4-005; publisher reads the pinned configuration snapshot | complete DIQ-203B suite and source-rank integrity failure test  | PASS   |
| AC2 label boundaries are exact                     | `recommendationPriorityLabel` implements `>=85`, `>=70`, `>=50`, then low                                                          | every boundary and immediately-below fixture                    | PASS   |
| AC3 ties are deterministic                         | unrounded score, impact, urgency, effort-ease, catalogue-order and ID comparator                                                   | exact tie and six-decimal rounding-collision tests              | PASS   |
| AC4 explanation lists governing components         | immutable item rationale covers impact, urgency, confidence, effort and dependency readiness; numeric detail is audit-only         | exact component coverage and workspace/audit redaction tests    | PASS   |
| AC5 customer override preserves baseline and audit | append-only expected-version/idempotent preference records alter display rank only; immutable generated rank remains intact        | preference permutation, baseline preservation and service tests | PASS   |

## S4-005 quality gates

| Gate                                | Evidence                                                                                | Status                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Deterministic domain/unit           | `tests/recommendation-priority.test.ts`                                                 | PASS                                                        |
| Integration/idempotency/failure     | immutable replay, append-only preference, worker sequencing and safe failure tests      | PASS                                                        |
| Tenant isolation/traceability       | service scope rejection plus database run/result/gate/resolution/catalogue/trace checks | PASS — live migration verification pending                  |
| Permission/redaction                | public/workspace/audit schema-diff tests and deny-by-default migration contract         | PASS — live privilege inspection pending                    |
| Accessibility/copy                  | textual five-component rationale and explicit non-estimate effort copy; no new UI       | PASS                                                        |
| Performance                         | 250 governed candidates prioritised inside the two-second portfolio budget              | PASS                                                        |
| Sprint 03 and S4-001–004 regression | complete DIQ-203B, catalogue, evaluation, confidence and resolution suites              | PASS                                                        |
| Type checking                       | `tsc --noEmit`                                                                          | PASS                                                        |
| Changed-file lint/format            | ESLint and Prettier over every S4-005 application, route, generated-route and test file | PASS                                                        |
| Full-repository lint                | inherited repository baseline                                                           | RECORDED LIMITATION — 5,654 errors and 15 warnings outside S4-005 scope |
| Full regression                     | 34 files / 388 tests                                                                    | PASS                                                        |
| Production build                    | Vite/Nitro production build                                                             | PASS                                                        |
| Lovable Cloud migration execution   | `20260803050000` followed by `20260803051000`; schema, ACL and idempotency verification | PENDING DEPLOYMENT                                          |

## Quality gates

Actual command results are recorded in the story implementation reports. S4-001 Product Governance activation and S4-003 deployment are complete; the first genuine eligible Delivery DNA result remains the live end-to-end prerequisite.
