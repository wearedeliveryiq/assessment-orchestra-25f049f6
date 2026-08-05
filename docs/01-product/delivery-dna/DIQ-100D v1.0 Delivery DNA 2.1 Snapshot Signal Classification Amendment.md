# DIQ-100D — Delivery DNA 2.1 Snapshot Signal Classification Amendment

| Control | Value |
| --- | --- |
| Document ID | DIQ-100D |
| Version | 1.0 |
| Status | **LOCKED** |
| Owner | Product Owner |
| Architecture authority | Chief Solution Architect |
| Approver | Matt Prust |
| Approved | 5 August 2026 |
| Product authority | [DIQ-100 v2.1](<DIQ-100 v2.1 Delivery DNA Specification.md>) |
| Machine authority | [DIQ-100A v2.1.1](<DIQ-100A v2.1.1 Delivery DNA Model Catalogue.json>) |
| Golden fixtures | [DIQ-100B v2.1.1](<DIQ-100B v2.1.1 Delivery DNA Golden Fixtures.json>) |
| Scope | Snapshot positive-signal and area-to-explore presentation only |

> **Implementation authority.** Matt Prust approved this rule without amendments after the live Delivery DNA 2.1 promotion review exposed the same tied domains in both result lists.

## 1. Decision

Snapshot signal classification uses available domains' unrounded Snapshot means and applies these rules:

1. A domain is eligible as a **positive signal** only when its mean is strictly greater than at least one other available domain mean.
2. A domain is eligible as an **area to explore** only when its mean is strictly lower than at least one other available domain mean.
3. Positive signals are ordered by mean descending, then domain order ascending.
4. Areas to explore are ordered by mean ascending, then domain order ascending.
5. Each list contains no more than two domains.
6. The lists are always disjoint. A domain must never appear in both.
7. When all available domain means are equal, both lists are empty. The product must not manufacture differentiation from domain order.
8. Unavailable domains are excluded from both lists.
9. An empty list is omitted. No replacement claim or unapproved customer copy is generated.

These are relative Snapshot signals, not strengths, weaknesses, recommendations or complete Delivery DNA findings.

## 2. Version and data treatment

- Snapshot presentation-policy version becomes `2.1.1`.
- Question-set version remains `2.1.0`.
- Model configuration ID remains `delivery-dna-product-config-2.1.0` because questions, anchors, weights, scoring and eligibility do not change.
- Existing Delivery DNA 2.1 Snapshot responses, overall level, domain means and history remain immutable.
- A completed 2.1 Snapshot may be rendered through presentation policy `2.1.1` without mutating stored responses or calculated domain means.
- The rendered result must retain presentation-policy provenance `2.1.1`.
- No assessment, analysis run, payment, entitlement, commercial offer, industry-context selection or customer-data migration is created or changed by this amendment.

## 3. Acceptance

Engineering must demonstrate:

1. exact all-equal behaviour with both lists empty;
2. exact partial-tie ordering;
3. a general invariant proving the two lists never overlap;
4. unchanged overall level, domain profile, indicative caveat, industry context and Saved Snapshot CTA;
5. targeted Snapshot regression, type checking and production build passing;
6. a reopened or newly completed production result with truthful, non-overlapping output; and
7. the Lovable badge remaining absent at 390px and 1280px with no horizontal overflow.

The complete fifteen-question journey need not be repeated when an existing completed 2.1 result can be safely reprojected and verified.

## 4. Change history

| Version | Date | Change | Approval |
| --- | --- | --- | --- |
| 1.0 | 5 August 2026 | Prohibited overlapping Snapshot signal lists and prohibited manufactured differentiation for an all-equal profile | Matt Prust |

---

**End of DIQ-100D v1.0 — LOCKED**
