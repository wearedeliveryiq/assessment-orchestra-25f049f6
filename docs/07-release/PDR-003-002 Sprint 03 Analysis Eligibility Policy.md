# PDR-003-002 — Sprint 03 Analysis Eligibility Policy

| Control        | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decision ID    | PDR-003-002                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Version        | 1.0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Status         | **LOCKED**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Sprint         | Sprint 03                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Decision owner | Product Owner                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Approved by    | Matt Prust                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Decision date  | 2 August 2026                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Classification | Internal — Controlled                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Authority      | [DIQ-002](<../00-master-index/DIQ-002 Product Architecture.md>), [PB-003](<../02-playbooks/PB-003 Sprint 03 Playbook.md>), [DIQ-203](<../01-product/delivery-intelligence/DIQ-203 Sprint 03 Product Configuration Specification.md>), [DIQ-203A](<../01-product/delivery-intelligence/configuration/DIQ-203A Sprint 03 Production Configuration.json>), [DIQ-203B](<../01-product/delivery-intelligence/configuration/DIQ-203B Sprint 03 Golden Fixtures.json>), [PDR-003-001](<PDR-003-001 Sprint 03 Analysis Trigger Policy.md>) |

> **Controlled-decision notice.** This decision is the locked Product Owner authority for deciding whether a completed assessment may enter `sprint03-product-config-1.0.0`. It clarifies PDR-003-001 without weakening DIQ-203 validation. Changes require a versioned amendment, impact assessment, Product Owner review, final approval, and DIQ-000 update.

## 1. Decision Summary

Only a completed, immutable Delivery DNA assessment created from the approved Delivery DNA `1.0.0` pack and exact `1.0.0` question-set manifest may enter `sprint03-product-config-1.0.0`.

Eligibility is evaluated deterministically before an analysis run is requested. An intrinsically incompatible assessment receives terminal hand-off status `ineligible`; it does not create a new analysis run and is never automatically or manually retried against this configuration. Existing immutable failed runs remain unchanged.

Legacy `delivery-maturity` assessments, including those using the `executive-sponsorship` `1.4.0` question set, remain outside Sprint 03 Delivery DNA intelligence. Customers may start a new governed Delivery DNA assessment. No response translation, inferred mapping, or silent migration is approved.

## 2. Authority and Conflict Resolution

The authority order is:

1. DIQ-002 Product Architecture v1.0 — LOCKED.
2. PB-003 Sprint 03 Playbook v1.0 — LOCKED.
3. DIQ-203, DIQ-203A and DIQ-203B v1.0 — LOCKED.
4. PDR-003-001 v1.0 — APPROVED.
5. This decision.

This record fills an eligibility and customer-experience gap. It does not amend scoring, evidence transformation, run lifecycle, idempotency, disclosure, or fail-closed validation. If an implementation convention conflicts with this decision, the controlled authorities prevail.

## 3. Canonical Eligibility Contract

### 3.1 Required identity and state

An assessment is eligible only when all conditions below are true for the same immutable assessment revision and tenant-scoped configuration snapshot.

| Field or condition        | Required value or rule                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Completion state          | `completed`; completion transaction committed and immutable revision available                                        |
| Assessment type           | `delivery-dna`                                                                                                        |
| Knowledge Pack ID         | `delivery-dna`                                                                                                        |
| Knowledge Pack version    | `1.0.0`                                                                                                               |
| Question-set ID           | `delivery-dna`                                                                                                        |
| Question-set version      | `1.0.0`                                                                                                               |
| Configuration set         | `sprint03-product-config-1.0.0`                                                                                       |
| Configuration status      | Locked version resolvable and integrity-valid                                                                         |
| Question compatibility    | Exact canonical manifest equality under Section 3.2                                                                   |
| Tenant/workspace          | Assessment, revision, completion event, eligibility record and request belong to the same authorised tenant/workspace |
| Required version metadata | Present, syntactically valid, immutable and resolvable; never inferred from answer shape or creation date             |

Identifiers are exact, case-sensitive values after schema-level canonical string validation. Aliases, display names and approximate version matching are not accepted.

### 3.2 Exact 39-question manifest rule

DIQ-203A v1.0.0 defines 13 capabilities with three questions each. Eligibility requires set equality between the assessment question-set manifest and the 39 configured question IDs:

```text
assessment.manifest.questionIds == DIQ-203A.capabilities[*].questions[*].id
```

Set equality means:

- all 39 configured `ddna.*` IDs occur exactly once in the assessment manifest;
- no configured ID is absent;
- no additional, aliased, legacy or unknown question ID is present;
- every manifest entry resolves to the same question-set ID and version;
- duplicate IDs, mixed versions and unverifiable manifest digests are incompatible.

The manifest rule does not require 39 answered values. The immutable canonical evidence snapshot must represent every configured ID exactly once using a DIQ-203-approved status: `answered`, `not_applicable`, `excluded`, or `missing`. DIQ-203 continues to govern values, reasons, capability availability and overall availability. Missing, excluded or not-applicable evidence may reduce availability or confidence but does not by itself make a correctly versioned manifest ineligible.

Response rows may not introduce an ID outside the manifest. Unknown IDs, duplicate canonical evidence records, invalid statuses, invalid values, or unapproved reasons remain fail-closed `ANALYSIS_INPUT_INVALID` conditions.

### 3.3 Evaluation result

Eligibility evaluation produces an immutable, tenant-scoped record containing:

- `eligibilityDecisionId`;
- tenant, workspace, assessment and assessment revision IDs;
- completion-event ID;
- requested configuration-set ID;
- assessment type, pack ID/version and question-set ID/version;
- question-set manifest digest and configured manifest digest;
- status `eligible` or `ineligible`;
- one primary safe reason code and zero or more ordered secondary reason codes;
- policy ID `PDR-003-002`, policy version `1.0`, evaluator version and timestamp;
- correlation ID and, when applicable, resulting analysis run ID.

Identical immutable input and policy/configuration versions must return or reuse the same semantic eligibility decision. A new assessment revision or approved configuration/policy version creates a new decision; it never mutates an earlier decision.

## 4. Hand-off Status and Retry Policy

`ineligible` is the approved terminal completion-to-analysis hand-off status. It is not an analysis-run state and must not be represented by creating a placeholder analysis run.

| Eligibility outcome                                           | Hand-off behaviour                                                         | Retry behaviour                                                                                 |
| ------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Eligible                                                      | Create or reuse the canonical PDR-003-001 analysis request                 | Existing idempotent lifecycle applies                                                           |
| Intrinsically incompatible                                    | Persist/reuse `ineligible`; do not enqueue                                 | No automatic retry and no **Retry analysis** action                                             |
| Required version/configuration temporarily cannot be resolved | Do not label intrinsically ineligible; record operational hand-off failure | Recover only after the immutable version is restored, under existing authorised recovery policy |
| Incomplete assessment                                         | Do not evaluate as completed hand-off                                      | Complete/correct assessment; no analysis request yet                                            |

`skipped` is not approved because it obscures whether the omission was intentional, temporary or incompatible.

## 5. Safe Reason Codes

Reason codes are stable API/audit values. Customer interfaces use the approved copy in Section 6 and must not expose internal predicates, raw IDs belonging to another tenant, stack traces, SQL, configuration contents or answer data.

| Code                                       | Terminal `ineligible` | Meaning                                                                                                             |
| ------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `ANALYSIS_ASSESSMENT_TYPE_INELIGIBLE`      | Yes                   | Assessment type is not `delivery-dna`                                                                               |
| `ANALYSIS_PACK_ID_INELIGIBLE`              | Yes                   | Pack ID is not `delivery-dna`                                                                                       |
| `ANALYSIS_PACK_VERSION_INELIGIBLE`         | Yes                   | Pack version is not exactly `1.0.0`                                                                                 |
| `ANALYSIS_QUESTION_SET_ID_INELIGIBLE`      | Yes                   | Question-set ID is not `delivery-dna`                                                                               |
| `ANALYSIS_QUESTION_SET_VERSION_INELIGIBLE` | Yes                   | Question-set version is not exactly `1.0.0`                                                                         |
| `ANALYSIS_QUESTION_SET_INCOMPATIBLE`       | Yes                   | Manifest does not exactly equal the configured 39-ID set                                                            |
| `ANALYSIS_ELIGIBILITY_METADATA_MISSING`    | Yes                   | Required assessment/pack/question-set identity metadata is absent or unversioned                                    |
| `ANALYSIS_ELIGIBILITY_TENANT_MISMATCH`     | Yes                   | Scoped records do not belong to one authorised tenant/workspace; return non-enumerating access behaviour externally |

