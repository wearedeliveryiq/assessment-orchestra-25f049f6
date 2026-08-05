# Sprint 05 Implementation Plan

## Status and use

This is the pre-lock engineering sequence for PB-005. It does not promote RC1 content to product authority. Implementation begins only after the readiness gate in `readiness-assessment.md` closes.

## Delivery sequence

### Gate 0 — Controlled authority reconciliation

- Verify PB-005, DIQ-300 and KP-001 are v1.0 **LOCKED**.
- Verify KP-001A/B are locked v1.0.0, parseable, internally consistent and digest-pinned.
- Verify DIQ-000 registers the same versions/statuses and no locked authority conflicts exist.
- Reconcile accepted Sprint 04 contracts and recorded release limitations.
- Convert every KP-001B fixture into an immutable automated test without modifying expected outputs.

### Foundation — S5-001 and S5-002

1. Replace the legacy manifest boundary with a versioned, strict, canonical schema while retaining an explicit adapter for legacy `executive-sponsorship` 1.4.0.
2. Separate JSON/schema validation, semantic/reference validation, canonical serialization and digest validation.
3. Introduce immutable definition/version/content snapshots, approvals, lifecycle events and environment activations.
4. Enforce one active version per pack/environment, compare-and-swap promotion, self-approval denial, retirement and rollback.
5. Replace in-memory production activation with durable governed state. Retain disk discovery only for authoring/CI ingestion.
6. Expose allow-listed catalogue projections; restrict validation, configuration diff and lifecycle commands to Product Governance.

Expected areas:

- `src/lib/knowledge-packs/{schema,validator.server,runtime-types,registry.server,manager.server,http.server}.ts`
- new governance repository/service/projection modules under `src/lib/knowledge-packs/`
- `src/lib/identity/rbac.ts` and focused role tests
- new migrations for immutable catalogue/version/approval/activation records plus Cloud grant hardening
- `tests/knowledge-pack-*.test.ts`

### Access and execution — S5-003 to S5-005

1. Add one deterministic access evaluator for `domainEligible`, `available`, `entitled`, `permitted`, execution state and permitted CTA.
2. Reuse Sprint 04 hand-off provenance and product availability/entitlement sources without treating eligibility as access.
3. Add immutable, versioned Pack consent and server-side access recheck at start.
4. Make start tenant/workspace scoped, version pinned, idempotent and double-click/concurrency safe.
5. Extend the generic runtime with exact pinned content, response status/reason semantics, expected revisions, idempotent saves and explicit conflict responses.
6. Make completion transactional and immutable, then emit the durable shared analysis hand-off without rolling back a valid completion when asynchronous delivery fails.
7. Preserve single/cohort respondent-group attribution and apply permission-specific redaction.

Expected areas:

- new `src/lib/knowledge-pack-access/` and `src/lib/knowledge-pack-consent/` domains
- `src/lib/runtime/{types,definition,engine,store,repository.server,http.server}.ts`
- assessment catalogue/start/save/complete API routes and customer UI
- tenancy, permission, concurrency, accessibility and end-to-end tests
- migrations for access decisions, consent, version-pinned execution, response revisions and completion outbox linkage

### Intelligence — S5-006, S5-007 and S5-010

1. Add a Pack canonical-input adapter over the immutable execution snapshot and evidence manifest.
2. Parameterise the shared Delivery Intelligence Engine with the locked Pack snapshot; remove any route from KP-001 to the hard-coded legacy `knowledge_pack` stage.
3. Reuse deterministic scoring, confidence, findings, declarative patterns, narrative facts and atomic result publication.
4. Extend shared trace node/edge types for Pack/question/contribution/result mappings, preserving organisation/workspace/run/version scope.
5. Block publication when any customer-visible output lacks a permitted backward evidence path.
6. Provide permission-specific explanation and audit/export projections with bounded traversal and redaction.

Expected areas:

- `src/lib/analysis/` strategy and normalisation extensions
- `src/lib/delivery-intelligence/` generic Pack adapters and trace extensions
- immutable Pack result/trace migrations only where shared tables cannot safely express the locked contract
- golden, determinism, failure, lineage, tenant and performance suites

### Action and hand-offs — S5-008, S5-011 and S5-012

