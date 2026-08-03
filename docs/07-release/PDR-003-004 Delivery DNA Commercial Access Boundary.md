# PDR-003-004 — Delivery DNA Commercial Access Boundary

| Control | Value |
|---|---|
| Decision ID | PDR-003-004 |
| Version | 1.0 |
| Status | **LOCKED** |
| Owner | Product Owner |
| Architecture authority | Chief Solution Architect |
| Approved by | Matt Prust |
| Decision date | 3 August 2026 |
| Classification | Internal — Controlled |

> **Lean decision notice.** Matt Prust approved the Delivery DNA free-versus-paid boundary on 3 August 2026. This record is immediate implementation authority for commercial result projections and action entitlements. It does not alter the 39 questions, assessment eligibility, scoring, confidence, patterns, recommendation generation, roadmap generation, traceability, security or immutable analysis results. Engineering may implement and deploy without another routine approval.

## 1. Purpose

Ensure Delivery DNA provides enough free value to establish trust and generate qualified demand while reserving detailed implementation planning, action management and ongoing improvement for an entitled DeliveryIQ service.

The governing principle is:

> Free explains where the customer is and what matters most. Paid helps the customer improve it.

## 2. Authority and scoped amendment

Apply this order for the commercial access boundary:

1. DIQ-002 Product Architecture v1.0 — LOCKED.
2. This PDR for result-tier projection, commercial CTA and improvement-action entitlement.
3. PB-003 and PB-004 v1.0 — LOCKED for all unaffected behaviour.
4. DIQ-203, DIQ-203A and DIQ-203B v1.0 — LOCKED for analysis and all unaffected disclosure behaviour.
5. PDR-003-001, PDR-003-002 and PDR-003-003 v1.0.
6. Existing implementation where it does not conflict.

This decision supersedes only:

- the DIQ-203/DIQ-203A/DIQ-203B registration-prompt wording that promises the complete improvement roadmap to a free account;
- the assumption that every authenticated workspace member with an existing permission receives the complete recommendation portfolio and improvement-action workflow without a commercial entitlement; and
- PB-004 S4-007–S4-010 customer projection/access behaviour to the minimum extent required below.

All source analysis, generated recommendations and generated roadmap items continue to be created in full and remain immutable. Commercial access is a server-side projection and workflow-authorisation decision over that result.

## 3. Approved access tiers

### 3.1 Anonymous Delivery DNA result

The existing DIQ-203A public allow-list, security controls and maximum limits remain unchanged. Anonymous output may contain:

- overall display score and band;
- confidence band and approved caveat;
- public summary;
- up to three strength previews;
- up to three priority-opportunity previews;
- up to three recommendation previews; and
- the approved registration CTA in Section 6.

Anonymous users do not receive the 13-capability detail, complete recommendation portfolio, roadmap, success measures, decisions, actions, outcome tracking, Knowledge Pack execution or TeamMate activation.

### 3.2 Authenticated free account

After verified authentication, explicit result linking and tenant/workspace authorisation, the free-account projection contains:

| Area | Approved free-account content |
|---|---|
| Overall result | Display score, band and complete approved executive summary |
| Capability profile | All 13 capability labels, display scores/bands or unavailable state, and safe evidence-coverage summary |
| Confidence | Display index, band, customer-safe limitations and improvement prompts |
| Findings | Up to the existing workspace maximum of five strengths and five priority opportunities |
| Recommendations | The top three presented recommendations in locked rank order: title, priority label, impact, effort, safe reason and expected outcome |
| Roadmap preview | The first scheduled presented recommendation in each non-empty 30-, 60- and 90-day horizon; maximum three items; title, horizon and priority label only |
| Related products | Existing safe Knowledge Pack and TeamMate previews may be shown; their availability, entitlement, permission and activation rules remain separate |
| Retention | Linked immutable result remains available in the authorised workspace |

The free-account projection must not expose:

- recommendations ranked below the top three;
- full dependency detail, unscheduled items or sequence overrides;
- recommendation success measures or implementation assets;
- the complete generated roadmap;
- recommendation accept, defer, reject, restore or supersede controls;
- action creation, ownership, dates, dependencies, state changes or evidence capture;
- outcome-measure configuration, observations or progress tracking;
- auditor-only ranking components, trace internals or restricted evidence; or
- paid Knowledge Pack or TeamMate content merely because it is recommended.

The roadmap preview is derived from the immutable full roadmap. It is not a separately calculated plan and must not change engine ordering.

### 3.3 Delivery DNA Action entitlement

The stable commercial entitlement key is `delivery_dna_action`, version `1.0.0`.

An authorised workspace user receives the complete Delivery DNA action experience only when all are true:

- the result and workspace are valid and tenant matched;
- the user has the existing permission required for the requested read or mutation;
- `delivery_dna_action` is commercially available for that tenant;
- the tenant holds an active `delivery_dna_action` entitlement; and
- the entitlement version is compatible and rechecked server-side at the time of access or mutation.

The entitled experience may expose the existing complete authenticated recommendation portfolio, full generated roadmap, dependency and success-measure detail, customer decisions, improvement actions, ownership, dates, progress, outcome observations and history, subject to the existing role, permission, redaction and tenant rules.

Authentication, recommendation eligibility, product availability, commercial entitlement, user permission and customer acceptance remain distinct. None implies another.

