# PB-003 — Sprint 03 Playbook – Delivery Intelligence Engine MVP

| Control | Value |
|---|---|
| Document ID | PB-003 |
| Version | 1.0 |
| Status | **LOCKED** |
| Owner | Product Owner |
| Approver | Matt Prust |
| Effective date | 2 August 2026 |
| Classification | Internal — Controlled |
| Sprint | Sprint 03 |

> **Controlled-document notice.** This playbook is the approved engineering contract for Sprint 03. Changes to product behaviour, scoring, confidence, patterns, recommendation policy, traceability, or public disclosure require Product Owner review, approver acceptance, a version increment, and an entry in the change history. Where this playbook conflicts with DIQ-002, DIQ-002 takes precedence. Engineering must record and escalate the conflict rather than infer new product behaviour.

## 1. Document Control

### 1.1 Purpose

This document defines the product, engineering, data, security, UX, test, acceptance, and release requirements for the Delivery Intelligence Engine MVP. It is intended to let engineering deliver Sprint 03 with minimal product ambiguity while preserving the locked DeliveryIQ architecture.

### 1.2 Authority and precedence

1. DIQ-002 — Product Architecture.
2. This locked playbook and an approved amendment to it.
3. DIQ-200 — Delivery Intelligence Engine.
4. DIQ-201 — Recommendation Framework.
5. DIQ-202 — Delivery Intelligence Traceability Model.
6. Accepted architecture decision records and existing implementation.

Existing code does not override approved product behaviour. An unresolved conflict blocks only the affected story.

### 1.3 Related documents

| ID | Relationship |
|---|---|
| DIQ-000 | Controlled-document index |
| DIQ-002 | Authoritative product architecture |
| DIQ-200 | Engine responsibilities and intelligence contracts |
| DIQ-201 | Recommendation selection, ranking, and roadmap policy |
| DIQ-202 | Evidence-to-output lineage and explainability model |

### 1.4 Change history

| Version | Date | Author/owner | Change | Approval |
|---|---|---|---|---|
| 1.0 | 2 August 2026 | Product Owner | Initial locked Sprint 03 baseline | Matt Prust |

### 1.5 Change control

- Editorial corrections that do not alter meaning may be released as 1.0.x.
- Backward-compatible clarification requires a minor version.
- Changed scoring, disclosure, prioritisation, security, or API semantics requires a major version and regression baseline.
- Every analysis result stores the rule-set and contract versions used to produce it.

## 2. Executive Summary

Sprint 03 turns completed assessment evidence into explainable delivery intelligence. The MVP produces capability scores, a confidence index, patterns, executive narrative, strengths and weaknesses, prioritised recommendations, a 30/60/90-day improvement roadmap, Knowledge Pack and TeamMate recommendations, a dashboard-ready read model, and a controlled public Delivery DNA view.

The Delivery Intelligence Engine is shared platform capability, not presentation logic. Delivery DNA and the authenticated DeliveryIQ Workspace consume the same immutable analysis result through different disclosure policies. Every conclusion must be reproducible and traceable to source evidence, configuration, and rule versions.

Sprint 03 is accepted only when a completed assessment can move through the entire pipeline deterministically, securely, and without duplicate scoring or recommendation logic.

## 3. Sprint Objectives

1. Establish one idempotent assessment-analysis pipeline.
2. Produce versioned capability and confidence calculations.
3. Detect approved evidence patterns without hidden inference.
4. Generate useful executive intelligence and prioritised action.
5. preserve end-to-end lineage from answer to customer-visible conclusion.
6. Serve authenticated and public presentation modes from one result.
7. provide production-grade tests, observability, security, and operational controls.

## 4. Business Outcomes

- Customers understand what their assessment evidence means, not merely their score.
- Leaders see the strongest capabilities, most material gaps, and next actions.
- Product teams can add Knowledge Packs and TeamMates without duplicating core logic.
- Every recommendation can be defended using visible evidence and rules.
- Delivery DNA creates a low-friction entry path while protecting detailed intelligence.

## 5. Success Metrics

| Metric | Sprint acceptance threshold |
|---|---|
| Determinism | Identical input and version set produces byte-equivalent semantic output, excluding run metadata |
| Traceability | 100% of scores, insights, patterns, and recommendations have resolvable lineage |
| Idempotency | Repeated request with the same key creates no duplicate completed analysis |
| Tenant isolation | 100% automated cross-tenant denial tests pass |
| Calculation accuracy | 100% approved golden-data cases pass |
| Explainability | 100% displayed conclusions provide reason, evidence references, and rule/version reference |
| Reliability | No unhandled failure in the agreed test suite; failed runs are safely retryable |
| Performance | Meets Section 14 targets at agreed reference load |
| Accessibility | Core result flow meets WCAG 2.2 AA automated and manual checks |
| Public disclosure | 100% policy tests prevent authenticated-only fields appearing in public mode |

Business outcome measures to instrument after release include assessment-to-result completion, report engagement, recommendation selection, Knowledge Pack conversion, TeamMate interest, and user-rated usefulness. They are not reasons to weaken accuracy or explainability.

## 6. Scope and Out of Scope

### 6.1 In scope

- S3-001 through S3-014.
- Completed assessment ingestion, validation, normalisation, and immutable run persistence.
- Capability score and confidence calculation using approved, versioned configuration.
- Pattern, insight, strength, weakness, and recommendation production.
- 30/60/90-day roadmap assembly.
- Knowledge Pack and TeamMate recommendation mappings.
- Dashboard and report read models.
- Evidence-level traceability and explainability.
- Public and authenticated disclosure modes.

### 6.2 Out of scope

- Authoring or materially changing the capability taxonomy, weights, thresholds, pattern catalogue, recommendation catalogue, or mappings without separately approved data.
- Benchmarking across customers, predictive analytics, machine-learned scoring, or autonomous model training.
- Knowledge Pack assessment execution and active TeamMate workflows.
- Portfolio-wide aggregation, historical trend analysis, billing, CRM, marketing automation, or public website build.
- Free-form generative claims not grounded in approved structured facts.
- Replacing existing identity, tenancy, consent, or retention controls.

## 7. Dependencies

