# S4-001 — Product Governance Role Remediation

## Outcome

Aligns catalogue governance with locked PB-004 Section 14 by separating product configuration authority from platform and tenant administration. It does not change catalogue content, recommendation rules or customer-visible recommendation behaviour.

## Architecture and security

- Adds `product_governance` as a platform-scoped identity role.
- Grants that role exactly `recommendation:govern`.
- Removes implicit catalogue governance from `platform_admin`.
- Keeps catalogue routes behind their existing server-side permission check.
- Prevents the governance role from being stored in organisation/workspace memberships or invitations at both application and database boundaries.
- Restricts tenant recommendation-evaluation audit detail to `audit:read`; `recommendation:govern` remains configuration-only.
- Preserves all existing tenant-isolation checks and makes no data changes or role assignments.

## Database changes

Apply separately and in order:

1. `20260803022000_add_product_governance_role.sql` adds the enum value and commits it independently.
2. `20260803023000_isolate_product_governance_role.sql` adds fail-closed checks to every tenant-role column.

The migrations contain no role grants, user updates, tenant updates or seed data. The enum addition is intentionally irreversible in-place; rollback leaves the unused value present and reverts application use.

## Verification

- Product Governance receives only catalogue-governance permission: passed.
- Platform administration alone cannot call catalogue governance APIs: passed.
- Product Governance cannot be assigned through tenant membership or invitation flows: passed.
- Database constraint contracts reject Product Governance in organisation, workspace and invitation role columns: passed; live application pending.
- Catalogue governance alone cannot expose tenant evaluation audit detail: passed.
- Affected role, catalogue, evaluation and migration-security suites: 42/42 passed.
- Full regression, including the locked Sprint 03 golden baseline: 317/317 passed across 30 files.
- Static type checking, changed-file lint, formatting and production build: passed.
- Full-repository lint reports 615 inherited errors and 15 warnings outside the changed scope; no changed-file lint finding remains.

## Release dependency

Production catalogue activation remains blocked until two genuine people are nominated and provisioned with `product_governance`, one acting as author and the other as approver. No placeholder, rehearsal identity or self-approval is permitted.

Live migration execution, regenerated live schema types and database constraint verification remain Lovable deployment gates. No production catalogue was activated or published by this remediation.
