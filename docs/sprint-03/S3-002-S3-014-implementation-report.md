# S3-002–S3-014 Implementation Report

## Summary

Sprint 03 now uses one versioned, deterministic Delivery Intelligence Engine for authenticated Workspace results and Delivery DNA public projections. Calculation is separate from orchestration, persistence and presentation. Completed results and trace are atomically published and immutable.

## Story evidence

- S3-002/S3-003: governed capability and confidence engines in `src/lib/delivery-intelligence/scoring.ts` and `confidence.ts`.
- S3-004–S3-008: narrative, findings, patterns, recommendations and roadmap are composed by `engine.ts` from the locked configuration.
- S3-009/S3-010: `mappings.ts` remains deterministic; `product-recommendations.server.ts` applies operational availability, organisation entitlement and accepted-recommendation controls. Analysis never activates a product.
- S3-011/S3-012: the dashboard consumes only an immutable Workspace projection and offers permission-aware trace explanations.
- S3-013: `trace-builder.ts` builds lineage during analysis and `publish_delivery_intelligence_result` publishes only validated result/trace pairs.
- S3-014: public projections use the exact deny-by-default allow-list, opaque hashed tokens, consent, expiry, rate limits, no-store responses and revocation.

## Data, API and UI changes

Migrations add immutable analysis runs, immutable results/traces, public projection/access records, governed product availability/entitlements and immutable recommendation acceptances. APIs cover run creation/status/result, explanations, recommendation acceptance, public issue/read/revoke, and latest assessment result. The Workspace dashboard displays the canonical intelligence result without recalculation.

## Security, isolation and traceability

Authenticated operations resolve organisation/workspace access before data access. Repository reads and writes bind organisation, workspace and run identifiers. Service-role-only tables have RLS enabled. Public access can retrieve only the stored allow-listed projection. Raw trace evidence is redacted unless the identity has `audit:read`.

## Test evidence

The final local regression contains 251 passing tests across 24 files, including 52/52 locked golden fixtures. Type checking, changed-file lint/format checks and the production client/server build pass.

## Limitations and technical debt

- Operational catalogue and entitlement tables intentionally ship without invented seed data; authorised operations must configure real product availability.
- Hosted database migration rehearsal, adversarial authenticated browser E2E and production latency measurement are deployment gates because local Supabase tooling/target credentials are not available in this checkout.
- Generated Supabase TypeScript types should be refreshed after migrations are applied; repository adapters temporarily isolate pending tables from generated types.

No unresolved product decision or conflict with DIQ-002/PB-003 remains.
