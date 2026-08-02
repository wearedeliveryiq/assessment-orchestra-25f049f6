# PB-004 — Sprint 04 Playbook – Recommendation Framework

| Control | Value |
|---|---|
| Document ID | PB-004 |
| Version | 1.0 |
| Status | **LOCKED** |
| Owner | Product Owner |
| Product approval | Product Owner, 2 August 2026 |
| Final approval | Matt Prust, 2 August 2026 |
| Classification | Internal — Controlled |
| Sprint | Sprint 04 |

> **Controlled-document notice.** Matt Prust approved this playbook without amendments on 2 August 2026. Version 1.0 is the locked engineering authority for Sprint 04, subordinate to the authority order in Section 1.2. Changes require a versioned amendment, impact assessment, Product Owner review, and final approval. No recommendation rule may override the locked Sprint 03 configuration without a separately approved versioned amendment.

## 1. Document Control

### 1.1 Purpose

Define the product, engineering, data, security, UX, testing, acceptance, and release requirements for the DeliveryIQ Recommendation Framework. Sprint 04 operationalises the recommendation MVP delivered by Sprint 03 into a governed improvement portfolio that customers can understand, adopt, sequence, own, and measure.

### 1.2 Authority and precedence

1. DIQ-002 — Product Architecture v1.0.
2. PB-003 — Sprint 03 Playbook v1.0.
3. DIQ-203, DIQ-203A, and DIQ-203B — locked Sprint 03 configuration and golden baseline.
4. PB-004 after final approval and lock.
5. DIQ-200, DIQ-201, DIQ-202, DIQ-300, and DIQ-400 within their approved status and scope.
6. Accepted architecture decisions and existing implementation.

Locked Sprint 03 scoring, confidence, patterns, recommendation eligibility, ranking, roadmap, Pack, TeamMate, disclosure, and trace rules remain unchanged. Sprint 04 adds governance, customer decisions, action management, outcome measurement, hand-offs, and operational controls around the immutable generated result.

### 1.3 Related documents

| ID | Relationship |
|---|---|
| DIQ-000 | Controlled-document register |
| DIQ-002 | Authoritative product architecture |
| DIQ-200 | Intelligence signals consumed by recommendations |
| DIQ-201 | Recommendation Framework responsibility boundary |
| DIQ-202 | Evidence-to-action lineage |
| DIQ-203/A/B | Locked Sprint 03 product rules and golden fixtures |
| DIQ-300 | Knowledge Pack hand-off boundary |
| DIQ-400 | TeamMate hand-off and activation boundary |

### 1.4 Change history

| Version | Date | Change | Product approval | Final approval |
|---|---|---|---|---|
| 0.1 | 2 August 2026 | Initial scope and proposed catalogue | Draft | — |
| 1.0 | 2 August 2026 | Complete S4-001–S4-014 playbook; RC1 approved without amendments and promoted | Approved | Approved by Matt Prust |

### 1.5 Change control

Customer state semantics, ranking presentation, portfolio classifications, permissions, outcome claims, hand-off behaviour, or audit requirements require a versioned amendment. Editorial corrections may use a patch version. Changes affecting DIQ-203 rules require a new DIQ-203 configuration version and regenerated golden fixtures.

## 2. Executive Summary

Sprint 03 determines what evidence means and generates an immutable recommended course of action. Sprint 04 enables customers to work with that advice safely. It introduces a governed recommendation catalogue, reusable evaluation record, coherent portfolio, customer decision workflow, focused improvement plan, ownership and outcomes, permission-aware Knowledge Pack and TeamMate hand-offs, executive reporting, analytics, and operational governance.

The generated recommendation baseline never changes. Customer decisions and progress are separately versioned overlays. DeliveryIQ remains an intelligence and improvement product rather than becoming a generic task-management system.

## 3. Sprint Goal and Objectives

> Convert explainable Delivery Intelligence into a governed, prioritised, measurable improvement portfolio that customers can review, adopt, sequence, own, and track.

Objectives:

1. Govern recommendation definitions and promotion independently of application releases.
2. Preserve deterministic eligibility, ranking, conflict, and dependency behaviour.
3. Present one coherent portfolio with clear action types and reasons.
4. Capture authorised customer decisions without rewriting intelligence history.
5. Turn accepted recommendations into bounded improvement actions and outcomes.
6. Provide safe Knowledge Pack and TeamMate hand-offs.
7. Deliver accessible experiences, auditability, analytics, and production operations.

## 4. Business Outcomes

- Leaders receive a manageable action portfolio rather than an undifferentiated list.
- Every action states why it matters, what success means, and what must happen first.
- Customers can accept, defer, reject, restore, own, and track advice transparently.
- DeliveryIQ can measure usefulness without automatically changing product rules.
- Knowledge Packs and TeamMates connect through stable, permission-aware contracts.
- Historical intelligence remains reproducible after catalogue or customer-state changes.

## 5. Success Metrics

