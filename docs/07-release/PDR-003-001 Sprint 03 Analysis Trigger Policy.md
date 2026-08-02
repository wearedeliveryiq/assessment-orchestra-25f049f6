# PDR-003-001 — Sprint 03 Analysis Trigger Policy

| Control                  | Value                                        |
| ------------------------ | -------------------------------------------- |
| Decision ID              | PDR-003-001                                  |
| Version                  | 1.0                                          |
| Status                   | **APPROVED**                                 |
| Sprint                   | Sprint 03                                    |
| Decision owner           | Product Owner                                |
| Approved by              | Product Owner                                |
| Decision date            | 2 August 2026                                |
| Implementation authority | PB-003, DIQ-203, DIQ-203A, and this decision |

## Decision

Delivery Intelligence analysis starts automatically after an assessment reaches a valid completed state.

The normal customer journey must not require a “Generate intelligence” button. An explicit, idempotent retry action is shown only when automatic processing has failed or the completion-to-analysis hand-off is confirmed missing.

## Rationale

- Intelligence is the expected outcome of completing an assessment, not a separate optional task.
- Automatic execution removes an unnecessary step and reduces abandonment.
- The locked S3-001 idempotency contract makes repeated requests safe.
- A visible retry action gives customers a controlled recovery path without exposing job mechanics.

## Approved Behaviour

### Automatic trigger

1. The server commits the assessment completion and immutable assessment revision.
2. After the completion transaction succeeds, a durable completion event or outbox record requests analysis for that exact tenant, workspace, assessment ID, revision, configuration set, and requested mode.
3. The analysis service derives or verifies the DIQ-203 idempotency key and creates or reuses the corresponding run.
4. Duplicate completion events, page refreshes, retries, and concurrent requests must reuse the same analysis run.
5. Analysis must never start for an incomplete, invalid, unauthorised, or unversioned assessment.
6. Failure to enqueue analysis must not roll back a successfully completed assessment. It must create an observable, retryable hand-off failure and be recovered by the worker/reconciler or authorised retry action.

### User experience

| Condition                                                                     | Customer experience                                                                            | Available action                                     |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Assessment completion is being committed                                      | “Completing your assessment…”                                                                  | None                                                 |
| Completed; automatic request not yet visible within normal propagation window | “Preparing your Delivery Intelligence…”                                                        | None initially                                       |
| Analysis queued or running                                                    | “Analysing your Delivery DNA…” with progress-safe status copy                                  | Refresh/poll automatically; no generate button       |
| Analysis completed                                                            | Navigate to or display the Delivery Intelligence result                                        | View result                                          |
| Analysis failed and is retryable                                              | Safe failure copy: “We couldn’t generate your Delivery Intelligence. Your assessment is safe.” | **Retry analysis**                                   |
| Analysis failed and is not retryable                                          | Safe failure copy and support route                                                            | Contact support; retry only if server policy permits |
| Completed assessment has no run after the approved recovery timeout           | Safe hand-off failure copy                                                                     | **Retry analysis**                                   |

The dashboard text “No analysis result is available yet” must not be the terminal state for a completed valid assessment. It may appear only for users without a completed assessment or as internal diagnostic copy, not as the primary completed-assessment experience.

### Retry contract

- Button label: **Retry analysis**.
- Retry calls the same authorised analysis-request contract used by automatic execution.
- Retry supplies or derives the same canonical idempotency key for the assessment revision and configuration set.
- Repeated clicks are disabled while the request is in flight and cannot create duplicate runs.
- If a queued, running, or completed run already exists, retry returns/reuses it and the UI moves to the corresponding state.
- A failed retry leaves the assessment intact and shows safe, non-technical error copy plus correlation/support reference where permitted.
- Retry is available only to a user authorised to request analysis for that tenant/workspace assessment.

### Recovery timing

- UI polling begins after completion and uses bounded backoff.
- Approved propagation window before exposing retry for a missing hand-off: 15 seconds.
- The server-side reconciler checks completed assessments without an analysis run at least once every 60 seconds.
- Automatic worker retry remains governed by DIQ-203: maximum three total attempts with 5-second then 30-second backoff for retryable execution failures.
- The retry button may appear immediately for a terminal retryable failed run; it does not wait for the missing-hand-off timeout.

### Observability and audit

Record tenant-safe structured events for completion committed, analysis requested, request reused, hand-off failed, reconciliation requested, user retry requested, retry reused, analysis started, completed, and failed. Include assessment revision, configuration set, analysis run ID when known, correlation ID, and safe error code. Do not log raw answers or secrets.

Alert on:

- completed assessments lacking a run for more than 60 seconds;
- repeated hand-off failures;
- retry failure rate above the operational threshold;
- duplicate-run integrity violations;
- tenant-scope or authorisation denial anomalies.

## Acceptance Criteria

1. Completing a valid assessment automatically creates or reuses one analysis run without user action.
2. Duplicate completion events and concurrent retries create no duplicate run.
3. The UI displays preparing, queued/running, completed, retryable failure, and non-retryable failure states accurately.
4. No normal-path “Generate intelligence” button is displayed.
5. “Retry analysis” appears only for retryable failure or a missing hand-off after 15 seconds.
6. Retry is authorised, idempotent, double-click safe, and reuses queued/running/completed runs.
7. Assessment completion remains committed if analysis hand-off fails.
8. Reconciliation repairs completed assessments with a missing run.
9. Tenant isolation, disclosure, event redaction, accessibility, and existing DIQ-203 lifecycle rules pass.
10. End-to-end test proves: complete assessment → automatic analysis → result displayed.

## Required Tests

- Automatic happy path.
- Completion event delivered twice.
- Concurrent completion and user retry.
- Enqueue/outbox failure after completion.
- Reconciler recovery.
- Retryable worker failure and button retry.
- Non-retryable failure.
- Existing queued, running, completed, and failed run reuse.
- Cross-tenant and unauthorised retry denial.
- Page refresh and browser back/forward during processing.
- Accessible status announcements, keyboard operation, disabled double-submit, and safe error copy.
- Regression of all DIQ-203B lifecycle/idempotency fixtures.

## Alternatives Rejected

### Explicit “Generate intelligence” as the normal path

Rejected because it adds avoidable friction, makes the assessment appear complete before its promised value is delivered, and creates a misleading optional boundary between assessment and intelligence.

### Synchronous analysis inside the completion request

Rejected because DIQ-203 approves asynchronous execution only; synchronous calculation increases latency and couples assessment durability to analysis availability.

## Change History

| Version | Date          | Change                                                              | Approval      |
| ------- | ------------- | ------------------------------------------------------------------- | ------------- |
| 1.0     | 2 August 2026 | Approved automatic analysis trigger and idempotent failure recovery | Product Owner |

---

**End of PDR-003-001 v1.0 — APPROVED**
