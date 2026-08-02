# DIQ-203 — Sprint 03 Product Configuration Specification

| Control | Value |
|---|---|
| Document ID | DIQ-203 |
| Version | 1.0 |
| Status | **LOCKED** |
| Owner | Product Owner |
| Product approval | Product Owner, 2 August 2026 |
| Final approval | Matt Prust, 2 August 2026 |
| Classification | Internal — Controlled |
| Machine-readable configuration | [DIQ-203A](<configuration/DIQ-203A Sprint 03 Production Configuration.json>) |
| Golden acceptance fixtures | [DIQ-203B](<configuration/DIQ-203B Sprint 03 Golden Fixtures.json>) |

> **Controlled-document notice.** This specification is the approved product definition requested by PB-003. Matt Prust approved version 1.0 without amendments on 2 August 2026. It is authoritative for Sprint 03 implementation subject to DIQ-002 and PB-003. Changes require a versioned amendment, impact assessment, regenerated affected fixtures, Product Owner review, and final approval. No numeric or catalogue rule in this package is inherited from DIQ-200, DIQ-201, or DIQ-202; those documents remain draft outlines.

## 1. Purpose

Define the exact, versioned product rules required to implement PB-003 stories S3-001 through S3-014. Prose defines intent and governance. DIQ-203A is authoritative for machine values. DIQ-203B is authoritative for golden inputs and exact expected projections. If prose and DIQ-203A differ, stop and obtain a controlled correction; neither silently overrides the other.

## 2. Authority Audit and Conflict Resolution

| Document | Status found | Rules actually present | Resolution |
|---|---|---|---|
| DIQ-002 v1.0 | LOCKED | Platform boundaries, shared-engine rule, explainability, Delivery DNA disclosure principle | Fully authoritative; DIQ-203 conforms |
| PB-003 v1.0 | LOCKED | Required behaviours, stories, acceptance gates, illustrative examples | Authoritative Sprint contract; illustrative numeric examples remain non-normative |
| DIQ-200 v0.1 | DRAFT — OUTLINE | Engine purpose, responsibilities, headings and release gates | No formula, taxonomy or catalogue to reuse; DIQ-203 supplies Sprint 03 values |
| DIQ-201 v0.1 | DRAFT — OUTLINE | Recommendation responsibilities and required fields | No trigger, rank or roadmap formula; DIQ-203 supplies Sprint 03 values |
| DIQ-202 v0.1 | DRAFT — OUTLINE | Minimum lineage record and release gate | No node/edge schema or redaction policy; DIQ-203 supplies Sprint 03 values |

No content conflict was found. Matt Prust’s approval resolves the former governance-status condition, and DIQ-203 is now fully production-approved and locked. DIQ-203 does not promote or amend the draft parent documents.

## 3. Configuration Set and Immutability

The production set ID is `sprint03-product-config-1.0.0`. Any value change requires a new semantic version and new golden-fixture baseline.

Every analysis snapshot must include SHA-256 digests and versions for:

- capability taxonomy and question mappings;
- scoring and band rules;
- confidence factors and bands;
- finding and pattern rules;
- recommendation catalogue and ranking policy;
- roadmap policy;
- Knowledge Pack and TeamMate mapping catalogues;
- narrative templates;
- trace schema and redaction policy;
- disclosure policy;
- lifecycle/error/API policy.

## 4. Capability Scoring

### 4.1 Taxonomy

The MVP has thirteen equally weighted capabilities, in stable display order:

1. `strategy_alignment` — Strategy and Alignment
2. `governance` — Governance and Decision-Making
3. `sponsorship` — Executive Sponsorship and Accountability
4. `portfolio` — Portfolio Direction and Prioritisation
5. `programme_delivery` — Programme Delivery
6. `project_delivery` — Project Delivery
7. `planning_controls` — Planning and Controls
8. `benefits` — Benefits Realisation
9. `risk_assurance` — Risk and Assurance
10. `stakeholder_change` — Stakeholder and Change Leadership
11. `pmo_enablement` — PMO Enablement
12. `reporting_insight` — Reporting and Delivery Insight
13. `continuous_improvement` — Continuous Improvement

### 4.2 Question mapping

The canonical Delivery DNA MVP contains three questions per capability: foundation (`.f`), practice (`.p`), and evidence (`.e`). Stable IDs and exact mappings are in DIQ-203A. Every question maps to exactly one capability. Question weights within a capability are `0.30`, `0.40`, and `0.30` respectively.

