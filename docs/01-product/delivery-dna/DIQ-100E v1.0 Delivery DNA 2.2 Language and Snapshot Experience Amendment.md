# DIQ-100E — Delivery DNA 2.2 Language and Snapshot Experience Amendment

| Control                | Value                                                                                                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Document ID            | DIQ-100E                                                                                                                                                                                              |
| Version                | 1.0                                                                                                                                                                                                   |
| Status                 | **LOCKED**                                                                                                                                                                                            |
| Owner                  | Product Owner                                                                                                                                                                                         |
| Architecture authority | Chief Solution Architect                                                                                                                                                                              |
| Approver               | Matt Prust                                                                                                                                                                                            |
| Approved               | 5 August 2026                                                                                                                                                                                         |
| Product authority      | [DIQ-100 v2.1](<DIQ-100 v2.1 Delivery DNA Specification.md>)                                                                                                                                          |
| Machine authority      | [DIQ-100A v2.1.1](<DIQ-100A v2.1.1 Delivery DNA Model Catalogue.json>)                                                                                                                                |
| Signal authority       | [DIQ-100D v1.0](<DIQ-100D v1.0 Delivery DNA 2.1 Snapshot Signal Classification Amendment.md>)                                                                                                         |
| Evidence authority     | [DIQ-204 v1.3](<../delivery-intelligence/DIQ-204 Delivery Evidence and Trends Register.md>) and [DIQ-204A v1.2.0](<../delivery-intelligence/configuration/DIQ-204A Delivery Evidence Catalogue.json>) |
| Scope                  | Customer language and public Snapshot presentation only                                                                                                                                               |

> **Implementation authority.** Matt Prust approved this lean customer-facing amendment without amendments on 5 August 2026. The Head of Software is authorised to produce the corresponding versioned catalogue and fixtures and to implement without a separate readiness gate.

## 1. Product decision

Delivery DNA 2.2 will improve the public Snapshot before active customer promotion by:

1. removing ambiguous first-person language from customer-facing questions;
2. replacing **central enablement** with language that works for organisations of different sizes, structures and sectors;
3. presenting the four maturity anchors as an intentional scale rather than an incomplete grid;
4. making the preparation transition visibly active, branded and truthful;
5. keeping the outcome, expanded explanation and next action together;
6. strengthening the visibility of each domain level;
7. renaming **Positive Signals** to **Areas of Strength**, with an explicit directional guardrail;
8. shortening visible source footnotes while retaining a separate non-benchmark disclosure; and
9. broadening supporting industry context beyond one publisher.

The five domains, fifteen capabilities, forty-five question IDs, Snapshot selection, answer values, scoring, weights, thresholds, Not applicable semantics, signal-selection rules, Saved Snapshot boundary and £295 Overview boundary do not change.

## 2. Customer-language standard

Customer-facing questions must make the subject of the assessment explicit. Use **the organisation**, **delivery teams**, **leaders** or the relevant delivery activity. Do not use **our**, **we** or **we're**, because the respondent may be a leader, adviser, employee or invited stakeholder and may be assessing a team, business unit or whole organisation.

Use plain, method-neutral language suitable for an SME, larger enterprise or public-sector organisation. Do not assume the organisation has a PMO, centre of excellence or central delivery function.

### 2.1 Exact replacements

Only the following wording changes are approved by this amendment. IDs, roles, weights, required flags and Snapshot selection remain unchanged.

| ID or field                                            | Exact replacement                                                                                                                             |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `direction_value.executiveQuestion`                    | Is the organisation investing in the right change and realising the expected value?                                                           |
| `ddna2.strategic_alignment.snapshot`                   | How clearly is the organisation's delivery portfolio connected to its strategy?                                                               |
| `ddna2.portfolio_prioritisation.snapshot`              | How reliably does the organisation prioritise the right work over work that simply keeps people busy?                                         |
| `ddna2.benefits_value.snapshot`                        | How reliably does the organisation check whether delivered work created the expected value?                                                   |
| `ddna2.delivery_approach_lifecycle.snapshot`           | How consistent and fit for purpose are the ways of working used across delivery teams?                                                        |
| `ddna2.planning_control_dependencies.snapshot`         | How reliable are delivery plans and forecasts when decisions need to be made?                                                                 |
| `ddna2.capacity_delivery_ecosystem.supporting_2`       | How well can the organisation's delivery support and capacity model adapt as the volume or complexity of work grows?                          |
| `ddna2.delivery_capability_enablement.snapshot`        | How much practical support—not just process—do delivery teams receive from the people, services and tools intended to help them deliver well? |
| `ddna2.delivery_capability_enablement.supporting_1`    | How well equipped are delivery teams with the skills their work demands?                                                                      |
| `ddna2.learning_adaptability_improvement.snapshot`     | How systematically does the organisation learn from delivery and change its ways of working as a result?                                      |
| `ddna2.digital_automation_responsible_ai.supporting_2` | How deliberately and responsibly does the organisation use and govern AI and automation within delivery?                                      |

