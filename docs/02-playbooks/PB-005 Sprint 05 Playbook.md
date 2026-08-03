# PB-005 — Sprint 05 Playbook – Knowledge Pack Runtime and Executive Sponsor Pack

| Control          | Value                                               |
| ---------------- | --------------------------------------------------- |
| Document ID      | PB-005                                              |
| Version          | 1.0-RC1                                             |
| Status           | **PRODUCT OWNER APPROVED — FINAL APPROVAL PENDING** |
| Owner            | Product Owner                                       |
| Final approver   | Matt Prust                                          |
| Product approval | Product Owner, 2 August 2026                        |
| Sprint           | Sprint 05                                           |
| Classification   | Internal — Controlled                               |

> **Controlled-document notice.** PB-005 is the complete Product Owner-approved engineering definition for Sprint 05. It is not implementation authority until Matt Prust approves it, DIQ-300 and KP-001/A/B are promoted to locked version 1.0 baselines, PB-005 is promoted to version 1.0 with status **LOCKED**, and the entry criteria in Section 7 are satisfied. No illustrative example in this document overrides a locked configuration or golden fixture.

## 1. Document Control

### 1.1 Purpose

Define the complete product, engineering, security, quality and release contract for delivering the shared DeliveryIQ Knowledge Pack runtime and the first governed production pack, KP-001 Executive Sponsor.

### 1.2 Authority and precedence

Apply the following order:

1. [DIQ-002 Product Architecture v1.0](<../00-master-index/DIQ-002 Product Architecture.md>) — LOCKED.
2. This playbook when promoted to v1.0 — LOCKED.
3. [DIQ-300 Knowledge Pack Framework](<../01-product/knowledge-pack-framework/DIQ-300 Knowledge Pack Framework.md>) when promoted to v1.0 — LOCKED.
4. [KP-001 Executive Sponsor Knowledge Pack](<../01-product/knowledge-pack-framework/executive-sponsor/KP-001 Executive Sponsor Knowledge Pack.md>), [KP-001A Catalogue](<../01-product/knowledge-pack-framework/executive-sponsor/KP-001A Executive Sponsor Catalogue.json>) and [KP-001B Golden Fixtures](<../01-product/knowledge-pack-framework/executive-sponsor/KP-001B Executive Sponsor Golden Fixtures.json>) when promoted to v1.0 — LOCKED.
5. [DIQ-400 TeamMate Framework](<../01-product/teammate-framework/DIQ-400 TeamMate Framework.md>), [DIQ-400A Capability Catalogue](<../01-product/teammate-framework/configuration/DIQ-400A TeamMate Capability Catalogue.json>) and [DIQ-400B Golden Policy Fixtures](<../01-product/teammate-framework/configuration/DIQ-400B TeamMate Golden Policy Fixtures.json>) when promoted to v1.0 — LOCKED, for TeamMate hand-off boundaries.
6. [DIQ-203/A/B Sprint 03 Product Configuration](<../01-product/delivery-intelligence/DIQ-203 Sprint 03 Product Configuration Specification.md>), [PDR-003-001](<../07-release/PDR-003-001 Sprint 03 Analysis Trigger Policy.md>) and [PDR-003-002](<../07-release/PDR-003-002 Sprint 03 Analysis Eligibility Policy.md>) for inherited engine, hand-off and fail-closed principles.
7. [PB-004 Sprint 04 Playbook](<PB-004 Sprint 04 Playbook.md>) and accepted Sprint 04 contracts for recommendation portfolios, customer decisions, actions, outcomes and hand-offs.
8. DIQ-200, DIQ-201 and DIQ-202 for shared engine, recommendation and traceability intent.
9. Accepted architecture decisions and existing implementation conventions.

Locked authority prevails over draft material and existing code. A direct conflict between locked authorities must not be resolved silently.

### 1.3 Related controlled records

| Document    | Relationship                                                                           |
| ----------- | -------------------------------------------------------------------------------------- |
| DIQ-000     | Controlled register and filing authority                                               |
| SAR-003     | Accepted Sprint 03 baseline and limitations                                            |
| PB-004      | Recommendation portfolio, customer decision and action hand-off dependency             |
| DIQ-300     | Pack lifecycle, artifacts, manifest, runtime and release framework                     |
| KP-001      | Executive Sponsor purpose, audience, capabilities, outputs and product rules           |
| KP-001A     | Exact pack catalogue, questions, weights, patterns, recommendations, mappings and copy |
| KP-001B     | Exact golden inputs and expected outputs                                               |
| DIQ-400/A/B | TeamMate definition, capability and policy boundary; no Sprint 05 runtime activation   |

### 1.4 Change history

| Version | Date          | Change                                  | Product approval | Final approval     |
| ------- | ------------- | --------------------------------------- | ---------------- | ------------------ |
| 0.1     | 2 August 2026 | Initial scope and story catalogue       | Draft            | —                  |
| 1.0-RC1 | 2 August 2026 | Complete Sprint 05 engineering playbook | Approved         | Pending Matt Prust |

### 1.5 Change control

Changes to customer-visible rules, pack identity, questions, weights, scoring, confidence, patterns, recommendation content, mappings, completion criteria, copy, consent, entitlement, retention or outcome claims require versioned amendment of the controlling product artifact and regenerated golden fixtures. Engineering may make routine technical choices consistent with locked authority.

## 2. Executive Summary

Sprint 05 turns Knowledge Packs from governed definitions into a reusable product capability. It delivers one shared runtime for discovering, starting, completing and analysing specialist assessments, then proves that runtime through KP-001 Executive Sponsor.

The sprint does not create a separate intelligence engine. Pack content is versioned configuration consumed by shared assessment, scoring, confidence, intelligence, recommendation, portfolio, traceability, identity, entitlement and audit services. Pack results are immutable and remain distinct from Delivery DNA and earlier results.

Success is an authorised customer completing KP-001 end to end: discovery or governed hand-off, access checks, informed consent, version-pinned assessment, save/resume, immutable completion, automatic eligibility and analysis, specialist results, explainability, actions and safe downstream Pack/TeamMate options.

## 3. Sprint Goal and Objectives

### 3.1 Goal

Deliver the shared Knowledge Pack runtime and KP-001 Executive Sponsor as the gold-standard first pack, establishing a repeatable and governed pattern for future specialist diagnostics.

### 3.2 Objectives

1. Establish an immutable, validated Knowledge Pack manifest and content contract.
2. Govern pack lifecycle, promotion, activation, retirement and historical reproduction.
3. Keep domain eligibility, availability, entitlement, permission and consent distinct.
4. Provide accessible discovery, start, save/resume, completion and recovery journeys.
5. Execute pack scoring, confidence, patterns, findings, narrative and recommendations through shared engines.
6. Integrate with Sprint 04 portfolios, customer decisions, actions and outcomes without mutating generated baselines.
7. Preserve complete tenant-scoped evidence-to-output traceability.
8. Prove the framework with the exact KP-001/A/B approved definition.
9. Establish authoring, validation, release, rollback and operational controls for subsequent packs.

## 4. Business Outcomes

