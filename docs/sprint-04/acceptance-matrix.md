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

| Gate                                | Evidence                                                                                | Status                                                                  |
| ----------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Deterministic domain/unit           | `tests/recommendation-priority.test.ts`                                                 | PASS                                                                    |
| Integration/idempotency/failure     | immutable replay, append-only preference, worker sequencing and safe failure tests      | PASS                                                                    |
| Tenant isolation/traceability       | service scope rejection plus database run/result/gate/resolution/catalogue/trace checks | PASS — including live Lovable verification                              |
| Permission/redaction                | public/workspace/audit schema-diff tests and deny-by-default migration contract         | PASS — including live privilege inspection                              |
| Accessibility/copy                  | textual five-component rationale and explicit non-estimate effort copy; no new UI       | PASS                                                                    |
| Performance                         | 250 governed candidates prioritised inside the two-second portfolio budget              | PASS                                                                    |
| Sprint 03 and S4-001–004 regression | complete DIQ-203B, catalogue, evaluation, confidence and resolution suites              | PASS                                                                    |
| Type checking                       | `tsc --noEmit`                                                                          | PASS                                                                    |
| Changed-file lint/format            | ESLint and Prettier over every S4-005 application, route, generated-route and test file | PASS                                                                    |
| Full-repository lint                | inherited repository baseline                                                           | RECORDED LIMITATION — 5,654 errors and 15 warnings outside S4-005 scope |
| Full regression                     | 34 files / 388 tests                                                                    | PASS                                                                    |
| Production build                    | Vite/Nitro production build                                                             | PASS                                                                    |
| Lovable Cloud migration execution   | `20260803050000` followed by `20260803051000`; schema, ACL and idempotency verification | PASS — live smoke unavailable because no eligible analysis exists       |

## S4-006 — Dependency and Sequencing Engine

| Acceptance criterion                            | Implementation evidence                                                                                                           | Test evidence                                                                 | Status |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------ |
| AC1 locked roadmap fixtures pass                | S4-006 delegates ordering/horizon assignment to the unchanged shared DIQ-203 roadmap primitive and pinned 3/3/4 capacity snapshot | complete DIQ-203B suite plus exact S4-006 dependency/capacity projection      | PASS   |
| AC2 required/recommended semantics are enforced | typed immutable edge graph; required unavailable/blocked propagates `blocked_dependency`; recommended produces a safe caveat      | missing, transitive block, recommended warning, superseded and capacity tests | PASS   |
| AC3 cycle path is returned safely               | bounded deterministic topological check returns exact `ROADMAP_DEPENDENCY_CYCLE`; worker emits only approved safe detail          | exact two-node cycle/path and non-rollback executor tests                     | PASS   |
| AC4 override is an audited overlay              | append-only actor/reason/risk/version/idempotency record; immutable generated sequence and server-calculated dependency risk      | baseline preservation, invalid permutation, required fields and service tests | PASS   |
| AC5 graph queries meet the performance target   | deterministic traversal bounded to 250 recommendations and 1,000 edges; publisher repeats hard bounds                             | 250-node / 986-edge fixture below one second; over-bound rejection            | PASS   |

## S4-006 quality gates

| Gate                                | Evidence                                                                                     | Status                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Deterministic domain/unit           | `tests/recommendation-sequencing.test.ts`                                                    | PASS                                                                    |
| Integration/idempotency/failure     | immutable replay, append-only override, worker sequencing and cycle-safe failure tests       | PASS                                                                    |
| Tenant isolation/traceability       | service scope rejection plus database run/resolution/priority/catalogue/mapping checks       | PASS — live schema and isolation controls verified                      |
| Permission/redaction                | public/workspace/audit schema-diff tests and deny-by-default migration contract              | PASS — live deny-by-default privileges verified                         |
| Accessibility/copy                  | textual dependency state, reason, block and caveat contracts; no colour-only/new UI          | PASS                                                                    |
| Performance                         | 250 recommendations / 986 edges inside one-second traversal and two-second portfolio targets | PASS                                                                    |
| Sprint 03 and S4-001–005 regression | complete DIQ-203B, catalogue, evaluation, confidence, resolution and priority suites         | PASS                                                                    |
| Type checking                       | `tsc --noEmit`                                                                               | PASS                                                                    |
| Changed-file lint/format            | ESLint and Prettier over every S4-006 application, route, generated-route and test file      | PASS                                                                    |
| Full-repository lint                | inherited repository baseline                                                                | RECORDED LIMITATION — 5,965 errors and 15 warnings outside S4-006 scope |
| Full regression                     | 35 files / 408 tests                                                                         | PASS                                                                    |
| Production build                    | Vite/Nitro production build                                                                  | PASS                                                                    |
| Lovable Cloud migration execution   | `20260803060000` followed by `20260803061000`; schema, ACL and idempotency verification      | PASS — live smoke unavailable because no eligible analysis exists       |