### 2.2 Exact anchor replacements

All anchors remain mapped to their existing values and level IDs.

| Question ID                                     | Level       | Exact replacement                                                                        |
| ----------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| `ddna2.benefits_value.snapshot`                 | Emerging    | Value is rarely checked; it is usually assumed once something is delivered.              |
| `ddna2.delivery_capability_enablement.snapshot` | Emerging    | Support mainly feels like oversight or administration rather than practical help.        |
| `ddna2.delivery_capability_enablement.snapshot` | Developing  | Some practical support is available, but its usefulness or availability is inconsistent. |
| `ddna2.delivery_capability_enablement.snapshot` | Established | Delivery teams generally receive useful practical support when they need it.             |
| `ddna2.delivery_capability_enablement.snapshot` | Leading     | Delivery teams have trusted, responsive support that helps them deliver and improve.     |

All non-enumerated question, help and anchor wording remains unchanged.

## 3. Answer-anchor layout

The maturity scale must read as a deliberate sequence, not as a card grid with a missing item.

1. Present **Emerging**, **Developing**, **Established** and **Leading** as four equal-width, equal-height scale cards on wide screens.
2. Use an even two-by-two arrangement at intermediate widths and one full-width card per row on narrow screens.
3. Keep spacing, internal padding and selected-state treatment consistent across all four scale cards.
4. Present **Not applicable** as a visually subordinate, full-width action below the four-card scale. It must not appear to be a fifth maturity level or leave a phantom fifth space.
5. Retain save-before-advance, selected-state delay, Back/edit, keyboard activation, focus movement and mandatory Not applicable reason rules.
6. Card order and accessible reading order must always be Emerging, Developing, Established, Leading, Not applicable.

## 4. Active preparation transition

Retain the approved four-to-six-second truthful transition and exact five preparation steps. Replace the visually static treatment with a purposeful branded sequence.

### 4.1 Required presentation

1. Use the approved DeliveryIQ ribbon mark with a lightweight Delivery DNA motif: five domain nodes connected by a flowing or braided line, or an equivalent original brand-native visual.
2. Keep at least one clearly active visual state throughout normal preparation: moving nodes, restrained pulse, flowing line, orbit, shimmer or step transition.
3. Show the five existing preparation steps one at a time. The active step is visibly in progress and each completed step receives a clear completed state.
4. Use a non-numeric progress treatment. Do not display a fabricated percentage.
5. Preserve the exact heading **Building your Delivery DNA Snapshot** and supporting text **We're reviewing the patterns across your 15 responses.**
6. Reveal **Your Snapshot is ready** before the automatic result transition.
7. If preparation exceeds six seconds, show **Still preparing your Snapshot** with continued activity.
8. Do not claim AI analysis, benchmarking, external comparison, evidence validation or use of the complete Delivery Intelligence Engine.
9. Under reduced-motion preferences, replace continuous animation with clear static step changes and completed states.

No decorative stock DNA image is required. If DNA imagery is used, it must be an original brand-native graphic and must not compete with or distort the DeliveryIQ mark.

## 5. Results hierarchy and copy

Render the public Snapshot result in this order:

1. branded completion hero;
2. **Your indicative delivery maturity** and the result label;
3. **What this means** and the applicable expanded interpretation;
4. the mandatory indicative-result caveat;
5. a compact, prominent **Save my Snapshot** action;
6. **Your indicative Delivery DNA profile** chart and accessible domain list;
7. up to two **Areas of Strength** and up to two **Areas to Explore**;
8. one approved **Industry context** item when eligible;
9. a full Saved Snapshot value panel with the primary action repeated; and
10. the quiet tertiary **Start a new Snapshot** action.

The result label and its interpretation must remain together. The profile chart must not separate them.

### 5.1 Exact expanded interpretations

#### Emerging

Your responses suggest that delivery practices are still forming or are applied inconsistently across the five domains. Progress may depend on individual effort rather than repeatable ways of working, which can make outcomes harder to predict as priorities or pressure change. The complete Delivery DNA explores where stronger foundations could create the greatest benefit.

#### Developing

Your responses suggest that useful delivery practices are in place, but their application varies between teams or types of work. The organisation may get good results in some areas while still relying on local workarounds or individual experience in others. The complete Delivery DNA tests the supporting practices behind this picture and identifies where greater consistency could add value.