Reason precedence is tenant mismatch, missing metadata, assessment type, pack ID, pack version, question-set ID, question-set version, then manifest incompatibility. All matched reasons may be audited in this order, but customer copy remains outcome-based.

`ANALYSIS_VERSION_UNAVAILABLE` and `ANALYSIS_CONFIGURATION_INVALID` remain DIQ-203 operational errors, not intrinsic eligibility reasons. `ANALYSIS_INPUT_INVALID` remains the fail-closed analysis validation error when an invalid request reaches the engine. Eligibility prevents known incompatible requests but is not a substitute for engine validation.

## 6. Customer Experience

### 6.1 Primary copy

**Heading:** Delivery Intelligence isn’t available for this assessment

**Body:** This assessment was completed using an earlier or different question set that isn’t compatible with the current Delivery DNA analysis. Your assessment is complete and your responses are safe.

### 6.2 Available actions

| Action                              | Rule                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **View assessment**                 | Available when the user may view the completed legacy assessment                                                          |
| **Start a Delivery DNA assessment** | Primary action when the tenant has an active, entitled Delivery DNA `1.0.0` assessment journey and the user may create it |
| **Contact support**                 | Available through the configured safe support route; include an opaque correlation reference, not internal error detail   |

Do not show **Retry analysis**, **Generate intelligence**, indefinite processing copy, or “No analysis result is available yet” for terminal `ineligible` hand-offs. Do not imply that existing answers will be copied, translated or reused. If a new Delivery DNA journey is unavailable or the user lacks permission, suppress or disable that action with established permission-safe behaviour.

Status must be accessible without colour, announced appropriately to assistive technology, keyboard operable, responsive, and phrased without blaming the customer.

## 7. Legacy Assessment Policy

Legacy `delivery-maturity` assessments and the `executive-sponsorship` question set version `1.4.0` are permanently outside `sprint03-product-config-1.0.0`.

The approved customer route is reassessment: preserve the legacy result and offer a new Delivery DNA `1.0.0` assessment when available and authorised. The new assessment has its own ID, revision, consent, answers, completion event, eligibility decision and analysis run.

No automatic migration, response copying, score conversion, inferred correspondence or legacy-to-`ddna.*` mapping is approved. Any future migration or cross-assessment synthesis requires a separate controlled specification, explicit mappings, consent/privacy review, golden fixtures, traceability, versioning and final approval.

## 8. Completion Trigger and Reconciler

1. The durable completion consumer evaluates eligibility before requesting analysis.
2. It persists or reuses the eligibility decision using tenant, workspace, assessment, revision, configuration set and policy version as the deterministic identity.
3. Only `eligible` may invoke the PDR-003-001 request contract.
4. `ineligible` acknowledges the completion hand-off as terminally resolved and creates no analysis job, queue message or automatic retry schedule.
5. Duplicate completion events and concurrent consumers reuse the same eligibility record and produce no duplicate run or terminal event.
6. The reconciler selects only completed assessments whose hand-off is unresolved, or eligible hand-offs missing their expected run after the approved recovery window.
7. The reconciler excludes terminal `ineligible` decisions and known non-retryable incompatible failed runs.
8. A new assessment revision is independently evaluated. A mere service restart, clock passage, reconciliation scan or repeated event does not create a new decision.
9. Eligibility records and events contain tenant-safe identifiers and safe codes; no raw answers are logged.

Operational metrics distinguish `eligible_requested`, `eligible_hand_off_failed`, `ineligible_terminal` and `eligibility_evaluation_failed`. Alerts must not treat expected terminal ineligibility as a stuck-analysis incident.

## 9. Existing Failed Run Treatment

Analysis run `b822ce85-f2bf-4cde-ba2f-b8abc31713cf` remains immutable with its original terminal failure, `ANALYSIS_INPUT_INVALID`, attempts, timestamps, input/configuration snapshot and events unchanged.

Engineering must:

1. verify the run belongs to the tenant/workspace and assessment revision being remediated before linking any record;
2. create an immutable `ineligible` eligibility decision for that same tenant-scoped assessment revision under PDR-003-002 v1.0;
3. append a tenant-scoped remediation/audit event that references the failed run and eligibility decision and records safe reason codes for legacy type/pack/question-set incompatibility;
4. mark the completion-to-analysis hand-off resolved by the eligibility decision without changing the analysis run row, status, error, attempt count or historic events;
5. suppress automatic/manual retry and present the Section 6 experience;
6. preserve the failed run for audit and support access subject to existing permissions and retention policy.

If ownership or revision linkage cannot be proven, do not link or remediate the run automatically; record a non-mutating operational exception for authorised review.

## 10. Security, Privacy and Tenant Isolation

- Every lookup and write is constrained by tenant and workspace before assessment or run existence is disclosed.
- Cross-tenant identifiers receive established non-enumerating denial behaviour and create a security audit signal.
- Eligibility must be calculated server-side from immutable authoritative metadata and the pinned manifest, never trusted from a client-supplied Boolean.
- Customer copy and support references reveal no question IDs, configuration predicates, other-tenant data or internal exception detail.
- Reassessment requires normal authentication, authorisation, entitlement and consent; ineligibility grants no additional access.
- Audit and observability records exclude raw responses and secrets.

## 11. Required Verification

### 11.1 Unit tests

- Exact accepted identity tuple and exact 39-ID manifest returns `eligible`.
- Each identity field mismatch independently returns its approved reason.
- Missing/unversioned metadata fails closed; no inference occurs.
- One missing, one extra, one duplicate, one aliased, mixed-version and legacy-ID manifest each returns `ANALYSIS_QUESTION_SET_INCOMPATIBLE`.
- Exact manifest with valid `missing`, `not_applicable` or `excluded` evidence remains eligible for engine evaluation.
- Invalid response value/status/reason remains `ANALYSIS_INPUT_INVALID` at the locked engine boundary.
- Reason precedence, deterministic digest and semantic idempotency are stable under input ordering.

### 11.2 Integration tests

- Eligible completion creates or reuses exactly one run.
- Legacy completion creates one terminal eligibility record and zero new runs/jobs.
- Duplicate events, concurrent consumers and reconciler overlap create no duplicates.
- Temporary immutable-version outage follows operational recovery and is not mislabelled intrinsically ineligible.
- Existing failed run remediation appends linkage/audit state without updating immutable history.
- DIQ-203 continues to reject a directly submitted incompatible request with non-retryable `ANALYSIS_INPUT_INVALID`.

### 11.3 Migration and data tests

- Backfill evaluates completed assessments in tenant-bounded batches and is restartable/idempotent.
- Eligible existing hand-offs/runs are not duplicated or reclassified.
- Known incompatible completed assessments become terminal `ineligible` without creating runs.
- Run `b822ce85-f2bf-4cde-ba2f-b8abc31713cf` is linked only after verified scope/revision match and remains byte/field-equivalent in immutable columns and events.
- Roll-forward, partial failure recovery, observability and safe rollback of mutable projection state are proven; immutable decisions/events are never deleted.

### 11.4 Tenant-isolation and security tests

- Cross-tenant assessment, event, eligibility decision and run access is denied without enumeration.
- Forged client eligibility, pack/version metadata and manifest digest are ignored or rejected.
- Tenant-scoped uniqueness prevents cross-tenant idempotency collision.
- Logs, metrics, errors and support references contain no raw answers or restricted identifiers.

### 11.5 UI and accessibility tests

- Approved heading, body and permitted actions render for `ineligible`.
- Retry, generate and processing controls/copy are absent.
- New-assessment action obeys entitlement and permission; view action obeys legacy-assessment access.
- Refresh, navigation and repeated polling retain terminal status without network retry loops.
- Screen-reader announcements, keyboard flow, focus, contrast, text alternatives and responsive layouts pass.

### 11.6 End-to-end tests

1. Complete valid Delivery DNA `1.0.0` assessment with exact manifest → eligible → automatic request → result.
2. Complete legacy `delivery-maturity` / `executive-sponsorship` `1.4.0` assessment → ineligible → no run/retry → safe reassessment journey.
3. Reconcile the same legacy assessment repeatedly → no queue message, new run or duplicate terminal record.
4. Remediate the named failed run → immutable failure preserved → terminal hand-off shown → no retry.
5. Attempt cross-tenant remediation and UI access → non-enumerating denial and security audit.
6. Run all DIQ-203B and PDR-003-001 regression suites without altered expectations.