1. Resolve only locked KP-001 recommendation definitions through the governed recommendation catalogue.
2. Reuse Sprint 04 evaluation, confidence, resolution, priority, sequencing, portfolio, decision, action and outcome contracts.
3. Preserve immutable generated advice and separate customer decisions/actions as overlays.
4. Evaluate mapped Pack/TeamMate access at display and action time; deduplicate source triggers and preserve provenance.
5. Never create a destination Pack before access/consent checks and never create a TeamMate runtime or external action.

Expected areas:

- generic Pack source adapters in `src/lib/recommendation-*`
- `src/lib/recommendation-handoffs/` Pack start consumption
- Pack result/action/hand-off API projections and UI controls
- fixture, permission, idempotency, no-side-effect and inactive-destination tests

### Experience — S5-009

1. Build a stable server projection over immutable Pack intelligence, trace and Sprint 04 overlays.
2. Render the locked hierarchy, safe empty/low-confidence/error states and externally configurable `en-GB` copy.
3. Keep all scoring, recommendation, hand-off and narrative fact selection on the server.
4. Validate keyboard, screen-reader, focus, error-summary, zoom, reduced-motion and 320px responsive behaviour.

Expected areas:

- new Pack catalogue, consent, assessment, processing, result and explanation routes/components
- projection/client modules and ETag/cache contracts
- component, accessibility, responsive and production-like end-to-end tests

### Product proof and operations — S5-013 and S5-014

1. Ingest and govern the exact locked KP-001/A/B artifacts without a pack-specific engine fork.
2. Promote through two-person lifecycle in a non-production rehearsal before production activation.
3. Complete single-participant and approved-cohort journeys, including save/resume, automatic analysis, results, actions and safe hand-offs.
4. Add configuration-as-code validation, diff, promotion/rollback, reconciliation, health, alerts and support-safe correlation tooling.
5. Rehearse migrations, rollback and backup/restore against an isolated target and the approved RPO/RTO policy.
6. Produce the story reports, acceptance matrix, release record, data dictionary and runbooks; update DIQ-000 and controlled documentation only through approved changes.

## Integration gates

| Gate              | Required evidence                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Foundation        | strict schema/semantic/digest tests, lifecycle concurrency, self-approval denial, immutable history, deny-by-default catalogue       |
| Access/runtime    | tenant/permission matrix, consent versioning, start/save/completion idempotency, response conflicts, durable hand-off, accessibility |
| Intelligence      | every locked golden fixture, shared-engine regressions, deterministic replay, complete trace, publication failure atomicity          |
| Action/experience | Sprint 04 regressions, overlay immutability, hand-off rechecks, no side effects, safe projections, WCAG 2.2 AA                       |
| Release           | full regression, lint/format/type/build, migrations/ACL/RLS, security/privacy, performance, e2e, rollback/restore, live smoke        |

## Branch and pull-request structure

Use additive branches from the latest reconciled `main`; do not rewrite published Lovable history.

| Branch                               | Scope                                              |
| ------------------------------------ | -------------------------------------------------- |
| `agent/s5-001-manifest-contract`     | S5-001 strict manifest/schema/digest validation    |
| `agent/s5-002-pack-governance`       | S5-002 catalogue lifecycle and durable activation  |
| `agent/s5-003-005-pack-runtime`      | Access, consent, start, save/resume and completion |
| `agent/s5-006-007-pack-intelligence` | Shared scoring/confidence/findings/patterns        |
| `agent/s5-010-pack-traceability`     | Trace model, explanation and audit                 |
| `agent/s5-008-pack-actions`          | Recommendation and action-plan integration         |
| `agent/s5-011-012-pack-handoffs`     | Pack and TeamMate boundaries                       |
| `agent/s5-009-pack-experience`       | Results/narrative/accessibility experience         |
| `agent/s5-013-kp001`                 | Exact locked KP-001 integration and golden proof   |
| `agent/s5-014-operational-readiness` | Promotion, observability, recovery and acceptance  |

Merge each only with green focused and impacted regression gates. Reconcile Lovable-managed migration filenames and generated Supabase types after deployment without duplicating timestamp migrations.

## Decisions engineering will not make

- It will not promote RC1 content or assign final digests.
- It will not choose or alter KP-001 questions, weights, thresholds, patterns, recommendations, mappings, narrative copy, consent text, entitlement policy, retention or outcome claims.
- It will not translate legacy `executive-sponsorship` 1.4.0 evidence.
- It will not activate inactive future Packs or TeamMates.
- It will not define the missing platform RPO/RTO target.