Knowledge Pack and TeamMate entitlements are not bundled into `delivery_dna_action` by this decision.

## 4. Server and interface behaviour

1. Generate and persist the complete immutable analysis, recommendation portfolio and roadmap regardless of commercial tier.
2. Resolve access on the server for every read and mutation. Hiding controls in the browser is not sufficient.
3. Return only the projection authorised for the current tenant, user, entitlement version and permission.
4. A free user attempting a paid read receives the same free projection, not partially leaked paid fields.
5. A free user attempting a paid mutation receives the established safe non-entitled/ unavailable response without commercial internals, stack detail or resource enumeration.
6. Upgrade or entitlement activation reveals the existing complete result without recalculation, copying or mutation.
7. Entitlement expiry or revocation removes paid access but does not delete the immutable analysis, decisions, actions, outcome history or audit records.
8. Existing Pack and TeamMate hand-offs retain their separate access checks.
9. Public and free projections remain accessible, responsive and understandable without relying on colour.

## 5. Commercial availability and legacy access

Before enforcing the boundary, engineering must check for customer-created Delivery DNA decisions, actions and outcome observations.

- If none exist, no customer or synthetic backfill is required.
- If an existing tenant has used those paid-scope features before enforcement, grant that tenant a grandfathered `delivery_dna_action` entitlement for the affected workspace. Do not remove existing customer access or history silently.
- Grandfathering is an access record only; it does not alter immutable source results or imply payment status.
- Product pricing, checkout, recurring billing and packaging are outside this decision.

Commercial availability is configuration driven and deny-by-default. When the entitled service is not yet available, the interface uses the unavailable copy in Section 6 and must not show a broken purchase route.

## 6. Approved customer copy

### 6.1 Anonymous registration CTA

**Label:** Create your free DeliveryIQ account to explore your complete Delivery DNA profile, priority recommendations and personalised roadmap preview.

**Destination:** retain the existing first-party registration destination `/register?source=delivery-dna&result={publicResultId}` and verified consent-based linking contract.

### 6.2 Free-account paid-value panel

**Heading:** Turn your Delivery DNA priorities into action

**Body:** Unlock your complete improvement plan, success measures and action tracking to help your team deliver and evidence progress.

When `delivery_dna_action` is available but the tenant is not entitled:

- **Action:** Talk to DeliveryIQ
- **Destination:** configured first-party commercial contact route with source `delivery-dna-result`; if no approved route exists, suppress the action rather than invent or break a link.

When `delivery_dna_action` is not commercially available:

- **Message:** DeliveryIQ's complete improvement-planning experience is coming soon.
- No purchase or activation action is shown unless an approved early-access route is configured.

When entitled and permitted:

- **Action:** Open improvement plan

Copy must not imply guaranteed improvement, project success, savings or access to separately entitled Knowledge Packs or TeamMates.

## 7. Immutability and traceability

The access policy ID/version and evaluated entitlement version must be recorded with the projection or access decision. Updating the commercial CTA or projection does not change the analysis run, scores, findings, recommendations or roadmap.

PDR-003-004 supersedes the expected registration label in DIQ-203B fixture `workspace_public_disclosure` only at the current presentation-policy boundary. The historical locked fixture remains unchanged as evidence of the original Sprint 03 configuration. Engineering must add PDR-003-004 projection fixtures rather than rewrite historical evidence.

No existing public token, linked result or analysis run is recalculated. Current presentation may apply this approved access-policy copy while preserving the originating analysis configuration and recording the presentation-policy version.

## 8. Minimum acceptance evidence

Engineering must add focused automated evidence for:

1. anonymous projection unchanged except for the exact approved registration label;
2. free projection containing exactly the authorised areas and no paid fields;
3. deterministic top-three recommendation selection and first-item-per-horizon preview;
4. entitled projection exposing the existing complete result without recalculation;
5. direct API attempts unable to bypass free projection or paid mutation controls;
6. availability, entitlement and permission evaluated independently;
7. entitlement activation, expiry and revocation;
8. grandfathering when pre-existing customer activity exists and zero backfill when it does not;
9. cross-tenant reads, writes, cache keys and entitlement references denied;
10. upgrade revealing the same immutable result/run and full roadmap;
11. absent commercial route producing no broken CTA;
12. keyboard, narrow-screen and non-colour access for locked/unlocked states;
13. unchanged scoring, confidence, pattern, ranking, roadmap generation and all 53 DIQ-203B engine fixtures; and
14. type checking, changed-file lint/format, production build and targeted security checks.

Update the existing acceptance matrix and produce one concise implementation report. Do not create per-story governance reports.

## 9. Implementation hand-off

This is one focused commercial-access work package, not an engine rebuild or new sprint. Reuse the existing Sprint 04 availability/entitlement/permission boundary and result projection architecture. Do not duplicate scoring, recommendation or roadmap logic.

Engineering may make routine technical choices and proceed through implementation, tests and safe deployment without another plan or readiness approval. Stop only for a genuine locked-authority conflict, unexpected existing-customer access impact that the grandfathering rule cannot preserve, or material security/tenant-isolation risk.

## 10. Change history

| Version | Date | Change | Approval |
|---|---|---|---|
| 1.0 | 3 August 2026 | Established anonymous, free-account and entitled Delivery DNA projections; approved commercial copy and server-side action entitlement | Matt Prust |

---

**End of PDR-003-004 v1.0 — LOCKED**
