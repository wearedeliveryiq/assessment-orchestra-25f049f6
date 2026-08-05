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
- PDR-003-004/A v1.1 supersedes the earlier no-checkout position with a configurable one-off Overview checkout. Live activation remains fail-closed until approved provider credentials, price reference, webhook secret and checkout tax/legal settings are configured.

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

This section records the v1.1 Snapshot release position before the later PDR-003-004/A v1.1 commercial journey. The current commercial position is recorded below. The existing pre-first-entitlement activation condition for `delivery_dna_action` 1.0.0 is unchanged. No Snapshot result is presented as a complete Delivery DNA diagnosis or comparative benchmark.

## PDR-003-004/A v1.1 Saved Snapshot and Overview update — 4 August 2026

### Customer value delivered

The live Snapshot remains unchanged. After verified registration and explicit consent, a customer now receives a Saved Snapshot rather than immediate access to the remaining assessment. The Saved Snapshot presents the active, versioned £295 one-off Delivery DNA Overview offer. A verified purchase unlocks the existing remaining 26 questions; completion uses the unchanged deterministic engine and produces a premium bounded web Overview and board-ready downloadable report from one immutable result.

The Overview provides capability scores and bands, evidence confidence and limitations, up to five strengths and five priority opportunities, the top three approved recommendations and a maximum-three 30/60/90-day direction. Materially relevant DIQ-204A-approved context may be shown with publisher, year, source and caveats. It has no scoring, confidence, ranking, benchmark, prediction or causality effect. Delivery DNA Action, Knowledge Packs and TeamMates remain separate and unavailable.

### Architecture, commerce and data integrity

- PDR-003-004A is loaded and fail-closed by one versioned server offer service. Checkout, payment and grant rows pin the offer ID/version, amount, currency and deployment price reference.
- Checkout scope binds one verified purchaser, organisation, workspace, Saved Snapshot and linked Delivery DNA assessment. The database revalidates the link and active membership.
- Access is granted only inside an idempotent atomic database function after a recent provider-signed event matches paid status, provider, offer, price, currency and every scope identifier. Redirects and browser input never grant access.
- New post-cutover Saved Snapshots are gated on every remaining-assessment read/write and Overview/API/report read. One existing genuine pre-cutover linked draft remains accessible from its immutable `linked_at`; no synthetic grant or customer evidence is created.
- Payment events and grants are append-only, service-role-only and RLS deny-by-default. The report endpoint is authenticated, tenant-scoped, no-store and uses the same server projection as the web result.
- The two migrations contain no seed or customer DML. They add checkout, verified-event and access-grant records plus Cloud permission hardening.

### Verification actually run

- All 11 PDR-003-004A fixtures: pass.
- Existing PDR-003-005A v1.0/v1.1 and all 53 DIQ-203B fixtures: unchanged regression coverage.
- Focused unit/integration checks cover offer resolution, exact copy, linked-Snapshot gating, signature verification, event freshness, wrong price/currency/scope, replay, cross-tenant denial, historical price pinning, bounded projection and web/PDF reconciliation.
- The generated seven-page A4 report passed text extraction and rendered-page visual inspection with no clipping or overlap.
- Type checking, changed-file lint/format and the production build passed. The complete regression passed 616/616 tests across 47 files, including all locked DIQ-203B and Snapshot fixtures.

### Activation limitation

