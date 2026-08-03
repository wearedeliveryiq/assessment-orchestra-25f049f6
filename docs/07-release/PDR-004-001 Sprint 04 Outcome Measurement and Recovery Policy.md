# PDR-004-001 — Sprint 04 Outcome Measurement and Recovery Policy

| Control                | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decision ID            | PDR-004-001                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Version                | 1.0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Status                 | **LOCKED**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Sprint                 | Sprint 04                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Decision owner         | Product Owner                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Architecture authority | Chief Solution Architect                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Approved by            | Matt Prust                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Decision date          | 3 August 2026                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Classification         | Internal — Controlled                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Authority              | [DIQ-002](<../00-master-index/DIQ-002 Product Architecture.md>), [PB-004](<../02-playbooks/PB-004 Sprint 04 Playbook.md>), [DIQ-203](<../01-product/delivery-intelligence/DIQ-203 Sprint 03 Product Configuration Specification.md>), [DIQ-203A](<../01-product/delivery-intelligence/configuration/DIQ-203A Sprint 03 Production Configuration.json>), [DIQ-203B](<../01-product/delivery-intelligence/configuration/DIQ-203B Sprint 03 Golden Fixtures.json>), [SAR-003](<SAR-003 Sprint 03 Product Acceptance.md>) |

> **Controlled-decision notice.** This record is the locked Product Owner and architecture authority for PB-004 S4-010 outcome status derivation and the platform recovery objectives inherited by Sprint 04. It completes rules that PB-004 intentionally requires but does not numerically define. It does not alter DIQ-203 scoring, recommendation eligibility, ranking, roadmap, disclosure or trace rules. Changes require a versioned amendment, impact assessment, regenerated affected fixtures, Product Owner review, final approval and DIQ-000 update.

## 1. Decision Summary

The following decisions are approved:

1. Outcome status is a deterministic projection over a versioned measure definition and immutable, non-superseded observations.
2. Numeric `maintain` measures use an inclusive target band defined by a target and an absolute tolerance in the same unit.
3. Target boundaries are inclusive and calculations use stored decimal values without display rounding.
4. Observation effective time determines whether evidence is on time; record time determines when DeliveryIQ learned about it.
5. Later evidence may restore `target_met`, but it never erases a missed deadline or earlier status history.
6. Corrections use immutable superseding observations; no observation is edited or deleted in place.
7. Sprint 04 customer system-of-record data inherits a recovery point objective of no more than 15 minutes and a recovery time objective of no more than four hours.
8. Derived analytics may use the separately defined lower recovery tier in Section 9, but it may not weaken customer-state, audit or configuration recovery.

These rules unblock S4-010 implementation. Product Acceptance and general availability remain subject to the implementation, fixture, recovery-rehearsal and evidence gates recorded in SAR-004.

## 2. Authority and Conflict Resolution

Apply this order:

1. DIQ-002 Product Architecture v1.0 — LOCKED.
2. PB-004 Sprint 04 Playbook v1.0 — LOCKED.
3. DIQ-203, DIQ-203A and DIQ-203B v1.0 — LOCKED within their Sprint 03 scope.
4. Accepted product and architecture decisions, including SAR-003 and this decision.
5. Existing implementation.

PB-004 remains authoritative for the permitted outcome states, association-only claims, immutable observations, tenant scope, permissions and traceability. This record defines the missing comparison, time, correction, recovery and fixture semantics. Existing code or illustrative data does not override this record.

## 3. Canonical Measure Contract

### 3.1 Measure definition

Every outcome retains the immutable catalogue-supplied intended outcome and success-measure template. A customer-configured measure is a separately versioned overlay containing, as applicable:

- `measureId`, `measureVersion`, tenant ID, workspace ID, action ID and source recommendation/catalogue version;
- direction: `increase`, `decrease`, `maintain` or `binary`;
- unit and decimal scale;
- baseline value and baseline effective time;
- target value;
- `maintainTolerance` for `maintain` only;
- optional target date and its snapshotted IANA time zone;
- data-source description or safe source reference;
- cadence and accountable owner;
- creation/update actor, timestamp and audit event;
- current derived status, status reason, decisive observation ID and calculation-policy version `PDR-004-001/1.0`.

