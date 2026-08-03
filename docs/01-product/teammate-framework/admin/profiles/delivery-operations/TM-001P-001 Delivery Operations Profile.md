# TM-001P-001 — Admin TeamMate Delivery Operations Profile

| Control          | Value                                                                           |
| ---------------- | ------------------------------------------------------------------------------- |
| Document ID      | TM-001P-001                                                                     |
| Version          | 1.0-RC1                                                                         |
| Status           | **PRODUCT OWNER APPROVED — FINAL APPROVAL PENDING**                             |
| Owner            | Product Owner                                                                   |
| Subject owner    | Delivery Operations                                                             |
| Product approval | Product Owner, 2 August 2026                                                    |
| Final approver   | Matt Prust                                                                      |
| Parent type      | [TM-001 Admin TeamMate v1.0-RC2](<../../TM-001 Admin TeamMate.md>)              |
| Framework        | [DIQ-400 v1.0-RC3](<../../../DIQ-400 TeamMate Framework.md>)                    |
| Manifest         | [TM-001P-001A](<TM-001P-001A Delivery Operations Profile Manifest.json>)        |
| Golden fixtures  | [TM-001P-001B](<TM-001P-001B Delivery Operations Profile Golden Fixtures.json>) |
| Classification   | Internal — Controlled                                                           |

> **Approval boundary.** This profile configures the Admin TeamMate for project, programme, portfolio, PMO and transformation administration. It cannot widen TM-001, create a separate runtime or activate an instance. It becomes production authority only after the parent framework/type, this profile package, taxonomy decision and applicable implementation playbook are final-approved and locked.

## 1. Purpose

The Delivery Operations profile adapts the horizontal Admin TeamMate to help delivery teams prepare governance work, coordinate approved actions and decisions, maintain delivery records, draft recurring status material and surface configured exceptions.

It is the first reference profile because DeliveryIQ already supplies Delivery Intelligence, recommendations, improvement actions and traceability. It is not the definition of the Admin core and does not constrain future SME/industry profiles.

## 2. Intended Customers

- PMO and transformation leaders.
- Programme, portfolio and project directors/managers.
- Delivery operations leaders and coordinators.
- Governance, reporting and assurance teams.
- Professional services teams managing delivery engagements.

## 3. Supported Outcomes

1. Governance meetings are prepared with current evidence and decisions required.
2. Delivery actions and human-confirmed decisions have visible owners, dates and follow-through.
3. RAID and delivery-control records are sufficiently current for accountable intervention.
4. Status/governance drafts are assembled from traceable approved sources with gaps visible.
5. Missing, stale, conflicting, overdue or threshold-breaching delivery information is surfaced.
6. Delivery administration effort is reduced without transferring accountability.

## 4. Profile Terminology

| Admin core concept  | Delivery Operations term                                       |
| ------------------- | -------------------------------------------------------------- |
| Task/action         | Delivery action                                                |
| Record              | Delivery control record                                        |
| Exception record    | RAID or decision exception                                     |
| Recurring update    | Weekly/project/programme status update                         |
| Meeting preparation | Governance meeting preparation                                 |
| Measure             | Delivery or outcome measure                                    |
| Accountable owner   | Sponsor, programme/project owner or delegated accountable role |

Customer terminology may replace labels through approved configuration, but never changes semantics or policy.

## 5. Permitted Data Objects

- Delivery Intelligence results/explanations and approved trace references.
- Recommendations and customer decisions/actions.
- Improvement plans, delivery actions, owners, dates and dependencies.
- Risk, assumption, issue and dependency records where approved schemas exist.
- Human-confirmed decision records.
- Governance meetings, agendas, notes/minutes drafts and attendance metadata.
- Delivery/outcome measures and status/report drafts.
- Profile work queue, schedules, templates and audit references.

Legacy or unversioned assessment responses are never translated into profile evidence.

## 6. Capability Subset

TM-001P-001A is authoritative. The profile uses the Admin type’s R0–R2 capabilities for reading/summarising evidence, guidance/drafts, meeting preparation/consented capture, internal task/reminder/decision coordination, monitoring/exceptions/escalation proposals, unsent compose drafts, approved DeliveryIQ draft saving and outcome/feedback records.

It does not grant `integration.write` or `communication.send`, and cannot introduce any capability absent from TM-001A.

## 7. Workflow Mapping

### P1 — Daily Delivery Briefing

Maps from `daily_admin_briefing`. Reads approved actions, decisions, meetings, RAID, measures and schedules. Produces a sourced prioritised brief with gaps/limitations; no mutation.

### P2 — Governance Meeting Preparation

Maps from `meeting_preparation`. Drafts agenda, pre-read, action status, decisions required and questions from approved meeting/delivery context. May insert into a user-present unsent email/appointment; never invites or sends.