- DeliveryIQ can offer specialist diagnostics without building bespoke applications per domain.
- Customers receive evidence-led Executive Sponsor insight and an actionable Sponsor Action Plan.
- Every result remains reproducible after pack content or configuration evolves.
- Entitlement and consent are explicit, reducing access and privacy risk.
- Recommendations can lead into deeper Packs or TeamMate previews without implying availability or activation.
- Future packs have a tested schema, lifecycle, quality bar and implementation template.
- Product teams can measure pack discovery, completion, action and outcome signals without collecting unnecessary response content.

## 5. Success Metrics

| Metric                     | Acceptance target                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| Manifest integrity         | 100% malformed, unresolved or unsigned definitions fail before activation                               |
| KP-001 catalogue integrity | 8 capabilities, 40 unique questions, 6 patterns and 8 recommendations match locked KP-001A exactly      |
| Golden conformance         | 100% KP-001B fixtures and required runtime fixtures pass without altered expected output                |
| Historical reproducibility | Identical immutable input and pinned versions reproduce semantically identical output                   |
| Tenant isolation           | 100% cross-tenant start, response, result, trace and administration attempts denied without enumeration |
| Save reliability           | No committed response loss under retry, refresh or concurrency conflict                                 |
| Completion idempotency     | Duplicate completion events create one immutable completion and one canonical analysis hand-off         |
| Traceability               | 100% customer-visible conclusions resolve to permitted pack evidence and rule versions                  |
| Accessibility              | Core pack journeys meet WCAG 2.2 AA evidence gates                                                      |
| Performance                | Section 15 targets met in a production-like environment                                                 |
| Automatic activation       | Zero TeamMate or external-action activations caused by analysis                                         |

Metrics are release evidence, not claims of customer outcome or predictive validity.

## 6. Scope and Out of Scope

### 6.1 In scope

- Versioned manifest, schema, content digest and immutable configuration snapshot.
- Pack catalogue, discovery, lifecycle, promotion, activation, retirement and rollback.
- Domain eligibility, product availability, tenant entitlement, user permission and informed consent.
- Authenticated pack start, single or approved cohort participation, save/resume and completion.
- Pack-specific capability scoring, confidence, findings, patterns, narrative and recommendations through shared services.
- Specialist results, explainability, traceability, audit and authorised export projection.
- Sprint 04 portfolio/action/outcome integration.
- Governed Pack-to-Pack and TeamMate hand-off previews.
- KP-001 Executive Sponsor implementation from locked KP-001/A/B.
- Configuration-as-code authoring validation, controlled promotion and operational readiness.

### 6.2 Out of scope

- Implementing Governance, Benefits, Risk, PMO, Portfolio, Planning or Change Packs.
- A general-purpose visual Knowledge Pack authoring studio or marketplace.
- Changing Delivery DNA questions, scoring, results or eligibility.
- Translating legacy `executive-sponsorship` 1.4.0 responses into KP-001 evidence.
- Cross-assessment score synthesis, benchmarking or predictive analytics.
- Public disclosure of raw specialist evidence or a general public KP-001 result.
- TeamMate runtime, automatic activation, autonomous action or integration execution.
- Unrestricted file uploads, board-paper ingestion or sensitive HR performance assessment.
- Billing system redesign, subscription packaging or sales policy beyond consuming approved entitlement state.
- Generative recommendations or ungoverned narrative claims.

## 7. Dependencies and Entry Criteria

### 7.1 Required entry criteria

- SAR-003 Sprint 03 acceptance remains valid and no unresolved integrity/security regression exists.
- Sprint 04 is accepted, or the exact portfolio, decision, action, outcome and hand-off contracts needed by Sprint 05 are stable and approved.
- DIQ-300, KP-001, KP-001A and KP-001B are version 1.0 and **LOCKED**.
- PB-005 is version 1.0 and **LOCKED**.
- Shared identity, tenant/workspace, assessment execution, response, analysis, result, trace, recommendation, consent and audit services are available.
- The pack catalogue starts deny-by-default: no pack is active until approved configuration and entitlements are explicitly promoted.

Engineering may perform schema discovery and non-customer preparation before every entry criterion closes. No production pack activation or customer start is authorised until all applicable criteria pass.

### 7.2 External and cross-sprint dependencies

| Dependency           | Required outcome                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| Sprint 03            | Immutable analysis, automatic hand-off, fail-closed validation, explainability and traceability |
| Sprint 04            | Stable recommendation, portfolio, decision, action, outcome and hand-off contracts              |
| Identity/workspace   | Authorised tenant-scoped membership and role/permission checks                                  |
| Entitlement service  | Current pack access state without leaking commercial rules                                      |
| Notification service | Optional invite/completion messages with safe content and idempotency                           |
| Operations           | Promotion authority, environment configuration, monitoring and rollback capability              |

The unavailable Delivery DNA 1.0.0 collection journey recorded in SAR-003 does not block catalogue-start KP-001. Recommendation-originated entry must be tested through controlled Sprint 04 fixtures until a live eligible Delivery DNA journey exists.

## 8. Architecture Alignment

### 8.1 Shared-platform model

```text
Pack definition and catalogue
          |
          v
Discovery -> eligibility/availability/entitlement/permission -> consent
          |
          v
Shared assessment execution -> immutable completion -> automatic analysis
          |
          v
Shared scoring/confidence/intelligence/recommendation/trace services
          |
          v
Pack result -> Sprint 04 portfolio/actions/outcomes
          |                         |
          +-> Pack hand-off         +-> TeamMate preview
```

### 8.2 Guardrails

- Pack definitions contain domain content and permitted configuration, not application code.
- Shared services own orchestration, validation, scoring mechanics, confidence mechanics, ranking, trace, security and disclosure.
- Stable pack and question IDs are never reused for different meanings.
- Approved versions and completed executions are immutable.
- One active pack version per pack/environment; historical reads use pinned snapshots.
- Eligibility does not imply availability, entitlement, permission, consent or activation.
- Client applications display server projections and do not calculate intelligence.
- Pack completion never mutates Delivery DNA or prior pack results.
- A recommendation never starts a Pack or activates a TeamMate without authorised customer action.

### 8.3 Canonical version boundary

Every execution snapshot pins pack ID/version, question-set ID/version, manifest schema, manifest/content/configuration digests, applicable engine/rule/template versions, locale, consent version and execution revision. A version mismatch or unresolved digest fails closed.

## 9. Story Catalogue

| ID     | Story                                        | Primary output                      | Depends on            |
| ------ | -------------------------------------------- | ----------------------------------- | --------------------- |
| S5-001 | Knowledge Pack Manifest and Schema           | Validated immutable pack contract   | Entry criteria        |
| S5-002 | Pack Catalogue and Lifecycle                 | Governed promotion and discovery    | S5-001                |
| S5-003 | Eligibility, Availability and Entitlement    | Correct access state                | S5-001–002, Sprint 04 |
| S5-004 | Consent and Pack Start                       | Authorised version-pinned execution | S5-002–003            |
| S5-005 | Specialist Assessment Runtime                | Save/resume/completion journey      | S5-004                |
| S5-006 | Pack Scoring and Confidence                  | Deterministic specialist scores     | S5-001, S5-005        |
| S5-007 | Pack Findings, Patterns and Intelligence     | Explainable specialist diagnosis    | S5-006                |
| S5-008 | Pack Recommendations and Action Plan         | Prioritised specialist action       | S5-007, Sprint 04     |
| S5-009 | Pack Narrative and Results Experience        | Executive specialist result         | S5-006–008            |
| S5-010 | Pack Traceability and Audit                  | Complete evidence lineage           | S5-005–009            |
| S5-011 | Knowledge Pack-to-Pack Hand-offs             | Governed deeper-diagnosis journey   | S5-003, S5-008–010    |
| S5-012 | TeamMate Hand-offs                           | Permission-aware support preview    | S5-008–010, Sprint 04 |
| S5-013 | KP-001 Executive Sponsor Implementation      | First production pack end to end    | S5-001–012            |
| S5-014 | Authoring, Release and Operational Readiness | Repeatable safe pack delivery       | S5-001–013            |

