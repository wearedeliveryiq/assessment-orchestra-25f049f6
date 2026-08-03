# S4-010 — Outcomes and Success Measures

## Status

Implemented and deployed against the S4-010 rules preserved unchanged in locked PDR-004-001 v1.1. Local engineering gates and managed Lovable Cloud verification pass. SAR-004 v1.2 records Sprint 04 Product Acceptance with recorded limitations. Authorised export and the genuine Delivery DNA journey remain separate capability/GA gates; no recovery restore is claimed.

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

Managed deployment evidence on 3 August 2026:

- GitHub main and Lovable content identity: `00373f0a5f9f3ccfabaebd0aea0f8c900a0d350f`; Lovable recorded the generated migrations and Supabase types in `6cb567b10c93602f2dce1a7a196c731f940e6952`.
- Source `20260803150000_recommendation_outcome_measurement.sql` was applied as `20260803154536_5ab1e1a7-e982-4f1f-b201-c8f9d39402aa.sql`.
- Source `20260803151000_harden_recommendation_outcome_permissions.sql` was applied as `20260803154612_1fcc9b40-a159-404e-bdeb-d64e1819e59d.sql`.
- Source `20260803152000_enable_governed_outcome_analytics.sql` was applied as `20260803154643_2245f262-dfb5-4994-9952-2a738b21d3a1.sql`.
- Cloud-default service-role grants were narrowed in `20260803154747_f8019ceb-25b5-4393-937d-8efb166fa2f3.sql` without changing product behaviour: the four stores retain `SELECT, INSERT` only for `service_role`, while the two internal helpers are not directly executable.
- Live verification found the exact two enums, four RLS-enabled stores with zero client policies, 14 indexes, 72 constraints, five enabled triggers and seven governed routines. `PUBLIC`, `anon` and `authenticated` have no table, `MAINTAIN` or routine privileges.
- All four stores contain zero rows because production contains zero improvement actions; the bounded backfill therefore changed zero customer rows. Catalogue versions remain 3, portfolios 0, assessment sessions 27 and analysis runs 1. No analytics, feature-flag or audit-export records were manufactured.
- Lovable reran 43 test files / 564 tests, all 53 DIQ-203B fixtures, all 37 PDR-004-001 fixture IDs, type checking, changed-file lint/format, the production build, the security scan and a home-page smoke test. The build contains the one-minute reconciler; the home page returned HTTP 200; the scan reported 14 pre-existing warnings and no critical finding.

## Files

Created: `src/lib/recommendation-outcomes/*`, the two outcome API routes, outcome controls, the reconciler task, three managed migration sources and `tests/recommendation-outcomes.test.ts`.

Modified: action controls, executive experience/model, S4-013 analytics repository, S4-014 governance export model/repository/types, task registration, generated route tree and related regression tests.

## Limitations and remaining release gates

- No production observation is manufactured. Live outcome smoke requires a genuine eligible Delivery DNA recommendation action.
- Repository-wide lint debt remains the accepted SAR-004 baseline; changed files are clean.
- Authorised audit-export evidence remains an enablement gate outside S4-010, and live outcome smoke requires a genuine eligible Delivery DNA action. PB-004A/PDR-004-001 v1.1 remove the former isolated Tier 1 rehearsal requirement for the current product stage; no restore or fixed recovery objective is claimed.
