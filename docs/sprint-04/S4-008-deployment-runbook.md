# S4-008 Customer Decision Workflow Deployment Runbook

## Preconditions and preflight

1. Confirm S4-007 tables, immutable triggers and corrected `publish_recommendation_portfolio(jsonb)` exist and are hardened.
2. Confirm `assessment_analysis_runs`, `recommendation_catalogue_versions`, organisations, workspaces, active memberships, `reject_audit_mutation()` and every S4-008 FK target exist.
3. Confirm the four decision enums, two decision tables, projection trigger/function and command function do not yet exist.
4. Confirm neither migration contains seed data, customer decisions, role grants, catalogue activation, product rules, or mutation of S4-007 baselines.
5. Record counts for portfolio items, decisions, assessments, analysis results, catalogue versions, identities and tenant records.

## Apply

Apply separately and back-to-back:

1. `20260803080000_recommendation_decisions.sql`
2. `20260803081000_harden_recommendation_decision_permissions.sql`

## Verify

- four enums contain only the locked values;
- both tables, all constraints, three indexes, immutable event trigger, event-scope trigger, governed projection trigger and command routine exist;
- RLS is enabled with zero client policies;
- `PUBLIC`, `anon`, and `authenticated` have no table, function, sequence or `MAINTAIN` privileges;
- `service_role` retains table reads and only the writes/execution needed by the governed command;
- the command is `SECURITY DEFINER` with `public, pg_temp` search path;
- direct event updates/deletes, cross-scope/pinned-version event inserts and unaudited projection writes fail;
- no existing portfolio, assessment, analysis, catalogue, identity, tenant or customer row changes;
- Supabase types regenerate; full tests, type check, changed-file lint/format and production build pass.

If a genuine portfolio exists, exercise accept, exact replay, stale concurrency, defer, restore, reject, restore, cross-tenant denial and read-only permission denial. Verify every successful transition appends exactly one event and leaves the portfolio baseline byte-identical. If no genuine portfolio exists, record live smoke as unavailable and create no synthetic customer evidence.

## Rollback

Before any decision exists, a separately reviewed rollback may remove the routine, triggers, tables and enums in reverse dependency order. After the first decision, preserve audit history: disable the write route/routine and deploy a versioned correction rather than deleting or rewriting decision records.