## 10. Full Story Specifications

### S5-001 — Knowledge Pack Manifest and Schema

**Background.** A Pack must be portable, immutable and machine-valid before shared services can execute it safely.

**User story.** As a product and engineering team, we want one governed manifest contract so that every Pack is versioned, reproducible and rejected safely when incomplete.

**Business rules.** The manifest contains every DIQ-300 required field. Stable identifiers use approved formats. Question IDs are unique and resolve exactly once. Capability and question weights reconcile. All patterns, recommendations, dependencies, mappings, copy and versions resolve. Unknown fields fail promotion unless the schema explicitly permits extension. Approval and activation require immutable content/configuration digests.

**Technical notes.** Use a versioned schema and deterministic canonical serialization. Validate referential integrity and semantic rules separately from JSON syntax. Schema evolution is additive where possible; breaking evolution requires a new schema version and migration plan.

**Acceptance criteria.** AC1 valid KP-001A passes unchanged; AC2 missing/unknown/duplicate/unresolved fields fail with stable codes; AC3 weights, IDs, graphs and mappings validate; AC4 canonical digest is invariant to non-semantic property ordering; AC5 approved manifest and digest cannot be mutated; AC6 schema/version compatibility is explicit.

**API considerations.** Internal validation returns structured path, code and safe message. Customer APIs expose only approved catalogue projection, never full proprietary predicates or hidden rule configuration.

**Data impacts.** Manifest definition/version, schema version, content digest, configuration digest, owner, approval, status, effective/retirement dates and immutable snapshot reference.

**Test scenarios.** Valid KP-001A; duplicate question; orphan capability; weight drift; unknown rule; dependency cycle; invalid copy length; reordered properties; digest tamper; unsupported schema; rollback to approved version.

**Definition of Done.** AC1–AC6 pass; schema and validator documented; KP-001A validation is executable in CI; invalid manifests cannot be promoted.

### S5-002 — Pack Catalogue and Lifecycle

**Background.** Customers and operations need an accurate catalogue while historical executions remain tied to their original version.

**User story.** As an authorised operator, I want governed Pack lifecycle and activation so that only approved compatible versions can be started.

**Business rules.** Lifecycle is `draft → in_review → approved → active → retired`, with approved versions optionally superseded. Only one active version per pack/environment. Author cannot be sole final approver. Retirement blocks new starts but not authorised history. Rollback activates a previously approved version and never rewrites executions. Discovery returns tenant-appropriate active summaries only.

**Technical notes.** Promotion is atomic, audited and compare-and-swap protected. Separate global definition lifecycle from environment activation and tenant availability. Avoid a customer-editable rule studio.

**Acceptance criteria.** AC1 only approved compatible versions activate; AC2 concurrent activation cannot create two active versions; AC3 retirement blocks new start and preserves historical read; AC4 rollback uses an existing immutable version; AC5 catalogue projections are locale/version aware; AC6 authorisation and separation of duties pass.

**API considerations.** List/detail catalogue reads support pagination, locale and stable IDs. Promotion/retirement endpoints are privileged, idempotent and never available to ordinary client roles.

**Data impacts.** Pack definition, version, lifecycle event, environment activation, approval identities, digests and retirement/supersession relationships.

**Test scenarios.** Draft read denial; valid promotion; self-approval denial; concurrent activation; retirement; rollback; missing locale; incompatible schema; cross-tenant admin attempt; historical result after retirement.

**Definition of Done.** AC1–AC6 pass; promotion/rollback runbook and audit exist; deny-by-default catalogue starts empty until approved activation.

### S5-003 — Eligibility, Availability and Entitlement

**Background.** Diagnostic relevance, product availability and customer access are different facts and must not be collapsed into one CTA.

**User story.** As a customer, I want an accurate Pack access state so that I am offered only valid actions without misleading promises.

**Business rules.** Evaluate `domain_eligible`, `available`, `entitled`, `permitted` and existing execution separately. Sprint 04 mapping may establish eligibility; authorised catalogue start may bypass recommendation eligibility only where KP-001 permits it. Availability requires compatible active version. Entitlement is tenant scoped. Permission is user/workspace scoped. All states are rechecked on start. Commercial/security reasons are not leaked.

**Technical notes.** Consume stable Sprint 04 hand-off and entitlement interfaces. Cache safe projections briefly with tenant, pack/version and entitlement-version keys; start never trusts cached client state.

**Acceptance criteria.** AC1 every state combination produces the approved action; AC2 eligibility never grants entitlement; AC3 stale availability/entitlement fails safely; AC4 catalogue-start and recommendation-start provenance are distinct; AC5 unavailable/incompatible Packs have no broken CTA; AC6 tenant and permission changes take effect before start.

**API considerations.** Return safe state, permitted CTA, pack/version summary and correlation reference. Do not return subscription internals, security policy or other tenant availability.

**Data impacts.** Tenant pack availability, entitlement reference/version, eligibility source, permission decision and evaluated timestamp; no duplication of the source subscription system.

**Test scenarios.** Eligible/available/entitled/permitted; each false independently; retired pack; entitlement revoked between view/start; recommendation dedupe; catalogue start; cross-tenant hand-off; cache invalidation.

**Definition of Done.** AC1–AC6 pass; integration fixtures and safe copy approved; operational state is observable without sensitive leakage.

### S5-004 — Consent and Pack Start

**Background.** Specialist assessment begins only after the customer understands purpose, evidence use and access implications.

**User story.** As an authorised participant, I want clear pre-start information and consent so that I can make an informed choice before an execution is created.

**Business rules.** Pre-start displays purpose, audience, estimated 15–20 minutes for KP-001, evidence needs, confidentiality, output and prohibited data guidance. Consent is explicit and versioned. Start rechecks lifecycle, entitlement, permission and consent server-side. One idempotency key creates/reuses one execution pinned to versions. Consent withdrawal follows policy and does not falsify immutable historic audit.

**Technical notes.** Use existing consent and assessment-execution services. Record lawful basis/consent version without storing unnecessary device or behavioural data. Prevent double-submit and cross-workspace starts.

**Acceptance criteria.** AC1 no execution before valid consent and access checks; AC2 repeated/concurrent start reuses one execution; AC3 execution snapshot pins all required versions/digests; AC4 revoked entitlement/permission denies start safely; AC5 consent evidence is immutable and policy-readable; AC6 pre-start content is accessible.

**API considerations.** Start accepts pack/version, workspace, provenance and idempotency key; server derives identity and active manifest. Returns execution ID/status/location, never a mutable manifest supplied by the client.

**Data impacts.** Execution, start provenance, consent record/version, pack snapshot, participant/cohort membership, idempotency key and audit event.

