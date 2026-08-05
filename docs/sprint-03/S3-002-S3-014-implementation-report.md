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

PR #46 merged as `11475df7d8b4e48a54464d499cf1c4150aacf36f`. Production preflight confirmed zero 1.0 checkouts, verified payment events and access grants. Lovable then applied the cutover and hardening separately as `20260805011743_1719b1a0-f014-4d06-9ff2-cb33c09d0d66.sql` and `20260805011812_af302d0a-a3ad-4ec6-96ae-194c80b02a16.sql`, regenerated types and synchronized commit `9776fd59f21b8403a9da5c053132b1fe14542d70`. Deployment `2fdc70bf-5772-4b6e-bf1e-54f6c9dfa287` published the final state.

Hosted Snapshot `cab3e03d-10ef-42a6-89ae-f9b659d6d0be` completed the exact 15-ID 2.0 manifest with a save-before-advance and Back/edit check. It returned the locked overall and five-domain non-numeric result after a measured 5.4-second preparation interval, exposed the accessible profile and source-caveated context, and routed “Save my Snapshot” to the approved registration boundary. Database evidence shows version/presentation `2.0.0`, 15 answered responses in order, 24-hour anonymous expiry, no linked identity or tenant and no change to the 30 assessments, three hand-offs/runs or two intelligence results. Eleven historical 1.x sessions, 66 historical responses and 96 historical funnel events remain intact. An unauthenticated checkout attempt returned 401 and all commerce tables remained empty.

Stripe credentials and the approved provider price reference remain unavailable, so checkout remains safely unavailable and an authorised purchase-to-result smoke cannot be manufactured. The hosted browser was not authenticated and its temporary 390px/1440px viewport override did not take effect; private Saved Snapshot persistence/download and paid fulfilment therefore remain externally blocked hosted checks, while their focused tenant, projection, PDF and responsive tests pass. Snapshot and all non-provider-dependent 2.0 behaviour are live.

## Delivery DNA 2.1 corrected replacement — 5 August 2026

### Customer value and corrected product model

Delivery DNA 2.1 replaces new 2.0 collection with the founder-reconciled wording while retaining the same smallest customer journey: 15-question anonymous Snapshot, Saved Snapshot, configurable £295 Overview offer, 30 supporting questions after verified payment and one bounded web/download Overview. The runtime uses exactly five domains, 15 capabilities, 45 question IDs and 180 answer anchors from DIQ-100A v2.1.1. Snapshot/supporting roles and weights are 40/30/30; the obsolete Foundation/Practice/Evidence role model is not used for 2.1. DIQ-100D changes Snapshot signal presentation only; the question set, calculation configuration, canonical content digest and £295 offer remain pinned to 2.1.0.

The deterministic catalogue validator pins the locked identity and canonical digest and checks the approved reconciliation totals: 37 exact submitted questions, four founder-approved edits, four approved new questions, 163 exact anchors, one edited anchor and 16 new anchors. No prompt or answer anchor is duplicated into presentation conditionals.

### Cutover, security and history

- New service-role-only database functions create and link only 2.1 Snapshots. Linking validates the versioned collection metadata, exact coverage, current 45-ID manifest, consent, verified identity, active membership and workspace ownership before creating an in-progress assessment with the 15 unchanged carried responses.
- The hardening migration removes service-role execution from the 1.x and 2.0 collection/link entry points while preserving their tables, rows and immutable provenance. It contains no translation, recalculation, customer DML, synthetic checkout, payment or grant.
- Existing 1.0 and 2.0 rows remain readable only under their historical rules. They cannot receive current 2.1 paid access or be analysed under 2.1. The current projection is an explicit allow-list and does not expose internal recommendation rules, success measures, raw evidence or unscheduled roadmap content.
- The versioned 2.1 offer retains the £295 one-off GBP total, £0 VAT and exact non-VAT disclosure. Verified-event fulfilment remains idempotent, exact-scope and fail-closed. Stripe activation remains paused because approved provider credentials and a price reference are unavailable.

### Verification actually run

