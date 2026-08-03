# PDR-003-003 — Delivery DNA 1.0.0 Collection Journey

| Control | Value |
|---|---|
| Decision ID | PDR-003-003 |
| Version | 1.0 |
| Status | **LOCKED** |
| Owner | Product Owner |
| Architecture authority | Chief Solution Architect |
| Approval | Product Owner and Chief Solution Architect, 3 August 2026 |
| Classification | Internal — Controlled |
| Machine-readable authority | DIQ-203C v1.0.0 |

> **Lean decision notice.** This record resolves the only missing customer rule required to build the genuine Delivery DNA 1.0.0 collection journey: approved en-GB wording and presentation for the 39 question IDs already locked by DIQ-203A. It does not change scoring, weights, taxonomy, confidence, analysis, eligibility, recommendations or traceability. Engineering may implement immediately without another routine product approval.

## 1. Authority

Apply this order:

1. DIQ-002 Product Architecture v1.0 — LOCKED.
2. PB-003 Sprint 03 Playbook v1.0 — LOCKED.
3. DIQ-203, DIQ-203A and DIQ-203B v1.0 — LOCKED.
4. PDR-003-001 and PDR-003-002 v1.0 — LOCKED within their scope.
5. [DIQ-203C Delivery DNA 1.0.0 Question Catalogue](<../01-product/delivery-intelligence/configuration/DIQ-203C Delivery DNA 1.0.0 Question Catalogue.json>) — LOCKED customer wording authority.
6. This decision for collection-journey presentation and priority.
7. Existing implementation where it does not conflict with the above.

DIQ-203A remains the machine authority for capability IDs, labels, display order, question IDs, required flags and weights. DIQ-203C must match that contract exactly and supplies only customer wording and response presentation.

## 2. Approved Decision

1. DIQ-203C v1.0.0 is approved as the exact en-GB customer-facing question catalogue for Delivery DNA 1.0.0.
2. The journey uses assessment type `delivery-dna`, Knowledge Pack `delivery-dna` v1.0.0, question set `delivery-dna` v1.0.0 and configuration set `sprint03-product-config-1.0.0`.
3. The manifest contains all 39 DIQ-203A IDs exactly once and no other question ID.
4. Capability order is DIQ-203A order; within each capability the order is foundation (`.f`), practice (`.p`), evidence (`.e`).
5. The response scale is the locked integer scale 1–5. DIQ-203C supplies customer labels and descriptions but does not change transformation or scoring.
6. `answered`, `not_applicable`, `missing` and `excluded` retain all DIQ-203 and PDR-003-002 semantics.
7. The genuine Delivery DNA collection journey is the next customer-value priority ahead of PB-005. PB-005 remains RC1 and is not implementation authority.

## 3. Customer Response Presentation

The journey must present the DIQ-203C introduction, instructions, dimension guidance and response labels exactly.

### 3.1 Answered

The customer selects one integer response from 1 to 5. Only this status contributes to scoring.

### 3.2 Not applicable

**Not applicable** is customer-selectable only where the question genuinely does not apply. Selection records status `not_applicable`, stable reason code `customer_declared_not_applicable` and mandatory concise reason text. It contributes neither numerator nor denominator and may reduce capability availability or confidence.

### 3.3 Missing

An unanswered question becomes canonical status `missing` at completion and is shown as **Not answered**. It is not silently converted to 1, 3, not applicable or excluded. Completion may proceed after the exact DIQ-203C missing-evidence acknowledgement. Missing evidence may reduce confidence or make a capability/overall result unavailable.

### 3.4 Excluded

Excluded is not a customer response option. Only an authorised existing quality or evidence-control path may record `excluded` with one of the locked DIQ-203 reasons. Customer presentation uses the safe labels in DIQ-203C. Exclusion contributes neither numerator nor denominator.

## 4. Wording Principles

The approved wording is:

- executive-friendly and suitable for en-GB;
- about the organisation's current observable position rather than aspiration;
- neutral and non-leading;
- separated into foundation, routine practice and evidence;
- applicable across delivery methods and sectors;
- free of scoring thresholds, recommendations and internal rule language; and
- not derived from the historical 36-question draft or the legacy `executive-sponsorship` questionnaire.

Editorial punctuation or accessibility markup must not alter question meaning or IDs. A substantive wording change requires a new DIQ-203C version and Product Owner approval; it does not require a new scoring configuration unless the locked mechanics change.

## 5. Minimum Safe Implementation

Engineering must:

1. create a new Delivery DNA journey rather than modify, translate or relabel the legacy `delivery-maturity` journey;
2. render the exact DIQ-203C catalogue in locked order with accessible progress, response controls, not-applicable reason entry, review and completion states;
3. persist the exact identity tuple and 39-ID manifest required by PDR-003-002;
4. preserve answer/status/value, required flag, capability mapping, answer/evidence timestamp and respondent-group metadata supported by the assessment runtime;
5. canonicalise unanswered manifest entries as `missing` at completion;
6. prevent customers selecting `excluded` or submitting invalid values/reasons;
7. use the PDR-003-001 automatic analysis hand-off only after PDR-003-002 returns `eligible`;
8. keep legacy assessments terminally ineligible without copying their answers;
9. preserve authentication, tenant isolation, privacy, accessibility and immutable assessment revision behaviour; and
10. reuse existing assessment runtime components where they satisfy the locked contract.

No separate questionnaire engine, scoring path, recommendation path or legacy mapping is authorised.

## 6. Lean Acceptance Evidence

Required evidence is limited to:

- a machine-contract test proving DIQ-203C has the same 13 capabilities, 39 unique IDs, mappings, flags and weights as DIQ-203A;
- rendering and submission tests for all five answers and the three non-answer statuses;
- validation of required not-applicable reason text and non-customer-selectable exclusion;
- completion with answered, missing and not-applicable evidence while preserving the exact manifest;
- one valid Delivery DNA completion reaching `eligible` and the automatic analysis request path;
- legacy completion remaining `ineligible` with no translation or retry;
- tenant, permission, keyboard, label, error and narrow-screen coverage for the core journey;
- unchanged DIQ-203B and PDR-003-002 regression results;
- type checking, changed-file lint/format and production build; and
- the existing acceptance matrix and final implementation report updated with results.

Do not create a new governance package or per-question implementation reports.

## 7. Priority and Handoff

This journey is the highest-value current adoption blocker and is approved as the next implementation priority. Work may begin immediately and continue through deployment and proportionate verification without another readiness or planning approval.

PB-005 implementation remains behind this journey until the genuine Delivery DNA 1.0.0 collection, completion, eligibility and automatic analysis path is usable and deployed, or the Product Owner explicitly changes priority.

## 8. Change History

| Version | Date | Change | Approval |
|---|---|---|---|
| 1.0 | 3 August 2026 | Approved exact customer wording and minimal journey presentation for all 39 locked DIQ-203A IDs; prioritised implementation ahead of PB-005 | Product Owner / Chief Solution Architect |

---

**End of PDR-003-003 v1.0 — LOCKED**