| Metric | Acceptance threshold |
|---|---|
| Lineage | 100% of portfolio items resolve to immutable Sprint 03 recommendation and evidence paths |
| Determinism | Identical result, catalogue, and policy versions produce identical portfolios |
| Catalogue validity | 100% invalid catalogue versions fail closed before activation |
| Conflict/dependency safety | All approved conflict, dedupe, prerequisite, and cycle fixtures pass |
| Decision audit | 100% decision transitions record actor, time, reason, previous state, and versions |
| Outcome coverage | 100% accepted actionable recommendations have intended outcome and success measure |
| Tenant isolation | 100% cross-tenant API, job, cache, export, and deep-link denial tests pass |
| Explainability | 100% displayed priority and sequencing decisions provide approved rationale |
| Accessibility | Core portfolio and action journeys meet WCAG 2.2 AA |
| Performance | Section 15 targets met in a production-like environment |

Post-release product measures: view-to-decision rate, accept/defer/reject mix, reason distribution, time to first accepted action, completion, evidence of outcome, Pack/TeamMate hand-off, and usefulness rating. Metrics never change rules automatically.

## 6. Scope and Out of Scope

### 6.1 In scope

- S4-001 through S4-014.
- Catalogue lifecycle, validation, promotion, rollback, and snapshots.
- Eligibility evaluation records, confidence gates, conflict resolution, dedupe, priority, and dependencies consistent with DIQ-203.
- Portfolio classifications: `immediate_attention`, `foundation`, `quick_win`, `strategic_initiative`, and `watch`.
- Customer decisions: `undecided`, `accepted`, `deferred`, `rejected`, `restored`, and system `superseded`.
- Focused improvement actions, ownership, target dates, progress, outcomes, and evidence references.
- Knowledge Pack and TeamMate hand-offs, executive reporting, analytics, audit, and operations.

### 6.2 Out of scope

- Changing locked Sprint 03 scoring or recommendation calculations.
- A general project, portfolio, resource, benefits, or work-management platform.
- Autonomous execution of recommendations or TeamMate activation.
- Full Knowledge Pack authoring studio or TeamMate runtime.
- Machine-learned ranking, cross-customer training, opaque personalisation, or benchmarking.
- Billing, procurement, CRM, marketplace, or third-party workflow integrations.

## 7. Dependencies and Entry Criteria

- Sprint 03 implementation accepted with all DIQ-203B fixtures passing.
- Immutable canonical results, traceability, and authorised Workspace projections available.
- Active DIQ-203 recommendation IDs and version snapshots available.
- Identity, tenant, workspace, permissions, audit, background job, migration, and analytics foundations available.
- DIQ-300 and DIQ-400 boundaries honoured even while those documents remain draft outlines.

Sprint 04 may begin with catalogue and schema discovery before Sprint 03 release, but no customer workflow may ship against an unstable Sprint 03 contract.

## 8. Architecture Alignment

```text
Immutable analysis result
  -> immutable recommendation evaluation and portfolio baseline
  -> mutable, audited customer decision overlay
  -> accepted recommendation
  -> focused improvement action
  -> outcome measure and progress evidence
       ├─> Knowledge Pack hand-off
       └─> TeamMate hand-off
```

Mandatory boundaries:

- Generated results and catalogue snapshots are immutable.
- Customer decisions/actions never recalculate the original analysis.
- Eligibility, priority, sequencing, presentation, and customer state are separate services/modules.
- One tenant/workspace scope is carried through every record, query, job, cache key, export, and event.
- Client code presents server decisions and never recreates recommendation rules.
- Human decisions are explicit overlays, not hidden overrides.

## 9. Story Catalogue

| ID | Story | Primary output | Depends on |
|---|---|---|---|
| S4-001 | Recommendation Catalogue and Versioning | Governed immutable definitions | Sprint 03 baseline |
| S4-002 | Eligibility and Trigger Evaluation | Reproducible evaluation record | S4-001 |
| S4-003 | Confidence Gates and Evidence Sufficiency | Safe advice under uncertainty | S4-002 |
| S4-004 | Conflict Resolution and Deduplication | Coherent eligible set | S4-002–003 |
| S4-005 | Impact, Effort and Priority Model | Explainable ordered actions | S4-001–004 |
| S4-006 | Dependency and Sequencing Engine | Valid action order | S4-004–005 |
| S4-007 | Recommendation Portfolio | Customer-ready grouped baseline | S4-005–006 |
| S4-008 | Customer Decision Workflow | Audited accept/defer/reject state | S4-007 |
| S4-009 | Action Ownership and Improvement Plan | Operational accepted actions | S4-008 |
| S4-010 | Outcomes and Success Measures | Measurable intended improvement | S4-001, S4-009 |
| S4-011 | Knowledge Pack and TeamMate Hand-offs | Safe next-step integrations | S4-002–010 |
| S4-012 | Recommendation Experience and Executive Reporting | Accessible decision experience | S4-007–011 |
| S4-013 | Recommendation Analytics and Learning Signals | Privacy-safe effectiveness data | S4-008–012 |
| S4-014 | Governance, Audit and Operational Readiness | Production-controlled framework | S4-001–013 |

## 10. Full Story Specifications

### S4-001 — Recommendation Catalogue and Versioning

**Background.** Sprint 03 embeds an approved catalogue snapshot. Sprint 04 requires repeatable lifecycle governance without changing historical results.

**User story.** As a Product Owner, I want controlled recommendation versions so that content and policy can evolve safely and reproducibly.