#### Established

Your responses suggest that delivery practices are generally understood and applied consistently across several domains. This gives the organisation a credible platform for dependable delivery, although consistency may still vary under pressure or between teams. The complete Delivery DNA examines the supporting evidence to show which practices are genuinely embedded and where focused improvement could create the greatest value.

#### Leading

Your responses suggest that delivery practices are consistently embedded, outcome-led and actively improved across the areas assessed. The next opportunity is less about adding process and more about sustaining effectiveness as priorities, scale and technology change. The complete Delivery DNA tests the supporting evidence and highlights where strengths can be protected or extended.

These interpretations are directional Snapshot copy. They do not change or substitute for the complete Overview narrative.

### 5.2 Typography and clipping

1. The maturity result label must have sufficient line height and vertical padding to preserve every glyph and gradient at all supported widths.
2. No heading, result label, focus ring or descender may be cropped at 320px, 390px, 768px, 1280px or 1440px, or at 200% browser text zoom.
3. Long labels must wrap cleanly without horizontal overflow or concealed text.

### 5.3 Domain-level prominence

In the accessible profile list, each domain's level must be title case, at least semibold, and use an approved high-contrast brand accent or badge treatment. The domain name remains the primary label, but the maturity level must be immediately scannable. Colour may reinforce the level but must not carry meaning on its own.

### 5.4 Areas of Strength

The customer-visible heading **Positive Signals** becomes **Areas of Strength**.

Display this helper text:

> These are the strongest relative signals in your Snapshot. They are directional, not a complete capability assessment.

DIQ-100D selection, ordering, tie, maximum-item, disjoint-list and all-equal omission rules remain unchanged. This amendment supersedes only DIQ-100D's prohibition on using the word **strengths** for the customer heading; it does not turn a relative Snapshot signal into an authoritative strength finding.

## 6. Saved Snapshot conversion treatment

The primary CTA must not be left as an isolated button at the bottom of a long results page.

### 6.1 Compact action near the outcome

Place a high-contrast compact action after the expanded interpretation and caveat:

- supporting message: **Download your results by saving your Snapshot**;
- primary action: **Save my Snapshot**; and
- reassurance: **Keep your 15 answers and return when you're ready.**

### 6.2 Full value panel

Repeat the action after the result content in a clearly separated conversion panel:

**Heading:** Keep your Delivery DNA Snapshot

**Body:** Save a private copy, download your results and keep your 15 answers ready if you choose to complete your Delivery DNA later.

**Primary action:** Save my Snapshot

The existing verified-registration, consent, privacy, retention and exact-answer continuation rules remain unchanged. Do not use **free account** as the product name.

## 7. Industry-context presentation

### 7.1 Visible disclosure

The result card remains labelled **Industry context** and must separately show:

> Industry research only — not a benchmark or a comparison with your organisation.

The asterisked source note must be short, linked where a licensed public source is available, and appear at the bottom of the result page. For the current Wellingtone material, the exact visible note is:

> \* Wellingtone, The State of Project Management 2026

Do not append methodology, respondent profile or the non-benchmark disclosure to that footnote. Retain methodology and scope metadata in DIQ-204A and expose it through an accessible **About this source** detail only if one is provided.

### 7.2 Additional approved-source candidates

The following four approved items are to be added or promoted through DIQ-204/A for Snapshot context. Each remains calculation-neutral and must be selected only through deterministic capability/domain mapping.

| Evidence ID                              | Customer-safe statement                                                                                                                                                                                                      | Capability mapping                                                                                                       | Exact source note                                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `context_apm_success_conditions_2015`    | APM research identified planning and review, clear goals, effective governance, competent teams and commitment to success as the five factors with the strongest and most consistent relationship to time, cost and quality. | Strategic Alignment; Sponsorship & Accountability; Leadership, Culture & Collaboration; Planning, Control & Dependencies | \* Association for Project Management, Conditions for Project Success 2015 |
| `context_pmi_success_value_2024`         | In PMI's global research, 74% defined project success as being on time, on budget and delivering a valuable outcome.                                                                                                         | Strategic Alignment; Benefits & Value Realisation; Portfolio & Prioritisation                                            | \* Project Management Institute, Maximizing Project Success 2024           |
| `context_uk_ai_accountability_2025`      | UK Government guidance recommends clear human responsibility, traceability and risk-based controls across the AI lifecycle.                                                                                                  | Digital, Automation & Responsible AI; Risk, Assurance & Resilience; Data, Reporting & Decision Insight                   | \* UK Government, AI Playbook for the UK Government 2025                   |
| `context_nista_confidence_snapshot_2026` | NISTA's 2025–26 report emphasises that delivery-confidence ratings are a point-in-time view of risk, not a definitive judgement of whether a project will succeed or fail.                                                   | Risk, Assurance & Resilience; Data, Reporting & Decision Insight                                                         | \* NISTA, Major Projects Annual Report 2025–26                             |