**Test scenarios.** Valid start; no consent; obsolete consent; double-click; concurrent start; retired version; revoked entitlement; wrong workspace; malicious manifest; accessible disclosure.

**Definition of Done.** AC1–AC6 pass; privacy/product copy review complete; start is tenant-safe, idempotent and traceable.

### S5-005 — Specialist Assessment Runtime

**Background.** Packs require a reliable shared response experience rather than bespoke forms and data models.

**User story.** As a participant, I want to complete, save and resume a specialist assessment safely so that my evidence is not lost and progress is understandable.

**Business rules.** Render sections/questions from pinned manifest. KP-001 uses the exact 40 questions and approved anchors. Server validates response type, range, status and reason. Save creates an immutable response revision or approved current-state event; concurrent conflicts never silently overwrite. Cohort responses retain pseudonymous respondent-group attribution. Completion enforces pack criteria and produces one immutable submission revision.

**Technical notes.** Reuse the assessment runtime, optimistic concurrency and accessible form components. Do not expose desirable answers. Autosave must not claim success before durable commit. Free text is optional, length-limited, excluded from scoring and protected from unsafe rendering.

**Acceptance criteria.** AC1 exact pinned content renders; AC2 save/resume preserves committed responses; AC3 invalid/stale/conflicting writes return safe actionable state; AC4 progress is accurate without scoring hints; AC5 completion enforces KP-001 criteria; AC6 duplicate completion creates one revision and hand-off; AC7 single/cohort scope and attribution are tenant-safe.

**API considerations.** Reads return execution/version/progress and permission-safe questions. Writes use execution, question ID, expected revision and idempotency key. Completion is asynchronous relative to analysis.

**Data impacts.** Response revision/status/value/reason, evidence metadata, respondent group, save event, execution revision, completion snapshot and outbox/hand-off.

**Test scenarios.** Start/resume; each response anchor; not applicable; missing reason; refresh; offline failure; concurrent tabs; duplicate save; cohort conflict; completion threshold; double completion; unsafe note; retired pack mid-execution.

**Definition of Done.** AC1–AC7 pass; no response loss in failure/concurrency tests; accessibility and responsive journeys pass; analysis logic is absent from the form client.

### S5-006 — Pack Scoring and Confidence

**Background.** Specialist results require governed calculations while retaining shared scoring and confidence mechanics.

**User story.** As an executive sponsor, I want reliable capability scores and evidence confidence so that I can interpret the assessment responsibly.

**Business rules.** Implement exact KP-001A mappings: eight capability weights sum to 1.0, five questions per capability and per-capability question weights sum to 1.0. Transformation, bands, availability, precision and default confidence inherit locked DIQ-300/DIQ-203. Overall availability requires configured capability weight ≥0.70. Missing evidence is not zero. Capability level and confidence remain independent.

**Technical notes.** Parameterise the shared engine by the pack snapshot; do not fork scoring code. Preserve every contribution and factor for traceability. Reject incompatible manifest/configuration before execution.

**Acceptance criteria.** AC1 KP-001B minimum/midpoint/maximum cases match exactly; AC2 missing/not-applicable/excluded behaviour matches; AC3 weights, boundaries, precision and half-up display pass; AC4 overall availability threshold is exact; AC5 confidence independence and limitations pass; AC6 reordered equivalent input is deterministic; AC7 all results carry versions and traces.

**API considerations.** Return immutable structured capability/overall/confidence objects within the pack result. No separate customer scoring endpoint.

**Data impacts.** Reuse result, score contribution, confidence factor and trace records with pack namespace/version; no parallel scoring tables unless approved by architecture review.

**Test scenarios.** All KP-001B scoring/confidence fixtures; exact 60% capability and 70% overall boundaries; bad weights; unknown ID; duplicate evidence; ordering; precision; low breadth; stale evidence.

**Definition of Done.** AC1–AC7 and locked fixtures pass; shared-engine regression remains green; configuration snapshot and calculation trace reproduce output.

### S5-007 — Pack Findings, Patterns and Intelligence

**Background.** Customers need specialist interpretation rather than an undifferentiated list of scores.

**User story.** As an executive sponsor, I want evidence-grounded strengths, opportunities and patterns so that I can focus on material sponsorship conditions.

**Business rules.** Findings inherit approved thresholds and customer terminology. Patterns are only the six KP-001A versioned rules. Evidence and confidence gates apply. Critical/high negative patterns win their configured exclusive conflict over positive patterns. Absence is never framed as proof of the opposite. Invalid rule references fail closed.

**Technical notes.** Reuse shared finding and declarative pattern evaluators. Persist decisive facts, failed prerequisites for authorised audit, conflict suppression and rule versions.

**Acceptance criteria.** AC1 every positive/negative KP-001B pattern fixture passes; AC2 findings, ties, maximums and confidence policy are exact; AC3 unmet evidence prevents positive match; AC4 conflict resolution is deterministic and auditable; AC5 every displayed item has customer-safe explanation and trace; AC6 unknown/invalid rule blocks publication.

**API considerations.** Customer result returns detected items only; authorised audit projection may show evaluated predicates and suppression without exposing proprietary expression source unnecessarily.

**Data impacts.** Reuse finding, pattern evaluation/detection, suppression and trace records with pack and rule versions.

**Test scenarios.** Six positive/six negative patterns; boundary; low evidence; tied findings; no strength/opportunity; exclusivity; invalid capability reference; configuration rollback.

**Definition of Done.** AC1–AC6 pass; complete catalogue fixture coverage and lineage exist; customer copy review passes.

### S5-008 — Pack Recommendations and Sponsor Action Plan

**Background.** Specialist insight must lead to prioritised, feasible action integrated with the governed recommendation workflow.

**User story.** As an executive sponsor, I want prioritised recommendations and a 30/60/90-day action plan so that I can improve sponsorship practice coherently.

**Business rules.** Emit only the eight KP-001A recommendations when their exact eligibility, exclusion, confidence and prerequisites pass. Shared ranking, dedupe, dependency and roadmap policy applies. Maximum displayed items follows KP-001. Each recommendation retains outcome, success measures and Pack/TeamMate mappings. Generated plan remains immutable; Sprint 04 decisions/actions are customer overlays. No action executes automatically.

**Technical notes.** Reuse Sprint 04 evaluation, portfolio, decision, action and outcome services. Preserve source Pack result and catalogue versions. Prevent a recommendation from suppressing its required dependency.

**Acceptance criteria.** AC1 KP-001B eligibility/exclusion/prerequisite fixtures pass; AC2 ranking/ties/deduplication are deterministic; AC3 dependencies and 30/60/90 capacity/sequence pass; AC4 every item has why, impact, effort, outcome and measure; AC5 customer decisions/actions do not mutate generated result; AC6 no unapproved recommendation appears.

**API considerations.** Pack result exposes immutable recommendations and generated action plan; authenticated Sprint 04 command endpoints handle accept/reject/defer, ownership and outcomes.

**Data impacts.** Reuse recommendation evaluation/result, portfolio, roadmap, decision, action and outcome records with source pack result linkage.

**Test scenarios.** Each recommendation positive/negative; exclusion; missing prerequisite; low confidence; tie; duplicate; dependency; capacity; cycle; accept action; revoked permission; replay; configuration version change.

**Definition of Done.** AC1–AC6 pass; KP-001B and Sprint 04 regressions pass; action hand-off is authorised, idempotent and traceable.