### 4.3 Response eligibility and transformation

- Eligible answer values are integers `1` through `5` with status `answered`.
- `not_applicable` contributes neither numerator nor denominator and requires a reason code.
- `excluded` contributes neither numerator nor denominator and requires an approved exclusion reason: `superseded`, `invalidated`, `duplicate`, or `quality_review`.
- Missing required evidence does not become zero. A capability score is unavailable when fewer than two of its three questions are eligible or eligible question weight is below `0.60`.
- Optional contextual text never changes the numeric score in Sprint 03.
- Transformation is linear: `normalised = (answer - 1) / 4 * 100`.
- Capability raw score is the weighted mean of eligible normalised answers, renormalising remaining eligible weights to 1.0.
- Overall raw score is the equal-weight mean of available capability raw scores. It is unavailable if fewer than nine capabilities are available.
- Store calculations to at least six decimal places. Round only display values using decimal half-up to one decimal place.

### 4.4 Bands

Bands use raw, unrounded scores and lower-inclusive boundaries:

| Raw score | Band | Customer label |
|---|---|---|
| `0 ≤ x < 25` | `fragile` | Fragile |
| `25 ≤ x < 50` | `developing` | Developing |
| `50 ≤ x < 75` | `established` | Established |
| `75 ≤ x ≤ 100` | `leading` | Leading |

## 5. Delivery Confidence Index

Confidence measures evidential support, not delivery capability.

### 5.1 Factors and weights

| Factor | Weight | Exact calculation |
|---|---:|---|
| `required_completion` | 0.35 | Eligible required answers / required questions |
| `capability_coverage` | 0.25 | Available capabilities / 13 |
| `response_consistency` | 0.20 | Mean capability consistency; for each available capability `1 - min(population SD of eligible normalised values / 50, 1)` |
| `evidence_recency` | 0.10 | Mean eligible evidence recency value: ≤90 days `1`; 91–180 `0.75`; 181–365 `0.50`; >365 `0.25`; missing `0` |
| `respondent_breadth` | 0.10 | Distinct verified respondent groups: 1=`0.40`, 2=`0.70`, ≥3=`1.00`; missing=`0` |

Index is `100 × sum(factor value × factor weight)`, stored to six decimals and displayed half-up to the nearest integer.

### 5.2 Required metadata

Answer status, question required flag, answer/evidence timestamp, verified respondent-group ID, and capability mapping. Missing recency or breadth metadata produces a factor value of zero and the corresponding limitation; it does not make capability scores unavailable.

### 5.3 Bands, limitations, and prompts

| Index | Band |
|---|---|
| `0 ≤ x < 50` | `low` |
| `50 ≤ x < 75` | `moderate` |
| `75 ≤ x ≤ 100` | `high` |

Stable limitation/prompt pairs:

- `incomplete_required_evidence` → “Some required evidence is missing.” / “Complete the unanswered required questions.”
- `limited_capability_coverage` → “The evidence does not cover enough delivery capabilities.” / “Provide evidence across all Delivery DNA capabilities.”
- `inconsistent_responses` → “Some responses within a capability vary materially.” / “Review the underlying evidence with relevant stakeholders.”
- `stale_evidence` → “Some evidence may no longer reflect current practice.” / “Refresh evidence older than 180 days.”
- `limited_respondent_breadth` → “The result represents a limited range of perspectives.” / “Invite evidence from at least three relevant stakeholder groups.”

A limitation is emitted when its factor value is below `0.75`. Factor independence is mandatory: changing answer scores without changing completion, coverage, within-capability spread, timestamps, or respondent groups must not change confidence.

## 6. Strengths and Priority Opportunities

- A strength requires capability raw score `≥75` and capability confidence contribution `≥50`.
- A priority opportunity requires capability raw score `<50` and capability confidence contribution `≥50`.
- A capability with confidence contribution `<50` is not classified; it receives `insufficient_evidence`.
- Strength rank: score descending, confidence descending, taxonomy display order ascending, capability ID ascending.
- Opportunity rank: score ascending, confidence descending, taxonomy display order ascending, capability ID ascending.
- Workspace maximum: five strengths and five priority opportunities.
- Public maximum: three of each.
- Customer term is **priority opportunity**. “Weakness,” “failure,” and “poor performer” are prohibited customer labels.