## S4-007 — Recommendation Portfolio Generation

| Acceptance criterion                                 | Implementation evidence                                                                                                                      | Test evidence                                                                                    | Status |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------ |
| AC1 every governed recommendation is classified once | deterministic five-class precedence; one primary class and ordered secondary tags; exact input-set reconciliation                            | every class, precedence, secondary-tag, duplicate-ID and full-membership tests                   | PASS   |
| AC2 locked class rules and precedence are exact      | immediate attention uses locked critical/high plus DIQ-203-derived urgency 90/100; foundation, quick-win, strategic and watch rules are pure | boundary, multi-class, dependency, effort, impact and horizon fixtures                           | PASS   |
| AC3 portfolio is stable, immutable and versioned     | stable class/sequence/rank/catalogue/ID order; policy/projector versions; semantic input/output hashes; one immutable result per sequence    | reversed-input stability, idempotent publication, reconciliation failures and migration contract | PASS   |
| AC4 customer output is safe and explainable          | accessible five-group workspace projection with why, confidence, dependency, outcome and success measures; separate audit and public shapes  | workspace/public/audit schema-diff, trace coverage, redaction and ETag tests                     | PASS   |
| AC5 API meets bounded performance and cache contract | 250-item limit, tenant-scoped run and portfolio-ID endpoints, strong ETag and conditional `304` support                                      | 250-item performance, 251 rejection, cross-tenant, ID lookup and ETag matching tests             | PASS   |

## S4-007 quality gates

| Gate                                | Evidence                                                                                                    | Status                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Deterministic domain/unit           | `tests/recommendation-portfolio.test.ts`                                                                    | PASS                                                                    |
| Integration/idempotency/failure     | immutable replay, cross-source reconciliation, worker ordering and non-rollback failure tests               | PASS                                                                    |
| Tenant isolation/traceability       | service scope rejection, tenant-scoped ID lookup and database source-trace/run/catalogue checks             | PASS — live schema and publisher verification complete                  |
| Permission/redaction                | public/workspace/audit schema-diff tests and deny-by-default migration contract                             | PASS — live ACL and zero-row verification complete                      |
| Accessibility/copy                  | semantic group labels, explicit empty/partial states and textual why/confidence/dependency content          | PASS                                                                    |
| Performance                         | 250 governed recommendations classified inside the two-second portfolio target                              | PASS                                                                    |
| Sprint 03 and S4-001–006 regression | complete DIQ-203B, catalogue, evaluation, confidence, resolution, priority and sequencing suites            | PASS                                                                    |
| Type checking                       | `tsc --noEmit`                                                                                              | PASS                                                                    |
| Changed-file lint/format            | ESLint and Prettier over every S4-007 application, route, generated-route and test file                     | PASS                                                                    |
| Full-repository lint                | inherited repository baseline                                                                               | RECORDED LIMITATION — 6,336 errors and 15 warnings outside S4-007 scope |
| Full regression                     | 36 files / 424 tests                                                                                        | PASS                                                                    |
| Production build                    | Vite/Nitro production build                                                                                 | PASS                                                                    |
| Lovable Cloud migration execution   | Schema plus digest-verified `20260803072000` publisher repair; live function, ACL and zero-row verification | PASS — live smoke unavailable because no eligible analysis exists       |