### S5-009 — Pack Narrative and Results Experience

**Background.** Executive sponsors need a coherent specialist view that explains position, confidence, interventions and action orientation.

**User story.** As an executive sponsor, I want a concise accessible result so that I can understand sponsorship effectiveness and decide what to do next.

**Business rules.** Result hierarchy follows KP-001/DIQ-300. Narrative contains mandatory sections and length limits: workspace ≤700 words, executive summary ≤200, preview ≤80. It is deterministic or constrained to allow-listed structured facts. Tone is candid, constructive, executive and non-personal. Prohibited claims and individual-performance judgement are blocked. Low-confidence caveats remain visible.

**Technical notes.** Build a stable server projection over immutable result/trace. No client calculation. Render safe structured sections and encode notes/content. Use progressive disclosure and retain result/version context.

**Acceptance criteria.** AC1 all available KP-001 outputs appear in approved hierarchy; AC2 narrative facts and limits match configuration; AC3 low-confidence/unavailable/tied/empty states are safe; AC4 client reconciles exactly to canonical result; AC5 permissions/redaction apply; AC6 WCAG 2.2 AA and responsive 320px+ checks pass.

**API considerations.** Result endpoint supports version/ETag and permission-specific workspace/executive projections. Preview contains approved summary only and no raw evidence.

**Data impacts.** Reuse immutable result/narrative output and projection cache keyed by tenant, execution, run, view, role and versions.

**Test scenarios.** Strong/weak/mixed; low confidence; unavailable overall; tie; no recommendation; partial failure; stale version; small screen; keyboard/screen reader; injection; permission change.

**Definition of Done.** AC1–AC6 pass; visual/semantic accessibility and narrative snapshot tests pass; no client-side intelligence duplication exists.

### S5-010 — Pack Traceability and Audit

**Background.** Specialist advice must be challengeable and reproducible without exposing restricted evidence.

**User story.** As an authorised reviewer, I want to trace every Pack conclusion to evidence and rules so that I can trust and audit the result.

**Business rules.** Required chain is response/evidence → question/capability contribution → score/confidence → finding/pattern → recommendation/action plan → Pack/TeamMate mapping → narrative/presentation. Every node is tenant/run/version scoped. Viewers receive aggregate explanations; auditors receive permitted question/evidence detail; identity/free text remains restricted. Incomplete lineage blocks affected publication.

**Technical notes.** Extend shared trace node/edge types rather than create a parallel graph. Validate orphan, cross-scope, invalid-type and prohibited-cycle conditions before atomic publication. Audit export is logged, permission checked and redacted.

**Acceptance criteria.** AC1 every visible KP-001 item has backward evidence path; AC2 forward dependency paths resolve; AC3 cross-tenant/run edges cannot be created/read; AC4 versions/digests reproduce result; AC5 permission projections match policy; AC6 incomplete trace blocks publication; AC7 export is structured and audited.

**API considerations.** Explanation and audit endpoints use opaque IDs, depth/size limits, pagination and reauthorisation. No hidden chain-of-thought, source code, secrets or other-tenant metadata.

**Data impacts.** Reuse trace nodes/edges, explanation projection, export record and access audit with pack-specific typed nodes where necessary.

**Test scenarios.** Every output type; full traversal; redaction; revoked permission; orphan; invalid edge; prohibited cycle; deleted evidence marker; large graph; export; cross-tenant tampering.

**Definition of Done.** AC1–AC7 pass; 100% visible-output coverage report passes; DIQ-202 conformance documented.

### S5-011 — Knowledge Pack-to-Pack Hand-offs

**Background.** KP-001 may indicate deeper Governance, Benefits, Risk, PMO or Change diagnosis, even when those future Packs are not yet available.

**User story.** As a customer, I want relevant deeper-diagnosis options presented safely so that I understand potential next steps without broken promises.

**Business rules.** Use only KP-001A mappings. Domain eligibility is distinct from active availability, entitlement and permission. Duplicate triggers merge. Only compatible active Packs may have actionable CTA. Inactive future Packs are suppressed from customer action or shown only with separately approved non-actionable copy. No Pack starts automatically. Hand-off records source result/recommendation, mapping/version and customer action.

**Technical notes.** Reuse Sprint 04 hand-off boundary and S5-003 access evaluator. Resolve catalogue state at view and start. Do not embed future pack content or invent entitlements.

**Acceptance criteria.** AC1 mappings match KP-001A; AC2 duplicate triggers merge with evidence; AC3 inactive/unavailable Pack has no broken start; AC4 state is rechecked on action; AC5 customer action is authorised/idempotent/audited; AC6 destination start retains provenance without copying source answers.

**API considerations.** Return safe Pack summary, diagnostic value, state and CTA. Start uses normal S5-004 contract with source provenance; no response payload transfer.

**Data impacts.** Reuse Pack recommendation/hand-off and start provenance records; do not create destination execution before consent and access checks.

**Test scenarios.** Governance/Benefits/Risk/PMO/Change mappings; duplicate; inactive; retired; entitlement revoked; concurrent click; cross-tenant source; destination version change; no answer transfer.

**Definition of Done.** AC1–AC6 pass; mapping fixtures and safe unavailable states pass; no unapproved future Pack is activated.

### S5-012 — TeamMate Hand-offs

**Background.** KP-001 actions may benefit from future digital execution support, but diagnosis must remain separate from activation.

**User story.** As a customer, I want permission-aware TeamMate previews linked to accepted actions so that I can understand available support without accidental activation.

**Business rules.** Use only KP-001A Executive, Meeting, Reporting and RAID mappings. A preview requires the mapped eligible recommendation/outcome; activation review additionally requires accepted action, availability, entitlement and `teammate.activate`. Analysis cannot create runtime, memory, task or external effect. Unavailable types fail safely without leaking commercial/security detail.

**Technical notes.** Reuse Sprint 04 hand-off state and DIQ-400 boundary. Sprint 05 may navigate to a review surface but does not implement the TeamMate runtime.

**Acceptance criteria.** AC1 exact mappings and prerequisites pass; AC2 unavailable/unentitled/unpermitted states disable or suppress CTA; AC3 duplicate triggers merge deterministically; AC4 hand-off retains source recommendation/outcome and versions; AC5 no runtime/action side effect occurs; AC6 tenant and permission boundaries pass.

**API considerations.** Return type, reason, supported outcome, prerequisites, state and permitted CTA. Do not expose memory, prompts, hidden capability or provisioning detail.

**Data impacts.** Reuse TeamMate recommendation and hand-off records; no TeamMate instance or memory record may be created by analysis.

**Test scenarios.** Four approved types; missing accepted action; unavailable; unentitled; permission revoked; duplicate; cross-tenant; concurrent review; explicit proof no runtime creation.

**Definition of Done.** AC1–AC6 pass; product, security and boundary tests pass; customer copy avoids guaranteed outcomes.

### S5-013 — KP-001 Executive Sponsor Implementation

**Background.** The shared runtime must be proven with a complete production-grade specialist Pack, not only framework abstractions.

**User story.** As an executive sponsor, I want to complete KP-001 and receive evidence-led sponsorship intelligence and actions so that I can strengthen delivery leadership.

