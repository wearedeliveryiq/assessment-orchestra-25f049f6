# S4-008 — Customer Decision Workflow

## Status

Implemented on `agent/s4-008-customer-decisions`. Application verification is complete; Lovable-managed migration execution and live schema verification remain deployment gates.

## Architecture and reuse

- Adds a customer-owned overlay to immutable S4-007 portfolio items. It never edits generated eligibility, confidence, resolution, rank, sequence, class, evidence, catalogue content, or portfolio data.
- Uses the exact locked states, commands and reason categories from PB-004. `restored` is an audited command whose resulting state is `undecided`; `superseded` is system-only and irreversible.
- Uses the existing tenant request context, `assessment:read` for views, `assessment:submit` for the established decision-maker write boundary, and the existing audit permission for actor/history disclosure.
- Keeps action creation outside this story. S4-009 may create one action only from an accepted decision.

## Data model

`recommendation_decision_events` is append-only and records portfolio/run/tenant scope, previous and current state, command, required fields, actor, time, portfolio policy, catalogue version/digest, decision version, idempotency key, and payload hash.

`recommendation_item_decisions` is the one-row current projection per portfolio item. Its trigger accepts only a projection that exactly matches a newly appended event and advances the version by one. A separate event-scope trigger binds every event to the immutable portfolio item's run/tenant and the portfolio's pinned policy/catalogue version and digest, including for privileged database writes. Missing rows project as version `0`, state `undecided`.

Both tables use RLS with zero client policies. `PUBLIC`, `anon`, and `authenticated` receive no access. The governed service-role routine repeats item, portfolio, tenant, workspace, active-membership, transition, required-field, idempotency, and expected-version checks under an advisory transaction lock.

## API and experience

- `GET /api/portfolio-items/{id}/decisions` returns the tenant-scoped current decision; audit-authorised users additionally receive immutable history.
- `POST /api/portfolio-items/{id}/decisions` accepts the locked `decision`, expected version, idempotency key, reason and review date contract. It returns the exact customer decision projection and maps stale versions to `409`.
- `GET /api/recommendation-portfolios/{id}/decisions` returns all current decisions in one bounded query; cross-tenant or unknown portfolios return `404`, including empty portfolios.
- The Delivery Intelligence dashboard now presents the governed S4-007 portfolio and visually separates generated advice from customer decisions. Accept requires explicit acknowledgement; defer requires a labelled date; reject requires a labelled locked reason and explicit confirmation; restore returns rejected/deferred advice to undecided. View-only users receive read-only copy.

## Files created

- `src/lib/recommendation-decisions/model.ts`
- `src/lib/recommendation-decisions/types.ts`
- `src/lib/recommendation-decisions/projection.ts`
- `src/lib/recommendation-decisions/repository.server.ts`
- `src/lib/recommendation-decisions/service.server.ts`
- `src/lib/recommendation-decisions/http.server.ts`
- `src/lib/recommendation-decisions/client.ts`
- `src/components/dashboard/recommendation-portfolio-section.tsx`
- `src/routes/api/portfolio-items.$id.decisions.ts`
- `src/routes/api/recommendation-portfolios.$id.decisions.ts`
- `supabase/migrations/20260803080000_recommendation_decisions.sql`
- `supabase/migrations/20260803081000_harden_recommendation_decision_permissions.sql`
- `tests/recommendation-decisions.test.ts`
- `docs/sprint-04/S4-008-deployment-runbook.md`

## Files modified

- `src/components/dashboard/delivery-intelligence-dashboard.tsx`
- `src/lib/delivery-intelligence/client.ts`
- `src/routeTree.gen.ts`
- `tests/migration-security.test.ts`
- `docs/sprint-04/acceptance-matrix.md`
- `docs/sprint-04/S4-007-implementation-report.md`
- `docs/sprint-04/S4-007-deployment-runbook.md`

## Acceptance evidence

- AC1: executable table-driven tests cover every legal transition and every illegal state/command pair, including irreversible supersession.
- AC2: accept acknowledgement, defer review date, reject reason category, extraneous-field rejection, and the six exact categories are validated in both the pure model and database constraints.
- AC3: semantic payload hashing plus tenant-scoped unique idempotency keys returns an exact replay without adding an event; conflicting reuse fails closed.
- AC4: expected decision version is checked under an advisory lock; stale concurrent writes return `RECOMMENDATION_DECISION_VERSION_CONFLICT` / HTTP `409`.
- AC5: read/write permissions, active tenant membership, workspace ownership and all resource queries are re-authorised. Cross-tenant IDs return `404` and client roles cannot access storage or the governed routine.
- AC6: S4-007 tables remain immutable; decisions are separate event/current-projection tables and customer output explicitly distinguishes generated advice from a customer choice.

## Verification

- Targeted decision, portfolio and migration-security suites: 3 files / 51 tests passed.
- Full regression: 37 files / 446 tests passed, including all 53 locked DIQ-203B fixtures.
- Pure transition performance: 10,000 commands inside the 500 ms test guard.
- Type checking, changed-file ESLint, changed-file Prettier and the production build passed.
- Full-repository lint was run and remains a recorded inherited limitation: 6,336 errors and 15 warnings outside the governed changed-file gate.
- Live end-to-end decision smoke remains unavailable until production has a genuine completed eligible Delivery DNA result and S4-007 portfolio. No customer evidence is manufactured.

## Known limitations and technical debt

- Single-item and portfolio synchronous audit projections are bounded at 10,000 events and fail closed above that limit. S4-014 owns asynchronous governed audit export for larger histories.
- Existing repository-wide lint debt remains outside this story; changed files must remain clean.

## Product decisions required

None.
