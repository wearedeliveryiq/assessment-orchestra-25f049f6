# PDR-003-001 Implementation Report

## Summary

Implements the approved automatic analysis trigger as a durable completion outbox. Assessment
completion and the outbox event commit together; analysis request and execution remain asynchronous
and independently retryable. Customers see governed preparing, processing, completed and failure
states rather than a normal-path generation button.

## Architecture and reuse

- Reuses the locked S3-001 request service, canonical normaliser, derived idempotency key, bounded
  analysis retry lifecycle, result projection and tenant authentication context.
- Adds no scoring, confidence, recommendation, traceability or presentation-layer intelligence.
- Adds an operational outbox and append-only hand-off event store containing no raw answers.
- Reuses the Cloudflare/Nitro scheduled-task contract, emitting a native one-minute cron trigger in
  the generated deployment configuration, and provides a secret-protected operational fallback.

## Data, API and UI changes

- `assessment_analysis_handoffs`: unique assessment revision/configuration/mode outbox with atomic
  claims, bounded hand-off retry and tenant scope.
- `assessment_analysis_handoff_events`: append-only safe lifecycle evidence.
- Completion trigger: enqueues only valid, non-deleted completed assessments.
- Reconciler: repairs completed assessments without a run and processes claims in bounded batches.
- `GET /api/assessments/{id}/analysis-status`: authorised safe customer lifecycle projection.
- `POST /api/assessments/{id}/analysis-retry`: authorised idempotent recovery action.
- Dashboard: polls automatically, announces status accessibly, disables repeated retry submission,
  and exposes retry only for approved states.

## Security and isolation

- Outbox tables have RLS enabled with no client policies.
- `anon` and `authenticated` have no table, sequence or function access.
- Only service-role functions can claim, complete, fail or reconcile hand-offs.
- Stored tenant scope is checked again before an analysis request is issued.
- Cross-tenant API requests retain non-leaking denial semantics.
- Events store only identifiers, versions, correlation IDs and safe error codes.

## Verification

- Unit coverage: automatic request, failure after completion, reconciliation, 15-second recovery
  threshold, cross-tenant denial, retryable failure and concurrent double-click reuse.
- Migration coverage: durable unique key, atomic claim, RLS, grants, append-only events and absence
  of canonical/raw evidence.
- Existing DIQ-203B lifecycle and idempotency regression suite remains required and unchanged.
- Production build and TypeScript checks are release gates.

## Deployment and rollback

Apply the additive migration through Lovable Cloud, regenerate types, verify the generated
one-minute cron trigger, then publish the application. Roll back application code first if
necessary; the outbox tables may remain dormant and must not be destructively removed during an
incident.

Apply `20260802150000_analysis_handoff_outbox.sql` and then immediately apply
`20260802151000_harden_analysis_handoff_permissions.sql` as a separate Lovable-managed migration.
The second migration removes Cloud platform default client grants and restores service-role-only
access before application publication.

## Known deployment gate

The production build emits `triggers.crons = ["* * * * *"]` and bundles the
`analysis:reconcile` task. The hosted deployment must retain that generated trigger; this is verified
after publish. The protected endpoint remains available for controlled operational recovery.