## S4-008 — Customer Decision Workflow

| Acceptance criterion                          | Implementation evidence                                                                                                                   | Test evidence                                                                  | Status |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------ |
| AC1 locked transition matrix is exact         | pure state machine plus matching database enum/check/routine conditions; system-only irreversible supersession                            | every legal and illegal state/command pair; superseded terminal tests          | PASS   |
| AC2 required command fields are validated     | accept acknowledgement, defer review date, reject locked reason and extraneous-field rejection in domain and database                     | missing acknowledgement/date/reason and exact six-category tests               | PASS   |
| AC3 duplicate commands are idempotent         | tenant-scoped unique key, semantic payload hash, pre-transition replay and advisory-locked database replay                                | exact replay without second write; conflicting key/payload failure             | PASS   |
| AC4 stale updates fail safely                 | current decision version checked under the item advisory lock and exposed as HTTP `409`                                                   | service version-conflict mapping and database migration contract               | PASS   |
| AC5 permissions and tenant scope are enforced | authenticated read/write contexts, `assessment:submit`, active membership/workspace check, scoped item/portfolio queries, deny-by-default | cross-tenant `404`, write-permission source check and migration-security tests | PASS   |
| AC6 generated baseline remains immutable      | separate append-only event/current overlay; existing S4-007 immutable tables untouched; generated advice and customer choice separated    | projection redaction/audit export, baseline-write absence and dashboard tests  | PASS   |

## S4-008 quality gates

| Gate                               | Evidence                                                                                              | Status                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Domain/transition/field validation | `tests/recommendation-decisions.test.ts`                                                              | PASS                                          |
| Idempotency/concurrency/failure    | semantic replay, key conflict, stale version and immutable projection contracts                       | PASS                                          |
| Tenant isolation/permissions       | scoped repositories, authenticated permission boundary, DB membership and deny-by-default ACL         | PASS — live migration verification pending    |
| Audit/disclosure/accessibility     | workspace redaction, audit history, generated/customer labels and explicit confirmation UX            | PASS                                          |
| Performance                        | 10,000 pure transitions inside the 500 ms guard                                                       | PASS                                          |
| Full regression/type/lint/build    | 37 files / 446 tests; all 53 DIQ-203B fixtures; typecheck; changed-file lint/format; production build | PASS — full lint limitation remains inherited |
| Lovable Cloud migration execution  | `20260803080000` then `20260803081000`                                                                | PENDING DEPLOYMENT                            |

## S4-009 — Action Ownership and Improvement Plan

| Acceptance criterion                      | Implementation evidence                                                                                                                        | Test evidence                                                                                     | Status |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------ |
| AC1 create/reuse one action idempotently  | accepted-decision gate; unique plan/item key; advisory lock; semantic request replay; duplicate-notification suppression                       | accepted/rejected create, existing reuse, exact replay and conflicting-key tests                  | PASS   |
| AC2 action state rules are enforced       | pure five-state transition model plus matching database transition, terminal-time, owner/date and completion-evidence constraints              | owner removal, missing date/evidence, legal start/block/resume/complete/cancel and terminal tests | PASS   |
| AC3 ownership and permissions are valid   | `workspace:manage` write boundary; active actor/owner/contributor organisation and workspace checks; non-blocking assignment notifications     | permission-source, owner/contributor validation and inactive-assignee failure tests               | PASS   |
| AC4 required dependencies block start     | deterministic required-dependency evaluation in service and governed routine; explicit acknowledged override with reason and recorded blockers | incomplete dependency denial, approved override and extraneous-override tests                     | PASS   |
| AC5 full history is retained              | append-only event stream; governed one-version projection; source decision/action cancellation never deletes history                           | immutable migration contract, audit/workspace projection and terminal cancellation tests          | PASS   |
| AC6 cross-tenant assignment is impossible | tenant-scoped reads and keys; DB actor and assignee membership/workspace checks; RLS zero policies and service-only command                    | missing/cross-tenant source `404`, inactive assignment and deny-by-default migration tests        | PASS   |

## S4-009 quality gates

