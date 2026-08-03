# S4-014 Recovery Rehearsal Record

## Implementation rehearsal

Automated tests exercise the recoverable state machine without customer data:

- absent feature configuration fails safe;
- immutable source data remains untouched;
- two claimed export jobs are isolated so one integrity failure does not roll back the successful job;
- exact request replay reuses one job and conflicting reuse is rejected;
- retry is limited to retryable failures and no more than three claims;
- stale processing leases are reclaimable after two minutes;
- completed payloads expire after 15 minutes and are no longer downloadable;
- integrity failure blocks export completion and records a non-retryable result;
- every authorised access attempt is logged;
- configuration comparison is deterministic and redacted;
- the full ten-code alert manifest is returned by health monitoring;
- 10,000 audit events project within the 60-second target while 10,001 fail closed.

## Managed-environment rehearsal still required

A true backup/restore exercise requires a Lovable Cloud recovery point and an isolated restore target. It must record:

1. source revision and database recovery-point identifier;
2. start, restore-complete and verification timestamps;
3. restored migration inventory and pinned catalogue/configuration digests;
4. row-count reconciliation for governed recommendation objects;
5. immutable-trigger, RLS, privilege, tenant-denial and audit-export checks;
6. measured RPO and RTO against the approved platform policy;
7. the actor and a `recovery_rehearsed` operational event containing only safe categorical metadata.

This live exercise cannot be marked passed until the platform RPO/RTO policy is approved. That missing authority blocks Sprint 04 production release but not S4-014 implementation or fail-safe deployment.