**Business rules.** Implement locked KP-001/A/B exactly: pack identity/version, 8 capabilities, 40 questions, weights, completion, 6 patterns, 8 recommendations, narrative, output limits, Pack mappings, TeamMate mappings, prohibited claims and evidence policies. Legacy `executive-sponsorship` 1.4.0 remains separate and is never translated. Catalogue start is permitted when authorised; recommendation entry retains provenance.

**Technical notes.** KP-001 must exercise shared runtime extension points with no pack-specific fork. Configuration is loaded/pinned by ID/version/digest. Any necessary shared-runtime fix must remain generic and regression-tested.

**Acceptance criteria.** AC1 KP-001A validates and activates atomically; AC2 all KP-001B fixtures pass unchanged; AC3 complete authorised customer journey passes; AC4 exact content/output/mappings and copy render; AC5 legacy separation and no translation pass; AC6 trace covers every visible output; AC7 security/privacy/accessibility/performance gates pass; AC8 result integrates with Sprint 04 actions and safe hand-offs.

**API considerations.** Use generic Pack endpoints and shared analysis/result contracts. No `/executive-sponsor` domain API may duplicate generic capability unless it is a presentation route over the same services.

**Data impacts.** Approved catalogue/configuration plus generic execution/result records; no bespoke per-question columns or duplicated result tables.

**Test scenarios.** Full single participant; approved cohort; save/resume; low confidence; missing/NA/excluded evidence; all patterns/recommendations; action acceptance; Pack/TeamMate states; legacy attempt; cross-tenant; concurrency; rollback; production smoke.

**Definition of Done.** AC1–AC8 pass; KP-001 Product Acceptance record signed; no pack-specific engine duplication or unsupported claim exists.

### S5-014 — Authoring, Release and Operational Readiness

**Background.** Subsequent Packs require a safe repeatable delivery process and operators need to diagnose failures without editing immutable history.

**User story.** As Product, Engineering and Operations, we want validated promotion, monitoring and rollback so that Pack releases are controlled and supportable.

**Business rules.** Sprint 05 provides configuration-as-code validation and controlled promotion, not a visual authoring studio. Author cannot be sole approver. Promotion validates schema, references, content, fixtures, trace, copy, security and digests. Critical integrity failure blocks activation/publication. Rollback activates an approved version. Support cannot mutate completed executions/results. Analytics use safe events and do not log raw evidence.

**Technical notes.** Provide CI validation, configuration diff, promotion command/service, approval record, environment activation, health metrics, alerts, replay-safe operational tools and runbooks. Feature flags fail safe/off.

**Acceptance criteria.** AC1 invalid catalogue cannot activate; AC2 separation of duties and audit pass; AC3 rollback preserves historical execution; AC4 metrics/alerts cover key failures and latency; AC5 replay/reconciliation is idempotent; AC6 backup/restore and migration rehearsal pass; AC7 acceptance matrix and release record are complete.

**API considerations.** Privileged operational interfaces require strong authentication, least privilege, rate limits and audited commands. No direct client table mutation.

**Data impacts.** Promotion/approval/activation events, configuration diff/digest, operational job state, metrics dimensions and release evidence references.

**Test scenarios.** Self-approval denial; invalid schema; fixture failure; digest tamper; concurrent promotion; rollback; partial migration; replay; alert test; backup restore; secret/PII log scan; support mutation denial.

**Definition of Done.** AC1–AC7 pass; release/rollback/support/security runbooks approved; Sprint 05 acceptance package complete.

## 11. Cross-story Dependency Map

```text
S5-001 -> S5-002 -> S5-003 -> S5-004 -> S5-005
   |         |          |                    |
   |         |          +--------------------+-> S5-011
   |         |                               |
   +---------------------> S5-006 -> S5-007 -> S5-008 -> S5-009
                                      |          |          |
                                      +----------+----------+-> S5-010
                                                 |
                                                 +-> S5-011
                                                 +-> S5-012

S5-001..S5-012 -> S5-013 -> S5-014
```

Work may be parallelised where contracts are stable. S5-013 cannot be accepted until every shared capability it exercises is production-ready. A blocker in an inactive downstream Pack or TeamMate does not block KP-001 when the customer state fails safely.

## 12. Global Business Rules

1. One shared runtime and intelligence stack serves all Packs.
2. Pack domain content is immutable versioned configuration.
3. Existing executions/results never change when a Pack version changes.
4. Unknown identifiers, unresolved versions and incompatible manifests fail closed.
5. Eligibility, availability, entitlement, permission, consent, execution and activation are distinct.
6. Responses never transfer between Packs without a separately approved mapping and consent policy; no such transfer is approved in Sprint 05.
7. Missing evidence is not silently converted to zero.
8. Customer-facing conclusions require complete evidence lineage and approved copy.
9. Generated advice never creates external action or TeamMate runtime automatically.
10. Legacy `executive-sponsorship` is not KP-001 and cannot be reclassified or translated.

## 13. Non-functional Requirements

- **Availability:** response capture remains usable during analysis/catalogue dependency failure where safe.
- **Reliability:** saves, starts, completions, hand-offs and promotions are idempotent and concurrency safe.
- **Immutability:** approved definitions, execution snapshots, completions, results and audit events are immutable.
- **Compatibility:** contracts and schemas are versioned; unsupported versions fail safely.
- **Maintainability:** generic services have stable extension points; no KP-001 conditional engine fork.
- **Observability:** correlate tenant-safe request, execution, pack/version, analysis run, duration, outcome and safe error code without raw responses.
- **Accessibility:** WCAG 2.2 AA for discovery, consent, assessment, completion, result, explanation and hand-off.
- **Internationalisation:** customer copy externalisable; v1.0 locale `en-GB`; stored values locale neutral.
- **Resilience:** bounded retries, leases, dead-letter/reconciliation and recovery runbooks preserve correctness.
- **Data quality:** schema, reference, digest and golden validation block invalid promotion.

## 14. Security, Privacy and Permissions

1. Authenticate and authorise every non-public Pack operation.
2. Scope every read, write, cache, job, event, trace, export and idempotency key to tenant/workspace.
3. Use least-privilege service roles; client roles cannot mutate catalogue, analysis, trace or audit tables directly.
4. Validate identifiers, versions, values, statuses, lengths, content, locale and state transitions server-side.
5. Encode displayed content and prevent stored/reflected injection from labels or notes.
6. Do not collect protected characteristics, sensitive HR judgements, private correspondence, secrets or unrestricted documents.
7. Record consent and access to detailed evidence/export; apply retention, deletion and data-subject policies.
8. Use permission-specific redaction; standard viewers never see respondent identity or unrestricted notes.
9. Promotion uses separation of duties, signed/digest-pinned content and audited environment activation.
10. Pack analysis cannot call external integrations, activate TeamMates or create autonomous tasks.
11. Dependency, secret, SAST, access-control and tenant-isolation checks must pass before release.

### 14.1 Minimum permission model

| Capability                 | Required authority                                       |
| -------------------------- | -------------------------------------------------------- |
| Discover active Pack       | Authenticated workspace member plus catalogue visibility |
| Start Pack                 | `knowledge_pack.start` plus entitlement and consent      |
| Respond                    | Active participant/cohort membership for execution       |
| View result                | Pack result viewer permission in the execution workspace |
| View detailed evidence     | Auditor permission and applicable evidence access        |
| Decide/own action          | Sprint 04 decision/improvement permissions               |
| Review TeamMate activation | `teammate.activate` plus availability/entitlement        |
| Promote/retire Pack        | Privileged product operations with separation of duties  |