| Gate                            | Evidence                                                                                              | Status                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Domain/state/field validation   | `tests/recommendation-actions.test.ts`                                                                | PASS                                          |
| Idempotency/concurrency/failure | pre-state replay, one action per item/plan, semantic-key conflict and optimistic version conflict     | PASS                                          |
| Tenant isolation/permissions    | scoped repositories, authenticated permissions, DB active-member assignment and deny-by-default ACL   | PASS — live migration verification pending    |
| Audit/disclosure/accessibility  | immutable blocker/evidence history; workspace redaction; labelled, keyboard-operable confirmations    | PASS                                          |
| Performance                     | 10,000 pure transitions inside the 600 ms guard                                                       | PASS                                          |
| Full regression/type/lint/build | 38 files / 464 tests; all 53 DIQ-203B fixtures; typecheck; changed-file lint/format; production build | PASS — full lint limitation remains inherited |
| Lovable Cloud migration         | `20260803090000` then `20260803091000`                                                                | PENDING DEPLOYMENT                            |

## Quality gates

## S4-010 — Outcomes and Success Measures

| Acceptance criterion                               | Implementation evidence                                                                                                                                             | Test evidence                                                                                                                                         | Status                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| AC1 every action retains catalogue outcome/measure | immutable `recommendation_action_outcomes` snapshot pins action, portfolio item, definition, recommendation and catalogue versions/digest                           | action/outcome creation, immutable source and association-copy fixtures                                                                               | PASS                                       |
| AC2 authorised typed measures                      | versioned direction, unit, scale, baseline, target, tolerance, target deadline/time zone, cadence, source and owner; active tenant membership checked in API and DB | direction/boundary, configuration, retired, unauthorised actor and cross-tenant fixtures                                                              | PASS — live migration verification pending |
| AC3 deterministic status                           | canonical-decimal evaluator implements inclusive increase/decrease/maintain, exact binary, effective-date, late restoration and regression                          | `out_inc_*`, `out_dec_*`, `out_maintain_*`, `out_binary_*`, `out_*deadline*`, `out_late_*`, `out_post_met_regression`, `out_decimal_no_display_round` | PASS                                       |
| AC4 immutable observations and corrections         | append-only observations and status events; same-scope, acyclic, single-branch superseding corrections; deterministic tie order                                     | `out_supersede_*`, `out_equal_effective_order`, immutability and correction tests                                                                     | PASS — live trigger verification pending   |
| AC5 safe customer/report output                    | workspace and executive projections expose versioned status, exact locked copy, deadline history and association-only notice; raw/internal rules excluded           | `out_association_copy`, schema/redaction, executive-report and accessibility tests                                                                    | PASS                                       |
| AC6 tenant scope, idempotency and trace            | tenant-scoped services/RPCs, semantic request hash, advisory lock, optimistic versions, observation-count concurrency guard, immutable trace IDs                    | `out_idempotent_replay`, `out_conflicting_replay`, `out_cross_tenant`, `out_unauthorised_actor`, stale/concurrency and RLS/ACL tests                  | PASS — live migration verification pending |

## S4-010 quality gates

| Gate                         | Evidence                                                                                                        | Status                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Mandatory golden fixtures    | all 37 PDR-004-001 Section 10 IDs executed by `tests/recommendation-outcomes.test.ts`                           | PASS                                           |
| API/failure/concurrency      | input validation, safe errors, replay/conflict, stale version, concurrent observation and correction paths      | PASS                                           |
| Tenant/security/privacy      | authenticated permissions, exact scope validation, RLS zero-policy and least-privilege migration assertions     | PASS — live ACL verification pending           |
| Trace/audit/report/analytics | append-only status facts; S4-014 governed export; S4-012 executive status; consented S4-013 categorical capture | PASS                                           |
| Accessibility/responsive     | semantic fieldsets/labels, status and alert regions, keyboard-native controls, 44px controls, narrow wrapping   | PASS                                           |
| Performance                  | 10,000 deterministic evaluations within the test guard                                                          | PASS                                           |
| Regression/type/lint/build   | 43 files / 564 tests; 53 DIQ-203B; typecheck; changed-file lint/format; production build                        | PASS — inherited full-lint limitation retained |
| Lovable Cloud migration      | `20260803150000`, `20260803151000`, `20260803152000`                                                            | PENDING DEPLOYMENT                             |

