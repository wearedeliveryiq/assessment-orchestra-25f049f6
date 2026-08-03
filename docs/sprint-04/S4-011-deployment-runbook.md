# S4-011 Knowledge Pack and TeamMate Hand-off Deployment Runbook

## Preconditions and preflight

1. Confirm S4-008 decision and S4-009 improvement-action tables, routines and hardening are applied.
2. Confirm `delivery_product_availability`, `organisation_product_entitlements`, organisations, workspaces, organisation/workspace memberships, source actions/items/runs and `reject_audit_mutation()` exist with the expected columns and key types.
3. Confirm `delivery_product_availability.product_version`, both hand-off enums, all three new tables, both governed routines and all new triggers/indexes do not exist.
4. Inspect current availability rows. Adding nullable `product_version` is non-destructive; any row without an exact version remains hidden from hand-offs.
5. Confirm neither migration contains product availability, entitlement, activation, catalogue, tenant, identity, customer or seed data.
6. Record counts for availability, entitlements, activations, actions, decisions, portfolios, analysis results, tenants and identities.

## Apply

Apply separately and back-to-back:

1. `20260803110000_recommendation_product_handoffs.sql`
2. `20260803111000_harden_recommendation_product_handoff_permissions.sql`

## Verify

- the availability table has nullable semver-validated `product_version` and every existing row/value is unchanged;
- both enums contain only the declared CTA/event values;
- all three tables, constraints, four declared indexes, three immutability/audit triggers, scope trigger and two governed routines exist;
- hand-off expiry is bounded between one and fifteen minutes, raw tokens are absent, and consumption is unique/idempotent;
- RLS is enabled with zero client policies;
- `PUBLIC`, `anon` and `authenticated` have no table, sequence, function or `MAINTAIN` privileges;
- `service_role` has read access and governed routine execution but no direct table or sequence writes;
- both routines are `SECURITY DEFINER` with `public, pg_temp` search paths;
- direct hand-off/event mutation, cross-tenant access, inactive membership, absent/retired target version, stale entitlement, cancelled action and non-accepted TeamMate source fail closed;
- neither routine writes `organisation_product_activations` or any Knowledge Pack/TeamMate runtime state;
- no existing action, decision, portfolio, analysis, catalogue, identity, tenant, availability or entitlement row changes;
- generated Supabase types include the new column, enums, tables and routines;
- full tests, all DIQ-203B fixtures, type check, changed-file lint/format and production build pass.

If genuine active versioned product availability, tenant entitlement and an accepted customer action exist, exercise entitled/unentitled Pack, entitled/unentitled TeamMate, revoked permission, expiry, exact replay, cross-tenant denial and target-version retirement. Verify each successful consume creates one event and no activation. If genuine prerequisites do not exist, record live smoke as unavailable and create no synthetic customer/product data.

## Rollback

Before any hand-off exists, a separately reviewed rollback may remove the routines, triggers, tables, enums and availability version column in reverse dependency order. After the first hand-off, preserve consent/audit history: disable the API/routines and deploy a versioned correction instead of deleting or rewriting records.
