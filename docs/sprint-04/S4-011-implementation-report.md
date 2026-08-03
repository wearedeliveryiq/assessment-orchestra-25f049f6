# S4-011 — Knowledge Pack and TeamMate Hand-offs

## Status

Implemented on `agent/s4-010-outcomes-success-measures`. Application verification is complete; Lovable-managed migration execution and live schema verification remain deployment gates.

S4-010 is independently blocked by the missing locked outcome/date-policy definitions recorded in `S4-010-product-rule-blocker.md`. S4-011 does not depend on those undefined calculations.

## Architecture and reuse

- Reuses the exact DIQ-203A mapping functions in `src/lib/delivery-intelligence/mappings.ts`; no Pack or TeamMate mapping is copied into a presentation layer.
- Resolves five separate server-owned states: domain eligibility, operational availability with an exact target version, tenant entitlement, current actor permission and tenant activation state.
- Reuses the S4-008 accepted decision and S4-009 source action. TeamMate activation review is unavailable unless the mapped recommendation remains accepted.
- Uses the existing authenticated tenant request context and current RBAC permissions. `assessment:create` controls an entitled Pack assessment start; `teammate.activate` controls TeamMate activation review. Unentitled active products retain only their locked view CTA.
- Introduces a ten-minute HMAC-protected, single-purpose token. Only its SHA-256 hash is stored, it is never placed in a URL, and both application and database recheck tenant membership, source action, target availability, exact version and entitlement at consumption.
- No application or database path activates a product. The activation table is a service-only operational read model used solely to distinguish already-active products.

## Data and audit model

`delivery_product_availability.product_version` identifies the exact active operational target. Existing rows remain nullable and therefore fail closed until a governed product version is set.

`recommendation_product_handoffs` is an immutable consent record linked to the exact action, portfolio item, analysis run, recommendation/version, tenant and target/version. It records explicit consent, creator, hashed token, idempotency/request hashes and a bounded expiry.

`recommendation_product_handoff_events` is append-only and records at most one consumption event per hand-off. Its trigger binds event tenant and actor scope to the immutable hand-off.

`organisation_product_activations` distinguishes activation from eligibility, availability and entitlement. It has no client policy or activation routine in this story.

All three tables have RLS enabled with zero client policies. `PUBLIC`, `anon` and `authenticated` receive no storage or function privilege. The service role receives read access and only the two governed create/consume routines; direct service-role writes are removed by the hardening migration.

## API and experience

- `GET /api/improvement-actions/{id}/handoffs` returns only currently available mapped opportunities and their five explicit state fields.
- `POST /api/improvement-actions/{id}/handoffs` requires a valid idempotency key and explicit consent, then returns the customer-safe projection and token in JSON.
- `POST /api/product-handoffs/consume` receives the token in a JSON body, repeats authorisation and operational checks, records consumption idempotently and returns a version-pinned downstream contract with `activated: false`.
- The action experience presents locked Pack/TeamMate copy, visible entitlement/permission/activation state, 44-pixel controls, loading/error/status semantics and an explicit consent confirmation. It states that the transition does not activate a Knowledge Pack or TeamMate.

## Files created

- `src/lib/recommendation-handoffs/model.ts`
- `src/lib/recommendation-handoffs/types.ts`
- `src/lib/recommendation-handoffs/projection.ts`
- `src/lib/recommendation-handoffs/token.server.ts`
- `src/lib/recommendation-handoffs/repository.server.ts`
- `src/lib/recommendation-handoffs/service.server.ts`
- `src/lib/recommendation-handoffs/http.server.ts`
- `src/lib/recommendation-handoffs/client.ts`
- `src/components/dashboard/recommendation-handoff-controls.tsx`
- `src/routes/api/improvement-actions.$id.handoffs.ts`
- `src/routes/api/product-handoffs.consume.ts`
- `supabase/migrations/20260803110000_recommendation_product_handoffs.sql`
- `supabase/migrations/20260803111000_harden_recommendation_product_handoff_permissions.sql`
- `tests/recommendation-product-handoffs.test.ts`
- `docs/sprint-04/S4-011-deployment-runbook.md`
- `docs/sprint-04/S4-010-product-rule-blocker.md`

## Files modified

- `src/components/dashboard/recommendation-action-controls.tsx`
- `src/routeTree.gen.ts`
- `tests/migration-security.test.ts`
- `docs/sprint-04/acceptance-matrix.md`

## Acceptance evidence

- AC1: the domain resolver delegates to the unchanged DIQ-203 mapping functions; the executable test iterates every locked recommendation and compares all mapped Pack and TeamMate IDs with DIQ-203A.
- AC2: separate entitlement and CTA tests prove that eligibility never confers entitlement. Active unentitled products use the locked view CTA; entitled activation/start CTAs require their current permission.
- AC3: application and database consumption reject missing/inactive availability, entitlement changes and any exact-version change. Tokens expire after ten minutes and cannot exceed fifteen minutes.
- AC4: no activation command exists. Both the customer response and UI explicitly state `activated: false`; tests and migration inspection prove no activation insert side effect.
- AC5: immutable hand-off records preserve explicit consent and exact source action/item; append-only events record the consuming actor and time. Exact replay returns the same token and record without another write.
- AC6: public Delivery DNA projection and disclosure code are untouched. The hand-off APIs require an authenticated, tenant-scoped workspace and the customer projection excludes tenant IDs, actor identity, request hash and token hash.

## Verification

- Targeted S4-011 domain, service, security, migration, accessibility and performance tests passed.
- Type checking and a production build passed during implementation.
- Full regression, all locked DIQ-203B fixtures, changed-file lint/format and final production build are required before merge and will be recorded here after execution.
- Live migration and hand-off smoke remain pending Lovable deployment. No synthetic customer evidence or product availability is created.

## Known limitations and technical debt

- DIQ-203A defines Pack and TeamMate IDs/mappings but not operational product versions. Existing availability rows therefore remain safely hidden until an authorised operational process sets an exact version.
- This story returns a bounded downstream contract and audit event; the Knowledge Pack runtime and TeamMate activation workflow remain explicitly out of scope.
- Production has no governed product-availability rows at the last verified baseline. Live customer hand-offs will remain hidden until genuine availability, version and entitlement records exist.
- Existing repository-wide lint debt remains outside this story; changed files are held to a clean gate.

## Product decisions required

None for S4-011. The separate S4-010 decision remains outstanding.
