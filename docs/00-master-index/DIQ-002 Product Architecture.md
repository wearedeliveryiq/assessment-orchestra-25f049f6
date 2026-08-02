# DIQ-002 — DeliveryIQ Product Architecture

| Control | Value |
|---|---|
| Document ID | DIQ-002 |
| Version | 1.0 |
| Status | **LOCKED** |
| Owner | Product Owner |
| Approver | Matt Prust |
| Last updated | 2 August 2026 |
| Cross-references | [DIQ-000](<DIQ-000 Master Index.md>), [DIQ-001](<DIQ-001 Vision & Mission.md>), [DIQ-003](<DIQ-003 Product Roadmap.md>), [DIQ-004](<DIQ-004 Design Principles.md>), [DIQ-100](<../01-product/delivery-dna/DIQ-100 Delivery DNA Specification.md>), [DIQ-200](<../01-product/delivery-intelligence/DIQ-200 Delivery Intelligence Engine.md>), [DIQ-201](<../01-product/recommendation-framework/DIQ-201 Recommendation Framework.md>), [DIQ-202](<../01-product/delivery-intelligence/DIQ-202 Delivery Intelligence Traceability Model.md>), [DIQ-300](<../01-product/knowledge-pack-framework/DIQ-300 Knowledge Pack Framework.md>), [DIQ-400](<../01-product/teammate-framework/DIQ-400 TeamMate Framework.md>) |

> This is the authoritative architecture of the DeliveryIQ platform. It supersedes previous architectural discussions unless explicitly amended.

## Master brand

**DeliveryIQ**  
**Tagline:** **Smarter project delivery.**  
**Core proposition:** DeliveryIQ helps organisations build, improve and automate project delivery.

## Platform capability stack

### Delivery Intelligence Engine™

Transforms assessment evidence into explainable delivery intelligence: capability and maturity scoring, confidence, patterns, executive insights, strengths, weaknesses and downstream triggers.

**Core question:** *What does the evidence mean?*

### Recommendation Framework™

Converts intelligence into prioritised improvements, impact and effort, quick wins, strategic initiatives, implementation guidance, sequencing, roadmaps and success measures.

**Core question:** *What should the organisation do next?*

### Knowledge Pack Framework™

Provides specialist diagnostic content using the shared platform. Each pack owns its questions, evidence rules, scoring, patterns, recommendations and narrative guidance.

**Core question:** *Where is deeper investigation required?*

### TeamMate Framework™

Provides organisation context, permissions, memory, prompts, workflows, integrations, auditability, task execution and outcome measurement for intelligent digital colleagues.

**Core question:** *How can DeliveryIQ help implement and sustain the improvement?*

## Customer-facing products

### Delivery DNA™

The flagship public entry product and a controlled public slice of the platform—not a separate engine. It gathers concise evidence, shows high-level capability, identifies priorities, recommends Knowledge Packs, previews TeamMates and creates a path to the Workspace.

### DeliveryIQ Workspace

The authenticated platform providing full intelligence, multiple assessments, organisational views, trends, dashboards, reports, planning, collaboration, benchmarking and TeamMate management.

### TeamMates™

Customer-facing digital colleagues powered by the TeamMate Framework that consume Delivery Intelligence and support specific delivery outcomes.

## Canonical execution flow

```text
Assessment evidence
        ↓
Delivery Intelligence Engine
        ↓
Recommendation Framework
        ├───────────────┐
        ↓               ↓
Knowledge Packs     TeamMates
deeper diagnosis    execution support
```

## Delivery DNA operating principle

Delivery DNA uses the shared assessment runtime, evidence model, intelligence engine, Recommendation Framework, Knowledge Pack logic and TeamMate mapping. It does not expose the full workspace, advanced history, portfolio reporting, audit explorer, active TeamMate workflows or unrestricted specialist assessments.

## Roadmap interpretation

| Stage | Deliverable |
|---|---|
| Sprint 1 | Platform foundation |
| Sprint 2 | Intelligence runtime foundation |
| Sprint 3 | Enterprise assessment and improvement experience |
| Later release | Delivery DNA public experience sliced from the completed platform |
| Later release | Knowledge Pack Studio and specialist library |
| Later release | TeamMate Framework and first production TeamMates |

## Locked strategic principles

1. DeliveryIQ is the master brand.
2. DeliveryIQ does not sell questionnaires; it enables better delivery decisions.
3. Delivery DNA is the flagship entry product, not the underlying engine.
4. The Delivery Intelligence Engine is the central intellectual property.
5. Knowledge Packs provide deeper diagnosis.
6. TeamMates provide execution support.
7. One shared platform powers all customer experiences.
8. Delivery DNA must contain no duplicate scoring, recommendation or intelligence logic.
9. Every conclusion must be evidence-based and explainable.
10. Every product decision should support smarter project delivery.

