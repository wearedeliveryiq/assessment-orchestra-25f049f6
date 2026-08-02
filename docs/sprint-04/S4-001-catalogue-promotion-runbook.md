# S4-001 Catalogue Promotion and Rollback Runbook

## Preconditions

- Back up the database and confirm both S4-001 migrations have passed read-only preflight.
- Confirm the source snapshot is the locked DIQ-203A `sprint03-product-config-1.0.0` catalogue.
- Nominate two different users with `platform_admin` and `recommendation:govern`: author and approver.

## Promotion

1. Create version `1.0.0` with a unique idempotency key.
2. Verify the returned content digest against a second local calculation.
3. Submit the draft for review.
4. Approve using a different authorised user; self-approval must fail.
5. Activate with a new idempotency key.
6. Verify one active row per recommendation ID in `production`, the lifecycle events, approval identity and immutable snapshot.
7. Re-submit each command to confirm idempotent replay and run a concurrent activation attempt to confirm only one winner.

## Rollback

1. Identify a previously approved, retired or superseded version and verify its digest.
2. Issue `rollback` under product-governance authority with a unique idempotency key.
3. Verify activation pointers atomically reference that version and the superseded/current lifecycle events remain append-only.
4. Do not modify or delete any historical result, portfolio, version, definition, approval or event.

## Failure response

- `CATALOGUE_VERSION_INVALID`: do not activate; correct through a new semantic version.
- `CATALOGUE_PROMOTION_CONFLICT`: reread current state and retry only if governance still authorises promotion.
- Dependency cycle or unknown reference: fail closed and issue a corrected version.
- Partial or integrity failure: transaction rollback is automatic; retain evidence and escalate before retry.
