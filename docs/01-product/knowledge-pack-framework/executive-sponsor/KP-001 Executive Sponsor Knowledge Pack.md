# KP-001 — Executive Sponsor Knowledge Pack

| Control          | Value                                                       |
| ---------------- | ----------------------------------------------------------- |
| Document ID      | KP-001                                                      |
| Version          | 1.0-RC1                                                     |
| Status           | **PRODUCT OWNER APPROVED — FINAL APPROVAL PENDING**         |
| Owner            | Product Owner                                               |
| Subject owner    | Executive Sponsorship                                       |
| Product approval | Product Owner, 2 August 2026                                |
| Final approver   | Matt Prust                                                  |
| Configuration    | [KP-001A](<KP-001A Executive Sponsor Catalogue.json>)       |
| Golden fixtures  | [KP-001B](<KP-001B Executive Sponsor Golden Fixtures.json>) |
| Framework        | [DIQ-300](<../DIQ-300 Knowledge Pack Framework.md>)         |

> **Approval boundary.** KP-001 is the Product Owner-approved first production Knowledge Pack definition. It becomes production authority only after DIQ-300 and KP-001/A/B receive final approval and locked versions.

## 1. Purpose

Assess how effectively executive sponsorship enables successful delivery and provide evidence-led priorities for strategic alignment, leadership, governance, benefits, risk, stakeholder leadership, delivery confidence, and continuous improvement.

## 2. Audience and Use

Primary: executive sponsors, senior responsible owners, accountable executives, and portfolio/programme sponsors. Secondary: governance leads, assurance, PMO leaders, and executives reviewing sponsorship capability.

The pack assesses sponsorship effectiveness, not the personality, competence, or performance rating of an individual. It may be completed by one sponsor or a verified multi-stakeholder cohort. Results are directional when evidence breadth is limited.

## 3. Entry and Completion

Entry requires an active pack, authenticated workspace, entitlement, `knowledge_pack.start`, consent, and either an eligible DeliveryIQ recommendation or authorised catalogue start. Recommended entry signals include sponsorship/governance priority opportunities, `pat_governance_sponsorship_gap`, `rec_sponsor_contract`, `rec_decision_rights`, or `rec_benefits_ownership`.

Completion requires all required questions answered or validly not applicable, at least six of eight capabilities available, and committed immutable submission. Completion automatically requests shared analysis idempotently.

## 4. Capability Model

| ID                       | Capability                 | Weight | Core diagnostic question                                   |
| ------------------------ | -------------------------- | -----: | ---------------------------------------------------------- |
| `strategic_alignment`    | Strategic Alignment        |   0.15 | Is sponsorship anchored to measurable strategic outcomes?  |
| `sponsor_leadership`     | Sponsorship and Leadership |   0.20 | Is the sponsor visible, active, accountable, and timely?   |
| `governance`             | Governance                 |   0.15 | Does governance enable effective decisions and escalation? |
| `benefits_realisation`   | Benefits Realisation       |   0.15 | Are benefits owned, measured, and used in decisions?       |
| `risk_assurance`         | Risk and Assurance         |   0.10 | Does the sponsor understand and act on risk and assurance? |
| `stakeholder_leadership` | Stakeholder Leadership     |   0.10 | Does sponsorship create alignment and adoption?            |
| `delivery_confidence`    | Delivery Confidence        |   0.10 | Is confidence evidence-led, candid, and current?           |
| `continuous_improvement` | Continuous Improvement     |   0.05 | Does sponsorship turn learning into improvement?           |

Each capability contains five equally weighted required questions. Response anchors inherit DIQ-300. Scoring bands and confidence inherit DIQ-203/DIQ-300. Overall score requires available capability weight ≥0.70.

## 5. Outputs

- Executive Sponsorship Effectiveness score and band.
- Eight capability scores with confidence.
- Top five strengths and priority opportunities.
- Approved patterns and executive narrative.
- Top five prioritised recommendations.
- 30/60/90-day Sponsor Action Plan.
- Relevant Governance, Benefits, Risk, PMO, and Change Pack recommendations.
- Executive, Meeting, Reporting, and RAID TeamMate previews/hand-offs where eligible.
- Full evidence-to-output explainability for authorised roles.

## 6. Approved Patterns

| ID                                      | Predicate summary                                     | Severity |
| --------------------------------------- | ----------------------------------------------------- | -------- |
| `kp001_strategy_sponsorship_disconnect` | strategic alignment ≥50 and sponsor leadership <50    | high     |
| `kp001_governance_without_value`        | governance ≥50 and benefits <50                       | high     |
| `kp001_confidence_blind_spot`           | risk/assurance <50 and delivery confidence ≥75        | critical |
| `kp001_passive_sponsorship`             | sponsor leadership <50 and stakeholder leadership <50 | critical |
| `kp001_effective_executive_control`     | leadership, governance, risk, and confidence all ≥75  | positive |
| `kp001_learning_sponsor`                | benefits and continuous improvement ≥75               | positive |

All constituent capabilities require confidence contribution ≥50. Critical/high wins an exclusive conflict over positive. Exact predicates and copy are in KP-001A.

## 7. Recommendation Catalogue

