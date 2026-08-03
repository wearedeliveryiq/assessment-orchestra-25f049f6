# PDR-003-005 — Delivery DNA Snapshot

| Control | Value |
|---|---|
| Decision ID | PDR-003-005 |
| Version | 1.0 |
| Status | **LOCKED** |
| Owner | Product Owner |
| Architecture authority | Chief Solution Architect |
| Approved by | Matt Prust |
| Decision date | 3 August 2026 |
| Classification | Internal — Controlled |
| Machine-readable authority | [PDR-003-005A](<../01-product/delivery-intelligence/configuration/PDR-003-005A Delivery DNA Snapshot Configuration.json>) v1.0.0 |

> **Lean decision notice.** Matt Prust approved the product name and staged engagement model on 3 August 2026. The formal product name is **Delivery DNA Snapshot**, with **DNA Snapshot** permitted after the first full reference. This record and PDR-003-005A are immediate implementation authority. They do not amend the full 39-question Delivery DNA Assessment or its locked intelligence rules.

## 1. Product decision

DeliveryIQ will use two clearly differentiated customer journeys:

| Product | Purpose | Questions | Output |
|---|---|---:|---|
| **Delivery DNA Snapshot** | Anonymous, low-friction engagement | 13 | Directional positive signals and areas to explore |
| **Delivery DNA Assessment** | Complete evidence-led organisational diagnosis | 39 | Authoritative Delivery DNA intelligence under DIQ-203 |

The governing proposition is:

> 13 questions to engage. 39 questions to diagnose.

The Snapshot is not called a score, maturity rating, full assessment, benchmark or complete diagnosis.

## 2. Authority and relationship to locked Delivery DNA

Apply this order for the Snapshot journey:

1. DIQ-002 Product Architecture v1.0 — LOCKED.
2. This PDR and PDR-003-005A for Snapshot identity, selection, result and continuation.
3. PDR-003-003 and DIQ-203C v1.0.0 for the source question wording and response presentation reused by the Snapshot.
4. PDR-003-004 v1.0 for subsequent free-account and commercial result access.
5. DIQ-203, DIQ-203A and DIQ-203B v1.0 for the full assessment and intelligence engine only.
6. Existing implementation where it does not conflict.

The Snapshot never enters `sprint03-product-config-1.0.0`, never produces an analysis run and never invokes the pattern, recommendation or roadmap engines. Only a completed full assessment with the exact 39-ID manifest may enter the locked engine.

## 3. Question selection

The Snapshot uses exactly the thirteen existing practice questions (`.p`), one for each Delivery DNA capability, in DIQ-203A capability order. PDR-003-005A lists the exact IDs.

- Wording, labels and help resolve from DIQ-203C v1.0.0 and must not be rewritten for the Snapshot.
- The customer uses the existing 1–5 response labels.
- `not_applicable` is available only with the existing mandatory concise reason.
- `excluded` is never customer-selectable.
- All thirteen questions must have a deliberate status of `answered` or `not_applicable` before a Snapshot result is shown.
- At least nine questions must be `answered`; otherwise the Snapshot is unavailable and the customer is invited to answer more applicable questions or continue to the full assessment.

No new taxonomy, question mapping, weight or inferred answer is approved.

## 4. Directional result rules

Snapshot selection uses raw 1–5 answers only for presentation. It does not apply DIQ-203 transformation, weights, aggregation, bands or confidence.

- Answer `4` or `5` is eligible as a `positive_signal`.
- Answer `1` or `2` is eligible as an `area_to_explore`.
- Answer `3` is neutral and creates no card.
- `not_applicable` and missing evidence create no card.
- Show at most two positive signals, ordered by answer descending then capability order ascending then capability ID ascending.
- Show at most two areas to explore, ordered by answer ascending then capability order ascending then capability ID ascending.
- Use the exact generic, non-causal card and caveat copy in PDR-003-005A.
- Display no numeric score, average, percentage, maturity band, confidence index, cross-company comparison, pattern, recommendation or roadmap.

The same input and policy version must always produce the same Snapshot output.

## 5. Customer journey

1. Website CTA: **Get your free DNA Snapshot**.
2. The pre-start screen states: 13 questions, approximately 3–5 minutes, no account required, directional result, and the option to continue to the complete assessment.
3. The customer answers the thirteen practice questions using accessible, mobile-first controls.
4. DeliveryIQ presents the directional Snapshot and exact caveat without requiring registration.
5. Continuation CTA: **Complete your Delivery DNA Assessment**.
6. The registration screen explains that the thirteen existing answers will be carried forward unchanged with the customer's consent.
7. After verified registration and explicit linking consent, the customer continues with the remaining 26 foundation/evidence questions. The thirteen practice responses are displayed for review and may be amended before full-assessment completion.
8. Only the completed 39-question assessment passes through PDR-003-002 eligibility and PDR-003-001 automatic analysis.
9. The resulting anonymous/free/entitled result follows PDR-003-004.