- A stable completed-assessment contract with tenant, workspace, assessment, pack, question, answer, and completion metadata.
- Versioned capability, scoring, confidence, pattern, recommendation, Knowledge Pack, TeamMate, narrative, and disclosure configuration.
- Existing authentication, authorisation, tenant isolation, database migration, job execution, logging, and API conventions.
- Representative assessment fixtures and Product Owner-approved golden outputs.
- DIQ-002, DIQ-200, DIQ-201, and DIQ-202 available to implementation reviewers. If unavailable, this playbook governs Sprint behaviour but cannot be used to silently amend those documents.

## 8. Architecture Alignment

### 8.1 Locked principles

- DeliveryIQ enables better delivery decisions; it does not sell questionnaires.
- The Delivery Intelligence Engine is central intellectual property.
- The Recommendation Framework converts intelligence into prioritised action.
- Knowledge Packs provide deeper diagnosis; TeamMates provide execution support.
- One platform powers Delivery DNA, the DeliveryIQ Workspace, and future experiences.
- Scoring, recommendation, and intelligence logic must not be duplicated by channel.
- Every conclusion is evidence-based, explainable, versioned, and auditable.

### 8.2 Logical flow

```text
Completed assessment
  -> validated canonical evidence
  -> immutable analysis run
  -> capability scores + confidence
  -> patterns + insights
  -> strengths + weaknesses
  -> recommendations
  -> roadmap + Knowledge Packs + TeamMates
  -> traceable result projection
  -> authenticated or public disclosure policy
```

### 8.3 Mandatory boundaries

- Domain calculation is pure and deterministic where practicable.
- Persistence and orchestration are separate from calculation.
- Presentation modes filter a canonical result; they do not recalculate it.
- Rules are configuration with stable identifiers and versions, not scattered conditionals.
- Narrative renders approved facts and templates; it cannot invent evidence.
- All reads and writes are tenant- and workspace-scoped.

## 9. Story Catalogue

| ID | Story | Primary output | Depends on |
|---|---|---|---|
| S3-001 | Assessment Analysis Pipeline | Canonical, immutable analysis run | Assessment runtime |
| S3-002 | Capability Scoring | Versioned capability and overall scores | S3-001 |
| S3-003 | Delivery Confidence Index | Confidence score and drivers | S3-001, S3-002 |
| S3-004 | Executive Summary | Evidence-grounded summary | S3-002, S3-003 |
| S3-005 | Strength and Weakness Analysis | Ranked strengths/opportunities | S3-002, S3-003 |
| S3-006 | Pattern Detection | Approved detected patterns | S3-001–003 |
| S3-007 | Recommendation Engine | Ranked actionable recommendations | S3-002, S3-005, S3-006 |
| S3-008 | Improvement Roadmap | 30/60/90-day plan | S3-007 |
| S3-009 | Knowledge Pack Recommendations | Deeper-diagnosis suggestions | S3-005–007 |
| S3-010 | TeamMate Recommendations | Execution-support suggestions | S3-007–009 |
| S3-011 | Delivery Intelligence Dashboard | Authenticated result projection | S3-002–010 |
| S3-012 | Explainable Intelligence | Human-readable reasons and evidence | S3-002–010, S3-013 |
| S3-013 | Delivery Intelligence Traceability | Complete lineage graph | S3-001–010 |
| S3-014 | Delivery DNA Public Mode | Controlled public projection | S3-004–013 |

## 10. Full Story Specifications

### S3-001 — Assessment Analysis Pipeline

**Background.** A completed assessment needs a reliable boundary between evidence capture and intelligence generation. Reprocessing must never corrupt or duplicate a result.

**User story.** As a platform service, I want to convert a completed assessment into a canonical analysis run so that downstream intelligence uses validated, reproducible evidence.

**Business rules.** Only completed, accessible assessments may run. Tenant, workspace, assessment and pack version are mandatory. Responses are normalised without changing meaning. An idempotency key identifies an assessment revision plus engine/rule-set version. Input and configuration snapshots are immutable. A failed run records a safe error state and may be retried. No narrative or recommendations are calculated here.

**Technical notes.** Use explicit states (`queued`, `running`, `completed`, `failed`). Persist input hash, idempotency key, initiator, timestamps, versions, and structured events. Lock or atomically claim a run. Separate orchestration from domain calculation.

**Acceptance criteria.**

- AC1: An authorised request for a complete assessment creates one run scoped to its tenant/workspace.
- AC2: Incomplete, unknown, mismatched-version, or unauthorised input is rejected with a stable error code.
- AC3: Repeating the same idempotency key returns the existing run and creates no duplicate.
- AC4: Canonical evidence retains stable references to every included answer.
- AC5: Input/configuration snapshots cannot be mutated after execution begins.
- AC6: State changes and failures emit structured, correlation-aware events.

**API considerations.** Prefer `POST /analysis-runs` with assessment ID, requested mode, and idempotency key; `GET /analysis-runs/{id}` returns status. Use `202` for asynchronous execution, `200` for an existing idempotent run, `409` for conflicting input, and non-leaking `404/403` semantics consistent with the platform.

**Data model impacts.** Add or reuse `analysis_run`, `analysis_input_snapshot`, `analysis_event`, and `analysis_error`; include tenant/workspace foreign keys, hashes, versions, and lifecycle timestamps.

**Test scenarios.** Happy path; same-key replay; concurrent replay; incomplete session; missing response; unknown question; pack-version mismatch; cross-tenant request; worker interruption and retry; immutable snapshot enforcement.

**Definition of Done.** AC1–AC6 pass; migrations and contracts are documented; unit/integration/failure/concurrency tests pass; telemetry is queryable; no downstream intelligence is embedded in orchestration.

### S3-002 — Capability Scoring

**Background.** Capability scores provide a consistent view of delivery maturity and feed every later conclusion.

**User story.** As an assessment participant, I want reliable capability and overall scores so that I can understand relative delivery maturity.

**Business rules.** Scores use only approved eligible responses, mappings, weights, transformations, and thresholds. Missing evidence is not silently treated as zero. Insufficient evidence produces an explicit unavailable/low-confidence state. Output includes raw, normalised, band, contribution, denominator, and rule-set version. Rounding occurs only for display. Overall score aggregation must be configured and reproducible.

