# DIQ-000 — DeliveryIQ Controlled Document Register

| Control                    | Value                                                             |
| -------------------------- | ----------------------------------------------------------------- |
| Document ID                | DIQ-000                                                           |
| Version                    | 3.5                                                               |
| Status                     | **CONTROLLED**                                                    |
| Owner                      | Product Owner                                                     |
| Approver                   | Matt Prust                                                        |
| Last updated               | 3 August 2026                                                     |
| Authoritative architecture | [DIQ-002 Product Architecture](<DIQ-002 Product Architecture.md>) |
| Cross-references           | All documents registered below                                    |

## Purpose

This index is the control record and entry point for DeliveryIQ documentation. A document is controlled only when registered here. DIQ-002 is the authoritative architecture and supersedes earlier architectural discussion unless explicitly amended.

## Status definitions

- **DRAFT** — under development and not yet an approved baseline.
- **DRAFT — OUTLINE** — an incomplete structural draft that is not implementation or production authority.
- **CONTROLLED DRAFT** — registered and governed work in progress; not implementation or production authority.
- **PRODUCT OWNER APPROVED — FINAL APPROVAL PENDING** — product definition is complete and may support engineering preparation, but production promotion requires the named final approver.
- **PRODUCT OWNER APPROVED — COMMERCIAL DECISIONS AND FINAL APPROVAL PENDING** — product definition is approved for planning, but unresolved commercial decisions and the named final approval prevent production promotion.
- **PRODUCT OWNER ACCEPTED — FOUNDER ACCEPTANCE PENDING** — Product Owner review has passed; founder acceptance remains an explicit release condition.
- **APPROVED** — the named decision authority has approved the record; the record remains subject to any higher-order locked authority and release controls.
- **ACCEPTED** — the defined acceptance authority has approved the record; downstream implementation or release gates remain independently applicable.
- **ACCEPTED WITH RECORDED LIMITATIONS** — acceptance has been granted with explicit limitations that remain governed release or future-work constraints.
- **REMEDIATION REQUIRED** — acceptance has not been granted; named deficiencies and evidence gates must be resolved and re-reviewed.
- **CONTROLLED** — issued and maintained under document control.
- **LOCKED** — approved authority; changes require a versioned amendment.
- **SUPERSEDED** — retained for traceability but replaced by a later version.

## Controlled Document Register

