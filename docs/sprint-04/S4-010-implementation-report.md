# S4-010 — Outcomes and Success Measures

## Status

Implemented against locked PDR-004-001 v1.0. Local engineering gates pass. The three additive Lovable Cloud migrations and live verification remain deployment gates until this branch is merged.

## Architecture and reuse

- Reuses the immutable S4-007 recommendation portfolio and S4-009 improvement action as the governed source. Each action snapshots the catalogue outcome, success-measure templates, catalogue version and digest once.
- Adds a deterministic, presentation-independent outcome evaluator using canonical decimal strings and integer arithmetic. No JavaScript floating-point value or display-rounded value participates in a decision.
- Keeps measurement configuration, observations and append-only status history as audited customer overlays. Published recommendation, scoring, confidence and portfolio records are never mutated.
- Reuses authenticated request context, existing RBAC, service-role repositories, semantic hashes and S4-014 audit/export boundaries.

## Product behaviour

- `increase` passes at `actual >= target`; `decrease` at `actual <= target`; `maintain` inside the inclusive `target ± absolute tolerance`; `binary` by exact Boolean equality.
- Missing numeric baselines fail closed. A baseline without a later qualifying observation is `baseline_recorded`; before-deadline misses are `tracking`; deadline misses are `target_not_met`.
- The target date is resolved to its final instant using a snapshotted IANA time zone. Evidence timing uses `effectiveAt`; the immutable record also retains `recordedAt`.
- Late satisfying evidence restores `target_met` with `satisfactionTiming=late` while `deadlineWasMissed=true` remains visible. Later regression returns the current status to `tracking` or `target_not_met` without removing prior history.
- Corrections append a same-tenant, same-measure superseding observation with a mandatory reason. Branches, cycles and cross-scope supersession fail closed. Only terminal leaves participate and ties use effective time descending, recorded time descending, then observation ID ascending.
- Customer and executive projections use the locked status copy and association-only notice. Audit projection includes versions, source references, observations and status events, but still excludes prohibited raw product rules and unrelated customer data.

## Data, API and operations

- `recommendation_action_outcomes` — immutable action/catalogue snapshot.
- `recommendation_outcome_measure_versions` — immutable typed measure versions and retired versions.
- `recommendation_outcome_observations` — immutable, idempotent evidence and correction links.
- `recommendation_outcome_status_events` — append-only current-state history.
- `GET/POST /api/improvement-actions/:id/outcomes` reads, configures, versions and retires measures.
- `POST /api/outcome-measures/:id/observations` records evidence or a superseding correction.
- `recommendation-outcomes:reconcile` evaluates bounded current measures every minute so deadline transitions are recorded even without a user request.
- Outcome observations feed S4-013 analytics only through the existing consented categorical `outcome_observed` event. S4-014 exports validate and project the governed outcome snapshot, versions, observations and status history.

## Security and isolation

- Every request rechecks `assessment:read`; mutations require `workspace:manage`.
- Repository lookups and all database routines require matching organisation, workspace, active actor membership and, where applicable, active accountable-owner membership.
- RLS is enabled with no client policies. `PUBLIC`, `anon` and `authenticated` are revoked from tables, sequence, helper and mutation routines, including `MAINTAIN`; only governed server routines retain service-role access.
- Immutable triggers reject update/delete on all four stores. Advisory locks, optimistic versions, semantic idempotency hashes and observation-count preconditions protect retries and concurrency.

## Acceptance and test evidence

`tests/recommendation-outcomes.test.ts` executes all 37 mandatory PDR-004-001 Section 10 fixtures by exact ID:

`out_inc_equal`, `out_inc_below`, `out_inc_above`, `out_dec_equal`, `out_dec_above`, `out_dec_below`, `out_maintain_lower_equal`, `out_maintain_upper_equal`, `out_maintain_below`, `out_maintain_above`, `out_maintain_zero_tolerance_equal`, `out_maintain_zero_tolerance_diff`, `out_binary_match`, `out_binary_miss`, `out_numeric_missing_baseline`, `out_baseline_no_observation`, `out_before_deadline_miss`, `out_deadline_no_observation`, `out_deadline_boundary_met`, `out_late_miss`, `out_late_met`, `out_late_restore`, `out_post_met_regression`, `out_recorded_late_effective_on_time`, `out_supersede_fail_with_pass`, `out_supersede_pass_with_fail`, `out_supersede_chain`, `out_supersede_cycle`, `out_supersede_branch`, `out_decimal_no_display_round`, `out_equal_effective_order`, `out_idempotent_replay`, `out_conflicting_replay`, `out_cross_tenant`, `out_unauthorised_actor`, `out_retired`, and `out_association_copy`.

The same suite adds decimal-scale rejection, invalid time-zone/date, supersession, semantic replay, stale/concurrent write, tenant/RLS/ACL source-contract, accessibility, task cadence and 10,000-evaluation performance coverage. Recommendation governance, analytics and executive-experience regression tests verify outcome export, consented capture and reporting.

Local evidence on 3 August 2026:

- 43 test files / 564 tests passed, including all 53 unchanged DIQ-203B fixtures and all 37 PDR-004-001 fixtures.
- TypeScript static checking passed.
- ESLint passed on every changed TypeScript/TSX file.
- Prettier passed on supported changed files; SQL is not supported by the repository Prettier configuration.
- Production client, server and scheduled-task build passed; the outcome reconciler artifact is present.
- `git diff --check` passed.

## Files

Created: `src/lib/recommendation-outcomes/*`, the two outcome API routes, outcome controls, the reconciler task, three managed migration sources and `tests/recommendation-outcomes.test.ts`.

Modified: action controls, executive experience/model, S4-013 analytics repository, S4-014 governance export model/repository/types, task registration, generated route tree and related regression tests.

## Limitations and deployment gate

- No production observation is manufactured. Live outcome smoke requires a genuine eligible Delivery DNA recommendation action.
- Migrations `20260803150000`, `20260803151000` and `20260803152000` require Lovable-managed application and post-migration RLS/ACL/type verification after merge.
- Repository-wide lint debt remains the accepted SAR-004 baseline; changed files are clean.
