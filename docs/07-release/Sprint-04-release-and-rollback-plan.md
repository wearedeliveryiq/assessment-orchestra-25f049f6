# Sprint 04 Release and Rollback Plan

## Release status

Status: **HOLD — remediation implemented locally; external release evidence pending**.

The recommendation framework remains fail closed where no eligible evidence exists. PDR-004-001 now governs S4-010 and recovery objectives. S4-014 audit export remains disabled during this hold until managed migration verification, authorised export testing, measured recovery and superseding Product Acceptance.

## Release sequence

1. Merge the S4-010 implementation and preserve the locked PDR/SAR records.
2. Apply `20260803150000`, `20260803151000` and `20260803152000` as separate Lovable-managed migrations and verify RLS, ACL, immutability, functions, generated types and unchanged existing data.
3. Publish the verified build and confirm the public shell remains available.
4. Confirm exact production catalogue/configuration IDs, versions and digests.
5. Restore a qualifying <=15-minute Tier 1 recovery point into an isolated target; measure RPO/RTO and verify integrity, tenant denial, immutable history, idempotency, audit continuity and safe feature flags.
6. Enable `audit_exports` through an idempotent Product Governance event with reason `release_gate`; run an authorised export/redaction/expiry/access-log test; disable it again if general enablement is not approved.
7. Execute the genuine eligible Delivery DNA smoke journey when genuine customer evidence is available; do not manufacture it.
8. File the reconciled evidence and obtain a superseding Product Owner and Matt Prust acceptance decision before declaring the sprint released.

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
- Measured Tier 1 backup/restore evidence showing RPO <=15 minutes and RTO <=4 hours.
- Genuine end-to-end customer journey and signed release acceptance.
