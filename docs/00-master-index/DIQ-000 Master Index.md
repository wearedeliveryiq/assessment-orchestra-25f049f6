# DIQ-000 — DeliveryIQ Controlled Document Register

| Control | Value |
|---|---|
| Document ID | DIQ-000 |
| Version | 1.6 |
| Status | **CONTROLLED** |
| Owner | Product Owner |
| Approver | Matt Prust |
| Last updated | 2 August 2026 |
| Authoritative architecture | [DIQ-002 Product Architecture](<DIQ-002 Product Architecture.md>) |
| Cross-references | All documents registered below |

## Purpose

This index is the control record and entry point for DeliveryIQ documentation. A document is controlled only when registered here. DIQ-002 is the authoritative architecture and supersedes earlier architectural discussion unless explicitly amended.

## Status definitions

- **DRAFT** — under development and not yet an approved baseline.
- **PRODUCT OWNER APPROVED — FINAL APPROVAL PENDING** — product definition is complete and may support engineering preparation, but production promotion requires the named final approver.
- **PRODUCT OWNER ACCEPTED — FOUNDER ACCEPTANCE PENDING** — Product Owner review has passed; founder acceptance remains an explicit release condition.
- **ACCEPTED** — the defined acceptance authority has approved the record; downstream implementation or release gates remain independently applicable.
- **CONTROLLED** — issued and maintained under document control.
- **LOCKED** — approved authority; changes require a versioned amendment.
- **SUPERSEDED** — retained for traceability but replaced by a later version.

## Controlled Document Register

| ID | Document | Version | Status | Location |
|---|---|---:|---|---|
| DIQ-000 | Master Index | 1.6 | CONTROLLED | This document |
| DIQ-001 | [Vision & Mission](<DIQ-001 Vision & Mission.md>) | 0.1 | DRAFT | `docs/00-master-index` |
| DIQ-002 | [Product Architecture](<DIQ-002 Product Architecture.md>) | 1.0 | **LOCKED** | `docs/00-master-index` |
| DIQ-003 | [Product Roadmap](<DIQ-003 Product Roadmap.md>) | 0.1 | DRAFT | `docs/00-master-index` |
| DIQ-004 | [Design Principles](<DIQ-004 Design Principles.md>) | 0.1 | DRAFT | `docs/00-master-index` |
| DIQ-100 | [Delivery DNA Specification](<../01-product/delivery-dna/DIQ-100 Delivery DNA Specification.md>) | 0.1 | DRAFT — OUTLINE | `docs/01-product/delivery-dna` |
| DIQ-200 | [Delivery Intelligence Engine](<../01-product/delivery-intelligence/DIQ-200 Delivery Intelligence Engine.md>) | 0.1 | DRAFT — OUTLINE | `docs/01-product/delivery-intelligence` |
| DIQ-201 | [Recommendation Framework](<../01-product/recommendation-framework/DIQ-201 Recommendation Framework.md>) | 0.1 | DRAFT — OUTLINE | `docs/01-product/recommendation-framework` |
| DIQ-202 | [Delivery Intelligence Traceability Model](<../01-product/delivery-intelligence/DIQ-202 Delivery Intelligence Traceability Model.md>) | 0.1 | DRAFT — OUTLINE | `docs/01-product/delivery-intelligence` |
| DIQ-203 | [Sprint 03 Product Configuration Specification](<../01-product/delivery-intelligence/DIQ-203 Sprint 03 Product Configuration Specification.md>) | 1.0 | **LOCKED** | `docs/01-product/delivery-intelligence` |
| DIQ-203A | [Sprint 03 Production Configuration](<../01-product/delivery-intelligence/configuration/DIQ-203A Sprint 03 Production Configuration.json>) | 1.0.0 | **LOCKED** | `docs/01-product/delivery-intelligence/configuration` |
| DIQ-203B | [Sprint 03 Golden Fixtures](<../01-product/delivery-intelligence/configuration/DIQ-203B Sprint 03 Golden Fixtures.json>) | 1.0.0 | **LOCKED** | `docs/01-product/delivery-intelligence/configuration` |
| DIQ-300 | [Knowledge Pack Framework](<../01-product/knowledge-pack-framework/DIQ-300 Knowledge Pack Framework.md>) | 0.1 | DRAFT — OUTLINE | `docs/01-product/knowledge-pack-framework` |
| DIQ-400 | [TeamMate Framework](<../01-product/teammate-framework/DIQ-400 TeamMate Framework.md>) | 0.1 | DRAFT — OUTLINE | `docs/01-product/teammate-framework` |
| PB-003 | [Sprint 03 Playbook — Delivery Intelligence Engine MVP](<../02-playbooks/PB-003 Sprint 03 Playbook.md>) | 1.0 | LOCKED | `docs/02-playbooks` |
| PB-004 | [Sprint 04 Playbook — Recommendation Framework](<../02-playbooks/PB-004 Sprint 04 Playbook.md>) | 1.0 | **LOCKED** | `docs/02-playbooks` |
| SAR-003-PD | [Sprint 03 Product Definition Acceptance](<../07-release/SAR-003-PD Sprint 03 Product Definition Acceptance.md>) | 1.0 | **ACCEPTED** | `docs/07-release` |

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

| Version | Date | Change |
|---|---|---|
| 1.6 | 2 August 2026 | Recorded Matt Prust’s approval and promoted PB-004 to the locked version 1.0 baseline |
| 1.5 | 2 August 2026 | Registered completed PB-004 v1.0-RC1 for final approval |
| 1.4 | 2 August 2026 | Recorded Matt Prust’s approval and promoted DIQ-203, DIQ-203A, DIQ-203B and SAR-003-PD to final version 1.0 baselines |
| 1.3 | 2 August 2026 | Registered DIQ-203, DIQ-203A, DIQ-203B and SAR-003-PD |
| 1.2 | 2 August 2026 | Restored and registered the initial DIQ controlled-document set; retained PB-003 and PB-004 |
| 1.1 | 2 August 2026 | Registered PB-004 initial controlled draft |
| 1.0 | 2 August 2026 | Established the index and registered PB-003 |