## S4-011 — Knowledge Pack and TeamMate Hand-offs

| Acceptance criterion                      | Implementation evidence                                                                        | Test evidence                                                          | Status |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------ |
| AC1 locked mapping fixtures pass          | shared DIQ-203A Pack/TeamMate mapping functions; no presentation-layer mapping                 | executable all-recommendation catalogue comparison plus DIQ-203B suite | PASS   |
| AC2 eligibility never implies entitlement | separate operational state and CTA resolver fields                                             | entitled/unentitled Pack and TeamMate tests                            | PASS   |
| AC3 stale availability fails safely       | exact version pinned in immutable token contract and rechecked by app/database on consume      | expiry, inactive/missing/retired version and entitlement-change tests  | PASS   |
| AC4 activation never occurs automatically | no activation routine/insert; downstream response explicitly returns `activated: false`        | service side-effect and migration-source assertions                    | PASS   |
| AC5 hand-off and consent traced           | immutable source action/item/tenant/version/consent record plus append-only consume event      | explicit-consent, replay, projection and migration tests               | PASS   |
| AC6 public disclosure remains locked      | authenticated workspace-only endpoints; customer-safe projection; public-result code unchanged | projection schema/token leakage and route auth tests                   | PASS   |

## S4-011 quality gates

| Gate                            | Evidence                                                                                              | Status                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Domain/mapping/state            | `tests/recommendation-product-handoffs.test.ts`                                                       | PASS                                          |
| Idempotency/expiry/failure      | stable exact replay, bounded expiry and retirement/revocation cases                                   | PASS                                          |
| Tenant isolation/permissions    | scoped repositories, authenticated request context, DB active-member checks and deny-by-default ACL   | PASS — live migration verification pending    |
| Security/privacy/audit          | HMAC token, stored hash only, no URL secret, explicit immutable consent and append-only consume event | PASS                                          |
| Accessibility/copy              | labelled status/error/confirmation, 44px controls and explicit no-activation copy                     | PASS                                          |
| Performance                     | 5,000 governed opportunity resolutions inside two seconds                                             | PASS                                          |
| Full regression/type/lint/build | 39 files / 481 tests; all 53 DIQ-203B fixtures; typecheck; changed-file lint/format; production build | PASS — full lint limitation remains inherited |
| Lovable Cloud migration         | `20260803110000` then `20260803111000`                                                                | PENDING DEPLOYMENT                            |

Actual command results are recorded in the story implementation reports. S4-001 Product Governance activation and S4-003–006 deployment are complete; the first genuine eligible Delivery DNA result remains the live end-to-end prerequisite.

## S4-012 — Recommendation Experience and Executive Reporting

| Acceptance criterion                            | Implementation evidence                                                                                                            | Test evidence                                                            | Status |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------ |
| AC1 all roles see correct controls              | current permission set is rechecked server-side and projected independently for decide/action/audit/membership/governance controls | viewer, decision-maker, improvement-lead, auditor and admin matrix       | PASS   |
| AC2 states/loading/errors are explicit          | live-region loading, safe error/retry, mutation errors, pending and empty states                                                   | source contract plus existing decision/action failure regressions        | PASS   |
| AC3 values reconcile to canonical records       | existing canonical projections composed once; all overlays validated against exact tenant, portfolio and item manifest             | baseline/decision/action/handoff reconciliation and escaped-scope denial | PASS   |
| AC4 WCAG 2.2 AA core journey                    | semantic hierarchy, native disclosure, labels, live regions, text status and 44px controls                                         | keyboard/screen-reader source contract and existing interaction tests    | PASS   |
| AC5 responsive at 320px and wider               | single-column base, wrapping, break-safe content and `min-w-0`; enhancements begin at `sm`                                         | narrow-layout source contract                                            | PASS   |
| AC6 report traceable with snapshot time/version | generated/customer labels, semantic snapshot time/hash, baseline time/policy and per-item source versions                          | exact snapshot, source version, trace coverage and redaction assertions  | PASS   |

