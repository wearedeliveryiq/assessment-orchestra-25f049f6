# DIQ-204 — Delivery Evidence and Trends Register

| Control | Value |
|---|---|
| Document ID | DIQ-204 |
| Version | 1.2 |
| Status | **CONTROLLED** |
| Owner | Product Owner |
| Approver | Matt Prust |
| Authorised | 5 August 2026 |
| Evidence snapshot | 5 August 2026 |
| Classification | Internal — Controlled |
| Machine-readable catalogue | [DIQ-204A](<configuration/DIQ-204A Delivery Evidence Catalogue.json>) |
| Cross-references | [DIQ-002](<../../00-master-index/DIQ-002 Product Architecture.md>), [DIQ-100](<../delivery-dna/DIQ-100 v2.0 Delivery DNA Specification.md>), [DIQ-100A](<../delivery-dna/DIQ-100A Delivery DNA 2.0 Model Catalogue.json>), [DIQ-100B](<../delivery-dna/DIQ-100B Delivery DNA 2.0 Golden Fixtures.json>), [DIQ-200](<DIQ-200 Delivery Intelligence Engine.md>), [DIQ-201](<../recommendation-framework/DIQ-201 Recommendation Framework.md>), [DIQ-202](<DIQ-202 Delivery Intelligence Traceability Model.md>), [DIQ-203](<DIQ-203 Sprint 03 Product Configuration Specification.md>), [DIQ-203A](<configuration/DIQ-203A Sprint 03 Production Configuration.json>), [DIQ-203C](<configuration/DIQ-203C Delivery DNA 1.0.0 Question Catalogue.json>) |

> **Controlled-document notice.** DIQ-204 governs how external delivery evidence and trends are selected, maintained and used by DeliveryIQ. It never changes scoring, confidence, pattern, recommendation or ranking at runtime. DIQ-203/A/B remain the authority for Delivery DNA 1.0; the final locked DIQ-100/A/B package will govern Delivery DNA 2.0. Evidence may change customer scoring only through a separately approved, versioned configuration release with updated golden fixtures.

## 1. Purpose

Keep DeliveryIQ current with credible developments in project, programme and portfolio delivery and governance while preventing weak statistics, transient fashions or automated web content from changing product behaviour.

This register provides:

- a current professional-practice baseline;
- a machine-readable evidence and fact catalogue;
- mappings from current trends to the applicable Delivery DNA 1.0 and 2.0 capabilities;
- approved customer-safe wording and prohibited inferences;
- a lean refresh and promotion process suitable for a startup.

## 2. Product decision

DeliveryIQ will maintain a **curated evidence layer**, not a self-modifying intelligence engine.

1. External evidence may inform educational content, Knowledge Packs, recommendation rationale and Product Owner backlog decisions.
2. External evidence must not alter a score, band, confidence result, pattern, rank, roadmap or customer conclusion at runtime.
3. Only evidence items marked `approved_for_customer_context` in DIQ-204A may appear in customer-facing content.
4. Every displayed statistic must carry its publisher and evidence year. Scope or methodology caveats must be available with the claim.
5. Historical or industry evidence must not be presented as a prediction, causal diagnosis or direct comparison for an assessed customer.
6. No question is added merely because a topic is fashionable. A Delivery DNA change requires evidence of a material capability gap and a proportionate product benefit.

## 3. Evidence hierarchy

DeliveryIQ uses sources in this order:

1. Current standards and official guidance from recognised standards bodies, government or chartered/professional institutions.
2. Official datasets and primary research with a disclosed population, date, scope and method.
3. Peer-reviewed research with an identifiable method and relevant population.
4. Reputable professional or industry surveys with disclosed methods, used as contextual evidence only.
5. Vendor studies, opinion pieces and media summaries, used only to discover stronger sources and never as sole customer-facing authority.

Unattributed statistics, social-media claims, search summaries and statements that cannot be traced to the original publication are excluded.

## 4. Current professional-practice baseline

The following publications form the baseline at the evidence snapshot date:

| Authority | Current publication | DeliveryIQ relevance |
|---|---|---|
| PMI | [PMBOK Guide — Eighth Edition](https://www.pmi.org/standards/pmbok), November 2025 | Value delivery, adaptability, accountability, AI, PMOs and procurement |
| APM | [APM Body of Knowledge — Eighth Edition](https://www.apm.org.uk/news/apm-body-of-knowledge-8th-edition-now-available/), April 2025 | Systems thinking, leadership, sustainability, project controls, data and AI |
| PMI and Agile Alliance | [Agile Practice Guide — Second Edition](https://www.pmi.org/standards/agile), July 2026 | Fit-for-purpose lifecycles, product and flow thinking, psychological safety, AI-enabled delivery and sustainability |
| PMI | [The Standard for Artificial Intelligence in Portfolio, Program and Project Management](https://www.pmi.org/standards/artificial-intelligence), June 2026 | Human oversight, ethical and legal guardrails, governance, risk and data quality |
| ISO | [ISO 21502:2020](https://www.iso.org/standard/74947.html) | Method-neutral project management, oversight, benefits and outcomes |
| ISO | [ISO 21513:2026](https://www.iso.org/standard/63585.html), January 2026 | Post-project evaluation of objectives, outcomes, benefits, governance and management |
| PeopleCert | [PRINCE2 7](https://www.peoplecert.org/news-and-announcements/new-prince2-7) | People, tailoring, digital/data, sustainability and compatibility with agile and lean methods |
| UK Government Project Delivery | [GovS 002, version 2.1](https://www.gov.uk/government/publications/project-delivery-functional-standard), September 2025 | Governance roles, portfolio/programme/project management, planning, control, solution transition, use and disposal |

Active watchlist items are not product authority until published and reviewed:

- PMI's Standard for Portfolio Management — Fifth Edition, in public-comment development at the snapshot date;
- ISO/DIS 21520, covering AI concepts, applications, implications, benefits, risks and governance in project, programme and portfolio management.

## 5. Current trend position

The evidence supports eight durable themes. These are practice signals, not claims that one method is universally superior.

| Theme | Product interpretation |
|---|---|
| Value and business acumen | Assess whether delivery choices connect to strategy, outcomes, benefits and investment value—not only time, cost and scope. |
| Fit-for-purpose delivery | Support predictive, adaptive, agile and hybrid approaches; assess whether the approach is appropriate and effective. |
| Complexity and systems thinking | Examine dependencies, stakeholder interests, decision friction, uncertainty and interactions across the delivery system. |
| People and change conditions | Treat leadership, collaboration, stakeholder adoption, psychological safety and sustainable team performance as delivery conditions. |
| Data and responsible AI | Assess data quality, decision use, human oversight, accountability, risk and ethical safeguards where AI supports delivery. |
| Sustainability and whole-life value | Consider environmental, social and whole-life consequences as part of intended value and governance where material. |
| Evaluation and learning | Continue benefits and governance evaluation after implementation and apply findings to subsequent delivery. |
| Proportionate governance | Match governance, controls and assurance to value, complexity and risk while retaining clear accountability. |

## 6. Delivery DNA 1.0.0 gap assessment

### 6.1 Assessment outcome

The 13-capability taxonomy and all 39 DIQ-203C questions were reviewed against the baseline. The question set remains broadly current because it is outcome-led and method-neutral. There is **no evidence-based requirement to invalidate, expand or delay Delivery DNA 1.0.0**.

Two topics are not explicit enough to support a future specialist conclusion without more evidence: responsible AI/data governance and sustainability/whole-life value. Two further topics—systems complexity and psychological safety/team conditions—are partially covered but may justify clearer wording in a future question-set version. None changes Sprint 03 scoring in version 1.0.0.

### 6.2 Capability mapping

| Capability | Current coverage | Trend mapping and decision |
|---|---|---|
| `strategy_alignment` | Strong | Covers priorities, outcomes, trade-offs and strategic contribution. Whole-life and sustainability value is a future candidate, not a current scoring rule. |
| `governance` | Strong | Covers decision rights, forums, escalation, records and follow-through. Responsible-AI accountability is not explicit. |
| `sponsorship` | Strong | Covers sponsor direction, barriers, decisions and accountability. Business-acumen evidence strengthens existing interpretation. |
| `portfolio` | Strong | Covers objectives, investment boundaries, capacity, start/stop/rebalance decisions, value and constraints. |
| `programme_delivery` | Strong with a partial gap | Covers outcomes, governance, dependencies, risks and approach. Systems complexity and inter-organisational relationships could be made more explicit later. |
| `project_delivery` | Strong | Covers outcomes, scope, delivery approach, adaptation, closure and constraints without privileging one lifecycle. |
| `planning_controls` | Strong | Covers baselines, tolerances, forecasts, change and corrective action. Flow metrics are valid evidence where appropriate but are not mandatory. |
| `benefits` | Strong | Covers owners, measures, timescales and tracking after implementation. ISO 21513 strengthens the interpretation of post-project evaluation. |
| `risk_assurance` | Strong with a partial gap | Covers risk, control, assurance and escalation. AI, data and ethical risks require context-specific evidence rather than inferred scoring. |
| `stakeholder_change` | Strong with a partial gap | Covers affected groups, impacts, engagement and sustained adoption. Psychological safety and team well-being are not explicit. |
| `pmo_enablement` | Strong | Covers purpose, authority, proportionate support, challenge, coordination and delivery value. |
| `reporting_insight` | Strong with a partial gap | Covers measures, ownership, data standards, validation and decision use. Human review of AI-generated insight is not explicit. |
| `continuous_improvement` | Strong | Covers feedback, learning, performance signals, completed improvements and reuse in later delivery. |

### 6.3 Future configuration candidates

These are backlog candidates only and do not constitute approved question or scoring changes:

1. Make responsible AI, data provenance, human review and AI-risk ownership explicit where AI is used.
2. Make sustainability and whole-life value explicit where material to the organisation or initiative.
3. Strengthen systems-complexity evidence covering interactions, conflicting incentives and cross-organisational dependencies.
4. Strengthen evidence of psychological safety, team sustainability and constructive challenge.

The preferred implementation is to refine or replace wording within a future question-set version, rather than increase the 39-question count by default.

## 7. AI product position and question-design policy

DeliveryIQ sells AI-enabled products, including TeamMates. AI-related questions must therefore help SMEs adopt useful AI confidently and responsibly. They must not frame AI as inherently unsafe, make non-adoption appear to be delivery failure or impose disproportionate enterprise controls.

The following rules apply to any future AI-related assessment or Knowledge Pack:

1. **Lead with value:** establish the intended outcome, useful use case and accountable owner before asking about controls.
2. **Use context gating:** ask detailed AI questions only when the organisation uses, pilots or plans to adopt AI in the relevant activity.
3. **Do not penalise non-use:** not using AI must not reduce the core Delivery DNA score. A genuine `not_applicable` response remains non-contributing under DIQ-203.
4. **Use proportionate safeguards:** assess human review, data permissions and quality, privacy, escalation and monitoring in language suitable for SMEs and in proportion to the use-case risk.
5. **Measure adoption as well as control:** include user readiness, workflow fit, training, feedback and realised value; do not create a compliance-only diagnostic.
6. **Remain technology-neutral:** do not require a particular model, vendor, certification or technical architecture.
7. **Avoid unsupported claims:** do not imply AI guarantees productivity, accuracy, project success or regulatory compliance.
8. **Keep the core journey concise:** prefer an optional AI Readiness diagnostic or Knowledge Pack over expanding the 39-question Delivery DNA journey by default.

Appropriate AI evidence may include:

- a defined business outcome and success measure;
- a named person accountable for the AI-supported decision or workflow;
- approved data access and handling arrangements;
- human review for material outputs and a clear exception route;
- monitoring of accuracy, usefulness, adoption and unintended effects;
- evidence that the AI use case saves time, improves decisions or creates another agreed benefit.

This policy does not approve new questions, scoring or AI recommendations. Any future wording must be neutral, concise, observable, suitable for en-GB SMEs and versioned through the applicable product authority.

## 8. Evidence catalogue contract

DIQ-204A is authoritative for evidence-item identifiers, source metadata, approved wording, caveats, capability mappings and review dates.

Each item contains:

- stable ID and version;
- evidence type and grade;
- source publisher, title, date and original URL;
- source and population context;
- factual claim or practice signal;
- customer-safe wording;
- prohibited inference;
- mapped Delivery DNA capabilities;
- permitted product uses;
- scoring effect, which is `none` for version 1.0;
- next review date.

Evidence grades are:

- `A1` — published standard or official government dataset;
- `A2` — primary research from a recognised professional body with usable methodology and scope;
- `B1` — reputable research suitable for directional context but not customer comparison or scoring;
- `excluded` — insufficiently traceable, methodologically weak or unsuitable for customer use.

## 9. Customer-facing fact policy

### 9.1 Allowed

- “In PMI's 2018 global research, 52% of completed projects experienced scope creep or uncontrolled scope change.”
- “PMI's 2026 research reported that 31% of complex projects did not achieve the full scope of intended benefits, compared with 13% of projects overall.”
- “The source is historical and describes its surveyed population; it is not a prediction of your outcome.”

### 9.2 Prohibited

- “One in ten projects fail because of scope creep.” The reviewed source does not establish that causal claim.
- “Your project has a 31% chance of failure.” Industry research cannot predict an individual customer's result.
- “You perform better/worse than the industry.” DIQ-203 prohibits cross-organisation comparison and no matched benchmark population exists.
- Any statistic without its source and evidence year.
- Any combination of separate studies presented as a single trend when their definitions or populations are not comparable.

## 10. Product usage

| Use | Policy |
|---|---|
| Delivery DNA scoring and bands | Prohibited; contextual evidence has no scoring effect under DIQ-100/A or DIQ-203/A |
| Pattern or recommendation eligibility | Prohibited without versioned product rules and tests |
| Knowledge Pack educational content | Allowed for approved items with source, year and caveat |
| Recommendation rationale | Allowed as general context; must not claim that the statistic caused the customer's finding |
| Customer result narrative | Allowed in a separately labelled “Industry context” element under the locked DIQ-100/A selection, source-note and disclosure rules |
| Website or marketing | Allowed with approved wording; must retain the source year and avoid predictive claims |
| Internal product discovery | Allowed for all included items; excluded items may be retained only with their exclusion reason |

## 11. Lean maintenance cycle

1. **Monthly horizon scan:** check the named authorities for new standards, revisions and primary research. Record only material changes.
2. **Quarterly evidence review:** validate links, source status, wording and review dates; approve or retire evidence in one batch.
3. **Annual model calibration:** review the active Delivery DNA capabilities, questions, patterns and recommendations against accumulated evidence and anonymised product outcomes where lawful and sufficient.
4. **Event-driven review:** assess a major standard, regulation or product-risk change when it could materially affect customer safety, accuracy or value.

This work must not create a routine sprint gate. The Product Owner may approve contextual evidence updates directly. Engineering is involved only when customer behaviour or machine-readable production configuration changes.

## 12. Release and traceability requirements

Any future engine change derived from this register must identify:

- the DIQ-204A evidence IDs relied on;
- the affected capability, question, pattern, recommendation or narrative rule;
- why the existing rule is insufficient;
- customer and compatibility impact;
- configuration and question-set version changes;
- affected golden fixtures and regression evidence;
- Product Owner approval.

Customer evidence and tenant data must never be added to DIQ-204A. Future outcome research must use separately governed, consented and aggregated data with a minimum cohort policy before publication.

## 13. Review decision

- External evidence continues to have no scoring, confidence, finding, pattern, recommendation or ranking effect.
- The seven Wellingtone 2026 evidence items are approved as `B1` directional context for the exact surfaces and capability mappings recorded in DIQ-204A.
- Wellingtone findings must carry a visible source note and the self-selected-survey caveat; they are not a representative benchmark or prediction.
- Delivery DNA 2.0 may select approved contextual items only under the locked DIQ-100/A rules and retain the exact evidence ID and version in the result projection.
- Responsible AI questions remain context-gated and value-led; non-use of AI does not automatically reduce maturity.
- The next scheduled evidence review is **3 November 2026**.

## 14. Change history

| Version | Date | Change | Approval |
|---|---|---|---|
| 1.2 | 5 August 2026 | Added seven Wellingtone 2026 directional context items, Delivery DNA 2.0 mappings and result-page source-note controls without changing scoring | Matt Prust |
| 1.1 | 3 August 2026 | Added the commercial and question-design policy for proportionate, value-led AI adoption without penalising non-use | Matt Prust |
| 1.0 | 3 August 2026 | Established the evidence hierarchy, current-practice baseline, 13-capability/39-question gap assessment, customer fact policy and initial catalogue | Matt Prust |
