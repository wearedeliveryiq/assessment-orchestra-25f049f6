# S4-012 — Recommendation Experience and Executive Reporting

## Status

Implemented on `agent/s4-012-recommendation-experience`. Application verification is complete; deployment and live authenticated smoke verification remain release gates.

S4-012 is a read-model and presentation story. It changes no product rule, generated recommendation, customer decision, action, outcome or hand-off record. S4-010 remains independently blocked by the locked outcome/date-policy gap recorded in `S4-010-product-rule-blocker.md`.

## Architecture and reuse

- Adds one tenant-scoped server projection that composes the existing immutable S4-007 portfolio, S4-008 decision, S4-009 action and S4-011 hand-off models. It does not duplicate recommendation, confidence, priority, sequence, decision, action or product-mapping logic.
- Loads the portfolio once, then decisions, actions and operational product state once each in parallel. Product hand-offs are resolved for the complete report on the server, eliminating the prior per-action request pattern.
- Revalidates every decision and action against the current organisation, workspace, portfolio and portfolio-item manifest before projection. Any mismatch returns the existing non-enumerating `RECOMMENDATION_ACCESS_DENIED` response.
- Rechecks `assessment:read` and all current role permissions on every request. Controls are derived exclusively from present permissions: decision makers decide, improvement leads manage actions, auditors receive the permitted audit affordance, and membership administration does not confer product governance.
- Creates a deterministic semantic snapshot version from the immutable portfolio hash, customer overlay versions/states, operational product state and current permission set. The snapshot timestamp and version are visible in the executive report and the version is its strong ETag.

## API and experience

`GET /api/recommendation-portfolios/{id}/experience` returns one customer-safe projection containing:

1. portfolio summary and trace coverage;
2. classification and priority;
3. approved supporting capability/pattern labels, rationale, confidence and caveat;
4. dependencies;
5. expected outcome and success measures;
6. customer decision state and authorised controls;
7. accepted action and progress;
8. available, permission-aware Pack and TeamMate hand-offs;
9. exact recommendation, catalogue, configuration and portfolio-policy source versions;
10. report snapshot time and semantic version.

The endpoint supports `If-None-Match`, returns `304` without a body for an exact current snapshot, and uses private no-cache response controls with cookie/authorisation variation.

The UI uses semantic `article`, `header`, `section`, ordered-list, definition-list, `details`, `summary` and `time` elements. All controls retain a minimum 44-pixel target, loading/errors use live-region semantics, the layout has no fixed width below 320 pixels, and the report is printable using the browser's PDF-capable print path. Generated advice and customer decisions/progress are labelled separately throughout. Association-only outcome copy prevents causal claims.

## Files created

- `src/lib/recommendation-experience/model.ts`
- `src/lib/recommendation-experience/service.server.ts`
- `src/lib/recommendation-experience/http.server.ts`
- `src/lib/recommendation-experience/client.ts`
- `src/routes/api/recommendation-portfolios.$id.experience.ts`
- `tests/recommendation-experience.test.ts`
- `docs/sprint-04/S4-012-deployment-runbook.md`

## Files modified

- `src/components/dashboard/recommendation-portfolio-section.tsx`
- `src/components/dashboard/recommendation-action-controls.tsx`
- `src/components/dashboard/recommendation-handoff-controls.tsx`
- `src/routeTree.gen.ts`
- `docs/sprint-04/acceptance-matrix.md`

## Acceptance evidence

- AC1: role matrix tests verify that read, decide, action, audit and membership capabilities are independent; server permission recheck controls every projection and the UI renders only approved decision/action controls.
- AC2: loading, safe error, retry, mutation error, pending and empty states are explicit and accessible. Failures state that no advice or customer record was changed.
- AC3: the server composes existing canonical projections, validates every overlay against the immutable portfolio manifest and exposes exact source versions. Tests reconcile decision/action/handoff overlays and reject escaped scope.
- AC4: semantic hierarchy, native keyboard-operated disclosure, labelled form controls, live regions, non-colour status copy and 44-pixel controls cover the core WCAG 2.2 AA journey.
- AC5: responsive classes use a single-column base, wrapping and `min-w-0` before wider breakpoints; source-contract tests guard the 320-pixel-safe structure.
- AC6: executive output clearly separates generated and customer state and exposes the report snapshot time, semantic version, baseline time/version and exact item source versions.

## Verification

- Targeted S4-012 domain, role, scope, disclosure, accessibility, caching and performance tests: 10 tests passed.
- Large report: 250 recommendations projected with four bounded source reads inside the two-second target; warm projection completed inside 700 milliseconds.
- Full regression: 40 files / 491 tests passed, including all 53 DIQ-203B fixtures.
- Type checking, changed-file ESLint, changed-file Prettier and production build passed.
- Full-repository lint remains inherited debt and is recorded in the acceptance matrix; no changed file introduces a lint error.

## Security, privacy and traceability

- No new database object, migration, client policy or data mutation is introduced.
- The authenticated tenant context and `assessment:read` check are repeated on every read; cross-tenant or out-of-manifest overlays fail with a non-enumerating 404.
- Customer output omits tenant IDs, actor IDs, raw trace-node IDs, canonical inputs, internal hashes, formulas, prompts, raw answers and audit histories.
- Every displayed generated item preserves trace coverage and recommendation/catalogue/configuration/portfolio-policy versions. Customer overlays retain their existing audited records and optimistic concurrency controls.

## Known limitations and technical debt

- The browser print path creates print/PDF-ready semantic output; managed server-side PDF generation is not part of the existing stack.
- The first production Delivery DNA portfolio remains the prerequisite for a genuine live report smoke test. No synthetic customer evidence will be manufactured.
- S4-010 remains blocked by absent locked maintain/date-policy definitions and is not inferred by this experience.
- Existing repository-wide lint debt remains outside this story; changed files are clean.

## Product decisions required

None for S4-012. The separate S4-010 decision remains outstanding.
