# Sprint 04 Release and Rollback Plan

## Release status

Status: **HOLD — remediation deployed; controlled external evidence pending**.

The recommendation framework remains fail closed where no eligible evidence exists. PDR-004-001 governs S4-010 and recovery objectives. S4-010 managed migration and deployment verification passed on 3 August 2026. S4-014 audit export remains disabled during this hold until authorised export testing, measured recovery and superseding Product Acceptance.

## Release sequence

1. **Complete:** merge the S4-010 implementation and preserve the locked PDR/SAR records.
2. **Complete:** apply `20260803150000`, `20260803151000` and `20260803152000` as separate Lovable-managed migrations, apply the Cloud-default-grant correction, and verify RLS, ACL, immutability, functions, generated types and unchanged existing data.
3. **Complete:** publish the verified build and confirm the public shell remains available with HTTP 200.
4. **Complete:** production catalogue `deliveryiq-recommendations` v1.0.0 is active against configuration set `sprint03-product-config-1.0.0`; its governed digest remains `0d35fb4d682e0817741454bd730f9fc2aeffe6a762ca03c0d2c093251712f2dc`.
5. **Blocked externally:** Lovable self-service recovery exposes daily in-place snapshots, not an arbitrary <=15-minute recovery point or isolated target. Obtain a qualifying support-provisioned target or approved alternative architecture, then restore into isolation, measure RPO/RTO and verify integrity, tenant denial, immutable history, idempotency, audit continuity and safe feature flags.
6. Enable `audit_exports` through an idempotent Product Governance event with reason `release_gate`; run an authorised export/redaction/expiry/access-log test; disable it again if general enablement is not approved.
7. Execute the genuine eligible Delivery DNA smoke journey when genuine customer evidence is available; do not manufacture it.
8. **Evidence filed:** obtain a superseding Product Owner and Matt Prust acceptance decision before declaring the sprint released.

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

## Managed deployment record

The release candidate is live at `https://assessment-orchestra.lovable.app` from source identity `00373f0a5f9f3ccfabaebd0aea0f8c900a0d350f`. Lovable recorded generated migration/type commit `6cb567b10c93602f2dce1a7a196c731f940e6952` and these managed migrations:

- `20260803154536_5ab1e1a7-e982-4f1f-b201-c8f9d39402aa.sql` — outcome schema and governed routines;
- `20260803154612_1fcc9b40-a159-404e-bdeb-d64e1819e59d.sql` — deny-by-default hardening;
- `20260803154643_2245f262-dfb5-4994-9952-2a738b21d3a1.sql` — governed outcome analytics;
- `20260803154747_f8019ceb-25b5-4393-937d-8efb166fa2f3.sql` — minimum Cloud-default service-role grant correction.

Live verification found exact enums and schema, RLS enabled with zero client policies, no client privileges, `service_role` limited to `SELECT, INSERT` and governed routine execution, zero outcome/customer backfill rows, all required test/build gates green, no critical security findings and `audit_exports` still disabled.