**Technical notes.** Implement a pure scorer over canonical input and versioned configuration. Decimal precision and rounding mode are explicit. Preserve per-answer contributions for lineage.

**Acceptance criteria.**

- AC1: Golden fixtures produce exact approved capability and overall scores.
- AC2: Excluded and not-applicable responses are handled according to configuration.
- AC3: Missing or insufficient evidence is visible and never fabricated.
- AC4: A score carries its band, rule version, inputs, weights, and calculation trace.
- AC5: Reordering equivalent input does not change output.

**API considerations.** Scores appear inside the analysis result; do not expose a second ungoverned scoring endpoint. Internal calculation contracts are versioned.

**Data model impacts.** Add `capability_score` and `score_contribution`, or equivalent immutable result records, keyed to analysis run and capability version.

**Test scenarios.** Minimum/maximum/midpoint; weighted questions; not applicable; missing optional/required answers; zero denominator; threshold boundaries; precision; reordered input; obsolete mapping.

**Definition of Done.** AC1–AC5 and golden-data suite pass; configuration is validated at load time; calculation trace is consumable by S3-013; no display rounding contaminates stored values.

### S3-003 — Delivery Confidence Index

**Background.** A score without evidence quality can imply false precision. Confidence communicates how strongly the available evidence supports conclusions.

**User story.** As a decision-maker, I want a confidence index and its drivers so that I can judge how much reliance to place on the analysis.

**Business rules.** Confidence is distinct from capability. It uses approved factors such as completeness, coverage, consistency, recency, and respondent breadth only when present and approved. It cannot increase merely because capability is high. Output includes index, band, factor contributions, limitations, and improvement prompts. Missing metadata reduces or marks unavailable confidence according to configuration.

**Technical notes.** Use a versioned factor calculator. Avoid statistical claims not supported by the method. Provide machine-readable factor codes and customer-safe descriptions.

**Acceptance criteria.**

- AC1: Golden cases produce exact confidence values and bands.
- AC2: Factor contributions reconcile to the result.
- AC3: Low confidence produces explicit limitations without suppressing valid scores.
- AC4: Capability changes alone do not change confidence unless an approved factor changes.
- AC5: Confidence evidence is traceable.

**API considerations.** Return confidence as a structured object with factors and caveats; public mode may expose band and concise caveat only.

**Data model impacts.** Add `confidence_result` and `confidence_factor_result` linked to the analysis run.

**Test scenarios.** Complete/high-coverage; incomplete; inconsistent answers; stale evidence; missing respondent metadata; exact band boundaries; same capability/different confidence.

**Definition of Done.** AC1–AC5 pass; language avoids unsupported certainty; factors and limitations display accessibly; traceability is complete.

### S3-004 — Executive Summary

**Background.** Executives need a concise interpretation of the most material results, not a transcript of the assessment.

**User story.** As an executive, I want an evidence-grounded summary so that I can understand delivery health, confidence, priorities, and implications quickly.

**Business rules.** Summary facts derive only from structured approved outputs. It includes overall position, confidence caveat, leading strengths, priority opportunities, and next-step orientation. Tone is clear, neutral, constructive, and non-alarmist. Contradictions and low confidence are disclosed. Identical facts and narrative-template version produce equivalent semantic narrative.

**Technical notes.** Prefer deterministic templates or tightly constrained generation from an allow-listed fact bundle. Persist template/model/prompt version if generative technology is used. Validate that every factual sentence maps to fact IDs.

**Acceptance criteria.**

- AC1: Summary covers approved mandatory sections and respects length limits per mode.
- AC2: Every factual assertion resolves to source facts.
- AC3: Low-confidence and unavailable-data cases use approved caveats.
- AC4: No customer, benchmark, or causal claim is invented.
- AC5: Output is safe for empty, tied, and contradictory results.

**API considerations.** Return structured sections plus optional rendered text, not HTML-only content. Include fact and trace references.

**Data model impacts.** Add `narrative_output` with type, audience, template version, facts, rendered text, and trace links.

**Test scenarios.** Strong/weak/mixed profiles; low confidence; ties; no eligible strength; no eligible weakness; unsafe markup; deterministic rerun; public length/policy.

**Definition of Done.** AC1–AC5 pass; product-approved narrative snapshots pass; accessibility and injection tests pass; unsupported assertions are mechanically detectable.

### S3-005 — Strength and Weakness Analysis

**Background.** Users need prioritised areas of relative strength and improvement rather than undifferentiated score lists.

**User story.** As a delivery leader, I want ranked strengths and improvement opportunities so that I can focus attention appropriately.

**Business rules.** Classification uses approved absolute thresholds and tie-breakers; “weakness” is presented as “priority opportunity” in customer copy unless explicitly approved. Low-confidence items are labelled or excluded. Ranking is deterministic. Default maximums are configurable. A capability cannot be both a strength and opportunity in one run.

**Technical notes.** Store classification reason, rank components, score, confidence, and rule ID. Do not rank solely by array position or rounded values.

**Acceptance criteria.**

- AC1: Approved thresholds and tie-breakers produce expected classifications.
- AC2: Rankings remain stable for identical inputs.
- AC3: Confidence policy is applied and visible.
- AC4: Each item includes a concise evidence-grounded reason.
- AC5: Empty and tied sets render without misleading filler.

**API considerations.** Provide ordered `strengths` and `opportunities` with stable IDs, ranks, reasons, and trace references.

**Data model impacts.** Add `capability_finding` or equivalent classification record.

**Test scenarios.** Threshold edges; ties; all strong; all low; no eligible items; low confidence; rounding collision; capability version change.

**Definition of Done.** AC1–AC5 pass; ranking golden tests pass; terminology is consistent across API, dashboard, report, and public mode.

### S3-006 — Pattern Detection

**Background.** Cross-capability combinations can reveal material delivery conditions that individual scores do not.

**User story.** As a delivery leader, I want approved patterns identified so that I can understand connected systemic issues and opportunities.

**Business rules.** Only versioned catalogue patterns may be emitted. Each pattern declares prerequisites, evidence minimum, confidence rule, severity/priority, mutually exclusive groups, and explanation. Absence of a pattern is not proof of the opposite. Multiple matches are de-duplicated and ordered deterministically.