Capability confidence contribution is the weighted confidence index recalculated using only completion, consistency, and recency evidence relevant to that capability, rescaled to 100; respondent breadth remains analysis-wide and is not used to classify a capability.

## 7. Pattern Catalogue

DIQ-203A contains the exact predicates. The approved catalogue is:

| ID | Version | Meaning | Priority | Exclusive group |
|---|---|---|---|---|
| `pat_governance_sponsorship_gap` | 1.0.0 | Governance and sponsorship are both priority opportunities | critical | `leadership_control_state` |
| `pat_execution_without_control` | 1.0.0 | Delivery execution exceeds governance and controls materially | high | `delivery_balance_state` |
| `pat_strategy_execution_disconnect` | 1.0.0 | Strategic alignment is established but programme/project delivery is not | high | `delivery_balance_state` |
| `pat_benefits_blind_spot` | 1.0.0 | Benefits and reporting are both below established | high | `value_visibility_state` |
| `pat_resilient_delivery_foundation` | 1.0.0 | Governance, planning/controls, and risk are all established or leading | positive | `leadership_control_state` |
| `pat_learning_system` | 1.0.0 | Reporting and continuous improvement are both leading | positive | `value_visibility_state` |

All constituent capabilities must be available and have capability confidence contribution `≥50`. Critical/high patterns win over positive patterns in the same exclusive group; otherwise higher numeric priority wins, then catalogue order. Absence is never described as the opposite. Exact customer-safe explanations are in DIQ-203A.

## 8. Recommendation Framework

### 8.1 Catalogue

| ID | Action | Default impact | Effort | Depends on |
|---|---|---|---|---|
| `rec_decision_rights` | Define decision rights and governance cadence | high | medium | — |
| `rec_sponsor_contract` | Establish an active sponsor contract | high | medium | — |
| `rec_integrated_controls` | Establish an integrated planning and controls baseline | high | high | `rec_decision_rights` |
| `rec_portfolio_priorities` | Establish transparent portfolio prioritisation | high | high | `rec_decision_rights` |
| `rec_benefits_ownership` | Assign benefits ownership and measures | high | medium | `rec_decision_rights` |
| `rec_risk_assurance` | Strengthen risk escalation and assurance | high | medium | `rec_decision_rights` |
| `rec_change_engagement` | Establish stakeholder and change leadership | medium | medium | `rec_sponsor_contract` |
| `rec_delivery_insight` | Create an outcome-led delivery insight pack | medium | low | — |
| `rec_improvement_cadence` | Establish a continuous-improvement cadence | medium | low | `rec_delivery_insight` |
| `rec_deepen_diagnosis` | Gather deeper specialist evidence | medium | low | — |

### 8.2 Eligibility, gates, ranking, and deduplication

Exact triggers and exclusions are in DIQ-203A. General rules:

- A catalogue trigger requires a matching priority opportunity or approved pattern.
- High-confidence recommendation: analysis confidence `≥75`; moderate: `50–74.999999`; low: `<50`.
- At low confidence, material actions with effort `medium` or `high` are withheld and `rec_deepen_diagnosis` is eligible. Low-effort evidence-gathering actions may be shown with caveat.
- Exclusions are evaluated before triggers; prerequisites affect scheduling, not eligibility, unless explicitly marked `eligibilityPrerequisite`.
- Rank score is `0.40 impact + 0.25 urgency + 0.15 confidence + 0.10 effortEase + 0.10 dependencyReadiness`, each component on `0..100`.
- Impact mapping: low `25`, medium `60`, high `90`. Urgency comes from trigger: critical pattern `100`, high pattern `80`, opportunity score `<25` `90`, otherwise `65`. Confidence component equals the confidence index. Effort ease: low `100`, medium `60`, high `25`. Dependency readiness: all dependencies eligible or none `100`, otherwise `40`.
- Rank by raw rank score descending, impact descending, urgency descending, effort ease descending, catalogue order ascending, recommendation ID ascending.
- Recommendations sharing a `dedupeGroup` merge into the lowest catalogue-order canonical item; triggers/evidence aggregate and the highest impact/urgency wins.
- Every recommendation includes expected outcome and at least one exact success measure from DIQ-203A.

## 9. Improvement Roadmap

