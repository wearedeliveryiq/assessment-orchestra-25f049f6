# S3-001 — Assessment Analysis Pipeline

## Purpose

This boundary converts a completed, tenant-scoped assessment into an immutable canonical input for later Delivery Intelligence stages. It validates and normalises evidence only. It does not calculate scores, recommendations, or narratives.

## API

Both endpoints require a bearer token plus `x-organisation-id` and `x-workspace-id` headers. The session must belong to the authenticated user and selected tenant.

- `POST /api/assessments/{sessionId}/analysis` validates and creates the run. Repeating an identical request returns the existing run.
- `GET /api/assessments/{sessionId}/analysis` returns the most recent run, or `null`.

Errors use `{ "error": string, "code": string }`. Expected codes include `assessment_not_completed`, `assessment_incomplete`, `completed_execution_required`, `knowledge_pack_invalid`, and `tenant_mismatch`.

## Data model

`assessment_analysis_runs` is append-only and protected by a database trigger against update or delete. Each row stores:

- the assessment, runtime execution, organisation, workspace, and creator IDs;
- the exact Knowledge Pack ID and version used by the completed execution;
- canonical schema and model versions;
- a SHA-256 input hash and unique idempotency key;
- the ordered canonical response collection; and
- completion and creation timestamps.

The idempotency key is derived from session ID, Knowledge Pack ID/version, analysis model version, and canonical input hash. A changed controlled input or model version therefore creates a new immutable run; an identical request reuses the original.

## Canonical input

Responses are selected from the pinned Knowledge Pack question contract and ordered by question ID. Volatile fields such as save timestamps and notes are excluded. Tenant IDs, session completion time, assessment type, pack version, response values, and numeric scores are retained.

## Events

The existing audit pipeline receives structured `analysis.started`, `analysis.completed`, `analysis.reused`, and `analysis.failed` lifecycle events. Completed events include the run ID, runtime execution ID, pack version, input hash, and response count.

## Architectural boundary

The run is the evidence handoff described by DIQ-200 and DIQ-202. Downstream stories may consume it, but S3-001 imports no scoring, recommendation, narrative, dashboard, Knowledge Pack recommendation, or TeamMate services.
