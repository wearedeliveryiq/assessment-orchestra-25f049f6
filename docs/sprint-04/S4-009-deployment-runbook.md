# S4-009 Action Ownership and Improvement Plan Deployment Runbook

## Preconditions and preflight

1. Confirm S4-007 portfolio and item tables plus S4-008 decision tables are applied, immutable and hardened.
2. Confirm organisations, workspaces, organisation memberships, workspace memberships, `reject_audit_mutation()` and every foreign-key target exist.
3. Confirm the two S4-009 enums, three tables, two scope/projection functions, governed command, indexes and triggers do not yet exist.
4. Confirm neither migration contains seed data, customer actions, catalogue activation, role assignments, product-rule changes or mutation of S4-007/S4-008 records.
5. Record counts for portfolios, portfolio items, decisions, actions, assessments, analysis results, catalogue versions, identities and tenant records.

## Apply

Apply separately and back-to-back:

1. `20260803090000_recommendation_improvement_actions.sql`
2. `20260803091000_harden_recommendation_action_permissions.sql`

## Verify

- both enums contain only the locked states and commands;
- all three tables, constraints, four declared indexes, immutable plan/event triggers, event-scope trigger, governed projection trigger and command routine exist;
- the current projection exactly follows an immutable event, including state, focused fields and timestamps;
- RLS is enabled with zero client policies;
- `PUBLIC`, `anon` and `authenticated` have no table, function, sequence or `MAINTAIN` privileges;
- `service_role` retains only the table access and command execution required by the governed workflow;
- the command is `SECURITY DEFINER` with `public, pg_temp` search path;
- direct event mutation, unaudited current writes, invalid state transitions, cross-tenant assignment, inactive-user assignment, stale versions and incomplete required dependencies fail;
- exact replay returns the same action without an extra event or notification;
- no existing portfolio, decision, assessment, analysis, catalogue, identity, tenant or customer row changes;
- generated Supabase types include the new objects; full tests, type check, changed-file lint/format and production build pass.

If a genuine accepted production portfolio item exists, exercise create, exact replay, update, start without date, required-dependency denial, authorised override, block, resume, complete with evidence, cancellation on a separate action, stale concurrency, inactive assignee and cross-tenant denial. Verify every successful transition appends exactly one event and leaves the source portfolio and decision history byte-identical. If no genuine item exists, record live smoke as unavailable and create no synthetic customer evidence.

## Rollback

Before any customer action exists, a separately reviewed rollback may remove the command, triggers, tables and enums in reverse dependency order. After the first action, preserve audit history: disable the write routes/routine and deploy a versioned correction rather than deleting or rewriting plans, actions or events.