**Business rules.** Stable recommendation ID is never reused for different intent. Versions are semantic and immutable after activation. States are `draft`, `in_review`, `approved`, `active`, `retired`, `superseded`. Only one active version per ID/environment. Activation requires schema, reference, trace, copy, outcome, success-measure, conflict, and dependency validation plus approval identity. Rollback activates a previously approved version; it never mutates history. Existing runs retain their snapshot.

**Technical notes.** Prefer validated data/configuration with content digests and atomic promotion. Separate catalogue definition from tenant availability. No UI rule studio in scope.

**Acceptance criteria.** AC1 valid versions promote atomically; AC2 invalid references/cycles/copy fail closed; AC3 active versions cannot mutate; AC4 historical portfolios resolve exact snapshots; AC5 activation/retirement/rollback are audited; AC6 concurrent promotion cannot create two active versions.

**API considerations.** Read active/specific versions through internal authorised contracts. Promotion endpoints require product-governance permission, optimistic concurrency, and idempotency.

**Data impacts.** `recommendation_definition`, version, lifecycle event, approval, dependency/conflict mapping, digest, and snapshot references.

**Test scenarios.** Valid promotion; malformed definition; duplicate ID/version; missing dependency; cycle; concurrent activation; rollback; retired historical read; cross-tenant catalogue administration denial.

**Definition of Done.** AC1–AC6 pass; migrations, schema validation, promotion runbook, rollback, audit, and catalogue fixtures complete.

### S4-002 — Eligibility and Trigger Evaluation

**Background.** Customers and auditors need to reproduce why each catalogue item was eligible, ineligible, or excluded.

**User story.** As an authorised reviewer, I want a versioned evaluation record so that recommendation selection can be explained and reproduced.

**Business rules.** Evaluate only approved Sprint 03 signals and active pinned catalogue. Exclusions precede triggers. Every candidate records matched triggers, unmet prerequisites, exclusions, confidence state, decisive facts, rule version, and result. `ineligible` is not customer-visible by default. Re-evaluation requires a new evaluation ID and never changes the original.

**Technical notes.** Pure deterministic evaluator over canonical result plus pinned catalogue/policy. Persist semantic output hash and trace links.

**Acceptance criteria.** AC1 DIQ-203B recommendation fixtures remain unchanged; AC2 every catalogue item has one terminal evaluation; AC3 ordering/input order does not alter results; AC4 unknown signals fail closed; AC5 evaluation is tenant/run scoped and traceable.

**API considerations.** Customer projection exposes eligible rationale; governance/auditor projection may expose evaluation summaries subject to permission.

**Data impacts.** `recommendation_evaluation`, candidate evaluation, trigger/exclusion facts, versions, hashes, traces.

**Test scenarios.** Trigger match/miss; exclusion; unknown signal; reordered input; replay; catalogue change; permission/redaction; cross-run edge.

**Definition of Done.** AC1–AC5, regression and lineage validation pass; no duplicate eligibility logic exists.

### S4-003 — Confidence Gates and Evidence Sufficiency

**Background.** Material action should not be presented as firm advice when evidence confidence is low.

**User story.** As a decision-maker, I want advice calibrated to evidence confidence so that I act with appropriate caution.

**Business rules.** Preserve DIQ-203 gates: high `≥75`, moderate `50–<75`, low `<50`; at low confidence medium/high-effort material actions are withheld and evidence gathering is eligible. A withheld item is not rejected. Moderate advice carries a concise caveat; high carries no default caveat. Confidence cannot alter impact or capability score. Evidence-first action remains low effort.

**Technical notes.** Gate after base trigger evaluation and before conflict/ranking. Persist pre-gate and post-gate state.

**Acceptance criteria.** AC1 exact boundary fixtures pass; AC2 low-confidence material action is withheld; AC3 confidence changes alone affect only gate/confidence components; AC4 caveats match locked copy; AC5 withheld details are restricted appropriately.

**API considerations.** Return `presented`, `withheld`, or `evidence_first` plus safe reason and confidence version.

**Data impacts.** Gate result and limitation links; no new confidence calculation.

**Test scenarios.** 49.999999/50/74.999999/75; low-effort exception; unavailable confidence; multiple limitations; public/workspace projection.

**Definition of Done.** AC1–AC5 and DIQ-203 regression pass; accessibility and copy review complete.

### S4-004 — Conflict Resolution and Deduplication

**Background.** Overlapping triggers can create repetitive or contradictory advice.

**User story.** As a customer, I want one coherent recommendation set so that I am not asked to perform duplicate or incompatible actions.

**Business rules.** Apply exclusion, mutual-exclusion, supersession, and dedupe groups in that order. Deduped triggers/evidence aggregate into the lowest catalogue-order canonical item unless a versioned canonical ID is specified. Higher priority wins exclusive conflict; tie uses catalogue order then ID. Suppression records reason and winner. A recommendation cannot suppress its dependency.

**Technical notes.** Validate conflict graph at catalogue promotion. Resolution is deterministic and side-effect free.

**Acceptance criteria.** AC1 approved conflict/dedupe fixtures pass; AC2 aggregate evidence is preserved; AC3 suppressed items remain auditable; AC4 prohibited dependency suppression blocks publication; AC5 resolution is stable under input order.

**API considerations.** Customer gets canonical items only; authorised explanations may state that related actions were combined.

**Data impacts.** Resolution event, canonical/suppressed links, reason, policy version.

