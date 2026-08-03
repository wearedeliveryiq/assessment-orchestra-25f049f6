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

The current local regression contains 606 passing tests across 46 files, including 53/53 locked golden fixtures. Type checking, changed-file lint/format checks and the production client/server build pass.

## Limitations and technical debt

- Operational catalogue, availability and entitlement tables intentionally ship without invented commercial seed data; authorised operations must configure real product availability.
- The new PDR-003-004/005 migration rehearsal and focused hosted journeys remain deployment gates because local Lovable Cloud credentials are not exposed to this checkout.
- Generated Supabase TypeScript types must be refreshed by Lovable after the new migrations are applied; repository adapters isolate pending fields until then.

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

### Hosted evidence

The genuine production journey is now verified. Session `d09c51a3-2af8-4283-9b98-4cc1d53a1c93` completed automatically through eligibility and the durable hand-off into run `0958ab19-814e-4de1-beb6-2d13dc7530e3`. The run completed on its first analysis attempt and published one immutable result, 64 trace nodes and 259 trace edges. No user retry event exists.

## PDR-003-004/005 delivery update — 3 August 2026

### Customer value delivered

DeliveryIQ now has a low-friction public **Delivery DNA Snapshot** entry journey and a clear free-versus-entitled result boundary. A visitor can answer the exact 13 existing practice questions without an account or PII, receive the approved directional view, then create and verify an account and explicitly carry the same responses into the remaining 26-question Delivery DNA Assessment. Authenticated free users receive a useful complete capability profile, bounded recommendations and roadmap preview; `delivery_dna_action` entitlement unlocks the existing full improvement workflow without recalculating the result.

### Architecture and data

- Snapshot calculation is a small deterministic presentation policy over raw 1–5 responses. It does not invoke or duplicate the Delivery Intelligence Engine.
- Anonymous state uses a 256-bit opaque token held in an HTTP-only SameSite cookie; the database stores only its SHA-256 hash. RLS is deny-by-default and client roles receive no table, sequence or function grants.
- Unlinked responses expire after exactly 24 hours and are removed by a bounded hourly cleanup. Funnel events contain only an approved event name, optional step number and timestamp.
- Continuation is one atomic tenant-scoped operation requiring a verified user and explicit consent. It preserves IDs, values, evidence status/reason and original timestamps with immutable provenance, creates only an in-progress full draft and requests no analysis.
- Commercial access reuses the existing product availability and organisation entitlement boundary. Availability, entitlement version/window/revocation, tenant/workspace and existing user permission are evaluated independently for every protected read or mutation.
- The complete recommendation portfolio remains generated and persisted independently of access tier. Projection and workflow authorisation are the only commercial differences.
- Production preflight found zero existing customer decisions, actions or outcomes; no grandfathering insert is required or included.

### Verification actually run

- Full Vitest regression: 606/606 tests across 46 files pass.
- Locked DIQ-203B regression: 53/53 fixtures pass unchanged.
- Locked PDR-003-005A regression: 8/8 fixtures pass.
- TypeScript `--noEmit`: pass.
- Changed-file ESLint: pass after clearing one local hook dependency warning.
- Changed-file Prettier: pass.
- Production Vite/Nitro client/server build: pass, including the hourly Snapshot cleanup task.
- Focused security checks cover client grant revocation, RLS, exact token hashing, expiry, analytics exclusion, tenant/workspace membership, idempotent linking, free-field leakage and all paid API guards.

### Deployment status and limitations

The application changes and three new managed-migration source files are ready to merge. Lovable Cloud must apply the migrations in timestamp order, regenerate generated Supabase types and publish the build. Final hosted evidence must then record one anonymous Snapshot completion and one consented continuation into a 13-response full draft, plus free and unavailable commercial projections. No commercial contact route is configured, so the locked fail-safe behaviour suppresses the `Talk to DeliveryIQ` action. Pricing, checkout and subscription packaging remain out of scope.
