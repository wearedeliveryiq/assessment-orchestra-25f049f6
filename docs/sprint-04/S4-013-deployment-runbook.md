# S4-013 Recommendation Analytics Deployment Runbook

## Preconditions

1. Confirm S4-008–012 application code and the active recommendation catalogue remain deployed.
2. Confirm `reject_audit_mutation`, organisation/workspace membership, portfolio, decision, action and hand-off objects exist.
3. Confirm the two S4-013 migrations have not already been applied under another name.
4. Record the current published revision and database recovery point.
5. Confirm the server has `RECOMMENDATION_ANALYTICS_PSEUDONYM_SECRET` or the existing service-role secret available at runtime. Never display either value.

## Preflight

- inspect both migrations for object collisions, compatible foreign keys and function signatures;
- confirm there are no seed events, consent rows, catalogue changes or rule changes;
- confirm all new tables enable RLS with zero client policies;
- confirm the event property function and object contract exactly match the data dictionary;
- confirm the aggregate uses `HAVING count(DISTINCT organisation_id) >= 10`;
- confirm the retention routine is the only permitted update/delete path;
- confirm the application uses authenticated write request protection for consent and event capture.

## Apply and verify

1. Apply `20260803130000_recommendation_analytics.sql` as one migration.
2. Immediately apply `20260803131000_harden_recommendation_analytics_permissions.sql` as a separate migration to remove Lovable Cloud default grants.
3. Verify the three enums, two tables, indexes, constraints, triggers and six functions.
4. Verify RLS is enabled and there are zero policies.
5. Verify `anon`, `authenticated` and `PUBLIC` have no table, `MAINTAIN` or function privilege.
6. Verify `service_role` has table `SELECT` and execute only on the four governed routines; trigger/validation helpers are not client-executable.
7. Confirm no catalogue, activation, recommendation, assessment, analysis, decision, action, hand-off or identity row changed.
8. Regenerate Supabase types from the live schema.
9. Run the full test, type, changed-file lint/format and production-build gates, then publish.

## Smoke and monitoring

- With an authorised test user, confirm default consent is `not_set`, grant is versioned and withdrawal stops later collection.
- Confirm identical event IDs create one row and a conflicting replay is rejected.
- Confirm a cross-tenant source, unknown property, free-text property and ungoverned outcome source are rejected.
- Simulate analytics capture failure and confirm the decision/action/handoff workflow still succeeds.
- Confirm a 9-tenant group is absent and a 10-tenant group can be returned. Do not manufacture production customers to perform this check.
- Monitor structured `recommendation-analytics` capture failures by categorical event/object type only; alert on sustained failure rate, consent-routine failure, retention failure or any privacy-threshold assertion.
- Never log input properties, user identifiers, object identifiers, secrets or customer evidence.

## Retention operation

Configure the existing platform retention policy using entity `recommendation_analytics_events`, a Product/Privacy-approved horizon, and `archive` or `purge`. Run the existing retention job. Confirm affected counts only; do not export event payloads into operational logs.

## Rollback

1. Revert the application deployment to the prior revision. Workflows remain operational because analytics capture is non-blocking.
2. Disable event collection by withdrawing consent for affected users or disabling the analytics application route at the deployment layer.
3. Do not drop tables or delete events during an incident. Preserve the immutable audit and privacy record until Product/Privacy approves a governed retention action.
4. If a migration fails, do not manually create partial objects. Record the exact failed statement, confirm transaction rollback, correct the approved implementation and reapply through the managed migration path.