Customer configuration never changes the catalogue outcome or earlier measure versions. An update creates a new measure version and recalculates the current projection while preserving prior versions and status history.

### 3.2 Validation

- Numeric values use an exact decimal type at the configured unit scale; binary floating-point comparison is prohibited.
- `increase`, `decrease` and `maintain` require a numeric baseline, numeric target and compatible unit before target status can be calculated.
- `binary` requires a Boolean target; its baseline is optional.
- `maintainTolerance` is required for `maintain`, must be numeric, non-negative and use the measure unit. For a percent unit it is percentage points, not a relative percentage.
- `maintainTolerance` is prohibited for other directions.
- A target date is an ISO-8601 calendar date. When present, a valid snapshotted IANA time zone is required. The deadline is the final instant of that date in the snapshotted time zone.
- Baseline, target, tolerance, observation and unit values must be mutually compatible. Invalid definitions or observations fail with `OUTCOME_OBSERVATION_INVALID` or the established validation-safe equivalent; no partial status is published.

## 4. Approved Comparison Semantics

The latest effective current observation satisfies its target exactly as follows:

| Direction  | Target is satisfied when                                                                 | Boundary policy                      |
| ---------- | ---------------------------------------------------------------------------------------- | ------------------------------------ |
| `increase` | `observationValue >= targetValue`                                                        | Equality passes                      |
| `decrease` | `observationValue <= targetValue`                                                        | Equality passes                      |
| `maintain` | `targetValue - maintainTolerance <= observationValue <= targetValue + maintainTolerance` | Both lower and upper boundaries pass |
| `binary`   | `observationValue == targetValue`                                                        | Exact Boolean equality               |

Comparisons use stored canonical values, not displayed or rounded values. A displayed value that appears equal after rounding does not pass unless the stored value satisfies the rule.

For `maintain`, target is the centre of the acceptable band. A tolerance of zero requires exact canonical equality. The baseline is retained for context and change reporting but does not replace the explicit target or tolerance.

## 5. Observation and Supersession Policy

### 5.1 Immutable observations

Every observation contains:

- stable observation ID and idempotency key;
- tenant, workspace, outcome and measure-version scope;
- typed canonical value and unit;
- `effectiveAt`, when the measurement applied;
- `recordedAt`, when DeliveryIQ accepted it;
- source type/reference, actor and permission-safe provenance;
- optional `supersedesObservationId` and mandatory correction reason when it is a correction;
- append-only audit and trace references.

Manual observations require an authorised actor and source. Replays with the same idempotency key and semantic payload reuse the existing observation. A conflicting replay fails safely.

### 5.2 Current observation ordering

Only terminal, non-superseded observations for the same tenant, workspace, outcome and measure version participate. The decisive current observation is ordered by:

1. latest `effectiveAt`;
2. latest `recordedAt` when effective times are equal;
3. ascending stable observation ID as the final deterministic tie-breaker.

Input order never changes the result.

### 5.3 Superseding corrections

- An observation is never updated or deleted in place.
- A correction creates a new immutable observation that names the observation it supersedes.
- The superseding observation must belong to the same tenant, workspace, outcome and measure version.
- One observation may have at most one accepted direct superseder. Optimistic concurrency prevents correction branches.
- Supersession chains must be finite and acyclic. Their terminal leaf is the current correction; all earlier nodes remain auditable and do not participate in current calculation.
- A later measurement is not a correction and must not use `supersedesObservationId` merely because it changes the result.
- A correction may change the derived current and deadline status from the correction's recorded time forward. It never erases the prior projection, actor, source or audit history.

## 6. Status Derivation

Allowed states remain exactly:

`not_measured`, `baseline_recorded`, `tracking`, `target_met`, `target_not_met`, `retired`.

Apply the following precedence:

1. **Retired.** An authorised explicit retirement makes the current state `retired`. Retirement is audited and does not remove observations or earlier states.
2. **Not measured.** Use `not_measured` when the active measure cannot yet be evaluated because no valid baseline exists for a numeric direction, no required binary target exists, or no measurement configuration has been completed. Retained observations do not create a target claim while required configuration is missing. Return a safe limitation reason.
3. **Baseline recorded.** Use `baseline_recorded` when required baseline/configuration exists but no qualifying post-baseline current observation exists and either no target date exists or the deadline has not passed.
4. **Target met.** Use `target_met` when the decisive current observation satisfies Section 4. This applies before, on or after the deadline and carries the timing metadata in Section 7.
5. **Target not met.** Use `target_not_met` when the deadline has passed and either the decisive current observation does not satisfy the target or no qualifying observation was recorded. Distinguish `value_below_or_outside_target` from `no_observation_by_target_date` using safe reason codes.
6. **Tracking.** Use `tracking` when the measure is evaluable, the decisive current observation does not satisfy the target, and either no target date exists or the deadline has not passed.

Status is a current calculated projection. Every transition is appended to history with policy version, decisive facts and observation references.

## 7. Target-Date and Late-Evidence Policy

### 7.1 Time basis

`effectiveAt` determines whether an observation is on time. `recordedAt` determines when the projection and audit trail changed.

- `effectiveAt <= deadlineInstant` is on-time evidence.
- `effectiveAt > deadlineInstant` is late evidence.
- An observation entered after the deadline but effective on or before it is late-recorded historical evidence, not late-effective evidence.

### 7.2 Deadline behaviour

- Before or at the deadline, a non-satisfying current observation produces `tracking`.
- Immediately after the deadline, a non-satisfying current observation produces `target_not_met`.
- If no qualifying observation exists when the deadline passes, status is `target_not_met` with reason `no_observation_by_target_date`.
- A satisfying observation effective on or before the deadline produces `target_met` with `satisfactionTiming = on_time`.
- A satisfying observation effective after the deadline produces `target_met` with `satisfactionTiming = late` and `deadlineWasMissed = true`.
- A late-recorded historical observation that was effective on time may produce `target_met` with `satisfactionTiming = on_time` and `recordedLate = true`. Earlier published states remain in history.
- Without a target date, satisfaction timing is `not_applicable`; a non-satisfying measure remains `tracking` and never becomes `target_not_met` solely because time passed.

### 7.3 Restoration and regression

Later evidence may restore `target_met` after `target_not_met` when the latest current observation satisfies the target. The restored state must disclose whether the target was met late and retain the prior missed-deadline event.

Conversely, a later current observation that no longer satisfies the target moves the current projection back to `tracking` before the deadline or `target_not_met` after it. This is especially important for `maintain` measures. The UI must describe current evidence and history; it must not imply that a previously observed improvement never occurred.

No status transition proves that the DeliveryIQ recommendation caused the observation.

## 8. Customer Copy and Explainability

- Use “The latest recorded observation meets the target” rather than “DeliveryIQ achieved the outcome”.
- Use “The target was met after the target date” for late satisfaction.
- Use “No qualifying observation was recorded by the target date” when evidence is absent.
- Use “The latest observation is outside the agreed range” for failed `maintain` comparison.
- Label corrected observations and retain access to permitted correction history.
- Every visible status includes the measure version, calculation-policy version, decisive observation date, safe reason and confidence/evidence limitation where applicable.
- Never claim causation, silently conceal late delivery, expose restricted source detail or infer an observation.

Stable projection reason codes are:

| Code                               | Use                                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------- |
| `measure_configuration_incomplete` | Required measure configuration other than numeric baseline is unavailable                    |
| `baseline_missing`                 | Numeric measure lacks a valid baseline                                                       |
| `baseline_only`                    | Baseline exists but no qualifying post-baseline observation exists before the deadline       |
| `target_satisfied`                 | Current observation satisfies the target on time or without a target date                    |
| `target_satisfied_late`            | Current observation satisfies the target after the deadline                                  |
| `target_pending`                   | Current observation does not satisfy the target and the deadline has not passed or is absent |
| `target_not_met_by_date`           | Current observation does not satisfy the target after the deadline                           |
| `no_observation_by_target_date`    | No qualifying observation exists after the deadline                                          |
| `measure_retired`                  | Measure was explicitly retired                                                               |