**Test scenarios.** Duplicate; exclusive conflict; tie; supersession; dependency collision; chained groups; invalid graph.

**Definition of Done.** AC1–AC5 pass; catalogue validator and trace paths complete.

### S4-005 — Impact, Effort and Priority Model

**Background.** Customers need transparent priority without false precision.

**User story.** As a leader, I want consistently prioritised advice so that attention is directed to the most material actions.

**Business rules.** Preserve DIQ-203 raw formula and tie-breakers. Customer labels are `critical`, `high`, `medium`, `low`, derived from rank score: `≥85`, `70–<85`, `50–<70`, `<50`. Numeric rank score remains Workspace auditor detail, not public. Impact/effort labels are catalogue assertions, not delivery estimates. Any override is a customer decision overlay and does not alter generated rank.

**Technical notes.** Store components unrounded; render label and component rationale. Never rank client-side.

**Acceptance criteria.** AC1 DIQ-203 rank fixtures pass; AC2 label boundaries exact; AC3 deterministic ties; AC4 explanation lists governing components; AC5 customer override preserves baseline and audit.

**API considerations.** Workspace returns rank, label, impact, effort, and safe rationale; public remains DIQ-203 allow-list.

**Data impacts.** Portfolio rank projection and optional customer display-order preference overlay.

**Test scenarios.** All boundaries; ties; rounding collision; low confidence; dependency not ready; customer sort preference; public redaction.

**Definition of Done.** AC1–AC5, regression and explanation tests pass.

### S4-006 — Dependency and Sequencing Engine

**Background.** High-priority actions may depend on lower-ranked foundations.

**User story.** As an improvement lead, I want dependencies sequenced visibly so that plans are feasible.

**Business rules.** Preserve DIQ-203 topological sequencing and 30/60/90 capacities. Dependency precedes dependant. `required` blocks action start; `recommended` warns but does not block. Cycles block portfolio publication. Missing/ineligible required dependency produces `blocked_dependency`; recommended dependency produces caveat. Sequence override requires authorised user, reason, and acknowledged risk; generated sequence remains unchanged.

**Technical notes.** Directed acyclic graph with bounded traversal and deterministic topological tie-breaks.

**Acceptance criteria.** AC1 locked roadmap fixtures pass; AC2 required/recommended semantics enforced; AC3 cycle path returned safely; AC4 override is audited overlay; AC5 graph queries meet performance target.

**API considerations.** Return dependency IDs, type, state, reason, and generated versus customer sequence.

**Data impacts.** Dependency snapshot, sequence result, block/caveat, override event.

**Test scenarios.** Linear/branching graph; missing dependency; cycle; rank override; capacity; concurrent customer override; superseded dependency.

**Definition of Done.** AC1–AC5, load and integrity tests pass; cycle/repair runbook exists.

### S4-007 — Recommendation Portfolio

**Background.** Users need a decision-oriented portfolio rather than a flat engine response.

**User story.** As an executive, I want recommendations grouped by action character so that I can understand the improvement approach.

**Business rules.** Classifications: `immediate_attention` for critical/high priority with urgency 100 or score <25; `foundation` when another eligible action depends on it; `quick_win` when effort low, no required unmet dependency, and impact medium/high; `strategic_initiative` when effort high or horizon 90; `watch` for presented advice not meeting another class. Precedence is immediate, foundation, quick win, strategic, watch. Each item belongs to one primary class and may carry secondary tags. Portfolio is immutable per evaluation.

**Technical notes.** Server projection with stable order, ETag, version, and trace coverage.

**Acceptance criteria.** AC1 every presented item appears once; AC2 classifications follow precedence; AC3 portfolio reconciles to evaluation/rank/roadmap; AC4 empty/partial states explicit; AC5 identical inputs produce identical semantic portfolio.

**API considerations.** `GET /recommendation-portfolios/{id}` with version/ETag and authorised projection.

**Data impacts.** Portfolio baseline, item classification/tags/order, source evaluation and run.

**Test scenarios.** Each class; multi-class precedence; empty; low confidence; large set; stale ETag; cross-tenant read.

**Definition of Done.** AC1–AC5, accessibility-ready contract, and reconciliation tests pass.

### S4-008 — Customer Decision Workflow

**Background.** Customers must control whether and when generated advice enters their plan.

**User story.** As an authorised customer, I want to accept, defer, reject, or restore advice so that the portfolio reflects deliberate decisions.

**Business rules.** Initial state `undecided`. User transitions: undecided/deferred/rejected → accepted; undecided/accepted/rejected → deferred; undecided/accepted/deferred → rejected; deferred/rejected → restored, which returns to undecided. System may mark `superseded`; user cannot reverse it. Defer requires review date; reject requires reason category; accept requires acknowledgement. Every transition is append-only, idempotent, actor/time/version audited. Only accepted items create actions.

**Technical notes.** Optimistic concurrency on current decision version; event-sourced or equivalently complete audit history.

**Acceptance criteria.** AC1 transition matrix enforced; AC2 required fields validated; AC3 duplicate request is idempotent; AC4 stale update returns conflict; AC5 permissions and tenant scope enforced; AC6 baseline remains immutable.

**API considerations.** `POST /portfolio-items/{id}/decisions` with idempotency key, expected version, decision, reason, and review date.