## S4-012 quality gates

| Gate                            | Evidence                                                                                                | Status                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Server projection/N+1           | one portfolio read plus one parallel read each for decisions, actions and products, independent of size | PASS                                          |
| Tenant isolation/permissions    | request-context permission recheck and exact overlay scope validation                                   | PASS                                          |
| Privacy/disclosure/traceability | customer projection excludes raw evidence/internal lineage while retaining safe evidence and versions   | PASS                                          |
| Accessibility/responsive/print  | semantic 320px-safe, keyboard-operable, print/PDF-ready customer journey                                | PASS                                          |
| Performance                     | 250-item report under 2s and warm projection under 700ms                                                | PASS                                          |
| Full regression/type/lint/build | 40 files / 491 tests; 53 DIQ-203B; typecheck; changed lint/format; build                                | PASS — full lint limitation remains inherited |
| Database migration              | read-model/application-only story; no schema or data change                                             | NOT APPLICABLE                                |
| Live report smoke               | requires first genuine eligible production Delivery DNA portfolio                                       | PENDING DEPLOYMENT                            |

## S4-013 — Recommendation Analytics and Learning Signals

| Acceptance criterion                         | Implementation evidence                                                                                                      | Test evidence                                                               | Status |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------ |
| AC1 exact event allow-list is enforced       | shared ten-event schema, exact object contracts and matching PostgreSQL enum/checks                                          | every event and property contract executed; unknown keys rejected           | PASS   |
| AC2 prohibited content cannot be captured    | exact categorical property keys/values; bounded token fields; no arbitrary text or evidence payload                          | raw answer, note, evidence, free text, secret and unknown-property attempts | PASS   |
| AC3 duplicate events deduplicate safely      | immutable event ID plus semantic request hash; conflicting key reuse fails                                                   | exact replay and hash/idempotency migration contracts                       | PASS   |
| AC4 analytics failure never breaks workflow  | server-authoritative decision/action/handoff capture uses safe adapter that catches failure without mutating source workflow | vendor-outage test and source integrations                                  | PASS   |
| AC5 ten-tenant cohort threshold is enforced  | SQL `HAVING` threshold plus defensive service assertion; aggregate excludes all tenant/actor/object identifiers              | 9-tenant denial and 10-tenant acceptance                                    | PASS   |
| AC6 rules change only through governed paths | no analytics-to-catalogue/rule write path; customer copy states that rules never change automatically                        | source inspection guards catalogue transition/rule writes                   | PASS   |

## S4-013 quality gates

| Gate                                 | Evidence                                                                                                    | Status                          |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Schema/privacy/consent               | `tests/recommendation-analytics.test.ts`; exact allow-list, prohibited fields, grant/withdraw and pseudonym | PASS                            |
| Idempotency/failure/tenant scope     | replay, conflicting source, cross-tenant denial and vendor outage                                           | PASS                            |
| Retention/monitoring/data dictionary | governed platform retention handler; runbook monitoring; `S4-013-data-dictionary.md`                        | PASS                            |
| Accessibility/copy                   | labelled consent section, 44px controls, live status/error copy and categorical usefulness controls         | PASS                            |
| Performance                          | 10,000 schema validations inside one second                                                                 | PASS                            |
| Full regression/type/lint/build      | 41 files / 511 tests; all 53 DIQ-203B; typecheck; changed lint/format; production build                     | PASS — inherited full-lint debt |
| Lovable Cloud migration              | managed S4-013 migrations plus helper-ACL correction; ACL/schema/type verification                          | PASS                            |
| Live aggregate smoke                 | requires at least 10 genuine consented tenants; no customer data will be manufactured                       | RECORDED LIMITATION             |

## S4-014 — Governance, Audit and Operational Readiness