Customer copy is selected from the status, reason and timing fields. Internal validation predicates, actor permissions and restricted source identifiers are not exposed.

## 9. Approved Platform Recovery Objectives

### 9.1 Tier 1 — customer and governance system of record

The following inherit **RPO <= 15 minutes** and **RTO <= 4 hours**:

- immutable analysis and recommendation baselines and their trace links;
- catalogue versions, approvals, digests and promotion history;
- customer decisions, actions, ownership, outcome definitions and observations;
- hand-off intents, consent records, permission-relevant state and audit events;
- tenant/workspace scope, configuration snapshots and idempotency records required to recover safely.

RPO is measured from the last durably committed authorised change to the recoverable point. RTO is measured from formal disaster-recovery invocation to restoration of a tenant-safe, integrity-validated customer service. Service may remain fail-closed until validation completes.

### 9.2 Tier 2 — rebuildable projections and reporting

Read models, caches, search indexes and generated report artifacts must be rebuildable from Tier 1 sources. They have **RTO <= 8 hours** and may not establish a weaker recovery point than their Tier 1 source. Ephemeral export files are not system-of-record data and may be regenerated from retained authorised audit events.

### 9.3 Tier 3 — product analytics

Privacy-safe, non-authoritative analytics events and aggregates have **RPO <= 24 hours** and **RTO <= 48 hours**. Loss or unavailability of analytics must not block customer workflows or alter product rules.

### 9.4 Recovery controls

- Backups and point-in-time recovery material are encrypted, access-controlled, tenant-safe and monitored.
- Initial general availability, material datastore change and at least annual operation require a successful recovery rehearsal.
- The rehearsal must demonstrate the applicable RPO/RTO, integrity/digest checks, tenant isolation, immutable history, idempotency, audit continuity and safe feature-flag state.
- Restore into a production environment requires separation of duties and a recorded decision.
- Audit exports remain disabled by default unless the elevated permission, export expiry, redaction and access-log controls pass. The disabled default does not remove the requirement to test the capability in an authorised environment.
- A failed recovery or integrity check blocks customer publication and general availability for the affected capability.

## 10. Required Golden Fixtures

Engineering must add executable, version-pinned fixtures with exact machine-readable outputs for every row below. Fixture time and time zone must be fixed; system clock dependence is prohibited.

