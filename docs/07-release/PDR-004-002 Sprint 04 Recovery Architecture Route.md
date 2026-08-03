# PDR-004-002 — Sprint 04 Recovery Architecture Route

| Control                | Value                                                                  |
| ---------------------- | ---------------------------------------------------------------------- |
| Decision ID            | PDR-004-002                                                            |
| Version                | 1.0                                                                    |
| Status                 | **LOCKED**                                                             |
| Sprint                 | Sprint 04                                                              |
| Decision owner         | Product Owner                                                          |
| Architecture authority | Chief Solution Architect                                               |
| Approved by            | Matt Prust                                                             |
| Decision date          | 3 August 2026                                                          |
| Classification         | Internal — Controlled                                                  |
| Resolves               | SAR-004 v1.1 Section 8 recovery-route decision request                 |
| Does not supersede     | PDR-004-001 v1.0 recovery objectives or SAR-004 v1.1 acceptance status |

> **Controlled-decision notice.** Matt Prust approved the recommended recovery route on 3 August 2026. DeliveryIQ will pursue a qualifying Lovable-supported recovery capability first and must use an alternative Tier 1 data architecture if Lovable cannot satisfy the locked requirements. The approved RPO/RTO are not weakened. This decision selects a remediation route; it does not claim that recovery has passed, does not accept Sprint 04, and does not authorise general availability.

## 1. Decision Summary

The following decision is approved:

1. **Route A is selected immediately:** obtain and demonstrate a Lovable-supported or enterprise recovery capability that meets every PDR-004-001 Tier 1 requirement.
2. **Route B is the mandatory fallback:** if Lovable confirms that it cannot provide the qualifying capability, or the supplied capability fails the controlled rehearsal, DeliveryIQ must move or replicate its Tier 1 system of record to an approved managed architecture that can meet the requirement.
3. **Route C is rejected:** DeliveryIQ will not weaken the Tier 1 recovery objective to fit the current daily in-place backup control.
4. Sprint 04 remains `REMEDIATION REQUIRED` and the release remains on `HOLD` until a measured isolated rehearsal passes and a superseding Product Acceptance record is issued.

## 2. Authority and Conflict Resolution

Apply this order:

1. [DIQ-002 Product Architecture v1.0](<../00-master-index/DIQ-002 Product Architecture.md>) — LOCKED.
2. [PB-004 Sprint 04 Playbook v1.0](<../02-playbooks/PB-004 Sprint 04 Playbook.md>) — LOCKED.
3. [PDR-004-001 Sprint 04 Outcome Measurement and Recovery Policy v1.0](<PDR-004-001 Sprint 04 Outcome Measurement and Recovery Policy.md>) — LOCKED.
4. [SAR-004 v1.1 Superseding Product Acceptance](<SAR-004 v1.1 Sprint 04 Superseding Product Acceptance.md>) — LOCKED REVIEW DECISION.
5. This decision for recovery-route selection.
6. Existing implementation and platform conventions where they do not conflict with the above.

PDR-004-001 remains authoritative for recovery scope, RPO, RTO, rehearsal and evidence. PDR-004-002 does not amend those rules. Current Lovable functionality, cost or implementation convenience cannot lower them silently.

## 3. Non-Negotiable Recovery Contract

A route qualifies only when it provides and demonstrates all of the following:

- Tier 1 recovery point no older than 15 minutes;
- Tier 1 service recovery within four hours from formal recovery invocation;
- recovery into a safe isolated target before any production replacement;
- stable source recovery-point and restore-target identifiers;
- encryption, access control, separation of duties and recorded authorised actors;
- recovery of all Tier 1 customer, governance, audit, trace, configuration and idempotency state defined by PDR-004-001;
- migration and configuration-digest reconciliation;
- immutable-history, RLS, least-privilege and cross-tenant verification after restore;
- safe feature flags, including `audit_exports = disabled` unless separately authorised; and
- measured, retained rehearsal evidence suitable for Product Owner and Matt Prust review.

Daily in-place snapshots, logical exports, automated state-machine tests and application smoke tests may support resilience, but they do not individually or collectively prove this contract without the qualifying recovery point, isolated target and measured results.

## 4. Route A — Lovable-Supported Qualifying Recovery

Route A begins immediately. The Head of Software must obtain a written Lovable response that addresses:

1. whether a recovery point no older than 15 minutes is available for this project;
2. whether Lovable can restore that point into an isolated, non-production target;
3. the identifiers and timestamps exposed for the recovery point and restore operation;
4. coverage of database schema/data, authentication, storage, secrets, scheduled jobs and other Tier 1 dependencies;
5. access control, separation of duties and audit logging for invocation;
6. expected invocation and completion process capable of meeting RTO <=4 hours;
7. any plan, support, enterprise or contractual prerequisites; and
8. permission to perform a controlled rehearsal without replacing or mutating the live database.