| Acceptance criterion                                   | Implementation evidence                                                                                                                                                                                                      | Test evidence                                                                                   | Status                                             |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| AC1 separation of duties enforced                      | existing S4-001 atomic author/approver lifecycle; isolated Product Governance feature-control permission                                                                                                                     | catalogue self-approval denial, role-isolation and feature-authorisation regressions            | PASS                                               |
| AC2 complete redacted audit export                     | versioned allow-list across catalogue, evaluation, confidence, resolution, priority, sequence, portfolio, decisions, actions, outcomes/measure versions/observations/status and hand-offs; actor/evidence/raw-rule redaction | exact projection, outcome integrity, tenant-scope, redaction, 10,000-event and over-limit tests | PASS — authorised live export remains release gate |
| AC3 integrity failure blocks safely                    | pre-queue and atomic publication scope/count/trace/overlay checks; terminal non-retryable integrity result                                                                                                                   | orphan lineage, count mismatch, cross-tenant, partial-job and no-payload tests                  | PASS                                               |
| AC4 rollback/recovery rehearsal passes                 | governed activation/configuration diff, feature rollback, stale-lease replay and immutable recovery contract; PDR-004-001 Tier 1 objectives filed                                                                            | catalogue rollback, feature replay, partial failure, retry and expiry tests                     | PARTIAL — measured isolated restore pending        |
| AC5 monitoring covers Section 20                       | health metrics and exact ten-code alert manifest; safe categorical operational events                                                                                                                                        | exact alert coverage and prohibited-metadata migration assertions                               | PASS                                               |
| AC6 security/performance/resilience/release gates pass | RLS zero-policy, client privilege revocation, scoped permission, rate/batch/attempt/lease/expiry bounds and one-minute task                                                                                                  | security source, 10,000-event performance, 10,001 rejection, idempotency and production build   | PARTIAL — Sprint release blockers remain           |

## S4-014 quality gates

| Gate                            | Evidence                                                                                                                              | Status                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Governance and configuration    | S4-001 separation regression; configuration diff; append-only feature events; absent flag resolves disabled                           | PASS                                             |
| Export and redaction            | `tests/recommendation-governance.test.ts`; versioned allow-list and access logging                                                    | PASS                                             |
| Idempotency/concurrency/failure | advisory lock, exact replay, SKIP LOCKED claims, stale lease, three attempts and per-job containment                                  | PASS                                             |
| Tenant/security/privacy         | authenticated scoped request, database membership/workspace checks, RLS zero policies, service-only functions and prohibited metadata | PASS — live ACL/schema verification complete     |
| Performance                     | exactly 10,000 events projected inside the 60-second asynchronous target; over-bound fails closed                                     | PASS                                             |
| Recovery                        | implementation rehearsal and rollback runbook reconciled to Tier 1 RPO <=15 minutes/RTO <=4 hours                                     | PARTIAL — measured isolated live restore pending |
| Outcome export                  | integrity-checked outcome snapshot, measure versions, observations and append-only status events                                      | PASS — authorised live export pending            |
| Full regression/type/lint/build | 43 files / 564 tests; all 53 DIQ-203B and 37 PDR-004-001 fixtures; typecheck; changed lint/format; production build                   | PASS — inherited full-lint debt                  |
| Lovable Cloud migration/publish | managed core, hardening and Cloud-helper correction; feature remains disabled; application published                                  | PASS                                             |

## Sprint 04 release acceptance

| Requirement                                                    | Status                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------ |
| S4-001–S4-014 feasible implementation                          | PASS                                                         |
| S4-010 complete locked behaviour and golden fixtures           | PASS — local; live migration verification pending            |
| DIQ-203B unchanged golden regression                           | PASS — all 53 fixtures                                       |
| Generated baselines immutable and overlays audited             | PASS                                                         |
| Tenant, access, idempotency, disclosure and export controls    | PASS — live S4-014 verification complete                     |
| Accessibility, responsive, privacy, performance and resilience | PARTIAL — measured restore and full customer journey pending |
| Approved platform RPO/RTO                                      | PASS — PDR-004-001 Tier 1 RPO <=15m / RTO <=4h               |
| Genuine eligible Delivery DNA end-to-end smoke                 | PENDING genuine customer evidence                            |
| Product Owner and Matt Prust release acceptance                | PENDING                                                      |