**Technical notes.** Implement declarative predicates where feasible. Validate catalogue references before activation. Record evaluated rule and decisive facts, including failed prerequisites where needed for audit.

**Acceptance criteria.**

- AC1: Every approved positive and negative fixture matches expected patterns.
- AC2: Unmet evidence minimum prevents a positive match.
- AC3: Conflicting/mutually exclusive patterns resolve by configured policy.
- AC4: Each detection includes rule version, evidence, confidence, and explanation.
- AC5: Unknown or invalid rules fail closed and are observable.

**API considerations.** Return detected patterns only to customer views; audit endpoints may return evaluation detail subject to permission.

**Data model impacts.** Add `pattern_detection` and optionally `pattern_evaluation` linked to run and catalogue version.

**Test scenarios.** Exact match; one missing predicate; boundary; low evidence; overlapping; exclusive; invalid capability reference; catalogue rollback.

**Definition of Done.** AC1–AC5 pass; full catalogue fixture coverage exists; invalid configuration cannot be promoted; lineage feeds S3-013.

### S3-007 — Recommendation Engine

**Background.** Intelligence creates value when it becomes prioritised, feasible action.

**User story.** As a delivery leader, I want prioritised recommendations with reasons, impact, and effort so that I know what to do next.

**Business rules.** Recommendations come only from the approved catalogue and trigger policy. Eligibility considers findings, patterns, confidence, prerequisites, exclusions, and tenant-safe context. Ranking uses configured impact, urgency, effort, confidence, dependencies, and tie-breakers. De-duplicate overlapping actions. Each recommendation includes why, expected outcome, evidence, success measures, and dependencies. No automatic execution occurs.

**Technical notes.** Separate eligibility from ranking. Persist component scores before presentation rounding. Configuration changes create a new result version, never mutate past results.

**Acceptance criteria.**

- AC1: Golden fixtures produce the expected eligible set and order.
- AC2: Exclusions, prerequisites, and confidence gates are enforced.
- AC3: Duplicate or overlapping catalogue actions resolve by policy.
- AC4: Every recommendation has evidence, reason, impact, effort, success measure, and rule version.
- AC5: No recommendation is invented outside the active catalogue.

**API considerations.** Provide stable recommendation IDs and structured rank components; filtering cannot bypass eligibility policy.

**Data model impacts.** Add `recommendation_result`, `recommendation_rank_component`, and evidence links.

**Test scenarios.** Single/multiple triggers; exclusion; missing prerequisite; tie; duplicate; low confidence; no recommendation; catalogue version change; malicious catalogue content.

**Definition of Done.** AC1–AC5 and DIQ-201 conformance tests pass; catalogue validation and audit views exist; all recommendations feed roadmap and traceability.

### S3-008 — Improvement Roadmap

**Background.** A ranked list still requires sequencing into a practical improvement path.

**User story.** As a delivery leader, I want a 30/60/90-day roadmap so that I can begin improvements in a coherent order.

**Business rules.** Only eligible recommendations may enter the roadmap. Dependencies precede dependants. The 30-day horizon favours foundations and safe quick wins; 60-day favours embedding; 90-day favours scaling and measuring. Capacity is configurable. Unresolved dependency cycles block publication. Roadmap dates are indicative unless explicitly scheduled by a user.

**Technical notes.** Use a deterministic dependency-aware scheduler. Preserve the ranked source and explain any sequencing override. Do not claim delivery estimates from effort labels alone.

**Acceptance criteria.**

- AC1: All roadmap items reference an eligible recommendation.
- AC2: Dependencies and configured capacity are respected.
- AC3: Sequence overrides include a reason.
- AC4: Cycles and impossible plans return a clear actionable error.
- AC5: Every horizon includes intended outcome and success measure where items exist.

**API considerations.** Return ordered horizons and unscheduled items with reason codes. Future user edits require a separate contract and do not overwrite generated baseline.

**Data model impacts.** Add `roadmap`, `roadmap_item`, horizon, position, source rank, dependency links, and scheduling reason.

**Test scenarios.** Linear/branching dependencies; capacity limits; cycle; no recommendations; all quick wins; high-impact prerequisite; deterministic tie.

**Definition of Done.** AC1–AC5 pass; dependency graph tests pass; empty and partial plans are usable; roadmap lineage is complete.

### S3-009 — Knowledge Pack Recommendations

**Background.** Some findings require deeper specialist diagnosis through a relevant Knowledge Pack.

**User story.** As a delivery leader, I want relevant Knowledge Packs recommended so that I can investigate priority areas in more depth.

**Business rules.** Recommend only active, available packs from approved mappings. A pack recommendation explains the detected need, expected diagnostic value, evidence, and eligibility. It is not represented as a completed diagnosis. Duplicates are merged; unavailable packs may be retained only as non-actionable internal signals, never broken customer links.

**Technical notes.** Map findings/patterns/recommendations to pack IDs through versioned configuration. Check tenant/product availability after domain eligibility without leaking catalogue restrictions.

**Acceptance criteria.**

- AC1: Golden profiles produce expected pack recommendations.
- AC2: Inactive, incompatible, or unavailable packs are not actionable.
- AC3: Duplicate triggers merge with aggregated reasons and evidence.
- AC4: Each displayed pack states why deeper diagnosis is useful.
- AC5: Recommendation order is deterministic and traceable.

**API considerations.** Return pack ID/version, availability, reason, expected value, CTA capability, and traces; do not embed mutable catalogue copy unnecessarily.

**Data model impacts.** Add `knowledge_pack_recommendation` and trigger links.

**Test scenarios.** One/multiple triggers; unavailable pack; duplicate mapping; no pack; tenant entitlement; retired version; catalogue title change.

**Definition of Done.** AC1–AC5 pass; catalogue/entitlement integration tests pass; copy distinguishes recommendation from diagnosis.

### S3-010 — TeamMate Recommendations

**Background.** TeamMates can help implement or sustain improvements after diagnosis.

**User story.** As a delivery leader, I want relevant TeamMates suggested so that I can understand where digital execution support may help.

**Business rules.** Recommend only approved TeamMate types mapped to eligible outcomes. A suggestion describes the job to be supported, expected value, prerequisites, and evidence. It must not imply activation, guaranteed outcomes, or access. Availability and permissions govern CTA. Duplicate triggers merge.