- All 47 DIQ-100B v2.1.1 fixtures: pass, including all-equal omission, partial ties and exhaustive no-overlap coverage.
- All 10 PDR-003-004A v2.1.0 fixtures: pass.
- Historical Snapshot and all 53 DIQ-203B fixtures: pass unchanged.
- Full Vitest regression: 633/633 tests across 48 files.
- TypeScript `--noEmit`: pass.
- Changed-file ESLint and Prettier: pass.
- Migration security and privilege-shape tests: pass.
- Production Vite/Nitro client, server and scheduled-task build: pass.

### Deployment and hosted evidence

Lovable applied the cutover and hardening migrations separately as `20260805093914_149f6767-b886-4e74-85a6-f52160a6c72a.sql` and `20260805093947_cf08d7a7-1340-42aa-b0d0-75476e9c96f2.sql`, regenerated Supabase types, rebuilt successfully and published the live site. PostgreSQL rejected one unparenthesised `CASE` comparison in the supplied cutover with `42601`; the managed migration and repository source now use the minimal syntax-only correction `(CASE … END) <> 45`, with no rule or threshold change.

Production preflight and postflight preserved the three completed unlinked 2.0 Snapshots, historical content hashes and all assessment/intelligence counts. The fresh hosted 2.1 Snapshot `6af3c925-520a-43a2-9845-97934df00835` completed all 15 exact `.snapshot` IDs with 14 answered responses and one reasoned N/A. Save-before-advance, Back/edit, the 5.297-second truthful preparation screen, bounded `Established` result, five accessible domain labels, sourced calculation-neutral context and the Saved Snapshot registration boundary all passed. Cloud verification confirmed the row is pinned to configuration/presentation `2.1.0`, remains anonymous and unlinked, and created no assessment, commerce record, grant, handoff, analysis run or intelligence result.

The Product Owner accepted the Delivery DNA 2.1 wording, behaviour and hosted result but identified one presentation-only promotion blocker: Lovable's hosting-injected `Edit with Lovable` badge. The supported project publishing control `hide_badge` was changed from `false` to `true` and republished without application-code, CSP, data, migration or product-rule changes. Fresh anonymous 390×844 and 1280×1800 checks found no visible text, link, button, accessibility attribute, iframe, shadow-root element or fixed overlay containing or linking to Lovable on the Snapshot start, question, result and Saved Snapshot registration surfaces; the result had no horizontal overflow or obscured content. The focused Snapshot suite passed 45/45, type checking passed and the production build passed on production code revision `bcff163` (which contains Delivery DNA 2.1 merge `e869a589bc4d37870fc7b2d30ced621f9bf79f45`). The publishing-setting change is deployment metadata and has no separate Git revision. The live response header identifies deployment `f24031f260c322f732a0619c5c514b32fa611368b554bb2c2ce0ccdca03fd7cd`, reverified at 2026-08-05 10:09:23 UTC. Product accepted the badge remediation.

Founder-approved DIQ-100D v1.0 resolves the live-review contradiction. Signal classification now uses unrounded available domain means, strict relative-difference eligibility and the locked mean/domain-order sort, with at most two disjoint items per list. All-equal profiles return empty lists; the web and Snapshot PDF omit both sections without replacement copy. The calculation-neutral industry-context selector remains unchanged, and completed 2.1 results are safely reprojected with presentation-policy provenance `2.1.1` without mutating responses, domain means or history. New 2.1 sessions pin presentation policy `2.1.1`; the additive migration changes no customer rows.

Targeted verification passes 88/88 across the six Snapshot, journey, commerce and migration suites; all 47 locked DIQ-100B fixtures are instrumented as executed exactly by ID. The complete regression passes 636/636 across 48 files. Type checking, changed-file lint/format and the production Vite/Nitro build pass.

PR #50 merged as `e7ad4c764873a8eb876caaed5356239d195e00f5`. Lovable applied the presentation-only source migration verbatim and recorded it as `20260805110522_ae22ae9a-d335-41d2-bfd4-e587e652c2d7.sql`; RLS remains enabled and `create_delivery_dna_snapshot_v21` remains executable only by `service_role`. Production repository revision `ae20d4a9b7e46a7b8dfba68052ac8ef9a4ef8727` is live as deployment `4c46ebf8b407888d8b0550d76bb2aa744160a0e949e3d1d8fbdade4380365d73`.

