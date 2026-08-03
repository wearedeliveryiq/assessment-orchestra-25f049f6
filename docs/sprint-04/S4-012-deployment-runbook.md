# S4-012 Recommendation Experience Deployment Runbook

## Preconditions

1. Confirm S4-007 portfolio, S4-008 decision, S4-009 action and S4-011 hand-off application code is deployed.
2. Confirm the active production recommendation catalogue and existing tenant, RLS and service-role controls are unchanged.
3. Confirm the S4-012 tree contains the combined experience model/service/HTTP/client modules, API route, UI changes, tests and implementation report.
4. Record the current published revision. S4-012 contains no migration and must not modify customer or governance data during deployment.

## Deploy

1. Synchronise the merged GitHub revision to the existing Lovable project without rewriting history.
2. Regenerate the route tree through the normal production build. Do not regenerate Supabase types because the database schema is unchanged.
3. Run full tests, all DIQ-203B fixtures, type checking, changed-file lint/format and the production build.
4. Publish only after all applicable gates pass.

## Verify

- unauthenticated, revoked and cross-tenant requests do not enumerate the portfolio;
- a viewer sees the complete generated hierarchy and customer overlay but no decision/action control;
- a decision maker sees only valid decision controls;
- an improvement lead sees only valid action controls;
- an auditor receives the permitted audit affordance but no write capability;
- all items display title, class, priority, evidence labels, confidence/caveat, impact/effort, dependencies, outcome, success measures, versions and decision state;
- generated advice and customer decisions/progress remain visibly separate;
- loading, error, retry, empty, stale-write and pending states use safe accessible copy;
- one experience request replaces decision/action/per-action-handoff reads;
- an exact `If-None-Match` returns `304`, while permission revocation is still checked first;
- keyboard disclosure and controls remain operable; layout remains usable at 320 pixels and wider;
- printing produces semantic report content with snapshot and source versions;
- no portfolio, decision, action, outcome, hand-off, catalogue, identity or tenant data changes during reads;
- production home, authenticated dashboard and unrelated regression journeys remain healthy.

If a genuine eligible Delivery DNA portfolio exists, complete a role-by-role live journey and print preview. If not, record the live report smoke as unavailable and create no synthetic customer evidence.

## Rollback

This story has no data migration. Revert the application deployment to the prior published revision. Existing generated portfolios and customer overlay history remain untouched and require no database rollback.