**Data impacts.** Decision event/current projection; categories `not_relevant`, `already_addressed`, `not_feasible`, `wrong_timing`, `insufficient_evidence`, `other`.

**Test scenarios.** Every legal/illegal transition; missing reason/date; replay; concurrency; revoked permission; superseded item; export.

**Definition of Done.** AC1–AC6 pass; audit and accessible confirmation UX complete.

### S4-009 — Action Ownership and Improvement Plan

**Background.** Accepted advice must become accountable, bounded action without turning DeliveryIQ into a generic task manager.

**User story.** As an improvement lead, I want accepted recommendations assigned and tracked so that agreed action is visible.

**Business rules.** One action per accepted portfolio item per plan version. States: `not_started`, `in_progress`, `blocked`, `completed`, `cancelled`. One accountable owner is required to start; contributors optional. Target date optional but required for `in_progress`. Completion requires completion note and evidence reference or explicit `evidence_not_available` reason. Rejecting/cancelling recommendation does not delete action history. Required dependencies block start unless authorised override exists.

**Technical notes.** Focused fields only: owner, contributors, status, target date, note, evidence refs, dependency state, timestamps.

**Acceptance criteria.** AC1 accepted item creates/reuses one action idempotently; AC2 state rules enforced; AC3 ownership/permissions valid; AC4 dependency block enforced; AC5 full history retained; AC6 no cross-tenant assignment.

**API considerations.** Create from accepted item, patch with optimistic version, append progress/evidence events.

**Data impacts.** Improvement plan/action, assignment, progress event, evidence link.

**Test scenarios.** Creation replay; owner removal; start without date; dependency; complete with/without evidence; cancellation; concurrent edit; user deactivation.

**Definition of Done.** AC1–AC6, notification boundary, audit, accessibility, and regression pass.

### S4-010 — Outcomes and Success Measures

**Background.** Completion is not proof of improvement; intended outcomes and evidence must remain explicit.

**User story.** As an executive, I want outcomes and measures attached to actions so that progress can be evaluated responsibly.

**Business rules.** Catalogue supplies intended outcome and measure template. Customer may set baseline, target, unit, target date, data source, cadence, and owner. States: `not_measured`, `baseline_recorded`, `tracking`, `target_met`, `target_not_met`, `retired`. DeliveryIQ reports association, not causation. Target met requires recorded observation satisfying configured direction (`increase`, `decrease`, `maintain`, `binary`) and date policy. Manual observation records source and actor.

**Technical notes.** Typed measures; immutable observations; calculated projection separated from source data.

**Acceptance criteria.** AC1 every action retains catalogue outcome/measure; AC2 typed validation works; AC3 status derives deterministically; AC4 observations immutable/audited; AC5 copy avoids causal claims; AC6 permissions/tenant scope pass.

**API considerations.** Outcome and observation endpoints with unit/direction schema and pagination.

**Data impacts.** Outcome, measure, baseline/target, observation, derived status.

**Test scenarios.** All directions; missing baseline; late observation; correction as superseding observation; target boundary; permission; deleted source.

**Definition of Done.** AC1–AC6, calculation fixtures and executive copy review pass.

### S4-011 — Knowledge Pack and TeamMate Hand-offs

**Background.** Recommendations may lead to deeper diagnosis or execution support, but eligibility is not entitlement or activation.

**User story.** As a customer, I want relevant next-step services presented accurately so that I can continue improvement safely.

**Business rules.** Preserve DIQ-203 mappings. Distinguish `domain_eligible`, `available`, `entitled`, `permitted`, and `activated`. Pack CTA: entitled active `start_assessment`; active not entitled `view_pack`; unavailable hidden. TeamMate activation requires authenticated workspace, accepted mapped recommendation, entitlement, availability, and `teammate.activate`; CTA `review_activation`. No analysis side effect activates anything. Hand-off records consent and source action.

**Technical notes.** Stable hand-off token/contract; downstream service re-authorises and rechecks availability.

**Acceptance criteria.** AC1 locked mapping fixtures pass; AC2 eligibility never implies entitlement; AC3 stale availability fails safely; AC4 activation never occurs automatically; AC5 hand-off and consent traced; AC6 public disclosure remains locked.

**API considerations.** Create short-lived single-purpose hand-off after authorisation; no secrets in URLs.

**Data impacts.** Hand-off intent, state, consent, source item/action, target type/version, expiry/audit.

**Test scenarios.** Pack/TeamMate entitled/unentitled/unavailable; revoked permission; expiry; replay; cross-tenant; target version retirement.

**Definition of Done.** AC1–AC6, security and downstream contract tests pass.

### S4-012 — Recommendation Experience and Executive Reporting

**Background.** Users need one accessible journey from explanation to decision and progress.

**User story.** As an executive or improvement lead, I want a clear recommendation experience so that I can decide and monitor action efficiently.

**Business rules.** Hierarchy: portfolio summary → priority/class → why/evidence/confidence → dependencies → expected outcome/measures → decision → accepted action/progress → hand-offs. Roles: viewer reads; decision-maker decides; improvement lead manages actions/outcomes; auditor accesses permitted evidence/audit; admin manages membership, not product rules. Executive report reflects baseline and current overlay with “generated” versus “customer decision” clearly labelled.

**Technical notes.** Server projections; responsive progressive disclosure; no client business calculations; print/PDF-ready semantic HTML where existing stack supports it.