Published documentation alone is insufficient because it documents only daily in-place snapshots. Route A succeeds only after Lovable supplies the qualifying capability and the measured Section 7 rehearsal passes.

## 5. Mandatory Transition to Route B

Route B becomes active without reopening the product decision when any of the following occurs:

- Lovable states that a <=15-minute recovery point is unavailable;
- Lovable cannot provide an isolated restore target;
- the proposed service excludes required Tier 1 state without an approved, testable recovery control;
- the proposed invocation cannot meet the four-hour RTO;
- Lovable cannot provide the identifiers and evidence needed for a controlled rehearsal; or
- a supplied Route A rehearsal fails a locked requirement and Lovable cannot correct the failure through the same qualifying service.

When a Route B trigger occurs, engineering is authorised to complete architecture discovery, provider assessment, threat modelling, migration design, cost estimation and a reversible proof of recovery. Selection of a paid external service, execution of a production data migration or material identity/integration change still requires the normal security, commercial and change approvals. No new product-rule decision is required unless the proposed design changes customer-visible behaviour or a locked authority.

The Route B architecture must preserve the current application contracts and make Tier 1 recovery independently demonstrable. Provider choice is deliberately not fixed by this record.

## 6. Containment While Recovery Is Unproven

Until Section 7 passes:

- keep the Sprint 04 release status at `HOLD`;
- keep overall Sprint 04 Product Acceptance at `REMEDIATION REQUIRED`;
- keep `audit_exports` disabled;
- do not enable the complete Delivery DNA-to-recommendation journey for general customers;
- do not introduce or manufacture customer evidence to exercise the gate;
- preserve the deployed fail-closed implementation, immutable records and tenant controls;
- do not perform a destructive in-place restore merely to create evidence; and
- do not describe the current daily backup, export or automated tests as PDR-004-001 compliance.

## 7. Required Rehearsal and Acceptance Evidence

The selected route must complete one controlled isolated rehearsal recording:

1. source application revision and full managed migration inventory;
2. recovery-point identifier and timestamp;
3. isolated restore-target identifier;
4. formal invocation, restore-complete and verification-complete timestamps;
5. measured RPO and RTO calculations;
6. catalogue/configuration versions and digest reconciliation;
7. governed record counts and immutable-history checks;
8. RLS, client-role denial, service-role limits and cross-tenant denial;
9. idempotency, audit continuity and safe feature-flag state;
10. authorised actor and a safe `recovery_rehearsed` operational event; and
11. cleanup or retention treatment for the isolated target.

Passing requires measured Tier 1 RPO <=15 minutes and RTO <=4 hours with every integrity and isolation check successful. A partial or inferred result is a failure.

After a pass, engineering must update the S4-014 recovery record, acceptance matrix, final implementation report and release plan, then request a superseding Product Owner and Matt Prust acceptance review. The genuine Delivery DNA journey and authorised audit-export test remain their separately recorded enablement/general-availability gates.

## 8. Implementation Instruction

```text
Execute PDR-004-002 v1.0 without changing PDR-004-001, PB-004 or customer-visible product behaviour.

First pursue Route A. Obtain written Lovable confirmation against every requirement in PDR-004-002 Section 4. Do not accept daily in-place backup or a logical export as evidence of RPO <=15 minutes or an isolated restore.

If Lovable confirms a qualifying capability, perform the controlled isolated rehearsal in Section 7 and record exact identifiers, timestamps, measured RPO/RTO and post-restore integrity/security results.

If any Route B trigger in Section 5 occurs, proceed automatically with safe architecture discovery, provider assessment, threat model, migration design, cost estimate and reversible proof of recovery for an alternative Tier 1 managed architecture. Request only the external commercial, credential or production-migration approvals that are genuinely required.

Keep the release on HOLD, audit_exports disabled and general customer enablement off until the measured rehearsal passes and a superseding acceptance decision is issued. Do not manufacture customer evidence and do not claim a recovery pass from automated tests or current Lovable self-service backups.
```

## 9. Change History

| Version | Date          | Change                                                                                             | Decision authority                                    |
| ------- | ------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1.0     | 3 August 2026 | Approved Route A with mandatory Route B fallback; rejected weakening of locked recovery objectives | Product Owner / Chief Solution Architect / Matt Prust |

---

**End of PDR-004-002 v1.0 — LOCKED**