Customers may also start the complete 39-question Delivery DNA Assessment directly from an authenticated workspace. The Snapshot is an acquisition route, not a mandatory prerequisite.

## 6. Response continuation and provenance

The anonymous Snapshot is a separate acquisition record with an opaque session ID. On explicit consent, the application creates or updates an authorised Delivery DNA draft and carries forward only:

- the exact DIQ-203C question ID;
- response status;
- integer answer where answered;
- not-applicable reason code/text where applicable;
- original response timestamp; and
- provenance `delivery-dna-snapshot` version `1.0.0`.

This is exact same-question continuation, not legacy translation or inferred mapping. No answer is converted, defaulted or copied to another question. The customer can review and change it in the full journey; a change follows normal assessment-revision behaviour.

Snapshot transfer never completes the full assessment automatically and never requests analysis.

## 7. Privacy, security and analytics

- Do not require name, organisation, email or account before showing the Snapshot.
- Use an opaque, non-sequential session token with the existing public-result entropy, storage, cache and abuse protections where reusable.
- Unlinked Snapshot responses expire after 24 hours and are deleted through a bounded cleanup process. Aggregate funnel events may remain without answer values or identifiers.
- Registration consent for result continuation is distinct from marketing consent.
- Do not place answer values, capability signals or session tokens in URLs, client analytics, logs or third-party tracking.
- Analytics may record only safe funnel events: landing view, start, question-step progress number, Snapshot completion, continuation CTA and completed registration.
- Preserve rate limiting, output encoding, accessibility, narrow-screen operation and constant-shape safe errors.

## 8. Approved naming and copy

| Context | Exact copy |
|---|---|
| Formal product name | Delivery DNA Snapshot |
| Permitted shorthand | DNA Snapshot |
| Website CTA | Get your free DNA Snapshot |
| Start heading | Discover your Delivery DNA Snapshot |
| Result heading | Your Delivery DNA Snapshot |
| Continuation CTA | Complete your Delivery DNA Assessment |
| Full product name | Delivery DNA Assessment |

Do not use “quick Delivery DNA score”, “mini assessment”, “maturity score”, “benchmark” or “AI prediction”.

## 9. Minimum acceptance evidence

Engineering must verify:

1. exactly thirteen unique `.p` IDs in DIQ-203A capability order and exact DIQ-203C wording;
2. all response labels and not-applicable semantics unchanged;
3. no result until all thirteen have a deliberate status and at least nine are answered;
4. exact positive/explore boundaries, limits and tie-breaks;
5. neutral/all-positive/all-explore/mixed/insufficient fixtures in PDR-003-005A;
6. no score, band, confidence, pattern, recommendation, roadmap or analysis run from Snapshot completion;
7. anonymous completion without PII or account;
8. exact-response continuation after verified registration and explicit consent;
9. no translation, cross-question copying, duplicate response or automatic full completion;
10. customer review/amendment of carried responses;
11. unlinked 24-hour expiry and safe cleanup;
12. tenant isolation after linking and safe concurrent/replayed registration;
13. mobile, keyboard, screen-reader, error and interrupted-session behaviour;
14. funnel analytics excluding answers, identifiers and sensitive content;
15. direct full-assessment start remains available;
16. PDR-003-001–004 and all 53 DIQ-203B regression fixtures remain unchanged; and
17. type checking, changed-file lint/format, production build and targeted security checks.

Update the active acceptance matrix and produce one concise implementation report. Do not create per-question reports or a separate assessment engine.

## 10. Implementation priority

Implement the Snapshot as the public entry stage of the active genuine Delivery DNA collection work. Reuse the existing question components, response schema, registration/linking boundary and full-assessment journey. Continue automatically through safe implementation, tests and deployment without another routine readiness approval.

## 11. Change history

| Version | Date | Change | Approval |
|---|---|---|---|
| 1.0 | 3 August 2026 | Approved the Delivery DNA Snapshot name, 13-question directional journey, continuation into the full 39-question assessment and minimal acceptance rules | Matt Prust |

---

**End of PDR-003-005 v1.0 — LOCKED**