**Acceptance criteria.** AC1 all roles see correct controls; AC2 states/loading/errors explicit; AC3 values reconcile to canonical records; AC4 WCAG 2.2 AA core journey; AC5 responsive 320px+; AC6 report is traceable and labels snapshot time/version.

**API considerations.** Portfolio summary and report projection minimise N+1 calls; ETag and permission recheck.

**Data impacts.** Read models only, plus optional saved filter/preferences outside product state.

**Test scenarios.** Every role/state; keyboard/screen reader; narrow screen; large portfolio; stale update; report snapshot; revoked access.

**Definition of Done.** AC1–AC6, visual/accessibility/e2e/build gates pass.

### S4-013 — Recommendation Analytics and Learning Signals

**Background.** DeliveryIQ needs effectiveness evidence without silently training or personalising product behaviour.

**User story.** As a Product Owner, I want privacy-safe usage and outcome signals so that controlled improvements are evidence-led.

**Business rules.** Approved events: portfolio viewed, explanation opened, decision recorded, action started/blocked/completed, outcome observed, Pack hand-off, TeamMate hand-off, usefulness submitted. Events contain tenant-scoped pseudonymous actor, object/version, timestamp, mode, and approved categorical properties; never raw answers, notes, evidence, free text, secrets, or cross-tenant aggregates below privacy threshold. Minimum aggregate cohort is 10 tenants for product reporting. Analytics never changes rules automatically.

**Technical notes.** Allow-listed schema, consent/retention controls, idempotent event ID, non-blocking delivery.

**Acceptance criteria.** AC1 allow-list enforced; AC2 prohibited data rejected/redacted; AC3 duplicate events dedupe; AC4 analytics failure does not break workflow; AC5 cohort threshold enforced; AC6 rule changes require controlled approval.

**API considerations.** First-party event endpoint or existing analytics adapter; server emits authoritative decision/action events.

**Data impacts.** Analytics event and aggregate only; retention per platform policy.

**Test scenarios.** Every event; duplicate; raw evidence attempt; free text; consent withdrawal; small cohort; vendor outage; tenant crossing.

**Definition of Done.** AC1–AC6, privacy/security review, data dictionary, retention and monitoring complete.

### S4-014 — Governance, Audit and Operational Readiness

**Background.** A production recommendation framework needs controlled promotion, audit, observability, resilience, and support.

**User story.** As a platform owner, I want governed operations so that recommendation capability remains safe and supportable.

**Business rules.** Catalogue promotion and rollback use separation of duties: author cannot be sole approver. Audit export includes catalogue/evaluation/portfolio/decision/action/outcome/hand-off versions and redacts by role. Critical integrity failure prevents affected publication. Retention/deletion follows tenant and legal policy. Feature flags fail safe. Support cannot edit immutable records; corrections create superseding events.

**Technical notes.** Health metrics, structured errors, alerts, replay tools, configuration diff, migration rehearsal, backup/restore, and runbooks.

**Acceptance criteria.** AC1 separation of duties enforced; AC2 complete redacted audit export; AC3 integrity failure blocks safely; AC4 rollback/recovery rehearsal passes; AC5 monitoring/alerts cover Section 20; AC6 security/performance/resilience/release gates pass.

**API considerations.** Governance/audit endpoints require elevated scoped permission, rate limits, pagination, access logging, and export expiry.

**Data impacts.** Governance approval, audit export job, integrity result, operational event.

**Test scenarios.** Self-approval denial; export/redaction; configuration rollback; partial job failure; replay; expired export; alert test; disaster recovery.

**Definition of Done.** AC1–AC6 and Sprint acceptance/release checklists complete; final implementation report produced.

## 11. Cross-story Dependency Map

```text
S4-001 Catalogue -> S4-002 Evaluation -> S4-003 Confidence -> S4-004 Conflicts
       -> S4-005 Priority -> S4-006 Dependencies -> S4-007 Portfolio
       -> S4-008 Decisions -> S4-009 Actions -> S4-010 Outcomes

S4-002..010 -> S4-011 Hand-offs
S4-007..011 -> S4-012 Experience/reporting
S4-008..012 -> S4-013 Analytics
S4-001..013 -> S4-014 Governance/readiness
```

Recommended gates: foundation (001–006), customer baseline (007), decision/action (008–010), ecosystem/experience (011–012), evidence/operations (013–014).

## 12. Global Business Rules

- Immutable generated baseline plus mutable audited customer overlay is universal.
- One current decision per portfolio item; all transitions remain historical.
- One action per accepted item per plan version.
- Customer overrides never alter generated eligibility, rank, classification, or sequence.
- Supersession preserves all previous IDs, versions, decisions, actions, and outcomes.
- Customer copy distinguishes recommendation, customer decision, action progress, and measured observation.
- No automated execution or causal-success claim is permitted.

## 13. Non-functional Requirements

- Deterministic domain outputs and semantic hashes.
- Atomic catalogue promotion and portfolio publication.
- Idempotent commands, bounded retries, optimistic concurrency, and safe recovery.
- Versioned backward-compatible APIs; additive change preferred.
- Structured tenant-safe observability without raw evidence or notes.
- WCAG 2.2 AA and locale-neutral stored values.
- All collections paginated/bounded; no N+1 or unbounded graph traversal.
- Configuration and golden fixtures validated in CI.

