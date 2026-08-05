# Sprint 05 Pre-lock Acceptance Matrix

## Status legend

- **READY AFTER LOCK** — reusable foundations are verified; implementation awaits locked authority.
- **DEPENDENCY PENDING** — an external Product/final-approval dependency is unresolved.
- **NOT STARTED** — customer-behaviour implementation is intentionally absent.

## Story readiness

| Story                                            | Primary reusable implementation                                                   | Principal missing implementation                                                                                                            | Dependencies                        | Complexity  | Status             |
| ------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ----------- | ------------------ |
| S5-001 Manifest and Schema                       | Existing Zod schema, validator, discovery and version helpers                     | Locked strict manifest contract, semantic validation, canonical serialization/digests, immutable snapshot and KP-001A executable validation | Locked DIQ-300/KP-001A/B/PB-005     | Large       | DEPENDENCY PENDING |
| S5-002 Pack Catalogue and Lifecycle              | Registry/manager patterns; S4-001 two-person catalogue governance                 | Durable immutable Pack lifecycle, approval, activation, rollback, safe catalogue projection and concurrency control                         | S5-001                              | Extra Large | NOT STARTED        |
| S5-003 Eligibility, Availability and Entitlement | Sprint 04 product state/handoff services; tenancy and permission context          | One Pack access evaluator, entitlement-version integration, safe copy/cache and recheck contract                                            | S5-001–002, accepted S4 contracts   | Large       | NOT STARTED        |
| S5-004 Consent and Pack Start                    | Generic assessment start; identity/workspace checks; semantic hashing patterns    | Versioned consent, tenant-pinned idempotent start, immutable snapshot and provenance                                                        | S5-002–003, locked consent/copy     | Large       | NOT STARTED        |
| S5-005 Specialist Assessment Runtime             | Generic runtime definition, validation, navigation, save/resume and completion    | Response revisions/status/reasons, concurrency, cohort attribution, transactional completion and durable hand-off                           | S5-004, locked completion rules     | Extra Large | NOT STARTED        |
| S5-006 Pack Scoring and Confidence               | Sprint 03 deterministic scoring/confidence and immutable publication              | Generic Pack canonical adapter, locked configuration strategy and exact KP-001B execution                                                   | S5-001, S5-005                      | Extra Large | NOT STARTED        |
| S5-007 Findings, Patterns and Intelligence       | Shared findings/patterns/narrative/trace primitives                               | Pack rule adapter, conflict evidence, safe explanation and invalid-rule publication block                                                   | S5-006                              | Extra Large | NOT STARTED        |
| S5-008 Recommendations and Action Plan           | Complete Sprint 04 recommendation-to-action chain                                 | Pack result source adapter, exact KP-001 catalogue integration and action-plan projection                                                   | S5-007, accepted S4 contracts       | Extra Large | NOT STARTED        |
| S5-009 Narrative and Results                     | Existing dashboard/projection patterns and deterministic narrative support        | Pack-specific server projection, approved hierarchy/copy, result states and accessible responsive journey                                   | S5-006–008                          | Large       | NOT STARTED        |
| S5-010 Traceability and Audit                    | Sprint 03 trace graph/explanations and S4 audit export/governance                 | Pack node/edge types, 100% visible-output coverage and Pack-specific redaction/export                                                       | S5-005–009                          | Extra Large | NOT STARTED        |
| S5-011 Pack-to-Pack Hand-offs                    | S4-011 consented, expiring, tenant-scoped idempotent hand-offs                    | Pack access/start consumption, exact KP-001 mappings and inactive destination states                                                        | S5-003, S5-008–010                  | Large       | NOT STARTED        |
| S5-012 TeamMate Hand-offs                        | S4-011 TeamMate review boundary and `teammate.activate` permission                | Exact KP-001 mappings, accepted-action prerequisite and explicit no-runtime proof                                                           | S5-008–010, DIQ-400 boundary        | Medium      | NOT STARTED        |
| S5-013 KP-001 Implementation                     | Generic Pack/runtime/engine extension points                                      | Locked KP-001/A/B ingestion, full golden suite and production-like single/cohort journeys                                                   | S5-001–012, final Product authority | Extra Large | DEPENDENCY PENDING |
| S5-014 Operational Readiness                     | S4 governance, audit export, health, scheduled jobs and release evidence patterns | Pack authoring/promotion CI, reconciliation, alerts, rollback/restore and final acceptance                                                  | S5-001–013, approved RPO/RTO        | Extra Large | NOT STARTED        |

## Global quality gates

| Gate                            | Present baseline evidence                                           | Sprint 05 status                                     |
| ------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| Controlled authority            | DIQ-002 locked; RC1 sources reviewed                                | BLOCKED — Sprint 05 baselines not locked/committed   |
| Locked KP-001B fixtures         | Non-authoritative RC1 fixture set exists outside current repository | BLOCKED — not executable as acceptance authority     |
| Unit/integration baseline       | 4 focused files / 48 reusable-foundation tests pass                 | READY AFTER LOCK                                     |
| Type safety baseline            | `tsc --noEmit` passes                                               | READY AFTER LOCK                                     |
| Tenant isolation                | Strong Sprint 03/Sprint 04 patterns exist                           | NOT STARTED for Pack runtime/catalogue               |
| Authentication/permissions      | Identity/workspace context exists                                   | NOT STARTED for Pack-specific permissions/governance |
| Idempotency/concurrency         | Analysis and Sprint 04 patterns exist                               | NOT STARTED for Pack start/save/completion/promotion |
| Traceability                    | Shared immutable graph exists                                       | NOT STARTED for Pack typed lineage                   |
| Accessibility                   | Existing component patterns exist                                   | NOT STARTED for Pack journeys                        |
| Performance                     | PB-005 RC1 proposes targets but is not authority                    | BLOCKED until lock; no Sprint 05 measurements        |
| Migrations/RLS/grants           | No Sprint 05 migrations authorised                                  | NOT STARTED                                          |
| Production build/e2e/live smoke | No Sprint 05 behaviour implemented                                  | NOT STARTED                                          |

## Authority-to-evidence matrix

| Requirement                     | Evidence required before implementation or release                  | Current state                               |
| ------------------------------- | ------------------------------------------------------------------- | ------------------------------------------- |
| PB-005 implementation authority | v1.0 **LOCKED** at `docs/02-playbooks/PB-005 Sprint 05 Playbook.md` | Missing/current index says controlled draft |
| Framework authority             | DIQ-300 v1.0 **LOCKED** at canonical path                           | v0.1 draft outline                          |
| First Pack authority            | KP-001 v1.0 **LOCKED** plus locked KP-001A/B v1.0.0                 | Missing from current repository             |
| Controlled index                | DIQ-000 registers exact locked versions/statuses/digests            | Registers PB-005 v0.1 controlled draft      |
| Sprint 04 integration           | Product acceptance or exact stable/approved consumed contracts      | Product review in progress                  |
| RPO/RTO                         | Approved target and recovery evidence for S5-014                    | Product decision absent                     |

This matrix records readiness only. No Sprint 05 acceptance criterion is marked passed.