**Technical notes.** Use versioned mappings from recommendations/outcomes, not raw score shortcuts. Keep recommendation separate from TeamMate runtime or conversational memory.

**Acceptance criteria.**

- AC1: Approved fixtures produce expected TeamMate suggestions.
- AC2: Missing prerequisites, availability, or permission disables activation CTA safely.
- AC3: Each suggestion maps to one or more eligible recommendations/outcomes.
- AC4: Duplicate triggers merge and ranking is deterministic.
- AC5: No TeamMate task executes as a side effect of analysis.

**API considerations.** Return TeamMate type ID, reason, supported outcome, prerequisites, availability, CTA state, and traces.

**Data model impacts.** Add `teammate_recommendation` and source links; do not create runtime instances.

**Test scenarios.** Available/unavailable; missing prerequisite; duplicate; no suggestion; entitlement; cross-tenant catalogue access; prohibited auto-activation.

**Definition of Done.** AC1–AC5 pass; runtime boundary and permission tests pass; recommendation copy is product-approved.

### S3-011 — Delivery Intelligence Dashboard

**Background.** Authenticated users require a coherent result experience rather than disconnected engine records.

**User story.** As an authorised workspace user, I want a clear dashboard of delivery intelligence so that I can understand and act on the assessment result.

**Business rules.** The dashboard displays analysis status, executive summary, scores, confidence, strengths, opportunities, patterns, recommendations, roadmap, Knowledge Packs, TeamMates, and explanations according to permissions. Partial/failed sections never masquerade as complete. Display ordering follows engine output. No calculation occurs in the client.

**Technical notes.** Build a stable, cacheable read model. Support loading, empty, stale, failed, and superseded states. Use semantic components and progressive disclosure. Deep links use opaque IDs and re-authorise every request.

**Acceptance criteria.**

- AC1: An authorised user can view every available MVP output in a coherent hierarchy.
- AC2: Unauthorised and cross-tenant access is denied without leakage.
- AC3: Loading, empty, low-confidence, partial, failed, and superseded states are explicit.
- AC4: Client values reconcile exactly with the canonical result.
- AC5: Core flow passes accessibility and responsive-layout checks.

**API considerations.** Prefer `GET /analysis-runs/{id}/result?view=workspace` or equivalent projection with ETag/version. Avoid N+1 calls and expose no internal secrets or rule source.

**Data model impacts.** Usually a projection/materialised read model; user acknowledgement/bookmarking is outside scope unless already supported.

**Test scenarios.** Full/partial/failed run; slow network; small screen; keyboard/screen reader; stale ETag; permission change; cross-tenant ID; large output.

**Definition of Done.** AC1–AC5 pass; end-to-end journey and visual regression tests pass; analytics exclude sensitive evidence; no client-side business logic duplication.

### S3-012 — Explainable Intelligence

**Background.** Customers must be able to understand why a conclusion or recommendation exists.

**User story.** As a decision-maker, I want to inspect the reason and evidence behind intelligence so that I can trust and challenge it responsibly.

**Business rules.** Every score, pattern, finding, recommendation, Knowledge Pack, and TeamMate suggestion exposes a customer-appropriate explanation: conclusion, why, decisive evidence, capability/score context, confidence, and rule/result version. Sensitive respondent details are redacted by permission. Explainability is not raw internal code or hidden reasoning.

**Technical notes.** Resolve explanations from S3-013 lineage and approved labels. Use stable reason codes and structured evidence summaries. Prevent prompt/system details, secrets, and cross-tenant identifiers from rendering.

**Acceptance criteria.**

- AC1: Every displayed conclusion has a resolvable explanation.
- AC2: Evidence links open only when the user is authorised.
- AC3: Redacted evidence remains useful and clearly labelled.
- AC4: Explanation matches the exact result/rule version shown.
- AC5: Missing lineage causes the affected conclusion to fail quality validation, not display an invented reason.

**API considerations.** Provide summary explanation inline and a permission-checked detail endpoint/projection. Rate-limit evidence expansion if necessary.

**Data model impacts.** Prefer derived explanation projections over duplicated text; persist approved narrative outputs and reason codes.

**Test scenarios.** Each output type; redaction; revoked permission; missing trace; superseded run; public mode; malicious answer text; deep link tampering.

**Definition of Done.** AC1–AC5 pass; automated trace coverage reports 100%; product, security, and accessibility reviews pass.

### S3-013 — Delivery Intelligence Traceability

**Background.** Auditability requires an unbroken chain from source answer through calculation and rule decisions to every output.

**User story.** As an authorised reviewer, I want end-to-end intelligence lineage so that I can reproduce and audit conclusions.

**Business rules.** Every node has a stable type and ID; every edge has a defined relationship. Required chain is answer/evidence → capability contribution → score/confidence → finding/pattern → recommendation → roadmap/Knowledge Pack/TeamMate → narrative/presentation. Lineage is immutable per run, tenant-scoped, and versioned. Deletion/retention policy must preserve lawful audit metadata without retaining prohibited content.

**Technical notes.** A relational edge model or generated graph is acceptable if integrity and query performance meet requirements. Validate no orphan customer-visible outputs. Store hashes and version identifiers sufficient for reproduction.

**Acceptance criteria.**

- AC1: Every visible intelligence item resolves backwards to evidence and forwards to dependent outputs.
- AC2: No cross-run or cross-tenant edge can be created or read.
- AC3: Integrity validation detects orphan, invalid-type, and cyclic edges where cycles are prohibited.
- AC4: A completed run records all configuration and algorithm versions needed for reproduction.
- AC5: Authorised audit export is complete, structured, and redacted by policy.

**API considerations.** Expose permission-specific lineage projections, pagination, depth limits, and stable node/edge types. Audit exports are authenticated and logged.

**Data model impacts.** Add `trace_node`, `trace_edge`, or equivalent typed relations; indexes include tenant/run/source/target/type.

**Test scenarios.** Full backward/forward traversal; orphan; invalid edge; prohibited cycle; tenant crossing; deleted/redacted answer; large graph; version reproduction; audit export.

