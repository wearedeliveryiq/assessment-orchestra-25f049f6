# S4-013 — Recommendation Analytics and Learning Signals

## Status

Implemented on `agent/s4-013-recommendation-analytics`. Application, migration-contract and targeted verification are complete; managed migration execution, regenerated live types, publish and authenticated live smoke remain deployment gates.

S4-013 changes no recommendation rule, score, confidence, rank, catalogue definition or generated/customer state. PDR-004-001 now governs S4-010, and the remediation captures `outcome_observed` only from a governed tenant-owned observation under existing consent; failure remains non-blocking.

## Architecture and reuse

- Reuses authenticated tenant context, current RBAC permissions, the existing service-role repository pattern, semantic hashing and platform retention runner.
- Adds one versioned allow-list shared by client/server validation and a matching database enum/check contract. Unknown objects, properties and categorical values fail closed.
- Stores an HMAC-SHA-256 pseudonym scoped by organisation and actor; the user ID is used transiently for server/database authorisation and is not persisted in the analytics event.
- Requires the latest append-only consent event to be `granted` at capture time. Withdrawal stops collection immediately.
- Revalidates every source object against organisation and workspace in application code and in the database security-definer routine.
- Uses immutable event IDs and semantic request hashes for deterministic replay. Analytics capture is non-blocking for customer workflows and logs only safe categorical failure metadata.
- Exposes only cohort aggregates containing at least 10 distinct organisations. Analytics has no write path to catalogue or rule objects.

## Application, API and UI

- `GET/POST /api/recommendation-analytics/consent` reads or appends the current explicit choice.
- `POST /api/recommendation-analytics/events` accepts only the approved schema and returns `202`; missing consent returns a non-error `consent_required` outcome.
- `GET /api/internal/recommendation-analytics` requires `recommendation:govern` and returns privacy-thresholded aggregate rows for a bounded reporting window.
- The portfolio experience explains collection in plain language, provides grant/withdraw controls, sends a deduplicated portfolio-view signal, records explanation opens and offers a categorical useful/not-useful control.
- Decision, action and consumed Pack/TeamMate hand-off signals are emitted server-side from the authoritative successful workflow response. Analytics failure cannot roll back those workflows.

## Data and security

- Adds append-only `recommendation_analytics_consent_events` and immutable `recommendation_analytics_events`.
- RLS is enabled with zero client policies. `anon`, `authenticated` and `PUBLIC` privileges are revoked; only `service_role` can read and execute governed routines.
- Direct event update/delete is rejected. The existing retention engine can archive or purge bounded expired analytics rows through a session-guarded routine.
- No raw answers, notes, evidence, free text, secrets, prompts, customer narrative or internal rules are accepted or logged.
- Cross-tenant product reporting is enforced in SQL at a minimum cohort of 10 tenants and repeated defensively in the service.

## Acceptance evidence

- AC1: exact ten-event and per-event property allow-list is enforced in TypeScript and PostgreSQL; all ten contracts are executable tests.
- AC2: unknown/free-text/raw-answer/note/evidence/secret fields fail before persistence; database properties are exact categorical objects.
- AC3: event ID plus semantic request hash returns an exact existing event on replay and rejects conflicting payload reuse.
- AC4: decision/action/handoff integrations use the safe capture adapter; failure is caught and cannot alter the source workflow.
- AC5: aggregate SQL omits cohorts below 10 organisations; service rejects a nonconforming repository response.
- AC6: no analytics module references catalogue transition or product-rule writes; the UI explicitly states that analytics never changes rules automatically.

## Verification

- Targeted S4-013 allow-list, prohibited-data, consent, idempotency, tenant, outage, cohort, migration, UX and performance tests: 20 passed.
- Ten thousand schema validations completed inside the one-second guard.
- Full regression: 41 files / 511 tests passed, including all 53 DIQ-203B fixtures.
- Type checking, changed-file ESLint/Prettier and the production build passed.
- Full-repository lint remains inherited debt: 613 errors and 15 warnings outside the S4-013 changed-file gate.

## Privacy and security review

- Data minimisation: event properties are categorical and exact; no arbitrary JSON is accepted.
- Pseudonymisation: HMAC is tenant-specific and cannot be reversed from the stored event.
- Consent: off by default, versioned, current-state checked atomically at capture and immediately withdrawable.
- Isolation: tenant scope, active membership, workspace ownership, source existence and consent are checked in both service and database boundaries.
- Disclosure: product aggregate contains only event type, mode, categorical properties and counts after the 10-tenant threshold.
- Logging: non-blocking errors omit payloads and identifiers; only event/object category and safe error class are logged.
- Change control: no automated rule, catalogue or recommendation update path exists.

## Files created

- `src/lib/recommendation-analytics/{model,types,pseudonym.server,repository.server,service.server,http.server,client}.ts`
- `src/routes/api/recommendation-analytics.consent.ts`
- `src/routes/api/recommendation-analytics.events.ts`
- `src/routes/api/internal/recommendation-analytics.ts`
- `supabase/migrations/20260803130000_recommendation_analytics.sql`
- `supabase/migrations/20260803131000_harden_recommendation_analytics_permissions.sql`
- `tests/recommendation-analytics.test.ts`
- `docs/sprint-04/S4-013-data-dictionary.md`
- `docs/sprint-04/S4-013-deployment-runbook.md`

## Files modified

- recommendation portfolio experience, decision/action/handoff HTTP services, platform retention integration, generated route tree, Sprint 04 acceptance matrix.

## Known limitations and technical debt

- `outcome_observed` cannot persist until S4-010 supplies an approved tenant-owned outcome record. The schema contract remains tested and capture is deliberately fail-closed.
- A live cross-customer 10-tenant aggregate must not be manufactured; deployment verification uses schema inspection and automated fixtures unless sufficient genuine consented tenants exist.
- The first genuine eligible production Delivery DNA portfolio remains the prerequisite for the complete live recommendation journey.
- Existing repository-wide lint debt remains outside this story; changed files must remain clean.

## Product decisions required

None for S4-013. The separate locked S4-010 outcome/date-policy definition remains outstanding.