Historical completed session `6af3c925-520a-43a2-9845-97934df00835` remains configuration/presentation `2.1.0`, completed, with its 15 responses and fingerprint unchanged. Its five domain means are all 3.0. The raw access token cannot be recovered from the retained SHA-256 hash, so verification did not mutate the historical row. A separate anonymous verification session replayed the identical answer set through the existing API and pinned configuration `2.1.0` / presentation `2.1.1`; the production build returned `Established`, empty positive and area lists, and omitted both sections at 390px and 1280px while retaining the five accessible domain labels, sourced Wellingtone context, caveat and Save CTA. Fresh live hosted start-page checks at both widths confirmed the Lovable badge remains absent and there is no horizontal overflow. The isolated anonymous verification Snapshot is the only new test record; no customer row was updated or deleted and no assessment, analysis, checkout, payment or grant was created. The Product Owner independently rechecked the live result and accepted the correction on 5 August 2026; the free Delivery DNA 2.1 Snapshot is authorised for customer promotion. Paid checkout remains fail-closed until its separately recorded activation evidence is available.

Provider activation and the purchase-to-result smoke remain legitimately unavailable; checkout continues to fail closed and no customer or payment evidence is manufactured.

## Delivery DNA 2.2 language and Snapshot experience — 5 August 2026

### Customer value delivered

Delivery DNA 2.2 keeps the approved five-domain, 15-capability model and improves the public Snapshot where customer language, answer-card readability, preparation feedback, interpretation and conversion clarity mattered. The question journey uses the exact DIQ-100E replacements, removes internal first-person and central-enablement language, and presents the four anchored maturity options as even cards with a distinct reason-required Not applicable action.

The preparation screen performs the real result operation behind a visible DeliveryIQ ribbon and five-domain flow, showing one truthful step at a time, completed states, the exact delayed heading and a non-animated reduced-motion alternative. The result keeps the maturity label and exact expanded interpretation together, then shows the caveat and compact Save action before the accessible profile. Domain levels are visually and textually prominent, relative positives are labelled Areas of Strength with the exact helper, industry research is separately marked as non-benchmark context, and the full Saved Snapshot panel repeats the governed action.

### Versioning, evidence and safety

- DIQ-100A v2.2.0 and DIQ-100B v2.2.0 are the minimum machine-readable successors issued under DIQ-100E. The catalogue pins configuration, question set and presentation policy 2.2.0 and retains the unchanged scoring, weight, threshold, selection, entitlement, price and payment rules.
- DIQ-204 v1.4 and DIQ-204A v1.3.0 add only the four approved contextual items, exact customer wording/source notes and deterministic per-domain selection priority. Every item remains visibly sourced and calculation-neutral.
- The additive cutover migration creates service-role-only 2.2 create/link routines and expands only governed version/provenance constraints. It contains no seed, customer migration, translation, recalculation, analysis, checkout, payment or grant data.
- Historical 1.x, 2.0 and 2.1 sessions, responses, fingerprints and provenance remain unchanged. Superseded collection entry points lose service-role execution at cutover; their immutable records remain preserved.
- Anonymous privacy, 24-hour retention, rate limiting, verified registration, explicit consent, tenant/workspace checks, idempotent linking and fail-closed commerce are unchanged.

### Verification actually run

- All 61 DIQ-100B v2.2.0 fixtures: pass by exact fixture ID, including all language, answer layout, active/reduced-motion preparation, hierarchy, clipping/zoom contract, domain accessibility, Areas of Strength, evidence mapping, CTA and version-cutover cases.
- All 53 DIQ-203B fixtures: pass unchanged.
- Targeted Delivery DNA and migration suite: 64/64 tests pass.
- Complete Vitest regression: 642/642 tests across 48 files pass.
- Type checking: pass.

### Remaining release condition

Stripe activation remains intentionally unavailable and no payment evidence was manufactured. The 2.2 free Snapshot can be merged, migrated and deployed, but active customer promotion remains paused until a fresh hosted 2.2 completion passes Product Owner visual acceptance at the required responsive sizes and text zoom. Final deployment and hosted identifiers are reported with the release hand-off rather than invented in advance.