## 15. Performance and Reliability

Measured against an agreed production-like environment:

| Operation                              | Target                                      |
| -------------------------------------- | ------------------------------------------- |
| Pack catalogue/list read               | p95 ≤500 ms                                 |
| Pack detail/access-state read          | p95 ≤500 ms                                 |
| Start/resume execution                 | p95 ≤700 ms                                 |
| Save answer/section                    | p95 ≤500 ms                                 |
| Complete submission request            | p95 ≤800 ms excluding asynchronous analysis |
| KP-001 analysis, 40 responses          | p95 ≤5 s; p99 ≤10 s                         |
| Pack result read, warm                 | p95 ≤800 ms                                 |
| Explanation detail                     | p95 ≤800 ms                                 |
| Trace traversal, depth ≤5/≤1,000 edges | p95 ≤1 s                                    |
| Catalogue promotion                    | Atomic; no partial active state             |

Load tests cover concurrent starts, saves, completion replay, analysis contention, result reads, entitlement change and promotion conflict. Requests use bounded collections and graph traversal. Degradation must preserve security and correctness.

## 16. Explainability and UX Expectations

### 16.1 Explainability

Every visible score, confidence statement, finding, pattern, recommendation, action-plan item, Pack/TeamMate hand-off and narrative fact includes stable output ID, reason code/text, capability/rule/result versions, confidence and trace references. Viewers receive useful aggregated evidence; authorised auditors receive permitted detail. Proprietary expressions, source code, prompts, secrets, other tenants and hidden reasoning never render.

### 16.2 UX hierarchy

1. Discovery summary and access state.
2. Pre-start purpose, evidence, time, privacy and consent.
3. Section progress and save/resume.
4. Completion and automatic analysis status.
5. Executive/specialist summary and confidence.
6. Capabilities, strengths, opportunities and patterns.
7. Recommendations and Sponsor Action Plan.
8. Customer decisions/actions/outcomes.
9. Related Packs/TeamMates.
10. Explanation and authorised evidence detail.

The experience distinguishes self-reported from verified evidence, generated advice from customer decisions, unavailable from insufficient evidence, and recommendation from entitlement/activation. It never ranks respondents or reveals desired answers.

### 16.3 Required states

Loading, empty catalogue, available, unavailable, unentitled, permission denied, consent required, draft, saving, saved, conflict, incomplete, completing, analysing, completed, retryable failure, non-retryable failure, superseded, retired and restricted must be explicit and accessible.

## 17. Example Contracts

Examples show contract shape. Locked KP-001A/B values remain authoritative.

### 17.1 Catalogue projection

```json
{
  "packId": "executive_sponsor",
  "version": "1.0.0",
  "title": "Executive Sponsor Knowledge Pack",
  "summary": "Assess how executive sponsorship enables successful delivery.",
  "estimatedMinutes": { "minimum": 15, "maximum": 20 },
  "access": {
    "domainEligible": true,
    "available": true,
    "entitled": true,
    "permitted": true,
    "action": "review_and_start"
  }
}
```

### 17.2 Idempotent start

```json
{
  "packId": "executive_sponsor",
  "packVersion": "1.0.0",
  "workspaceId": "workspace_opaque",
  "source": { "type": "catalogue" },
  "consentVersion": "kp001-consent-1.0.0",
  "idempotencyKey": "opaque-client-or-server-key"
}
```

The server resolves the active locked manifest and derives tenant/user identity. The client cannot provide question definitions, weights or eligibility Boolean.

### 17.3 Save response

```json
{
  "executionId": "execution_opaque",
  "questionId": "kp001.strategic_alignment.1",
  "expectedRevision": 6,
  "status": "answered",
  "value": 4,
  "idempotencyKey": "response-command-opaque"
}
```

### 17.4 Result projection shape

```json
{
  "resultId": "result_opaque",
  "pack": { "id": "executive_sponsor", "version": "1.0.0" },
  "status": "completed",
  "overall": { "displayScore": 68.4, "band": "established" },
  "confidence": { "band": "moderate", "limitations": [] },
  "capabilities": [],
  "strengths": [],
  "priorityOpportunities": [],
  "patterns": [],
  "recommendations": [],
  "actionPlan": { "day30": [], "day60": [], "day90": [], "unscheduled": [] },
  "knowledgePackHandOffs": [],
  "teamMateHandOffs": [],
  "versions": {},
  "traceIds": []
}
```

The numeric values above are illustrative and are not golden expectations.

## 18. Traceability Matrix

| Sprint output           | Source                                        | Shared capability          | Required lineage                                           |
| ----------------------- | --------------------------------------------- | -------------------------- | ---------------------------------------------------------- |
| Catalogue/access state  | Manifest, activation, entitlement, permission | Catalogue/access evaluator | Definition/version → evaluated state → CTA                 |
| Execution/response      | Pinned Pack/question, participant evidence    | Assessment runtime         | Consent/start → execution → response revision              |
| Capability score        | KP-001A mapping/weights and eligible evidence | Scoring engine             | Response → contribution → score/band                       |
| Confidence              | Evidence metadata and approved factors        | Confidence engine          | Evidence/metadata → factor → confidence                    |
| Finding/pattern         | Scores/confidence and KP-001A rules           | Intelligence engine        | Score/evidence → finding/pattern                           |
| Recommendation          | Findings/patterns and KP-001A catalogue       | Recommendation Framework   | Trigger/evidence → evaluation → recommendation             |
| Action plan             | Eligible ranked recommendations/dependencies  | Roadmap/portfolio          | Recommendation → sequence/horizon                          |
| Customer action/outcome | Sprint 04 decision workflow                   | Portfolio/action services  | Generated item → decision → action → observation           |
| Pack hand-off           | KP-001A mapping and catalogue state           | Pack access/start          | Recommendation → mapping → access state → start provenance |
| TeamMate hand-off       | Accepted action/outcome and KP-001A mapping   | TeamMate boundary          | Recommendation/action → mapping → review state             |
| Narrative/result        | Approved structured outputs                   | Narrative/projection       | Fact/presentation → all source nodes                       |

## 19. Sprint Acceptance Checklist

- [ ] DIQ-300, KP-001, KP-001A, KP-001B and PB-005 are version 1.0 **LOCKED**.
- [ ] S5-001 through S5-014 acceptance criteria and Definitions of Done pass.
- [ ] KP-001A validates exactly and all KP-001B fixtures pass unchanged.
- [ ] Runtime golden fixtures cover manifest, lifecycle, access, consent, save/resume, conflict, completion, automatic analysis and recovery.
- [ ] Catalogue starts deny-by-default and only approved KP-001 is active.
- [ ] Tenant isolation and least privilege pass for catalogue, execution, response, analysis, result, trace, export and operations.
- [ ] 100% visible-output lineage and redaction validation pass.
- [ ] No legacy response translation, client intelligence calculation, external action or automatic TeamMate activation exists.
- [ ] WCAG 2.2 AA, security, privacy, performance, resilience and production build gates pass.
- [ ] Migration rehearsal, backup/restore, rollback and replay/reconciliation pass.
- [ ] KP-001 single-participant and approved cohort end-to-end journeys pass in a production-like environment.
- [ ] Sprint 04 decision/action/outcome integration and inactive Pack/TeamMate states pass.
- [ ] Product Owner review and Matt Prust final Sprint Acceptance are recorded.
- [ ] DIQ-000 and controlled locations are current.