### P3 — Consented Governance Follow-up

Maps from `consented_meeting_follow_up`. Produces draft minutes, proposed decisions/actions and follow-up draft from authorised notes/transcript. Human confirmation is required before any record is committed.

### P4 — Delivery Action Follow-through

Maps from `action_follow_through`. Monitors approved action state, creates work-queue exceptions and may schedule internal reminders/update allow-listed DeliveryIQ workflow state under explicit command/standing R2 policy.

### P5 — Weekly Status Draft

Maps from `recurring_update_draft`. Reconciles approved sources, identifies missing/stale/conflicting inputs and creates a labelled versioned report/narrative draft. Human approval/publishing remains outside the TeamMate.

### P6 — RAID and Decision Exception Review

Maps from `record_exception_review`. Applies approved versioned thresholds to delivery records, explains decisive facts and proposes escalation. It cannot change inherent severity, accept risk, close a material item or make a decision.

## 8. DeliveryIQ Recommendation Mappings

The profile may be presented from the following approved recommendation identities when applicable and available:

- `rec_decision_rights`
- `rec_integrated_controls`
- `rec_delivery_insight`
- `rec_improvement_cadence`
- `rec_sponsor_contract`
- `rec_risk_assurance`
- `rec_benefits_ownership`

Mapping establishes eligibility/discovery only. It does not grant availability, entitlement, permission, profile activation or runtime action.

## 9. Human Accountability

The profile cannot:

- make/approve governance, investment, prioritisation or delivery decisions;
- accept risk or liability;
- certify assurance, accuracy, compliance, baseline or benefit realisation;
- approve minutes, reports, business cases or formal submissions;
- change RAID severity/owner/status outside an exact authorised workflow;
- represent a sponsor/director externally;
- publish/send/invite or mutate an external delivery system;
- assess employee performance, sentiment or productivity.

## 10. Customer Experience

Customer-facing name: **Admin TeamMate — Delivery Operations**.

Catalogue summary: _Prepare governance work, coordinate approved follow-up and keep delivery information ready for accountable action—without giving up control of decisions or communications._

Primary actions:

- Prepare governance meeting
- Create delivery briefing
- Draft weekly update
- Coordinate action follow-up
- Review RAID exceptions
- Explain this delivery insight

Profile and source context remain visible so customers understand this is one Admin TeamMate configured for delivery operations.

## 11. Measures

- Governance preparation completed by agreed deadline.
- Action/decision record completeness and follow-through.
- Delivery record freshness against configured policy.
- Draft adoption and material correction.
- Missing/conflicting input resolution.
- Safe-action, duplicate-prevention and customer trust feedback.

No measure becomes employee productivity scoring or proof that the TeamMate caused delivery success.

## 12. Portability and Compatibility

1. The profile runs on the shared Admin runtime and policy engine.
2. Profile fields are versioned configuration and templates, not executable code.
3. All 23 selected capabilities resolve to TM-001A/DIQ-400A at equal or lower risk.
4. Delivery-specific objects resolve through approved generic record/context interfaces.
5. Removing the profile disables new profile work but preserves authorised history tied to its version.
6. Another profile cannot read Delivery Operations data unless its own instance/resource grants permit it.
7. Customer terminology changes labels only; profile semantics/thresholds remain versioned.

## 13. Golden Coverage

TM-001P-001B covers mappings, capability narrowing, all six workflows, missing/stale/conflicting delivery evidence, RAID/decision accountability, recommendation hand-off, unsent Outlook drafts, tenant/profile isolation, profile retirement, customer terminology and shared-runtime enforcement.

## 14. Release Gates

- [ ] DIQ-400/A/B, TM-001/A/B and TM-001P-001/A/B are version 1.0 **LOCKED**.
- [ ] Every profile capability is a subset of TM-001A with no higher risk.
- [ ] All delivery-specific schemas, thresholds, templates, mappings and copy are versioned and approved.
- [ ] Locked Sprint 03 preview IDs are preserved until the taxonomy decision is approved.
- [ ] No legacy evidence translation, external write/send or accountable decision exists.
- [ ] Golden, security, tenant/profile isolation, accessibility, performance and regression tests pass.
- [ ] Product Owner and Matt Prust accept the profile release.

## 15. Change History

| Version | Date          | Change                                                                                          | Product approval | Final approval                           |
| ------- | ------------- | ----------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------- |
| 1.0-RC1 | 2 August 2026 | Extracted Delivery Operations from the horizontal Admin core as the first governed work profile | Approved         | Pending Matt Prust and taxonomy decision |

---

**End of TM-001P-001 v1.0-RC1 — Product Owner approved; final approval pending**