| Fixture                               | Input condition                                                                             | Exact expected projection                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `out_inc_equal`                       | Increase; observation equals target before deadline                                         | `target_met`, `on_time`                                                         |
| `out_inc_below`                       | Increase; observation one canonical unit below target before deadline                       | `tracking`                                                                      |
| `out_inc_above`                       | Increase; observation above target                                                          | `target_met`                                                                    |
| `out_dec_equal`                       | Decrease; observation equals target                                                         | `target_met`                                                                    |
| `out_dec_above`                       | Decrease; observation one canonical unit above target before deadline                       | `tracking`                                                                      |
| `out_dec_below`                       | Decrease; observation below target                                                          | `target_met`                                                                    |
| `out_maintain_lower_equal`            | Observation equals `target - tolerance`                                                     | `target_met`                                                                    |
| `out_maintain_upper_equal`            | Observation equals `target + tolerance`                                                     | `target_met`                                                                    |
| `out_maintain_below`                  | Observation one canonical unit below lower boundary before deadline                         | `tracking`                                                                      |
| `out_maintain_above`                  | Observation one canonical unit above upper boundary before deadline                         | `tracking`                                                                      |
| `out_maintain_zero_tolerance_equal`   | Zero tolerance and exact equality                                                           | `target_met`                                                                    |
| `out_maintain_zero_tolerance_diff`    | Zero tolerance and any canonical difference before deadline                                 | `tracking`                                                                      |
| `out_binary_match`                    | Boolean observation equals target                                                           | `target_met`                                                                    |
| `out_binary_miss`                     | Boolean observation differs before deadline                                                 | `tracking`                                                                      |
| `out_numeric_missing_baseline`        | Numeric direction lacks baseline                                                            | `not_measured`, limitation `baseline_missing`                                   |
| `out_baseline_no_observation`         | Complete numeric configuration; no post-baseline observation; deadline absent or not passed | `baseline_recorded`, reason `baseline_only`                                     |
| `out_before_deadline_miss`            | Valid non-satisfying observation before deadline                                            | `tracking`                                                                      |
| `out_deadline_no_observation`         | Deadline passed without qualifying observation                                              | `target_not_met`, reason `no_observation_by_target_date`                        |
| `out_deadline_boundary_met`           | Satisfying effective time equals deadline instant                                           | `target_met`, `on_time`                                                         |
| `out_late_miss`                       | Non-satisfying observation effective after deadline                                         | `target_not_met`                                                                |
| `out_late_met`                        | Satisfying observation effective after deadline                                             | `target_met`, `late`, `deadlineWasMissed = true`                                |
| `out_late_restore`                    | Prior `target_not_met`; later satisfying observation                                        | Current `target_met`, `late`; earlier state retained                            |
| `out_post_met_regression`             | Later decisive observation no longer satisfies after deadline                               | Current `target_not_met`; earlier `target_met` retained                         |
| `out_recorded_late_effective_on_time` | Recorded after deadline, effective on/before deadline, satisfying                           | `target_met`, `on_time`, `recordedLate = true`                                  |
| `out_supersede_fail_with_pass`        | Correction supersedes decisive failing observation with satisfying value                    | Recalculated `target_met`; original retained/excluded                           |
| `out_supersede_pass_with_fail`        | Correction supersedes decisive satisfying observation with failing value                    | Recalculated `tracking` or `target_not_met` by date; original retained/excluded |
| `out_supersede_chain`                 | Valid two-step correction chain                                                             | Terminal leaf decisive; both ancestors retained/excluded                        |
| `out_supersede_cycle`                 | Proposed cycle                                                                              | Fail closed; no observation/status publication                                  |
| `out_supersede_branch`                | Concurrent second superseder                                                                | Version conflict; first accepted branch unchanged                               |
| `out_decimal_no_display_round`        | Display-rounded equality but canonical value outside boundary                               | Does not meet target                                                            |
| `out_equal_effective_order`           | Same effective time; different record times/IDs                                             | Section 5.2 deterministic winner                                                |
| `out_idempotent_replay`               | Same key and semantic payload                                                               | Same observation/status; no duplicate event                                     |
| `out_conflicting_replay`              | Same key, different payload                                                                 | Conflict; original unchanged                                                    |
| `out_cross_tenant`                    | Observation or superseder crosses tenant/workspace                                          | Non-enumerating denial; no state change                                         |
| `out_unauthorised_actor`              | Actor lacks outcome permission                                                              | Denial; no observation/audit-domain mutation except security access event       |
| `out_retired`                         | Authorised retirement with existing observations                                            | `retired`; observations and status history retained                             |
| `out_association_copy`                | Any target-met state                                                                        | Approved association-only copy; no causal claim                                 |

All fixtures must assert IDs/versions, decisive observation, reason, effective/recorded timing flags, history preservation, tenant scope, trace links and exact status. Required integration coverage also includes API validation, pagination, permissions, RLS, idempotency, concurrency, source redaction/deletion behaviour, executive reporting and audit export projection.

## 11. Product Acceptance Consequences

PDR-004-001 is approved and locked. It authorises implementation of the missing S4-010 rules and the recovery evidence required by PB-004. It does not itself accept S4-010 or Sprint 04.

Sprint 04 acceptance requires:

1. S4-010 implementation against this exact policy;
2. all Section 10 fixtures passing;
3. no changes to the 53 locked DIQ-203B tests or expectations;
4. a recovery rehearsal demonstrating the applicable Section 9 objectives;
5. updated acceptance matrix and implementation/release records filed in the review repository;
6. Product Owner re-review under SAR-004.

## 12. Change History

| Version | Date          | Change                                                                                                                                | Approval   |
| ------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1.0     | 3 August 2026 | Approved S4-010 comparison, date, restoration, supersession and fixture semantics; established Sprint 04 platform recovery objectives | Matt Prust |

---

**End of PDR-004-001 v1.0 — LOCKED**