**Definition of Done.** AC1–AC5 pass; referential and semantic integrity checks run in CI and before result publication; DIQ-202 conformance is documented.

### S3-014 — Delivery DNA Public Mode

**Background.** Delivery DNA is a controlled public slice of the shared platform, not a second intelligence engine.

**User story.** As a public Delivery DNA participant, I want a concise, safe preview of my results so that I receive immediate value and understand the benefit of the full workspace.

**Business rules.** Public mode may expose overall score/band, high-level summary, up to three strengths, up to three opportunities, preview recommendations, confidence caveat, and registration prompt. It must not expose full evidence, detailed capability analysis, complete recommendations/roadmap, audit explorer, restricted Knowledge Pack content, TeamMate activation, organisation history, or internal metadata. Disclosure is server-side, deny-by-default, and versioned. Registration/account linking must not alter the original analysis.

**Technical notes.** Apply a tested projection policy to the canonical result. Use short-lived/opaque access tokens, rate limiting, cache controls, abuse monitoring, and noindex rules where appropriate. Never accept a client flag as authorisation for workspace fields.

**Acceptance criteria.**

- AC1: Public projection contains only allow-listed fields and configured item limits.
- AC2: The same canonical result powers public and workspace views without recalculation.
- AC3: Attempts to request hidden fields or change mode are rejected server-side.
- AC4: Public links/tokens expire or revoke according to policy and do not reveal tenant identifiers.
- AC5: Public content includes confidence and limitations without exposing raw evidence.

**API considerations.** Use a dedicated public projection route/token audience; apply strict response schema, rate limits, cache headers, and generic errors. Workspace endpoints continue to require authentication.

**Data model impacts.** Add versioned `disclosure_policy` and optional `public_result_access` token metadata; never duplicate result records.

**Test scenarios.** Exact allow list; over-fetch/query tampering; expired/revoked token; guessed ID; caching; low confidence; fewer than three items; XSS; registration linking; comparison to workspace result.

**Definition of Done.** AC1–AC5 pass; automated schema-diff proves no restricted field leakage; penetration/privacy/accessibility tests pass; no duplicated intelligence logic exists.

## 11. Cross-story Dependency Map

```text
S3-001 Pipeline
  ├─> S3-002 Scoring ─> S3-003 Confidence
  │      ├─> S3-005 Strengths/Weaknesses ─┐
  │      └─> S3-004 Executive Summary     │
  └────────> S3-006 Pattern Detection     │
                                             v
                                      S3-007 Recommendations
                                        ├─> S3-008 Roadmap
                                        ├─> S3-009 Knowledge Packs
                                        └─> S3-010 TeamMates

S3-001..010 ─> S3-013 Traceability ─> S3-012 Explainability
S3-002..012 ─> S3-011 Dashboard
S3-004..013 ─> S3-014 Public Mode
```

Recommended delivery gates: foundation (001–003), intelligence (005–007 plus 013), action (004 and 008–010), experience (011–012), public projection (014). Traceability is designed from S3-001 and completed alongside each story, not bolted on at the end.

## 12. Non-functional Requirements

- **Availability:** analysis failure must not corrupt assessment data; retries are safe.
- **Reliability:** completed results are immutable; publication is atomic.
- **Compatibility:** contracts are versioned; additive evolution is preferred.
- **Maintainability:** domain rules have stable IDs, schemas, validation, and owners.
- **Observability:** correlate request, job, analysis run, tenant-safe subject, duration, version, outcome, and stable error code. Do not log raw answers by default.
- **Accessibility:** WCAG 2.2 AA for core result journeys, including keyboard use, focus, headings, contrast, text alternatives, error announcements, and non-colour score meaning.
- **Internationalisation:** customer text is externalisable; numbers/dates are locale-aware; stored values remain locale-neutral.
- **Resilience:** timeouts, bounded retries, dead-letter handling, cancellation, and recovery runbook.
- **Data quality:** configuration validation and golden fixtures block invalid rule-set promotion.

## 13. Security Requirements

1. Enforce authentication and authorisation on every non-public operation.
2. Scope every query, mutation, cache key, job, event, and trace to tenant and workspace.
3. Use least-privilege service identities and existing secrets management.
4. Validate all identifiers, schemas, lengths, enums, and content; encode output to prevent injection.
5. Do not expose raw errors, internal rules, prompts, secrets, stack traces, sequential IDs, or other tenants’ metadata.
6. Encrypt data in transit and at rest using platform standards.
7. Make audit events append-only and record access to detailed evidence/export.
8. Apply retention, deletion, consent, and data-subject policies to assessment evidence and derived data.
9. Public access uses opaque scoped credentials, expiry/revocation, rate limiting, and abuse detection.
10. Dependency, SAST, secret, access-control, and tenant-isolation checks must pass before release.

## 14. Performance Requirements

Reference targets apply to the agreed production-like dataset and environment and must be measured, not assumed.

| Operation | Target |
|---|---|
| Create/replay analysis request | p95 ≤ 500 ms excluding queued processing |
| MVP analysis, up to 250 answers/25 capabilities/100 active rules | p95 ≤ 5 s; p99 ≤ 10 s |
| Workspace result read, warm | p95 ≤ 800 ms |
| Public result projection, warm | p95 ≤ 500 ms |
| Explanation detail | p95 ≤ 800 ms |
| Trace traversal, depth ≤ 5 and ≤ 1,000 edges | p95 ≤ 1 s |
| Result payload | ≤ 1 MB uncompressed by default; paginate large collections |

No request may perform unbounded graph traversal or N+1 database access. Load tests cover concurrent runs, result reads, idempotency contention, and public abuse limits. Degradation must preserve correctness and security.

## 15. Explainability Requirements

- Every conclusion carries a stable output ID, reason code, plain-language reason, evidence references, confidence, and rule/result version.
- A score explanation shows eligible inputs, weights/contributions, exclusions, denominator, calculation precision, and band rule subject to permission.
- A recommendation explanation shows trigger, affected capability/outcome, ranking factors, prerequisites, and success measure.
- Customer explanations reveal rationale, not proprietary source code or hidden model reasoning.
- Generative text, if used, is constrained to a structured fact bundle and undergoes factual trace validation.
- A conclusion with incomplete lineage cannot be published.

## 16. UX Expectations