| ID                                | Recommendation                                      | Outcome                                                                       |
| --------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------- |
| `kp001_rec_sponsor_contract`      | Establish the sponsor contract                      | Explicit accountabilities, availability, decisions, and intervention routines |
| `kp001_rec_success_definition`    | Reconfirm strategic outcomes and success            | Shared measurable definition of success                                       |
| `kp001_rec_governance_reset`      | Reset governance around decisions                   | Faster, accountable decision and escalation flow                              |
| `kp001_rec_benefits_ownership`    | Establish benefits ownership                        | Owned baselines, targets, measures, and reviews                               |
| `kp001_rec_risk_conversation`     | Establish executive risk and assurance conversation | Timely escalation and response to material uncertainty                        |
| `kp001_rec_stakeholder_alignment` | Build senior stakeholder alignment                  | Clear sponsorship coalition and adoption leadership                           |
| `kp001_rec_confidence_review`     | Institute evidence-led delivery confidence review   | Candid current confidence and intervention triggers                           |
| `kp001_rec_learning_cadence`      | Establish sponsor-led improvement cadence           | Lessons converted into owned measurable action                                |

Eligibility, exclusions, impact, effort, dependencies, outcomes, measures, mappings, and exact copy are versioned in KP-001A. Shared DIQ-203 ranking and roadmap policy applies.

## 8. Narrative

Mandatory sections: overall sponsorship position, evidence confidence, leading sponsorship strengths, priority executive interventions, material patterns, and 30/60/90-day action orientation. Workspace maximum 700 words; executive summary maximum 200; Pack preview maximum 80. Tone is candid, constructive, executive, evidence-led, and non-personal.

Prohibited: judging an individual’s character or competence, attributing motive, guaranteeing delivery success, claiming legal/compliance assurance, or asserting causation without evidence.

## 9. Knowledge Pack and TeamMate Mappings

- Governance Pack from governance reset/decision issues.
- Benefits Pack from benefits ownership/value visibility.
- Risk and Assurance Pack from risk/confidence blind spots.
- Stakeholder and Change Pack from alignment/adoption gaps.
- PMO Effectiveness Pack from reporting, cadence, or control support needs.
- Executive TeamMate from accepted sponsor contract, governance, or benefits actions.
- Meeting TeamMate from accepted governance cadence action.
- Reporting TeamMate from accepted confidence/benefits action.
- RAID TeamMate from accepted risk/assurance action.

Mapping never implies entitlement or activation.

## 10. Explainability and Redaction

Every score, pattern, finding, recommendation, and narrative fact includes question/evidence references, capability, rule/version, confidence, configuration set, analysis run, and trace IDs. Standard viewers see aggregate evidence summaries. Auditors may see question labels/values, timestamps, exclusion reasons, and pseudonymous respondent groups. Public/preview modes expose no raw pack evidence. Free text and respondent identity are excluded from narrative generation.

## 11. UX Requirements

- Pre-start screen explains purpose, eight themes, estimated 15–20 minutes, evidence needs, confidentiality, and outputs.
- Section navigation supports save/resume and shows answered/remaining without revealing “desired” answers.
- Results use progressive disclosure, accessible score explanations, and clear distinction between self-reported and verified evidence.
- Multi-respondent disagreement is shown as confidence limitation, never as blame.
- WCAG 2.2 AA, keyboard/screen-reader operation, and responsive 320px+ layouts are required.

## 12. Security, Privacy, and Data

Inherit DIQ-300 and platform controls. Store tenant/workspace, pack/version, session/execution, respondent group, consent, evidence timestamps, snapshots, hashes, and trace. Do not collect sensitive HR performance data, protected characteristics, private executive correspondence, secrets, or unrestricted board materials. Notes are optional, length-limited, excluded from scoring, and redacted by role.

## 13. Acceptance Criteria

1. All 40 stable questions map exactly once to the eight capabilities.
2. Capability and question weights sum exactly to 1.0 at their levels.
3. Minimum, maximum, midpoint, missing, not-applicable, excluded, and threshold fixtures pass.
4. Confidence remains independent of capability level.
5. Every pattern has exact positive and negative fixtures.
6. Every recommendation has eligibility, exclusion, confidence, ranking, dependency, outcome, measure, Pack, and TeamMate coverage.
7. Every visible conclusion has complete traceability.
8. Entry, entitlement, permission, consent, start, save/resume, completion, and automatic analysis are tenant-safe and idempotent.
9. Narrative, redaction, accessibility, performance, and disclosure gates pass.
10. No duplicate platform intelligence logic or automatic TeamMate activation exists.

## 14. Performance Targets

Catalogue/start/read/save targets inherit DIQ-300. Analysis of 40 responses targets p95 ≤5 seconds and p99 ≤10 seconds. Results read warm p95 ≤800 ms. Save operations must not lose a previously committed answer during retry or concurrency conflict.

## 15. Risks and Assumptions

| Risk                                          | Control                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| Single sponsor self-rates too positively      | Respondent breadth/consistency confidence and caveat                             |
| Pack appears to assess individual performance | Capability language, prohibited claims, non-personal narrative                   |
| Questions overlap                             | One primary mapping and trace review                                             |
| Executive advice exceeds evidence             | Confidence gates and evidence-first actions                                      |
| Governance/benefits Packs duplicate content   | KP-001 diagnoses sponsor responsibility; specialist Packs deepen domain practice |

## 16. Change History and Approval

| Version | Date          | Change                                            | Product approval | Final approval     |
| ------- | ------------- | ------------------------------------------------- | ---------------- | ------------------ |
| 1.0-RC1 | 2 August 2026 | Initial complete Executive Sponsor Knowledge Pack | Approved         | Pending Matt Prust |

**Recommendation:** approve KP-001, KP-001A, and KP-001B as version 1.0 without amendments after DIQ-300 approval.

---

**End of KP-001 v1.0-RC1 — Product Owner approved; final approval pending**