## 20. Release and Operational Checklist

- [ ] Release candidate is built from an approved reconciled revision.
- [ ] Configuration/schema/catalogue digests are pinned and verified in the target environment.
- [ ] Migrations, indexes, RLS, grants and generated types are applied and verified.
- [ ] No illustrative availability, entitlement, Pack or TeamMate data is promoted.
- [ ] Active KP-001 version and rollback version are recorded.
- [ ] Consent text/version, privacy notice and retention policy are deployed.
- [ ] Monitoring covers start/save/completion failure, analysis latency, orphan trace, entitlement denial, tenant denial, invalid manifest, promotion failure and queue age.
- [ ] Support can inspect safe correlation state without mutating immutable records.
- [ ] Incident, rollback, configuration rollback, reconciliation, retirement and data-subject runbooks are ready.
- [ ] Production smoke covers catalogue, consent/start, save/resume, completion, automatic analysis, result, explanation, action and safe hand-offs.
- [ ] Post-release integrity, performance and customer-experience review is scheduled.

## 21. Risks and Assumptions

| Risk or assumption                                   | Control or treatment                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Sprint 04 contracts change                           | Pin accepted versions; reconcile before PB-005 lock                                        |
| Framework becomes bespoke to KP-001                  | Generic shared contracts and second-pack schema validation examples without implementation |
| Legacy Executive Sponsorship is confused with KP-001 | Distinct IDs/versions/copy; no migration or response translation                           |
| Sponsor self-rating appears authoritative            | Confidence breadth/consistency, caveats and non-personal language                          |
| Specialist questions collect sensitive data          | Prohibited data guidance, constrained fields, redaction and review                         |
| Future Packs appear available prematurely            | Deny-by-default activation and availability-aware CTA                                      |
| Entitlement leaks commercial/security policy         | Safe state projection and server recheck                                                   |
| Pack configuration update changes history            | Immutable snapshots/digests and versioned result                                           |
| Cohort disagreement is framed as blame               | Confidence limitation and pseudonymous group treatment                                     |
| TeamMate recommendation causes execution             | Strict review-only boundary and no runtime side effect tests                               |
| Delivery DNA collection remains unavailable          | Catalogue-start KP-001; controlled Sprint 04 fixtures for recommendation entry             |

## 22. Appendices

### Appendix A — Stable terminology

- **Knowledge Pack:** governed specialist diagnostic definition and customer product.
- **Pack definition:** immutable versioned product content/configuration.
- **Execution:** tenant/workspace instance pinned to a Pack version.
- **Domain eligible:** specialist diagnosis is relevant under approved mapping.
- **Available:** compatible active Pack version exists in the environment.
- **Entitled:** tenant product access permits use.
- **Permitted:** user may perform the action in the workspace.
- **Consented:** participant accepted the applicable purpose/data-use version.
- **Generated baseline:** immutable Pack result and advice.
- **Customer overlay:** Sprint 04 decision, action, owner or outcome observation.

### Appendix B — Stable error taxonomy

| Code                           | Meaning                                                              |
| ------------------------------ | -------------------------------------------------------------------- |
| `PACK_DEFINITION_INVALID`      | Manifest/schema/reference validation failed                          |
| `PACK_VERSION_UNAVAILABLE`     | Required immutable version cannot be resolved                        |
| `PACK_NOT_ACTIVE`              | Pack version cannot accept a new start                               |
| `PACK_NOT_ENTITLED`            | Tenant access does not permit the action; external copy remains safe |
| `PACK_ACTION_DENIED`           | User/workspace permission denied without enumeration                 |
| `PACK_CONSENT_REQUIRED`        | Valid consent is absent or obsolete                                  |
| `PACK_START_CONFLICT`          | Idempotency key reused with different canonical input                |
| `PACK_RESPONSE_INVALID`        | Response violates pinned question contract                           |
| `PACK_RESPONSE_CONFLICT`       | Expected execution/response revision is stale                        |
| `PACK_COMPLETION_INCOMPLETE`   | Pack completion criteria are not satisfied                           |
| `PACK_ANALYSIS_INPUT_INVALID`  | Canonical Pack evidence/configuration is incompatible                |
| `PACK_RESULT_TRACE_INCOMPLETE` | Publishable output lacks required lineage                            |
| `PACK_HANDOFF_UNAVAILABLE`     | Destination Pack/TeamMate action is not currently available          |
| `PACK_PROMOTION_CONFLICT`      | Concurrent or invalid lifecycle transition prevented activation      |

External error projection must follow non-enumeration and sensitive-reason redaction policy.

### Appendix C — Story Acceptance Record template

| Field                              | Required value                                      |
| ---------------------------------- | --------------------------------------------------- |
| Story                              | S5-xxx                                              |
| Implemented revision               | Commit/merge identifier                             |
| Authority versions                 | PB-005, DIQ-300, KP-001/A/B and dependent contracts |
| Acceptance criteria                | Pass/fail with evidence                             |
| Golden/runtime tests               | Command and result                                  |
| Security/tenant evidence           | Tests/review                                        |
| Accessibility/performance evidence | Tests/measurement                                   |
| Migration/rollback                 | Evidence                                            |
| Limitations                        | Accepted or blocking                                |
| Product review                     | Product Owner                                       |
| Final acceptance                   | Matt Prust                                          |

### Appendix D — Global Definition of Done

Sprint 05 is done only when approved scope is implemented; all story, golden, regression, failure, concurrency, security, privacy, tenant, trace, accessibility and performance gates pass; migrations and production build pass; controlled documents and acceptance matrix are current; KP-001 end-to-end smoke passes; limitations are explicitly accepted; and final acceptance is recorded.

### Appendix E — Implementation prompt after lock

```text
Implement PB-005 Sprint 05 v1.0 after confirming it and DIQ-300/KP-001/A/B are LOCKED and all Section 7 entry criteria are satisfied.

Implement S5-001 through S5-014 completely against the authority order in PB-005 Section 1.2. Continue through all safe in-scope work without stopping at plans, readiness reports, individual stories or ordinary failures. Do not invent or alter customer-visible Pack rules. Use shared assessment, analysis, recommendation, trace, security and action services; do not fork engines for KP-001.

Convert locked KP-001B and runtime acceptance cases into executable tests. Verify tenant isolation, consent, entitlement, idempotency, concurrency, immutable versions/results, traceability, redaction, accessibility, performance, migrations, rollback and production build. Do not translate legacy executive-sponsorship responses or activate a TeamMate automatically. Produce an acceptance matrix and final implementation report with only actually executed evidence.
```

## 23. Final Approval Request

**Recommendation:** after DIQ-300 and KP-001/A/B are approved and locked, approve PB-005 version 1.0 without amendments and set status **LOCKED**.

**Consequence:** Engineering may implement S5-001 through S5-014 after satisfying Section 7. Approval does not activate KP-001 in any environment; activation remains subject to the release checklist and final Sprint Acceptance.

---

**End of PB-005 v1.0-RC1 — Product Owner approved; final approval pending**
