# PB-004A — Sprint 04 Proportionate Recovery Amendment

| Control                | Value                          |
| ---------------------- | ------------------------------ |
| Document ID            | PB-004A                        |
| Version                | 1.0                            |
| Status                 | **LOCKED**                     |
| Amends                 | PB-004 Sprint 04 Playbook v1.0 |
| Owner                  | Product Owner                  |
| Architecture authority | Chief Solution Architect       |
| Final approval         | Matt Prust, 3 August 2026      |
| Classification         | Internal — Controlled          |
| Sprint                 | Sprint 04                      |

> **Controlled-amendment notice.** Matt Prust approved a proportionate current-stage recovery posture on 3 August 2026 because the former Tier 1 objective is disproportionate to current product risk and the cost of a qualifying Lovable capability. This amendment replaces only the PB-004 recovery acceptance clauses identified below. It does not claim that a restore occurred, does not change Sprint 03 or recommendation product rules, and does not weaken security, privacy, tenant isolation, immutability or truthful customer communication.

## 1. Authority and Purpose

Apply this order:

1. DIQ-002 Product Architecture v1.0 — LOCKED.
2. PB-004 Sprint 04 Playbook v1.0 — LOCKED except where expressly amended here.
3. This PB-004A v1.0 amendment for the clauses in Section 3.
4. PDR-004-001 v1.1 for the detailed current-stage recovery policy.
5. Applicable locked product configuration and accepted decisions.
6. Existing implementation where it does not conflict with the above.

All PB-004 clauses not expressly identified in Section 3 remain unchanged.

## 2. Approved Product Decision

For the current product stage:

- DeliveryIQ does not promise a fixed recovery point objective or recovery time objective.
- DeliveryIQ accepts Lovable Cloud's documented available recovery controls: daily database backups, retention of roughly 14 days and in-place database restore to an available snapshot.
- DeliveryIQ does not claim point-in-time recovery, isolated restore, side-by-side restore or a measured recovery time.
- Loss of database changes since the selected available snapshot, service unavailability during restore and possible application/schema reconciliation are accepted residual risks.
- A destructive production restore is not required merely to satisfy Sprint acceptance.
- Recovery capability must still be documented, operationally owned, periodically checked and truthfully represented.

This is an explicit product-risk and commercial decision. It is not a finding that the prior requirements were implemented.

## 3. PB-004 Clauses Replaced

### 3.1 S4-014 technical notes

Replace the backup/restore and recovery-rehearsal implication in PB-004 S4-014 Technical Notes with:

> Document the available platform backup and restore controls, known exclusions, access model, data-loss and service-interruption risks, operational recovery runbook, restore decision authority and post-restore verification. Do not claim unsupported point-in-time, isolated-target, RPO, RTO or rehearsal capability.

### 3.2 S4-014 acceptance criterion AC4

Replace:

> AC4 rollback/recovery rehearsal passes.

With:

> **AC4:** application/configuration rollback controls pass; the available platform backup/restore capability is truthfully assessed; a proportionate recovery runbook and decision authority are documented; residual data-loss, in-place restore, downtime, scope and reconciliation risks are explicitly accepted; and no recovery rehearsal or objective is claimed unless actually performed and measured.

### 3.3 S4-014 test scenarios and Definition of Done

Replace the mandatory disaster-recovery rehearsal implication with:

- test application and feature rollback, failure containment, replay and immutable recovery contracts;
- conduct a documented recovery tabletop using current platform controls;
- verify backup visibility and runbook readiness before customer enablement under the accepted Sprint 04 release and after a material platform change;
- perform a live restore only when authorised and operationally safe; and
- record actual results without inferring unperformed evidence.

S4-014 Definition of Done is satisfied when AC1–AC6, as amended, pass; the platform capability assessment, residual-risk acceptance and recovery runbook are filed; and the final implementation report is complete. An isolated restore rehearsal is not a current-stage Sprint DoD requirement.

### 3.4 PB-004 Section 15 recovery statement

Replace the final recovery sentence with:

> Recovery controls follow the locked current-stage platform policy. No fixed RPO or RTO may be promised unless a later approved architecture can support and demonstrate it. Absence of a destructive restore rehearsal does not block implementation or Sprint acceptance where available controls, runbook, decision authority and residual risks are truthfully documented and approved.

### 3.5 PB-004 Section 19 acceptance checklist

For the resilience gate, recovery passes when the amended AC4 evidence is complete. The remaining accessibility, security, privacy, tenant, performance and resilience controls are unchanged.

### 3.6 PB-004 Section 20 release checklist

Replace:

> Migration and rollback rehearsals pass with backup/restore evidence.

With:

> Migration and application/configuration rollback evidence passes. Available platform backup/restore controls, limitations, runbook, decision authority and last operational verification are recorded. A restore is claimed only if actually performed; no unsupported RPO/RTO or isolated-recovery representation is permitted.

The genuine Delivery DNA journey, audit-export enablement, security, tenant, support and Product Acceptance gates remain separately governed.

## 4. Accepted Residual Risks

Matt Prust, as founder and final approver, accepts that:

1. database changes made after the selected available daily snapshot may be lost;
2. the actual recovery point may be materially older than 15 minutes and is not contractually promised by DeliveryIQ;
3. restore occurs in place under the documented self-service control and makes the database temporarily unavailable;
4. restoring an older schema may require application/schema reconciliation before service is reopened;
5. database backups do not include storage-bucket files;
6. logical exports exclude storage files, edge-function code, secrets and usable passwords and are not a restore service;
7. an isolated self-service recovery target and arbitrary point-in-time recovery are not available in the documented current platform control; and
8. actual recovery duration is unmeasured and no RTO is promised.

These risks must remain visible in release, operational and customer-contract decisions. The decision must be revisited if product risk, customer commitments, regulatory obligations, data criticality or platform capability materially changes.

## 5. Unchanged Controls

This amendment does not change:

- PDR-004-001 outcome comparison, timing, restoration, regression, supersession, precision or fixture rules;
- DIQ-203/A/B scoring, confidence, recommendation, disclosure or trace rules;
- immutable histories and append-only corrections;
- RLS, least privilege, tenant isolation, idempotency, audit and privacy requirements;
- audit export's disabled-by-default state or enablement evidence; or
- the requirement for genuine evidence before claiming a complete customer journey.

## 6. Change History

| Version | Date          | Change                                                                                                                              | Product approval | Final approval         |
| ------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------- |
| 1.0     | 3 August 2026 | Replaced disproportionate Tier 1 and isolated-rehearsal requirements with proportionate, truthful Lovable Cloud recovery acceptance | Approved         | Approved by Matt Prust |

---

**End of PB-004A v1.0 — LOCKED**