## 14. Security, Privacy, and Permissions

| Role | View | Decide | Manage actions/outcomes | Audit detail | Catalogue govern |
|---|---:|---:|---:|---:|---:|
| Viewer | Yes | No | No | No | No |
| Decision-maker | Yes | Yes | No | No | No |
| Improvement lead | Yes | Yes | Yes | No | No |
| Auditor | Yes | No | No | Permitted | No |
| Tenant admin | Yes | Membership policy | By assigned permission | Permitted | No |
| Product governance | No tenant data by default | No | No | Configuration audit | Author/approve with separation |

- Re-authorise every query, mutation, export, deep link, job, and hand-off.
- Tenant/workspace keys are mandatory in records, indexes, caches, and events.
- Validate identifiers, state transitions, content lengths, dates, units, and enums.
- Encrypt in transit/at rest; use least-privilege service identities and secrets management.
- Apply consent, retention, deletion, export, pseudonymisation, and breach procedures.
- Prevent ID enumeration, injection, CSRF, XSS, mass assignment, and confused-deputy hand-offs.

## 15. Performance and Reliability

| Operation | Target |
|---|---|
| Portfolio generation up to 250 recommendations | p95 ≤ 2 s; p99 ≤ 5 s |
| Portfolio read, warm | p95 ≤ 700 ms |
| Decision command | p95 ≤ 500 ms |
| Action/outcome command | p95 ≤ 600 ms |
| Dependency traversal ≤1,000 edges | p95 ≤ 1 s |
| Executive report projection | p95 ≤ 2 s |
| Audit export ≤10,000 events | asynchronous; 95% complete ≤60 s |

Decision/action commands target 99.9% monthly availability excluding agreed maintenance. Analytics failure must not block customer workflows. Catalogue/evaluation integrity failure must fail closed. Recovery point and time objectives inherit platform policy; absence of an approved policy blocks production release, not implementation.

## 16. Explainability and UX Expectations

Every portfolio item shows title, class, priority label, why, supporting capability/pattern, confidence/caveat, impact, effort, dependencies, intended outcome, success measure, source versions, and customer decision state. Restricted formulas, raw evidence, prompts, source code, cross-tenant information, and chain-of-thought are never displayed.

Use progressive disclosure and supportive language. Distinguish generated advice from customer choices visually and semantically. Confirmation is required for reject, supersede acknowledgement, sequence override, cancel, and complete-without-evidence. Charts have text alternatives and never rely on colour alone.

## 17. Example Contracts and Expected Outputs

### 17.1 Decision command

```json
{
  "portfolioItemId": "pi_01",
  "decision": "deferred",
  "reviewAt": "2026-09-01T09:00:00Z",
  "reasonCategory": "wrong_timing",
  "expectedVersion": 2,
  "idempotencyKey": "decision-pi_01-3"
}
```

Exact response:

```json
{
  "portfolioItemId": "pi_01",
  "currentDecision": "deferred",
  "decisionVersion": 3,
  "reviewAt": "2026-09-01T09:00:00Z",
  "reasonCategory": "wrong_timing"
}
```

### 17.2 Accepted action and outcome

```json
{
  "actionId": "act_01",
  "sourceRecommendationId": "rec_decision_rights",
  "status": "in_progress",
  "accountableOwnerId": "user_opaque",
  "targetDate": "2026-09-30",
  "generatedSequence": 1,
  "customerSequence": 1,
  "outcome": {
    "statement": "Decisions have clear owners, forums, thresholds and cadence.",
    "measure": {
      "direction": "increase",
      "unit": "percent",
      "baseline": 40,
      "target": 100,
      "status": "tracking"
    }
  }
}
```

### 17.3 Portfolio classification examples

| Conditions | Expected primary class |
|---|---|
| Critical/high with urgency 100 | `immediate_attention` |
| Required by another eligible item | `foundation` |
| Low effort, impact medium/high, dependencies ready | `quick_win` |
| High effort or day-90 horizon | `strategic_initiative` |
| Presented and no earlier class | `watch` |

## 18. Traceability Matrix

| Output | DIQ-200 input | DIQ-201 responsibility | DIQ-202/Sprint 04 lineage |
|---|---|---|---|
| Evaluation | Findings, patterns, confidence | Eligibility/exclusion | Result → candidate → evaluation |
| Priority | Impact/urgency/confidence/dependency | Ranking | Evaluation → components → rank |
| Portfolio | Ranked recommendations/roadmap | Classification/sequence | Rank → portfolio item |
| Decision | Portfolio item | Human override/audit | Item → decision events/current state |
| Action | Accepted decision | Guidance/ownership | Decision → action/progress |
| Outcome | Recommendation success measure | Outcome tracking | Action → measure → observation |
| Hand-off | Eligible recommendation/action | Pack/TeamMate mapping | Action/item → hand-off → target |
| Report | All authorised projections | Presentation | Facts → narrative/report item |

## 19. Sprint Acceptance Checklist