- Capacity: day 30 maximum three items; day 60 maximum three; day 90 maximum four.
- Schedule eligible recommendations by dependency topological order, then recommendation rank.
- Day 30 accepts prerequisite-free low/medium effort items and foundations required by later items.
- Day 60 accepts medium effort items whose dependencies are in day 30 or earlier, plus high-effort foundations when capacity remains.
- Day 90 accepts high-effort/strategic items and dependants whose prerequisites are in earlier horizons.
- A dependency always precedes its dependant, even when this overrides rank; reason `dependency_precedence` is recorded.
- Unresolved cycles block roadmap publication with `ROADMAP_DEPENDENCY_CYCLE`.
- Eligible items exceeding capacity are returned in `unscheduled` with `capacity_exceeded`; items with a missing/ineligible dependency use `dependency_unavailable`.
- Generated horizons are indicative and do not assert delivery dates.

## 10. Knowledge Pack Recommendations

Approved pack types for Sprint 03 preview are `governance`, `executive_sponsor`, `planning_controls`, `benefits`, `risk_assurance`, `stakeholder_change`, `pmo_effectiveness`, and `portfolio`. Exact recommendation and capability mappings are in DIQ-203A.

- Domain eligibility is calculated independently of availability and entitlement.
- Only `active` packs may have an enabled CTA.
- Entitled + active → `start_assessment`; not entitled + active → `view_pack`; unavailable/inactive → no CTA and no customer card.
- Duplicate triggers merge. Rank by source recommendation rank, then lowest mapped capability score, then pack catalogue order.
- Copy template: “Explore the {Pack name} Knowledge Pack to examine {diagnostic value} in more depth.”
- Never state that the pack has diagnosed a condition before completion.

## 11. TeamMate Recommendations

Approved preview types: `executive`, `pmo`, `portfolio`, `reporting`, `raid`, and `meeting`.

- TeamMates map from eligible recommendations/outcomes, never directly from raw answers.
- Exact mappings are in DIQ-203A.
- Prerequisite: authenticated workspace and at least one accepted mapped recommendation for activation. Public mode may show no TeamMate details in Sprint 03.
- Available + entitled + `teammate.activate` permission → `review_activation`; available but not entitled → `view_teammate`; otherwise CTA disabled or card suppressed by disclosure mode.
- Recommendation never activates a TeamMate or creates memory/workflow state.
- Copy template: “The {TeamMate name} can help your team {supported outcome}. Review its scope and permissions before activation.”

## 12. Executive Narrative

### 12.1 Mandatory workspace sections and limits

1. `overall_position` — 45 words maximum.
2. `confidence` — 35 words maximum.
3. `strengths` — 30 words per item, maximum five.
4. `priority_opportunities` — 35 words per item, maximum five.
5. `recommended_next_steps` — 40 words per item, maximum five.

Total rendered workspace narrative maximum is 600 words. Public summary maximum is 80 words and uses at most one leading strength and one priority opportunity in prose; cards retain PB-003 item limits.

### 12.2 Deterministic templates

Templates and exact tokens are in DIQ-203A. Facts are inserted only from allow-listed fields. Approved tone is executive, neutral, constructive, concise, evidence-led, and non-alarmist.

Required low-confidence caveat: “This result is directional because the available evidence has low confidence. Validate the priority areas before committing material action.”

Unavailable-score caveat: “An overall delivery position is not available because fewer than nine capabilities have sufficient evidence.”

Prohibited claims include causal certainty, guarantees, legal/regulatory compliance, comparisons to other organisations, predictive success/failure, respondent intent, fabricated root causes, and any fact absent from the structured result.

## 13. Explainability and Redaction

Every customer-visible conclusion requires: `outputId`, `outputType`, `reasonCode`, `reasonText`, `evidenceSummary`, `capabilityIds`, `confidenceBand`, `ruleId`, `ruleVersion`, `configurationSetId`, `analysisRunId`, and `traceIds`.

### 13.1 Evidence summaries

- Workspace `assessment_viewer`: capability label, eligible answer count, total question count, score/band, and aggregated answer distribution; no respondent identity.
- Workspace `assessment_auditor`: above plus question labels, answer values/status, timestamp, exclusion reason, and pseudonymous respondent-group ID.
- `tenant_admin`: auditor view plus internal evidence IDs; never secrets or other tenants.
- Public: no raw answers, question IDs, distributions, respondent information, timestamps, internal evidence IDs, trace IDs, or rule components.

### 13.2 Restricted internal information