- Lead with executive meaning, then enable progressive drill-down.
- Recommended hierarchy: status → summary → scores/confidence → strengths/opportunities → patterns → actions/roadmap → Knowledge Packs/TeamMates → explanation.
- Use supportive language and never shame respondents or imply certainty beyond confidence.
- Show score, band, confidence, and “why” together where feasible.
- Charts must have text/table equivalents and not rely on colour alone.
- Preserve user context while expanding explanations; provide visible close/back behaviour.
- Clearly distinguish unavailable, not applicable, insufficient evidence, processing, failed, and restricted.
- Public mode is concise and transparent about what registration unlocks; avoid dark patterns.
- Responsive layouts support 320 CSS px width through large desktop; touch targets and focus states meet accessibility standards.

## 17. Example Assessment Payloads and Expected Outputs

The examples illustrate contracts and invariants, not final approved weights or thresholds. Golden fixtures must replace illustrative values before production promotion.

### 17.1 Canonical analysis request

```json
{
  "assessmentId": "asmt_01JEXAMPLE",
  "assessmentRevision": 3,
  "tenantId": "tenant_example",
  "workspaceId": "workspace_example",
  "knowledgePack": {"id": "delivery-dna", "version": "1.0.0"},
  "completedAt": "2026-08-02T09:30:00Z",
  "responses": [
    {"answerId": "a1", "questionId": "q-governance-01", "value": 2, "notApplicable": false},
    {"answerId": "a2", "questionId": "q-planning-01", "value": 4, "notApplicable": false},
    {"answerId": "a3", "questionId": "q-risk-01", "value": 3, "notApplicable": false}
  ],
  "requestedMode": "workspace",
  "idempotencyKey": "asmt_01JEXAMPLE:3:engine-1.0.0"
}
```

### 17.2 Expected canonical result shape

```json
{
  "analysisRunId": "run_01JEXAMPLE",
  "status": "completed",
  "versions": {
    "engine": "1.0.0",
    "scoring": "score-rules-1.0.0",
    "confidence": "confidence-rules-1.0.0",
    "recommendations": "recommendations-1.0.0",
    "traceability": "trace-schema-1.0.0"
  },
  "overall": {"rawScore": 3.0, "displayScore": 3.0, "band": "developing"},
  "confidence": {
    "index": 0.78,
    "band": "moderate",
    "factors": [{"code": "coverage", "value": 1.0}, {"code": "breadth", "value": 0.55}],
    "limitations": ["Limited respondent breadth"]
  },
  "capabilities": [
    {"id": "governance", "rawScore": 2.0, "band": "priority", "confidence": "moderate"},
    {"id": "planning", "rawScore": 4.0, "band": "strength", "confidence": "moderate"},
    {"id": "risk", "rawScore": 3.0, "band": "developing", "confidence": "moderate"}
  ],
  "strengths": [{"capabilityId": "planning", "reasonCode": "score_above_strength_threshold"}],
  "opportunities": [{"capabilityId": "governance", "reasonCode": "score_below_priority_threshold"}],
  "patterns": [{"id": "planning_governance_imbalance", "confidence": "moderate"}],
  "recommendations": [{
    "id": "rec_governance_cadence",
    "rank": 1,
    "impact": "high",
    "effort": "medium",
    "why": "Governance evidence is below the approved priority threshold.",
    "successMeasures": ["Decision forums have defined owners and cadence"],
    "traceIds": ["trace_rec_1"]
  }],
  "roadmap": {"day30": ["rec_governance_cadence"], "day60": [], "day90": []},
  "knowledgePacks": [{"id": "governance", "reason": "Deeper governance diagnosis is indicated"}],
  "teamMates": [{"id": "executive-teammate", "reason": "Support governance cadence and decision follow-through"}]
}
```

### 17.3 Expected public projection

```json
{
  "resultId": "public_result_opaque",
  "overall": {"displayScore": 3.0, "band": "developing"},
  "confidence": {"band": "moderate", "caveat": "The result is based on limited respondent breadth."},
  "summary": "Your delivery foundations are developing. Planning is a relative strength; governance is the clearest improvement opportunity.",
  "strengths": [{"title": "Planning", "summary": "Planning evidence is comparatively strong."}],
  "opportunities": [{"title": "Governance", "summary": "Clarify decision ownership and cadence."}],
  "recommendationPreviews": [{"title": "Establish a governance cadence", "impact": "high"}],
  "registrationPrompt": {"label": "Unlock your full DeliveryIQ report"}
}
```

The public response must not contain answer IDs, tenant/workspace IDs, raw evidence, detailed traces, full roadmap, entitlement data, internal rank components, or hidden catalogue fields.

## 18. Traceability to the Delivery Intelligence Engine

| Sprint output | DIQ-200 concern | DIQ-201 concern | DIQ-202 lineage |
|---|---|---|---|
| Canonical run | Orchestration and versioned execution | — | Evidence/run root |
| Scores | Capability analysis and maturity scoring | Input signal | Answer → contribution → score |
| Confidence | Confidence scoring | Ranking constraint | Metadata/evidence → factor → confidence |
| Patterns/findings | Pattern recognition, strengths/weaknesses | Trigger input | Score/evidence → finding/pattern |
| Recommendations | Recommendation trigger hand-off | Eligibility, priority, action content | Finding/pattern → recommendation |
| Roadmap | Improvement output | Dependencies and sequencing | Recommendation → roadmap item |
| Knowledge Packs | Deeper-diagnosis recommendation | Mapping and priority | Trigger → pack recommendation |
| TeamMates | Execution-support recommendation | Mapping and priority | Recommendation/outcome → TeamMate |
| Narrative/dashboard | Executive insight and presentation | Action presentation | All displayed facts → source nodes |
| Public mode | Shared engine, controlled product slice | Preview-only action view | Projection → canonical output |

## 19. Sprint Acceptance Checklist

