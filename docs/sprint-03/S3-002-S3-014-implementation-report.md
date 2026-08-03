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
- No real customer currently holds `delivery_dna_action` 1.0.0, so the entitled production projection and protected writes have not been smoke-tested against customer data. Automated entitlement, permission, tenant-isolation and immutability coverage passes.
- Pricing, checkout and subscription packaging remain out of scope. No commercial contact route is configured, so the approved fail-safe suppresses the contact action.

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

PRs [#35](https://github.com/wearedeliveryiq/assessment-orchestra-25f049f6/pull/35) and [#36](https://github.com/wearedeliveryiq/assessment-orchestra-25f049f6/pull/36) are merged and the application is published. Lovable Cloud applied the governed commercial, Snapshot and permission migrations as `20260803210156_e24b211a-cfcb-4c01-ae71-2844d388fadd.sql`, `20260803210314_773c6451-456e-4a8d-9c28-d136ea047810.sql` and `20260803210349_c790da9a-6d65-4a2a-a833-d399fe703d4c.sql`, regenerated Supabase types, and then applied corrective migration `20260803212556_633d7d4e-8c61-4ec3-9205-e78d09b5cc9a.sql`.

Production Snapshot `51ae3877-ee7d-4df0-a265-59473ed4c7d9` completed with the approved zero-signal presentation and no intelligence output. Its first continuation attempt exposed a JSONB parameter mismatch; the database transaction rolled back completely, leaving the Snapshot unlinked and without a partial draft. The correction serialises the numeric value with `to_jsonb(answer)` without changing product behaviour. Retrying the same explicit consent then created full Delivery DNA draft `47de0803-48e7-41ac-acda-4c97350e628d` with 13/13 exact carried responses. The draft remains `in_progress` at 13/39, with zero analysis runs and zero hand-offs.

The hosted authenticated-free result for assessment `d09c51a3-2af8-4283-9b98-4cc1d53a1c93` showed the complete free projection and exact unavailable copy. Because no commercial contact route is configured, the panel correctly contained no action element. No real customer holds the new entitlement, so an entitled production read/write smoke remains deferred until the first authorised entitlement is granted; automated policy fixtures are the current evidence. Pricing, checkout and subscription packaging remain out of scope.

Post-correction verification ran 27 focused Snapshot/commercial tests, TypeScript checking and a production build successfully. The preceding complete release regression passed 606/606 tests across 46 files, including all 53 DIQ-203B and all eight PDR-003-005A fixtures.

## PDR-003-005/A v1.1 premium Snapshot update — 3 August 2026

### Customer value delivered

The public Delivery DNA Snapshot now provides a premium, branded acquisition experience without changing the underlying 13 questions or creating intelligence. Ordinary answers save before advancing; Back/edit, explicit N/A reasoning and retry-safe failure handling remain available. Completion moves through a truthful four-to-six-second preparation state into an indicative maturity label, a 13-axis practice-signal profile, bounded positive signals and areas to explore, and the approved primary continuation journey.

### Architecture and data

- The deterministic v1.1 presentation policy is loaded from the locked machine-readable configuration. It calculates an unrounded equal-weight mean only to select the approved indicative label; the mean is never returned or displayed.
- The radar plots only the raw selected practice response for each locked capability. N/A remains null and appears as a labelled gap, with an ordered text equivalent for assistive technology and narrow screens.
- The public route uses a dedicated dark acquisition shell and imports the pinned Project Intelligence Hub mark manifests, logo/ribbon components, Manrope fonts and colour tokens rather than redrawing the brand.
- New anonymous sessions pin collection and presentation version 1.1.0. The collection version is immutable; only the approved 1.0.0-to-1.1.0 presentation transition is accepted for admissible completed historical Snapshots. Exact stored answers, timestamps, links and analysis state are untouched.
- Completion still calls only the Snapshot service. It creates no analysis run, score, benchmark, confidence, pattern, recommendation or roadmap.

### Verification actually run

- All 14 PDR-003-005A v1.1.0 fixtures: pass.
- All eight historical PDR-003-005A v1.0 fixtures: pass unchanged.
- All 53 DIQ-203B fixtures: pass unchanged.
- Focused Snapshot, journey, commercial, eligibility, hand-off, analysis and public-disclosure regression: 127/127 pass.
- Full Vitest regression: 609/609 tests across 46 files pass.
- TypeScript `--noEmit`: pass.
- Changed-file ESLint and Prettier: pass.
- Production Vite/Nitro client/server build: pass.

### Limitations

Pricing, checkout and subscription packaging remain out of scope. The existing pre-first-entitlement activation condition for `delivery_dna_action` 1.0.0 is unchanged. No Snapshot result is presented as a complete Delivery DNA diagnosis or comparative benchmark.