Selection must favour contextual relevance over novelty. Government major-project statistics must not be presented as a representative SME or cross-industry benchmark. A Snapshot still shows no more than one item.

Primary source references:

- [Association for Project Management — Conditions for Project Success](https://www.apm.org.uk/resources/find-a-resource/conditions-for-project-success/)
- [Project Management Institute — Maximizing Project Success](https://www.pmi.org/learning/thought-leadership/project-success)
- [UK Government — AI Playbook for the UK Government](https://www.gov.uk/government/publications/ai-playbook-for-the-uk-government)
- [NISTA — Major Projects Annual Report 2025–26](https://www.gov.uk/government/publications/nista-major-projects-annual-report-2025-26/nista-major-projects-annual-report-2025-26)

## 8. Version and data treatment

This approval requires:

1. question-set and presentation-policy version become `2.2.0`;
2. configuration ID becomes `delivery-dna-product-config-2.2.0`;
3. new sessions use only the 2.2 catalogue and copy;
4. existing 2.1 records remain immutable, versioned history and are not translated into 2.2;
5. no score, answer value, weight, threshold, Snapshot selection, Overview entitlement or price changes;
6. no assessment, analysis run, checkout, payment, entitlement or customer evidence is created by the cutover; and
7. the live 2.1 Snapshot may remain available while 2.2 is implemented, but active customer promotion should use the accepted 2.2 experience.

## 9. Minimum acceptance evidence

Engineering must update the existing maintained acceptance matrix and consolidated report and demonstrate:

1. exact runtime parity with every replacement in sections 2.1 and 2.2;
2. no customer-facing **our**, **we**, **we're**, **central support** or **central enablement** in the Delivery DNA question journey;
3. all non-enumerated prompts, anchors, IDs, roles, weights and scoring rules unchanged;
4. an even four-card scale at wide widths, two-by-two at intermediate widths, single-column at narrow widths and a separate full-width Not applicable action;
5. save-before-advance, Back/edit, Not applicable reason, keyboard and focus behaviour unchanged;
6. visibly active truthful preparation at normal motion and an accessible reduced-motion equivalent;
7. no fabricated percentage, AI-analysis claim, benchmark claim or frozen transition;
8. result label, expanded interpretation, caveat and compact CTA appearing together before the profile chart;
9. all four exact interpretations selected correctly;
10. no text clipping or horizontal overflow at the named widths and 200% text zoom;
11. domain levels visibly stronger while remaining accessible without colour;
12. exact **Areas of Strength** heading and helper text with DIQ-100D selection invariants unchanged;
13. exact Wellingtone footnote and separate non-benchmark disclosure;
14. every newly displayed evidence item retaining its evidence ID, version, source and deterministic selection reason with no scoring effect;
15. the compact and full Saved Snapshot CTAs using the exact copy and existing secure continuation;
16. historical 2.1 fixtures and all 53 DIQ-203B fixtures passing unchanged where applicable;
17. new 2.2 copy, layout, hierarchy, evidence and version fixtures passing;
18. mobile and desktop hosted visual checks, accessibility check, type checking, changed-file lint/format and production build passing; and
19. no unauthorised checkout, payment, grant, analysis run or customer-data mutation.

## 10. Implementation and promotion

The Head of Software is authorised to:

1. issue the minimum corresponding DIQ-100A/B and DIQ-204/A versions;
2. implement, test, deploy and reconcile the full amendment without another routine approval gate; and
3. return one hosted acceptance result covering the answer grid, transition and complete result page.

This is a customer-experience improvement, not a security or data-integrity incident. The current 2.1 experience may remain live during implementation. Do not begin active customer promotion until the 2.2 hosted result passes Product Owner visual acceptance.

## 11. Approval decision

Matt Prust approved **DIQ-100E v1.0 without amendments** on 5 August 2026. Its status is **LOCKED** and the implementation route in section 10 is authorised.

## 12. Change history

| Version | Date          | Change                                                                                                               | Approval   |
| ------- | ------------- | -------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1.0     | 5 August 2026 | Locked organisation-neutral language, premium Snapshot presentation, stronger conversion and broader sourced context | Matt Prust |

---

**End of DIQ-100E v1.0 — LOCKED**