## 12. Acceptance Criteria

1. Eligibility is server-side, deterministic, configuration-driven, versioned and tenant-safe.
2. Only the exact Section 3 identity tuple and 39-ID manifest may enter `sprint03-product-config-1.0.0`.
3. Evidence statuses retain all locked DIQ-203 semantics; validation is not weakened.
4. Intrinsically incompatible assessments terminate as `ineligible` before run creation and never retry.
5. Legacy answers are never translated, inferred, copied or scored as Delivery DNA evidence.
6. Customer experience uses approved safe copy and offers only authorised view, reassessment and support actions.
7. Completion consumers and reconcilers do not repeatedly queue terminally resolved assessments.
8. The named failed run and all existing run/event history remain immutable.
9. All tests in Section 11 and existing locked golden fixtures pass.
10. Implementation evidence includes schema/migration review, acceptance matrix, security review and production rollback/recovery runbook.

## 13. Implementation Prompt for Codex

```text
Implement locked PDR-003-002 v1.0 — Sprint 03 Analysis Eligibility Policy in the DeliveryIQ application repository. Do not change product rules.

Authority order:
1. DIQ-002 v1.0
2. PB-003 v1.0
3. DIQ-203, DIQ-203A and DIQ-203B v1.0
4. PDR-003-001 v1.0
5. PDR-003-002 v1.0

Complete the entire implementation without stopping at a plan or readiness report. First locate the authoritative controlled documents and existing assessment-completion, outbox, analysis-request, reconciler, run-lifecycle and UI flows. Then implement the deterministic, server-side eligibility gate before analysis hand-off.

Required outcome:
- accept only completed assessment type `delivery-dna`, Knowledge Pack `delivery-dna` v1.0.0, question set `delivery-dna` v1.0.0, and exact equality with the 39 DIQ-203A question IDs;
- preserve explicit missing/not-applicable/excluded evidence semantics within that exact manifest;
- persist/reuse immutable tenant-scoped eligibility decisions;
- make `ineligible` a terminal hand-off outcome outside the analysis-run lifecycle;
- never queue or retry intrinsically incompatible assessments;
- preserve DIQ-203 fail-closed validation and `ANALYSIS_INPUT_INVALID` at the engine boundary;
- provide the locked reason codes, customer copy and authorised actions;
- keep legacy `delivery-maturity` / `executive-sponsorship` 1.4.0 outside Sprint 03 analysis and offer a fresh Delivery DNA assessment only when authorised;
- exclude terminal ineligible records from completion-trigger and reconciler retries;
- remediate run `b822ce85-f2bf-4cde-ba2f-b8abc31713cf` only after tenant/workspace/revision verification, by appending the approved eligibility/audit linkage without mutating its run or event history;
- preserve authentication, authorisation, tenant isolation, privacy, accessibility, idempotency and observability.

Implement and run every unit, integration, migration, tenant-isolation, UI, accessibility and end-to-end test required by PDR-003-002 Section 11. Run existing DIQ-203B and PDR-003-001 regressions, formatting, linting, type checks, migrations and production build. Fix ordinary failures and continue through all safe in-scope work. Produce an acceptance matrix and final implementation report with commands run, results, limitations and any genuine hard blockers. Do not claim a gate passed unless it ran.
```

## 14. Alternatives Rejected

### Translate legacy answers to `ddna.*`

Rejected because no approved semantic mappings or golden fixtures exist, and inferred translation would weaken traceability and validation.

### Accept a subset or superset of configured questions

Rejected for Sprint 03 because it permits unknown content or ambiguous capability coverage. Explicit evidence statuses already support missing and non-contributing evidence without changing manifest identity.

### Retry the incompatible failed run

Rejected because incompatibility is intrinsic and non-retryable. Repetition cannot produce a valid result and would create noise and misleading customer states.

### Mutate the failed run to `ineligible`

Rejected because `ineligible` is a hand-off decision, not a run state, and immutable analysis history must remain intact.

## 15. Change History

| Version | Date          | Change                                                                                                                                            | Approval   |
| ------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1.0     | 2 August 2026 | Established and approved the Sprint 03 analysis eligibility, ineligible hand-off, legacy reassessment and immutable failed-run remediation policy | Matt Prust |

---

**End of PDR-003-002 v1.0 — LOCKED**