Source code, SQL, prompts/system messages, secret values, internal exception detail, proprietary rule expression text, other tenants’ aggregates, raw rank component weights in public mode, and security/entitlement reasons are never customer-visible. Customer explanations describe the approved rationale, not hidden chain-of-thought.

Redacted/deleted evidence retains a salted tenant-scoped hash, type, capability, version, and deletion marker only when lawful retention policy permits it.

## 14. Public Delivery DNA Disclosure

The server-side allow-list is exact and recursive:

- `schemaVersion`
- `resultId` (public opaque ID)
- `generatedAt`
- `overall.displayScore`
- `overall.band`
- `confidence.band`
- `confidence.caveat`
- `summary`
- `strengths[].title`
- `strengths[].summary`
- `opportunities[].title`
- `opportunities[].summary`
- `recommendationPreviews[].title`
- `recommendationPreviews[].impact`
- `recommendationPreviews[].summary`
- `registrationPrompt.label`
- `registrationPrompt.destination`

All other fields are denied. Limits: three strengths, three opportunities, three recommendation previews.

- Token is 256-bit cryptographically random, stored hashed, audience `delivery-dna-public-result`, single result scope, lifetime 24 hours.
- Revocation occurs on user request, result invalidation, security event, or account-link completion. Expired/revoked tokens return generic `PUBLIC_RESULT_UNAVAILABLE`.
- Response cache: `Cache-Control: private, no-store`; no CDN/shared caching; no browser persistence by DeliveryIQ beyond the active session.
- Rate limits per token: 30 requests/minute and 300/24 hours. Per IP: 60/minute and 1,000/24 hours. Exceeding either returns `429` with generic copy.
- Abuse controls: opaque non-sequential IDs, constant-shape errors, enumeration monitoring, token/IP velocity alerts, WAF rules, output encoding, payload size limits, and manual revocation.
- Registration links a result only after verified account authentication and explicit consent. It creates an access relationship to the immutable run; it does not copy, recalculate, or mutate it. One result may link to one tenant/workspace; support-mediated reassignment requires an audit event.
- Approved prompt: **“Create your free DeliveryIQ account to unlock your full report, improvement roadmap and recommended next steps.”**
- Approved destination is the configured first-party route `/register?source=delivery-dna&result={publicResultId}`; the server exchanges the public token after authentication rather than placing it in the URL.

## 15. S3-001 Lifecycle and API Contract

### 15.1 Lifecycle and retry

States: `queued → running → completed`; `queued|running → failed`; `failed → queued` only through an authorised retry; `completed` is terminal and immutable. A lease-expired `running` job may be reclaimed and continues the same run attempt sequence. Maximum automatic attempts: three total, exponential backoff 5 seconds then 30 seconds. Configuration/input validation errors are never retried automatically. A new approved configuration or assessment revision creates a new run.

### 15.2 Analysis revision and idempotency

`assessmentRevision` is an immutable positive integer incremented whenever an answer status/value, evidence timestamp, respondent-group attribution, question/pack version, completion state, or approved exclusion changes after the previous snapshot. Editorial display-label changes do not increment it.

Canonical idempotency key:

```text
sha256(tenantId + "\n" + workspaceId + "\n" + assessmentId + "\n" + assessmentRevision + "\n" + configurationSetId + "\n" + requestedMode)
```

The client may supply this key or the server may derive it. Reuse with byte-equivalent canonical input returns the existing run. Reuse with different input returns `ANALYSIS_IDEMPOTENCY_CONFLICT`.

### 15.3 Snapshot and API

Snapshot fields: canonical evidence, tenant/workspace/assessment IDs, revision, completion timestamp, pack/question versions, respondent groups, exclusions, requested mode, every configuration component version/digest, engine version, schema version, canonical input hash, idempotency key, initiator, consent basis, and creation time.

`POST /analysis-runs` is asynchronous: new accepted request returns `202` with run ID/status/location; completed idempotent replay returns `200`; queued/running replay returns `202`. `GET /analysis-runs/{id}` returns lifecycle status. No synchronous calculation endpoint is approved for Sprint 03.

### 15.4 Stable error taxonomy

