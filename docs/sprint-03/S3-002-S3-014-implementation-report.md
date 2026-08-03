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

## PDR-003-003 delivery update — 3 August 2026

### Customer value delivered

The application now contains the genuine Delivery DNA 1.0.0 collection journey: 39 locked questions across 13 capabilities, clear five-point response guidance, saved progress, explicit not-applicable reasons, acknowledged missing evidence, review-before-completion and direct transition to the existing Delivery Intelligence dashboard.

The legacy 16-question delivery-maturity journey is unchanged and remains terminally ineligible for Sprint 03 analysis. No evidence mapping, scoring rule or recommendation rule was invented.

### Architecture and data

- `src/lib/delivery-dna/catalogue.ts` is the single validated application adapter over the unchanged locked DIQ-203C JSON; server creation and analysis loading fail closed if its contract differs from DIQ-203A.
- Assessment sessions pin assessment, Knowledge Pack, question-set and configuration identities plus the exact 39-ID manifest and digest.
- Draft responses persist answered or not-applicable state. Completion creates explicit missing rows for every unanswered manifest entry.
- A completed `delivery-dna-collection` runtime execution supplies immutable, idempotent provenance to the existing PDR-003-001 hand-off and S3-001 analysis pipeline without invoking the legacy eight-stage questionnaire engine.
- Migrations add governed reason fields, evidence-state constraints, one-per-session collection provenance and completed-provenance immutability. A separate hardening migration removes Cloud default execution grants.

### Verification actually run

- TypeScript `--noEmit`: pass.
- Changed-file ESLint: pass.
- Changed-file Prettier: pass.
- Full regression: 572/572 tests across 44 files pass.
- Locked DIQ-203B fixtures: 53/53 pass unchanged.
- Production Vite/Nitro build: pass.
- Local browser smoke: the signed-out production shell renders the new Delivery DNA value proposition and start action with correct semantic structure.

### Deployment status and limitation

The code and migrations are ready for review and merge. The two new migrations have not been applied to Lovable Cloud, the build has not yet been published, and no real customer assessment was manufactured locally. Final hosted acceptance therefore still requires: apply both migrations in order, regenerate Supabase types, publish, and record one authorised Delivery DNA completion reaching eligible analysis and a published intelligence result. The authenticated questionnaire and narrow-screen checks must be included in that focused deployment smoke test.
