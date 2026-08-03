# S4-010 — Product-rule blocker

## Status

Implementation is isolated pending a locked Product Owner decision. S4-011 and every other independent Sprint 04 story continue.

## Confirmed authority gap

PB-004 v1.0 requires deterministic outcome states and tests for all four directions, target boundaries and late observations. It names `increase`, `decrease`, `maintain` and `binary`, and says target achievement depends on the configured direction and date policy. No locked authority defines:

1. whether `maintain` means exact equality, an inclusive range or a tolerance around a target;
2. the tolerance/range representation and boundary behaviour if `maintain` is not exact equality;
3. which observation date controls achievement when observations are late or backdated;
4. when a missed target date produces `target_not_met`, including whether a later satisfying observation may restore `target_met`;
5. the interaction between cadence, target date and superseding correction observations.

These values materially determine customer-visible outcome status. Engineering will not infer them from ordinary terminology or encode illustrative fixtures as production rules.

## Product decision required

A locked decision should define the exact comparison formula and inclusive/exclusive boundaries for every direction, plus a deterministic date-policy state table covering on-time, late, missing and superseding observations. It should also provide golden fixtures for each boundary.

## Safe work completed

Applicable architecture, catalogue, action and playbook sources were inspected. No S4-010 schema, API, calculation or customer UI has been introduced, so no speculative rule can reach a customer. S4-009 retains the catalogue outcome and success-measure text required by S4-010 AC1, but this is not claimed as S4-010 completion.