| Code | HTTP | Retry | Meaning |
|---|---:|---|---|
| `ANALYSIS_INPUT_INCOMPLETE` | 422 | after correction | Required assessment state/evidence is incomplete |
| `ANALYSIS_INPUT_INVALID` | 422 | after correction | Canonical input violates schema or mapping |
| `ANALYSIS_VERSION_UNAVAILABLE` | 409 | after restoration | Required immutable version cannot be resolved |
| `ANALYSIS_IDEMPOTENCY_CONFLICT` | 409 | no | Key was reused with different canonical input |
| `ANALYSIS_CONFIGURATION_INVALID` | 503 | after operator correction | Active configuration fails validation |
| `ANALYSIS_EXECUTION_TRANSIENT` | 503 | automatic | Retryable internal dependency/worker failure |
| `ANALYSIS_EXECUTION_FAILED` | 500 | manual after review | Non-retryable safe execution failure |
| `ANALYSIS_TRACE_INCOMPLETE` | 500 | after defect correction | Publishable output lacks mandatory lineage |
| `ANALYSIS_ACCESS_DENIED` | 404 | no | Resource is not visible to caller; non-enumerating |
| `ROADMAP_DEPENDENCY_CYCLE` | 422 | after config correction | Eligible roadmap graph contains a cycle |
| `PUBLIC_RESULT_UNAVAILABLE` | 404 | no | Public token/result expired, revoked, invalid, or hidden |
| `PUBLIC_RATE_LIMITED` | 429 | after window | Public request exceeded approved limit |

## 16. Traceability Contract

Node types: `evidence`, `question`, `capability_contribution`, `capability_score`, `overall_score`, `confidence_factor`, `confidence_result`, `finding`, `pattern`, `recommendation`, `roadmap_item`, `knowledge_pack_recommendation`, `teammate_recommendation`, `narrative_fact`, `presentation_item`.

Edge types: `answers`, `maps_to`, `contributes_to`, `aggregates_into`, `supports`, `limits`, `triggers`, `ranks`, `depends_on`, `scheduled_as`, `recommends`, `renders_as`, `supersedes`.

Allowed source/target pairs are defined in DIQ-203A. Every node carries tenant ID, workspace ID, analysis run ID, stable domain ID, domain version, configuration set ID, and content hash. Cross-tenant/run edges are invalid. Cycles are prohibited except `supersedes` chains, which must remain acyclic themselves. Publication requires all visible outputs to have a reverse path to at least one evidence node and their governing rule node/version.

## 17. Golden Acceptance Data

DIQ-203B contains exact machine-readable input and expected assertion projections. The fixtures cover:

- score minimum, midpoint, maximum, missing/optional/excluded/not-applicable cases;
- every score and confidence band boundary;
- confidence independence;
- strength/opportunity ties;
- positive and negative cases for all six patterns;
- recommendation triggers, gates, exclusions, prerequisites, ties, and deduplication;
- roadmap dependency, capacity, and cycle behaviour;
- Knowledge Pack and TeamMate mappings;
- low-confidence narrative;
- full trace integrity;
- exact workspace-versus-public disclosure.

Fixture expected output is scoped by `assertionProjection`. Fields outside that projection are intentionally not asserted; within it, the expected JSON is exact and order-sensitive unless `orderSensitive` is false. These are production acceptance tests after final approval, not illustrative examples.

## 18. Change History

| Version | Date | Change | Product approval | Final approval |
|---|---|---|---|---|
| 1.0 | 2 August 2026 | Initial complete Sprint 03 product configuration; RC1 approved without amendments and promoted | Approved | Approved by Matt Prust |

## 19. Decision Request

### DR-203-001 — Final production lock — RESOLVED

**Decision:** Option A approved by Matt Prust on 2 August 2026 without amendments.

- **Option A — Approve and lock 1.0.** Codex may implement exactly DIQ-203/203A and use DIQ-203B as the production acceptance baseline. Consequence: Sprint 03 can proceed immediately; later changes require versioning and regression review.
- **Option B — Approve with named amendments.** Provide exact rule/catalogue changes. Consequence: Product Owner issues RC2 and regenerates affected fixtures before engineering proceeds on those areas.
- **Option C — Reject and defer.** Consequence: implementation remains limited to rule-agnostic infrastructure; Sprint 03 customer-visible intelligence stays blocked.

**Consequence:** DIQ-203, DIQ-203A, and DIQ-203B are promoted to their final version 1.0 baselines. Codex may implement the approved rules and use DIQ-203B as the production acceptance baseline.

---

**End of DIQ-203 v1.0 — LOCKED**
