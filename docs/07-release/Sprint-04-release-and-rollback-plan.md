# Sprint 04 Release and Rollback Plan

## Release status

Status: **HOLD — engineering complete except S4-010; release acceptance blocked**.

The recommendation framework must remain fail closed until the S4-010 policy, platform RPO/RTO and genuine end-to-end evidence are approved. S4-014 audit export must remain disabled during this hold.

## Release sequence

1. Lock the S4-010 maintain/date policy and golden fixtures; implement and rerun all regression gates.
2. Approve platform RPO/RTO and complete the isolated backup/restore rehearsal.
3. Confirm exact production catalogue/configuration IDs, versions and digests.
4. Verify every Sprint 04 managed migration, generated type and least-privilege ACL.
5. Execute the genuine eligible Delivery DNA smoke journey, including cross-tenant denial.
6. Enable `audit_exports` through an idempotent Product Governance event with reason `release_gate`.
7. Verify the asynchronous export within 60 seconds, its redaction/integrity record, access logging and expiry.
8. Record Product Owner and Matt Prust acceptance before declaring the sprint released.

## Rollback

1. Disable affected optional features through governed feature events using reason `incident` or `rollback`.
2. Return catalogue activation to the last approved version using different author and approver identities.
3. Revert application deployment to the recorded good revision without force-push, rebase, amend or squash.
4. Preserve all immutable histories. Use superseding events for corrections; never delete catalogue, recommendation, decision, action, hand-off, analytics, export or integrity records during an incident.
5. Restore from the approved platform recovery point only through the platform process and validate tenant scope, digests, migrations and row counts before reopening traffic.

## Acceptance evidence required

- Sprint 04 acceptance matrix with every feasible gate passing and S4-010 no longer blocked.
- Full DIQ-203B and Sprint 04 regression, static checks and production build.
- Live schema, RLS, ACL, expiry, alert and cross-tenant checks.
- Measured backup/restore evidence against approved RPO/RTO.
- Genuine end-to-end customer journey and signed release acceptance.