| ID               | Document                                                                                                                                                                           |   Version | Status                                                                   | Location                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------: | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| DIQ-000          | Master Index                                                                                                                                                                       |       3.5 | CONTROLLED                                                               | This document                                                           |
| DIQ-001          | [Vision & Mission](<DIQ-001 Vision & Mission.md>)                                                                                                                                  |       0.1 | DRAFT                                                                    | `docs/00-master-index`                                                  |
| DIQ-002          | [Product Architecture](<DIQ-002 Product Architecture.md>)                                                                                                                          |       1.0 | **LOCKED**                                                               | `docs/00-master-index`                                                  |
| DIQ-003          | [Product Roadmap](<DIQ-003 Product Roadmap.md>)                                                                                                                                    |       0.1 | DRAFT                                                                    | `docs/00-master-index`                                                  |
| DIQ-004          | [Design Principles](<DIQ-004 Design Principles.md>)                                                                                                                                |       0.1 | DRAFT                                                                    | `docs/00-master-index`                                                  |
| DIQ-100          | [Delivery DNA Specification](<../01-product/delivery-dna/DIQ-100 Delivery DNA Specification.md>)                                                                                   |       0.1 | DRAFT — OUTLINE                                                          | `docs/01-product/delivery-dna`                                          |
| DIQ-200          | [Delivery Intelligence Engine](<../01-product/delivery-intelligence/DIQ-200 Delivery Intelligence Engine.md>)                                                                      |       0.1 | DRAFT — OUTLINE                                                          | `docs/01-product/delivery-intelligence`                                 |
| DIQ-201          | [Recommendation Framework](<../01-product/recommendation-framework/DIQ-201 Recommendation Framework.md>)                                                                           |       0.1 | DRAFT — OUTLINE                                                          | `docs/01-product/recommendation-framework`                              |
| DIQ-202          | [Delivery Intelligence Traceability Model](<../01-product/delivery-intelligence/DIQ-202 Delivery Intelligence Traceability Model.md>)                                              |       0.1 | DRAFT — OUTLINE                                                          | `docs/01-product/delivery-intelligence`                                 |
| DIQ-203          | [Sprint 03 Product Configuration Specification](<../01-product/delivery-intelligence/DIQ-203 Sprint 03 Product Configuration Specification.md>)                                    |       1.0 | **LOCKED**                                                               | `docs/01-product/delivery-intelligence`                                 |
| DIQ-203A         | [Sprint 03 Production Configuration](<../01-product/delivery-intelligence/configuration/DIQ-203A Sprint 03 Production Configuration.json>)                                         |     1.0.0 | **LOCKED**                                                               | `docs/01-product/delivery-intelligence/configuration`                   |
| DIQ-203B         | [Sprint 03 Golden Fixtures](<../01-product/delivery-intelligence/configuration/DIQ-203B Sprint 03 Golden Fixtures.json>)                                                           |     1.0.0 | **LOCKED**                                                               | `docs/01-product/delivery-intelligence/configuration`                   |
| DIQ-203C         | [Delivery DNA 1.0.0 Question Catalogue](<../01-product/delivery-intelligence/configuration/DIQ-203C Delivery DNA 1.0.0 Question Catalogue.json>)                                  |     1.0.0 | **LOCKED**                                                               | `docs/01-product/delivery-intelligence/configuration`                   |
| DIQ-204          | [Delivery Evidence and Trends Register](<../01-product/delivery-intelligence/DIQ-204 Delivery Evidence and Trends Register.md>)                                                    |       1.1 | **CONTROLLED**                                                           | `docs/01-product/delivery-intelligence`                                 |
| DIQ-204A         | [Delivery Evidence Catalogue](<../01-product/delivery-intelligence/configuration/DIQ-204A Delivery Evidence Catalogue.json>)                                                       |     1.1.0 | **CONTROLLED**                                                           | `docs/01-product/delivery-intelligence/configuration`                   |
| DIQ-300          | [Knowledge Pack Framework](<../01-product/knowledge-pack-framework/DIQ-300 Knowledge Pack Framework.md>)                                                                           |   1.0-RC1 | PRODUCT OWNER APPROVED — FINAL APPROVAL PENDING                          | `docs/01-product/knowledge-pack-framework`                              |
| KP-001           | [Executive Sponsor Knowledge Pack](<../01-product/knowledge-pack-framework/executive-sponsor/KP-001 Executive Sponsor Knowledge Pack.md>)                                          |   1.0-RC1 | PRODUCT OWNER APPROVED — FINAL APPROVAL PENDING                          | `docs/01-product/knowledge-pack-framework/executive-sponsor`            |
| KP-001A          | [Executive Sponsor Catalogue](<../01-product/knowledge-pack-framework/executive-sponsor/KP-001A Executive Sponsor Catalogue.json>)                                                 | 1.0.0-rc1 | PRODUCT OWNER APPROVED — FINAL APPROVAL PENDING                          | `docs/01-product/knowledge-pack-framework/executive-sponsor`            |
| KP-001B          | [Executive Sponsor Golden Fixtures](<../01-product/knowledge-pack-framework/executive-sponsor/KP-001B Executive Sponsor Golden Fixtures.json>)                                     | 1.0.0-rc1 | PRODUCT OWNER APPROVED — FINAL APPROVAL PENDING                          | `docs/01-product/knowledge-pack-framework/executive-sponsor`            |
| DIQ-400          | [TeamMate Framework](<../01-product/teammate-framework/DIQ-400 TeamMate Framework.md>)                                                                                             |   1.0-RC3 | PRODUCT OWNER APPROVED — FINAL APPROVAL PENDING                          | `docs/01-product/teammate-framework`                                    |
| DIQ-400A         | [TeamMate Capability Catalogue](<../01-product/teammate-framework/configuration/DIQ-400A TeamMate Capability Catalogue.json>)                                                      | 1.0.0-rc3 | PRODUCT OWNER APPROVED — FINAL APPROVAL PENDING                          | `docs/01-product/teammate-framework/configuration`                      |
| DIQ-400B         | [TeamMate Golden Policy Fixtures](<../01-product/teammate-framework/configuration/DIQ-400B TeamMate Golden Policy Fixtures.json>)                                                  | 1.0.0-rc3 | PRODUCT OWNER APPROVED — FINAL APPROVAL PENDING                          | `docs/01-product/teammate-framework/configuration`                      |
| TM-001           | [Admin TeamMate](<../01-product/teammate-framework/admin/TM-001 Admin TeamMate.md>)                                                                                                |   1.0-RC2 | PRODUCT OWNER APPROVED — FINAL APPROVAL PENDING                          | `docs/01-product/teammate-framework/admin`                              |
| TM-001A          | [Admin TeamMate Manifest](<../01-product/teammate-framework/admin/TM-001A Admin TeamMate Manifest.json>)                                                                           | 1.0.0-rc2 | PRODUCT OWNER APPROVED — FINAL APPROVAL PENDING                          | `docs/01-product/teammate-framework/admin`                              |
| TM-001B          | [Admin TeamMate Golden Fixtures](<../01-product/teammate-framework/admin/TM-001B Admin TeamMate Golden Fixtures.json>)                                                             | 1.0.0-rc2 | PRODUCT OWNER APPROVED — FINAL APPROVAL PENDING                          | `docs/01-product/teammate-framework/admin`                              |
| TM-001P-001      | [Admin TeamMate Delivery Operations Profile](<../01-product/teammate-framework/admin/profiles/delivery-operations/TM-001P-001 Delivery Operations Profile.md>)                     |   1.0-RC1 | PRODUCT OWNER APPROVED — FINAL APPROVAL PENDING                          | `docs/01-product/teammate-framework/admin/profiles/delivery-operations` |
| TM-001P-001A     | [Delivery Operations Profile Manifest](<../01-product/teammate-framework/admin/profiles/delivery-operations/TM-001P-001A Delivery Operations Profile Manifest.json>)               | 1.0.0-rc1 | PRODUCT OWNER APPROVED — FINAL APPROVAL PENDING                          | `docs/01-product/teammate-framework/admin/profiles/delivery-operations` |
| TM-001P-001B     | [Delivery Operations Profile Golden Fixtures](<../01-product/teammate-framework/admin/profiles/delivery-operations/TM-001P-001B Delivery Operations Profile Golden Fixtures.json>) | 1.0.0-rc1 | PRODUCT OWNER APPROVED — FINAL APPROVAL PENDING                          | `docs/01-product/teammate-framework/admin/profiles/delivery-operations` |
| DIQ-401          | [TeamMate Commerce, Provisioning and Delivery Framework](<../01-product/teammate-framework/DIQ-401 TeamMate Commerce Provisioning and Delivery Framework.md>)                      |   1.0-RC2 | PRODUCT OWNER APPROVED — COMMERCIAL DECISIONS AND FINAL APPROVAL PENDING | `docs/01-product/teammate-framework`                                    |
| DIQ-401A         | [TeamMate Commerce and Fulfilment Contract](<../01-product/teammate-framework/configuration/DIQ-401A TeamMate Commerce and Fulfilment Contract.json>)                              | 1.0.0-rc2 | PRODUCT OWNER APPROVED — COMMERCIAL DECISIONS AND FINAL APPROVAL PENDING | `docs/01-product/teammate-framework/configuration`                      |
| DIQ-401B         | [TeamMate Commerce and Fulfilment Golden Fixtures](<../01-product/teammate-framework/configuration/DIQ-401B TeamMate Commerce and Fulfilment Golden Fixtures.json>)                | 1.0.0-rc2 | PRODUCT OWNER APPROVED — COMMERCIAL DECISIONS AND FINAL APPROVAL PENDING | `docs/01-product/teammate-framework/configuration`                      |
| PB-003           | [Sprint 03 Playbook — Delivery Intelligence Engine MVP](<../02-playbooks/PB-003 Sprint 03 Playbook.md>)                                                                            |       1.0 | LOCKED                                                                   | `docs/02-playbooks`                                                     |
| PB-004           | [Sprint 04 Playbook — Recommendation Framework](<../02-playbooks/PB-004 Sprint 04 Playbook.md>)                                                                                    |       1.0 | **LOCKED**                                                               | `docs/02-playbooks`                                                     |
| PB-004A          | [Sprint 04 Proportionate Recovery Amendment](<../02-playbooks/PB-004A Sprint 04 Proportionate Recovery Amendment.md>)                                                              |       1.0 | **LOCKED**                                                               | `docs/02-playbooks`                                                     |
| PB-005           | [Sprint 05 Playbook — Knowledge Pack Runtime and Executive Sponsor Pack](<../02-playbooks/PB-005 Sprint 05 Playbook.md>)                                                           |   1.0-RC1 | PRODUCT OWNER APPROVED — FINAL APPROVAL PENDING                          | `docs/02-playbooks`                                                     |
| PDR-003-001      | [Sprint 03 Analysis Trigger Policy](<../07-release/PDR-003-001 Sprint 03 Analysis Trigger Policy.md>)                                                                              |       1.0 | **APPROVED**                                                             | `docs/07-release`                                                       |
| PDR-003-002      | [Sprint 03 Analysis Eligibility Policy](<../07-release/PDR-003-002 Sprint 03 Analysis Eligibility Policy.md>)                                                                      |       1.0 | **LOCKED**                                                               | `docs/07-release`                                                       |
| PDR-003-003      | [Delivery DNA 1.0.0 Collection Journey](<../07-release/PDR-003-003 Delivery DNA 1.0.0 Collection Journey.md>)                                                                      |       1.0 | **LOCKED**                                                               | `docs/07-release`                                                       |
| PDR-003-004      | [Delivery DNA Commercial Access Boundary](<../07-release/PDR-003-004 Delivery DNA Commercial Access Boundary.md>)                                                                  |       1.0 | **LOCKED**                                                               | `docs/07-release`                                                       |
| PDR-003-005      | [Delivery DNA Snapshot](<../07-release/PDR-003-005 Delivery DNA Snapshot.md>)                                                                                                       |       1.0 | **LOCKED**                                                               | `docs/07-release`                                                       |
| PDR-003-005A     | [Delivery DNA Snapshot Configuration](<../01-product/delivery-intelligence/configuration/PDR-003-005A Delivery DNA Snapshot Configuration.json>)                                    |     1.0.0 | **LOCKED**                                                               | `docs/01-product/delivery-intelligence/configuration`                   |
| SAR-003-PD       | [Sprint 03 Product Definition Acceptance](<../07-release/SAR-003-PD Sprint 03 Product Definition Acceptance.md>)                                                                   |       1.0 | **ACCEPTED**                                                             | `docs/07-release`                                                       |
| SAR-003          | [Sprint 03 Product Acceptance](<../07-release/SAR-003 Sprint 03 Product Acceptance.md>)                                                                                            |       1.0 | **ACCEPTED WITH RECORDED LIMITATIONS**                                   | `docs/07-release`                                                       |
| PDR-004-001 v1.0 | [Sprint 04 Outcome Measurement and Recovery Policy — historical](<../07-release/PDR-004-001 Sprint 04 Outcome Measurement and Recovery Policy.md>)                                 |       1.0 | **SUPERSEDED**                                                           | `docs/07-release`                                                       |
| PDR-004-001      | [Sprint 04 Outcome Measurement and Proportionate Recovery Policy](<../07-release/PDR-004-001 v1.1 Sprint 04 Outcome Measurement and Proportionate Recovery Policy.md>)             |       1.1 | **LOCKED**                                                               | `docs/07-release`                                                       |
| PDR-004-002 v1.0 | [Sprint 04 Recovery Architecture Route — historical](<../07-release/PDR-004-002 Sprint 04 Recovery Architecture Route.md>)                                                         |       1.0 | **SUPERSEDED**                                                           | `docs/07-release`                                                       |
| SAR-004 v1.0     | [Sprint 04 Product Acceptance — historical review](<../07-release/SAR-004 Sprint 04 Product Acceptance.md>)                                                                        |       1.0 | **SUPERSEDED**                                                           | `docs/07-release`                                                       |
| SAR-004 v1.1     | [Sprint 04 Superseding Product Acceptance — historical review](<../07-release/SAR-004 v1.1 Sprint 04 Superseding Product Acceptance.md>)                                           |       1.1 | **SUPERSEDED**                                                           | `docs/07-release`                                                       |
| SAR-004          | [Sprint 04 Product Acceptance](<../07-release/SAR-004 v1.2 Sprint 04 Product Acceptance.md>)                                                                                       |       1.2 | **ACCEPTED WITH RECORDED LIMITATIONS**                                   | `docs/07-release`                                                       |

