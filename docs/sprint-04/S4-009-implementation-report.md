# S4-009 — Action Ownership and Improvement Plan

## Status

Implemented on `agent/s4-009-improvement-actions`. Application verification is complete; Lovable-managed migration execution and live schema verification remain deployment gates.

## Architecture and reuse

- Adds a focused customer action layer after the immutable S4-007 portfolio and append-only S4-008 decision layer. Generated recommendation content and customer decisions are never edited or deleted.
- Uses the locked five action states and focused fields. The conservative transition model permits create to `not_started`, update in a non-terminal state, start/resume from `not_started` or `blocked`, block from `not_started` or `in_progress`, complete only from `in_progress`, and explicitly confirmed cancellation from a non-terminal state. `completed` and `cancelled` are terminal.
- Uses the existing tenant request context, `assessment:read` for views and `workspace:manage` for the improvement-lead write boundary. The database repeats active organisation membership, workspace membership and workspace ownership checks for the actor and every assignee.
- Uses the existing notification boundary for new ownership and reassignment. Notification delivery is deliberately non-blocking and does not change action transaction success.
- Keeps one governed plan version (`1`) in the customer API until a later approved plan-version lifecycle exists; the data model remains version-ready.

## Data and audit model

`recommendation_improvement_plans` roots a plan version in one immutable recommendation portfolio and tenant scope.

`recommendation_improvement_action_events` is append-only. It records every state, owner, contributor, target, note, completion-evidence, dependency-override, blocking-dependency, actor, time, version, idempotency key and semantic request hash change.

`recommendation_improvement_actions` is the governed current projection. Its trigger accepts only changes that exactly match a newly appended event, advance the version by one, preserve immutable source scope and bind state timestamps to the event time. The event foreign key is deferrable so event-first publication remains atomic.

All three tables use RLS with zero client policies. `PUBLIC`, `anon` and `authenticated` receive no access. The service-role routine repeats source decision, tenant, assignment, dependency, transition, evidence, replay and optimistic-version checks under an advisory transaction lock.

## API and experience

- `POST /api/portfolio-items/{id}/actions` creates or reuses the one plan-version action only after an accepted customer decision.
- `PATCH /api/improvement-actions/{id}` applies a bounded command with an expected version and idempotency key.
- `GET /api/improvement-actions/{id}` returns the workspace projection; audit-authorised users also receive immutable history.
- `GET /api/recommendation-portfolios/{id}/actions` returns a bounded tenant-scoped action list.
- The Delivery Intelligence portfolio displays action state separately from generated advice and customer choice. It supports accessible create, start/resume, block, complete and cancel controls. Completion copy records association and activity, never causal impact.

## Files created

- `src/lib/recommendation-actions/model.ts`
- `src/lib/recommendation-actions/types.ts`
- `src/lib/recommendation-actions/projection.ts`
- `src/lib/recommendation-actions/repository.server.ts`
- `src/lib/recommendation-actions/service.server.ts`
- `src/lib/recommendation-actions/http.server.ts`
- `src/lib/recommendation-actions/client.ts`
- `src/components/dashboard/recommendation-action-controls.tsx`
- `src/routes/api/portfolio-items.$id.actions.ts`
- `src/routes/api/improvement-actions.$id.ts`
- `src/routes/api/recommendation-portfolios.$id.actions.ts`
- `supabase/migrations/20260803090000_recommendation_improvement_actions.sql`
- `supabase/migrations/20260803091000_harden_recommendation_action_permissions.sql`
- `tests/recommendation-actions.test.ts`
- `docs/sprint-04/S4-009-deployment-runbook.md`

## Files modified

- `src/components/dashboard/recommendation-portfolio-section.tsx`
- `src/routeTree.gen.ts`
- `tests/migration-security.test.ts`
- `docs/sprint-04/acceptance-matrix.md`

## Acceptance evidence

- AC1: a tenant-scoped unique `(plan_id, portfolio_item_id)` constraint, accepted-decision recheck, advisory lock and exact replay path create or reuse one action. A losing concurrent creator does not issue a duplicate notification.
- AC2: pure model tests and matching database constraints/routine conditions cover owner/date requirements, all allowed transitions, terminal states, completion evidence and explicit cancellation.
- AC3: writes require `workspace:manage`; the database verifies active organisation and workspace membership for the actor, accountable owner and every contributor. Inactive and cross-tenant assignees fail closed.
- AC4: both service and database calculate incomplete required dependencies. Start fails unless the caller explicitly acknowledges the risk and supplies a reason; the immutable event records the exact blockers.
- AC5: every successful change appends one immutable event and advances the governed projection. Rejecting the source advice or cancelling an action never deletes either history.
- AC6: all queries and commands carry organisation/workspace scope, cross-tenant IDs return `404`, assignment scope is repeated in the database, and client roles cannot access storage or the command routine.

## Verification

- Targeted action, decision and migration-security suites: 3 files / 56 tests passed before the final gate.
- Type checking and the production build passed before the final gate.
- Full regression: 38 files / 464 tests passed, including all 53 locked DIQ-203B fixtures.
- Pure transition performance: 10,000 transitions inside the 600 ms test guard.
- Type checking, changed-file ESLint, changed-file Prettier and the production build passed.
- Full-repository lint was run and remains a recorded inherited limitation: 6,630 errors and 15 warnings outside the governed changed-file gate.
- Live end-to-end action smoke remains unavailable until production has a genuine completed eligible Delivery DNA result, portfolio and accepted recommendation. No customer evidence is manufactured.

## Known limitations and technical debt

- The first customer API exposes governed plan version `1`; plan-version rollover needs a future approved lifecycle before it is exposed.
- The focused UI creates an action owned by the authorised creator. The API and database support reassignment and contributors; a workspace-member picker can be added in the later integrated experience story without changing this model.
- Synchronous single-action audit history is bounded at 10,000 events and fails closed above that limit. S4-014 owns governed asynchronous export for larger histories.
- Existing repository-wide lint debt remains outside this story; changed files are clean.

## Product decisions required

None.