No approved Stripe deployment configuration is currently present. The implementation requires `DELIVERYIQ_PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and `DELIVERYIQ_OVERVIEW_STRIPE_PRICE_ID`. Until those are configured with the approved £295 price, the purchase action is unavailable with safe copy, no checkout is created and no access can be granted. PDR-003-004/A v1.2/v1.0.1 now lock the launch tax position separately: £0 VAT and a £295 customer total. After configuration, one authorised purchase-to-result hosted smoke must verify payment, unlock, completion, immutable Overview web/PDF reconciliation and denied cross-tenant access. No customer payment or grant was manufactured for evidence.

## PDR-003-004/A non-VAT offer update — 4 August 2026

PDR-003-004 v1.2 and PDR-003-004A v1.0.1 promote the existing Overview offer without changing its ID, product/access scope or £295 price. The versioned server offer now pins a £295 subtotal, £0 VAT and £295 GBP customer total with the exact disclosure “No VAT charged — DeliveryIQ is not VAT registered.” The Saved Snapshot offer and hosted Checkout use that server value; automatic provider tax and tax-ID collection are disabled.

Checkout, verified-event and immutable access-grant evidence retain the offer version, provider price reference, subtotal, VAT, customer total, currency, tax status, tax policy and customer disclosure. The webhook grants only when the provider-signed event reports subtotal 29500, tax 0 and total 29500 GBP and every existing purchaser/tenant/workspace/Snapshot/assessment field matches. The legacy v1.0.0 fulfilment function remains available only for already-created historical events; new checkout creation uses the v1.0.1 function, so a future tax change requires a new version without rewriting history.

The 12th locked fixture `non_vat_registered_checkout_total` and implementation-specific wrong-VAT/total checks pass alongside the original 11 fixtures and unchanged DIQ-203B regression. The complete regression passed 616/616 tests across 47 files; TypeScript checking, changed-file lint/format and the production build also passed. The two additive migrations contain no seed, customer or grant data. Live checkout remains fail-closed until the four approved Stripe settings are configured and the authorised purchase-to-result smoke in the existing runbook is completed.

## Delivery DNA 2.0 clean replacement — 5 August 2026

### Customer value delivered

The customer journey now starts with the exact 15 Practice questions across five domains, provides a non-numeric indicative result and allows the customer to save, privately return to and download that same Snapshot. A verified £295 purchase will open the remaining 30 exact Foundation/Evidence questions and produce the complete 45-question Delivery DNA Overview. The home and ineligible-result entry points no longer start a 1.0 assessment.

The Overview is one bounded decision product: overall and five-domain position, all 15 capabilities, evidence confidence and limitations, strengths, opportunities, eligible cross-domain patterns, top three recommendations, 30/60/90 direction, explainability and visibly sourced calculation-neutral context. The web experience and report use the same immutable server projection. Perspectives, Action, progress tracking, Knowledge Packs, TeamMates and Enterprise packaging are not introduced.

### Implementation and safety

- `catalogue-v2.ts`, `snapshot-v2.ts`, `analysis-v2.ts` and `context-v2.ts` are deterministic adapters over unchanged locked configuration. DIQ-100A's exact file digest is pinned centrally on every 2.0 run and result.
- Anonymous Snapshot state remains opaque-token based and contains no PII. Saving requires verified identity, explicit consent and a matching organisation/workspace. Linked Snapshot reads and PDF downloads reverify all three scopes and do not rely on the former anonymous token.
- The paid boundary reuses the existing fail-closed Stripe foundation, now pinned to offer/access 2.0.0. It validates signature freshness, paid status, £295 subtotal, £0 VAT, £295 total, GBP and the exact purchaser/tenant/workspace/Snapshot/assessment scope before one idempotent grant.
- The complete assessment records evidence recency and perspective-breadth declarations, preserves exact carried responses/timestamps/status/provenance and uses the shared immutable hand-off and publication pipeline. The legacy Sprint 04 recommendation pipeline is not duplicated for 2.0.
- The cutover migration preserves historical 1.x rows, accepts only the exact 15-ID 2.0 Snapshot manifest and 1–4 answers for new sessions, disables new 1.0 Snapshot creation and derives the 2.0 analysis configuration from session metadata. It contains no translation, recalculation, synthetic payment or access grant.

### Verification

- All 43 DIQ-100B fixtures and all nine PDR-003-004A fixtures execute unchanged.
- Historical DIQ-203B and PDR-003-005A regression remains separate and passing; no 1.0 rule is imported into 2.0.
- Focused tests cover N/A/missing, exact threshold boundaries, availability, population-SD consistency, confidence, finding thresholds/ties, positive/negative pattern cases, exclusions, ranking/deduplication, roadmap dependencies/capacity/cycles, context isolation, Snapshot/Overview allow-lists, full lineage, clean cutover, tenancy, immutability, payment denial/idempotency and web/PDF reconciliation.
- Full regression: 630/630 tests across 48 files. TypeScript checking, changed-file ESLint/Prettier and the production client/server build pass.

### Deployment and limitation

The application and migrations are ready for the established Lovable-managed deployment path. Before live cutover, production must confirm there are still zero paid 1.0 customers/checkouts/grants; if that fact changed, only preservation of that access requires a migration decision. Stripe credentials and the approved provider price reference are not present locally, so checkout remains safely unavailable and the authorised purchase-to-result smoke cannot be manufactured. Snapshot, Saved Snapshot and all non-provider-dependent behaviour remain deployable and useful.