## Filing structure

```text
docs/
├── 00-master-index/       Governance and architectural authorities
├── 01-product/            Product and platform specifications
│   ├── delivery-dna/
│   ├── delivery-intelligence/
│   ├── recommendation-framework/
│   ├── knowledge-pack-framework/
│   └── teammate-framework/
│       ├── configuration/
│       └── admin/
│           └── profiles/
│               └── delivery-operations/
├── 02-playbooks/          Controlled delivery playbooks
└── 07-release/            Acceptance and release control records
```

## Governance rules

1. Supporting documents must conform to DIQ-002; DIQ-002 prevails if a conflict exists.
2. Every feature, sprint, Knowledge Pack and TeamMate must cite its controlling document before release.
3. Locked-document changes require approval, a version increment, impact assessment and index update.
4. Superseded documents must be archived without breaking their traceability.
5. The register version and status must agree with each document header.

## Index Change History

| Version | Date          | Change                                                                                                                                                                     |
| ------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.5     | 3 August 2026 | Registered locked PDR-003-005/A defining the Delivery DNA Snapshot name, 13-question directional journey, exact continuation and acceptance fixtures                      |
| 3.4     | 3 August 2026 | Registered locked PDR-003-004 defining anonymous, free-account and entitled Delivery DNA projections, commercial copy and action entitlement                             |
| 3.3     | 3 August 2026 | Updated DIQ-204/A with the value-led, context-gated and proportionate SME policy for AI questions; retained the 39-question core journey and prohibited non-use penalties  |
| 3.2     | 3 August 2026 | Registered DIQ-204 and DIQ-204A, establishing the current-practice evidence baseline, customer-safe fact catalogue and Delivery DNA 1.0.0 gap assessment                  |
| 3.1     | 3 August 2026 | Registered locked DIQ-203C and PDR-003-003 customer wording authority; prioritised the genuine Delivery DNA 1.0.0 collection journey ahead of PB-005                      |
| 3.0     | 3 August 2026 | Registered PB-004A, PDR-004-001 v1.1 and SAR-004 v1.2; superseded prior recovery route/acceptance records and recorded Sprint 04 acceptance with limitations               |
| 2.9     | 3 August 2026 | Registered locked PDR-004-002 selecting Lovable-supported recovery first with a mandatory alternative Tier 1 architecture fallback                                         |
| 2.8     | 3 August 2026 | Registered SAR-004 v1.1 superseding review; closed S4-010 and evidence remediation, preserved v1.0, and isolated recovery architecture as the remaining acceptance blocker |
| 2.7     | 3 August 2026 | Registered locked PDR-004-001 and SAR-004 Sprint 04 review decision with remediation required                                                                              |
| 2.6     | 2 August 2026 | Completed the controlled-document filing audit, defined all statuses used by the register, and removed obsolete empty filing paths                                         |
| 2.5     | 2 August 2026 | Refactored TM-001 as cross-industry Admin, registered the Delivery Operations profile, and promoted DIQ-400/A/B to RC3 and DIQ-401/A/B to RC2                              |
| 2.4     | 2 August 2026 | Registered DIQ-401/A/B RC1 TeamMate commerce, subscription, provisioning and delivery package                                                                              |
| 2.3     | 2 August 2026 | Refined DIQ-400/A/B to RC2 and registered the TM-001/A/B Admin TeamMate reference product package                                                                          |
| 2.2     | 2 August 2026 | Registered DIQ-400/A/B v1.0 RC1 TeamMate definition and capability package                                                                                                 |
| 2.1     | 2 August 2026 | Registered completed PB-005 v1.0-RC1 for final approval                                                                                                                    |
| 2.0     | 2 August 2026 | Registered SAR-003 final Sprint 03 Product Acceptance with recorded limitations                                                                                            |
| 1.9     | 2 August 2026 | Registered and locked PDR-003-002 Sprint 03 analysis eligibility policy                                                                                                    |
| 1.8     | 2 August 2026 | Registered DIQ-300 RC1, KP-001/A/B RC1, and PB-005 initial controlled draft                                                                                                |
| 1.7     | 2 August 2026 | Registered PDR-003-001 automatic analysis trigger and retry policy                                                                                                         |
| 1.6     | 2 August 2026 | Recorded Matt Prust’s approval and promoted PB-004 to the locked version 1.0 baseline                                                                                      |
| 1.5     | 2 August 2026 | Registered completed PB-004 v1.0-RC1 for final approval                                                                                                                    |
| 1.4     | 2 August 2026 | Recorded Matt Prust’s approval and promoted DIQ-203, DIQ-203A, DIQ-203B and SAR-003-PD to final version 1.0 baselines                                                      |
| 1.3     | 2 August 2026 | Registered DIQ-203, DIQ-203A, DIQ-203B and SAR-003-PD                                                                                                                      |
| 1.2     | 2 August 2026 | Restored and registered the initial DIQ controlled-document set; retained PB-003 and PB-004                                                                                |
| 1.1     | 2 August 2026 | Registered PB-004 initial controlled draft                                                                                                                                 |
| 1.0     | 2 August 2026 | Established the index and registered PB-003                                                                                                                                |