- [ ] S4-001–S4-014 acceptance criteria and Definitions of Done pass.
- [ ] All locked DIQ-203B fixtures remain passing without altered expectations.
- [ ] Sprint 04 catalogue, transition, classification, dependency, outcome, hand-off, and permission golden fixtures pass.
- [ ] Generated baselines remain immutable and customer overlays are fully audited.
- [ ] Tenant isolation, access, concurrency, idempotency, disclosure, and export tests pass.
- [ ] Trace coverage is 100% for displayed portfolio, decision, action, outcome, and hand-off items.
- [ ] Accessibility, responsive, security, privacy, performance, and resilience gates pass.
- [ ] Migrations, API schemas, catalogues, runbooks, acceptance matrix, and implementation reports are complete.
- [ ] No client-side recommendation rules or automatic TeamMate activation exist.
- [ ] Known limitations and debt are explicitly accepted.

## 20. Release and Operational Checklist

- [ ] Approved catalogue/configuration versions and digests are pinned.
- [ ] Migration and rollback rehearsals pass with backup/restore evidence.
- [ ] Feature flags default safe and separation of duties is configured.
- [ ] Alerts cover promotion failure, invalid catalogue, orphan lineage, dependency cycle, transition conflict, command failure, export failure, tenant denial, hand-off abuse, and latency.
- [ ] Support runbooks cover rollback, replay, supersession, user deactivation, corrupt overlay, export, and incident response.
- [ ] Smoke tests cover portfolio read, each decision, action lifecycle, outcome observation, report, Pack/TeamMate hand-off, audit export, and cross-tenant denial.
- [ ] Release notes and customer/support guidance are approved.
- [ ] Product Owner and Matt Prust record release acceptance.

## 21. Risks and Assumptions

| Risk/assumption | Control |
|---|---|
| Sprint 03 contracts change | Pin versions; require impact assessment and fixture rerun |
| Product becomes generic task manager | Enforce focused action schema and out-of-scope boundary |
| Customer overlay corrupts historical advice | Separate immutable baseline and append-only events |
| Priority appears falsely precise | Customer labels and rationale; restrict numeric components |
| Outcomes imply causation | Association-only copy and sourced observations |
| Catalogue conflicts/cycles | Promotion validator and fail-closed publication |
| Entitlement mistaken for recommendation | Separate eligibility, availability, entitlement, permission, activation |
| Analytics becomes hidden learning | No automatic rule change; controlled Product Owner approval |
| Temporary worktree or branch loses work | Commit intentionally, push working branches, preserve Lovable history |

## 22. Appendices

### Appendix A — Stable terminology

- **Generated baseline:** immutable portfolio derived from a specific analysis/configuration set.
- **Customer overlay:** audited decisions, sequencing preferences, actions, and observations.
- **Decision:** explicit accept, defer, reject, restore, or system supersede state.
- **Action:** focused implementation record created only from accepted advice.
- **Outcome:** intended improvement; not proof of causation.
- **Observation:** immutable sourced measurement against a success measure.
- **Hand-off:** authorised transition to a Pack or TeamMate review/activation journey.

### Appendix B — Stable error taxonomy

| Code | Meaning |
|---|---|
| `CATALOGUE_VERSION_INVALID` | Definition/reference/schema validation failed |
| `CATALOGUE_PROMOTION_CONFLICT` | Concurrent or duplicate active-version promotion |
| `RECOMMENDATION_EVALUATION_INVALID` | Input signal or evaluation integrity failed |
| `RECOMMENDATION_DEPENDENCY_CYCLE` | Eligible dependency graph contains a cycle |
| `PORTFOLIO_PUBLICATION_FAILED` | Atomic portfolio publication failed safely |
| `DECISION_TRANSITION_INVALID` | Requested state transition is prohibited |
| `DECISION_VERSION_CONFLICT` | Optimistic concurrency version is stale |
| `ACTION_DEPENDENCY_BLOCKED` | Required dependency prevents action start |
| `OUTCOME_OBSERVATION_INVALID` | Observation/unit/direction validation failed |
| `HANDOFF_UNAVAILABLE` | Target unavailable, expired, unentitled, or unauthorised |
| `RECOMMENDATION_ACCESS_DENIED` | Non-enumerating tenant/permission denial |

### Appendix C — Story Acceptance Record

```text
Record ID: SAR-004-___
Story: S4-___
Implementation revision:
Acceptance criteria evidence:
Golden fixtures:
Architecture/security/tenant review:
Tests and results:
Known limitations/debt:
Product Owner review:
Accepted by Matt Prust:
Date:
```

### Appendix D — Global Definition of Done

A story is done only when acceptance criteria pass; applicable unit, integration, failure, concurrency, security, tenant, accessibility, performance, and regression tests pass; traceability and audit are complete; documentation/migrations are current; no locked rule is changed; implementation evidence is produced; and the required acceptance record is approved.

## 23. Final Approval Record

**Decision:** Option A approved by Matt Prust on 2 August 2026 without amendments.

- **Option A — Approve without amendments.** Promote PB-004 to version 1.0 and status **LOCKED**; Codex may implement S4-001–S4-014.
- **Option B — Approve with named amendments.** Product Owner issues RC2 and updates affected acceptance material before implementation.
- **Option C — Defer.** Sprint 04 remains discovery-only; production implementation does not start.

**Consequence:** PB-004 is promoted to version 1.0 and status **LOCKED**. Codex may implement S4-001 through S4-014 against this playbook after satisfying the entry criteria in Section 7.

---

**End of PB-004 v1.0 — LOCKED**