- [ ] S3-001 through S3-014 have Product Review and Founder Acceptance records.
- [ ] All acceptance criteria and story Definitions of Done pass.
- [ ] Golden assessment fixtures and expected outputs are approved and passing.
- [ ] 100% visible-output lineage validation passes.
- [ ] Idempotency, concurrency, retry, and immutable-result tests pass.
- [ ] Tenant isolation and permission tests pass at API, job, cache, and trace layers.
- [ ] Public disclosure schema-diff and over-fetch tests pass.
- [ ] Security, privacy, accessibility, performance, and resilience gates pass.
- [ ] Database migrations have forward and rollback/mitigation plans.
- [ ] APIs, schemas, rule versions, telemetry, and runbooks are documented.
- [ ] No duplicate scoring, recommendation, or public-mode calculation exists.
- [ ] Known limitations and technical debt are accepted explicitly.
- [ ] DIQ-000 references PB-003.

## 20. Release Checklist

- [ ] Release candidate is built from an approved revision with clean CI.
- [ ] Production rule/configuration versions are signed off and immutable.
- [ ] Migration rehearsal and backup/restore checks are complete.
- [ ] Feature flags and disclosure policy default to safe/off where applicable.
- [ ] Secrets, service permissions, rate limits, queues, and indexes are configured.
- [ ] Dashboards and alerts cover failure rate, latency, queue age, orphan traces, tenant denials, and public abuse.
- [ ] Support, incident, rollback, replay, and configuration rollback runbooks are ready.
- [ ] Smoke tests cover one workspace run, explanation, dashboard, public projection, expiry, and cross-tenant denial.
- [ ] Release notes identify contract/config versions and known limitations.
- [ ] Product Owner authorises release and Matt Prust records final acceptance.
- [ ] Post-release validation and metric review are scheduled.

## 21. Risks and Assumptions

| Risk/assumption | Impact | Control/response |
|---|---|---|
| Approved scoring or catalogue rules are not available | Incorrect product behaviour | Use illustrative fixtures only; block production promotion until Product Owner approves versioned configuration |
| Existing schema/API differs from examples | Rework or incompatibility | Adapt implementation to existing conventions without changing playbook semantics; record contract mapping |
| Confidence is mistaken for capability | Misleading decisions | Separate models, copy, UI, and tests |
| Narrative invents unsupported claims | Trust and legal risk | Structured facts, templates, trace validator, constrained generation |
| Rule changes alter historical results | Audit failure | Immutable run snapshots and explicit re-analysis as a new run |
| Public mode leaks detailed intelligence | Privacy/IP/commercial harm | Server-side allow list, schema tests, opaque scoped tokens, security review |
| Trace graph becomes expensive | Latency/cost | Indexed relations, bounded traversal, projections, load tests |
| Recommendation catalogue conflicts | Unstable or contradictory action | Validation, exclusions, deduplication, deterministic priority |
| Low evidence creates false precision | Poor decisions | Insufficient-evidence states and confidence caveats |
| Tenant scope is lost in background work/cache | Data breach | Tenant keys everywhere, policy enforcement, adversarial tests |
| Sprint scope is large | Partial integration | Deliver in dependency gates; do not accept isolated stories as sprint completion |

Assumptions: assessment capture and identity/tenancy foundations already exist; controlled documents named in Section 1 will be supplied to engineers; product configuration is data-driven and separately approvable; the examples in this document are non-normative until promoted as golden fixtures.

## 22. Appendices

### Appendix A — Canonical vocabulary

- **Evidence:** a versioned assessment answer or approved contextual fact.
- **Capability score:** calculated maturity measure for a defined capability.
- **Confidence:** strength of evidential support, independent of capability level.
- **Finding:** classified strength or priority opportunity.
- **Pattern:** approved relationship across multiple facts or outputs.
- **Recommendation:** approved action selected and ranked by DIQ-201 rules.
- **Knowledge Pack:** specialist diagnostic content recommended for deeper investigation.
- **TeamMate:** digital colleague type recommended for execution support.
- **Trace:** typed, versioned relationship between evidence, processing, and output.
- **Canonical result:** immutable complete result before audience-specific projection.
- **Disclosure policy:** server-side rule defining fields permitted for an audience.

### Appendix B — Stable error taxonomy

| Code | Meaning | Retryable |
|---|---|---|
| `ANALYSIS_INPUT_INCOMPLETE` | Assessment is not complete or required evidence is missing | No, until corrected |
| `ANALYSIS_VERSION_UNAVAILABLE` | Required pack/rule version cannot be resolved | No, until restored |
| `ANALYSIS_IDEMPOTENCY_CONFLICT` | Same key was used for different input | No |
| `ANALYSIS_CONFIGURATION_INVALID` | Active configuration failed validation | No |
| `ANALYSIS_EXECUTION_FAILED` | Internal execution failed safely | Potentially |
| `ANALYSIS_TRACE_INCOMPLETE` | A visible output lacks required lineage | No, until defect fixed |
| `ANALYSIS_ACCESS_DENIED` | Caller cannot access the requested resource | No |
| `PUBLIC_RESULT_EXPIRED` | Public access credential is expired/revoked | No |

### Appendix C — Story acceptance record template

```text
Record ID: SAR-003-___
Story: S3-___
Implementation revision:
Status: Proposed | Product Reviewed | Founder Accepted | Rejected
Acceptance criteria evidence:
Architecture review: Pass | Fail
Security review: Pass | Fail
Test review: Pass | Fail
Known limitations:
Technical debt:
Product Owner review:
Accepted by: Matt Prust
Acceptance date:
```

### Appendix D — Implementation report template

```text
Story ID and summary
Architecture and reuse assessment
Files created/modified
Database/API/service changes
Configuration/rule versions
Tests and results
Acceptance-criteria mapping
Security/tenant-isolation evidence
Performance evidence
Traceability evidence
Known limitations and technical debt
Product questions
```

### Appendix E — Definition of Ready

A story is ready when its objective, user story, rules, acceptance criteria, dependencies, out-of-scope boundary, test scenarios, Definition of Done, data/API impact, and architecture references are understood; required product configuration exists; and unresolved conflicts are either closed or explicitly accepted.

### Appendix F — Global Definition of Done

A story is done only when its acceptance criteria pass; appropriate unit, integration, failure, edge, security, and regression tests pass; documentation and migrations are complete; architecture and tenant isolation are preserved; observability is present; no unauthorised product behaviour was invented; an implementation report is produced; and the story receives the required acceptance record.

---

**End of controlled document PB-003 v1.0 — LOCKED**
