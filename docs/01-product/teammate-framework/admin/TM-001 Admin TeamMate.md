# TM-001 — Admin TeamMate

| Control               | Value                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| Document ID           | TM-001                                                                                                       |
| Version               | 1.0-RC2                                                                                                      |
| Status                | **PRODUCT OWNER APPROVED — FINAL APPROVAL PENDING**                                                          |
| Owner                 | Product Owner                                                                                                |
| Subject owner         | Business Administration                                                                                      |
| Product approval      | Product Owner, 2 August 2026                                                                                 |
| Final approver        | Matt Prust                                                                                                   |
| Framework             | [DIQ-400 v1.0-RC3](<../DIQ-400 TeamMate Framework.md>)                                                       |
| Commerce and delivery | [DIQ-401](<../DIQ-401 TeamMate Commerce Provisioning and Delivery Framework.md>)                             |
| Manifest              | [TM-001A](<TM-001A Admin TeamMate Manifest.json>)                                                            |
| Golden fixtures       | [TM-001B](<TM-001B Admin TeamMate Golden Fixtures.json>)                                                     |
| First profile         | [TM-001P-001 Delivery Operations](<profiles/delivery-operations/TM-001P-001 Delivery Operations Profile.md>) |
| Classification        | Internal — Controlled                                                                                        |

> **Approval boundary.** TM-001 is the Product Owner-approved horizontal Admin TeamMate for SMEs across industries. It becomes production authority only after DIQ-400/A/B and TM-001/A/B are final-approved and locked, at least one compatible profile package is locked, the TeamMate taxonomy decision in Section 22 is resolved through controlled change, and an applicable implementation playbook is locked. This document does not activate a TeamMate or grant Microsoft 365 access.

## 1. Definition

The **Admin TeamMate** is a persistent digital administrative coordinator for a named SME organisation, workspace, function, team or business process. It helps people keep meetings, tasks, records, schedules, documents and communications organised by applying an approved work profile to authorised business context.

It is business administration, not DeliveryIQ platform administration and not an unbounded general agent. It has no identity, billing, security, tenant-management or system-configuration authority and cannot exercise professional or accountable judgement.

**Customer promise:** _Spend less time organising, preparing and following up routine administration, while retaining complete control over decisions, communications and material changes._

### 1.1 Cross-industry product architecture

TM-001 is deliberately industry-neutral:

```text
Admin TeamMate core
  + approved work profile
  + optional industry overlay
  + customer configuration
  = governed customer instance
```

- The core supplies identity, capabilities, safety, memory, work queue, audit, approvals and integrations.
- A work profile supplies outcomes, workflow selection, terminology, templates and record semantics.
- An optional industry overlay supplies sector vocabulary, schemas, connectors, classification/retention and stricter prohibitions.
- Customer configuration selects approved options, named processes, schedules, resources and terminology.

No profile or overlay can widen the core capability/risk envelope. The first profile is Delivery Operations; it proves the model but does not define the core product.

## 2. Primary Customers and Users

### 2.1 Buyers

- SME founders, owners and managing directors.
- Operations, office and practice managers.
- Functional leaders who carry substantial coordination overhead.
- Professional and field-service businesses managing repeatable customer work.
- Delivery/PMO leaders selecting the Delivery Operations profile.

### 2.2 Daily users

- Owners and managers coordinating a small business or function.
- Administrators, office/practice managers and coordinators.
- Team leads and authorised action/record owners.
- Executive or personal assistants working within business scope.
- Profile-specific operators such as project/programme coordinators.

### 2.3 Accountable owner

Every instance has one named accountable owner responsible for its scope, data sources, capability grants, standing policies and continued appropriateness. Ownership can be transferred only through an authorised audited workflow.

## 3. Supported Outcomes

1. Meetings and recurring administrative events are prepared with current authorised information.
2. Approved tasks, actions and decisions have visible owners, dates and follow-through.
3. Agreed business records are current enough to support human work and decisions.
4. Routine documents, updates and communications are prepared from traceable sources with limitations visible.
5. Overdue, missing, conflicting or stale administrative information is surfaced to the right owner.
6. Administrative effort is reduced without removing accountability or creating hidden automation.

The TeamMate supports these outcomes; it does not claim sole causation, guarantee a business result or replace professional judgement.

## 4. Premium Product Proposition

TM-001 is not sold as a generic chat feature. Premium value comes from a governed combination of:

- a persistent role and named workspace scope;
- DeliveryIQ records/intelligence where applicable and authorised profile/customer context;
- authorised Microsoft 365, file and approved business-system context;
- reusable administration workflows;
- proactive but controlled scheduled work;
- high-quality drafts from approved templates;
- visible work queue, approvals and activity history;
- inspectable memory and source provenance;
- measurable supported outcomes and service reliability.

### 4.1 Packaging model

| Package             | Included experience                                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DeliveryIQ Core     | Contextual guidance, explanations and drafts inside DeliveryIQ; R0/R1 only                                                                                                          |
| TeamMate Premium    | Persistent instance, work queue, governed memory, scheduled monitoring, R2 DeliveryIQ coordination, Outlook/Teams in-context extensions and premium templates                       |
| TeamMate Enterprise | Organisation deployment controls, advanced retention/redaction, custom connectors, separation of duties, audit exports, enterprise support and type-specific approved R3 extensions |

Commercial packaging never bypasses availability, entitlement, permission, consent or capability policy. R3 is not part of TM-001 v1.0 even for Enterprise.

DIQ-401 governs website purchase, subscription, entitlement, provisioning and delivery. A purchase fulfils a ready-to-configure Admin allocation; it never activates TM-001 or connects customer data automatically.

### 4.2 Profile model

Customers buy the Admin TeamMate product and select an available work profile. They do not buy a separate codebase for each industry. Approved examples may include:

- General Business Administration;
- Delivery Operations;
- Professional Practice Administration;
- Property/Facilities Administration;
- Field Service Administration;
- Membership/Charity Administration.

Only Delivery Operations is defined in the current package. Other examples are roadmap concepts, not available products or approved industry claims.

## 5. Jobs to Be Done

### 5.1 Start of day

- Produce a concise business administration briefing.
- List meetings requiring preparation.
- Identify overdue or unowned actions.
- Surface decisions approaching their required date.
- Highlight stale records, measures or recurring inputs selected by the profile.
- Propose the next administrative priorities.

### 5.2 Before a meeting

- Assemble current agenda and pre-read draft.
- Summarise relevant authorised records, previous actions and profile-defined context.
- Identify decisions required, supporting evidence and unresolved conflicts.
- Check whether required owners/contributors have supplied updates.
- Draft meeting/appointment content in the user’s active Outlook compose surface.
- Prepare questions and follow-up prompts without deciding the answer.

### 5.3 During a meeting

When explicit participant notice/consent exists:

- capture notes or receive authorised transcript/notes;
- identify proposed decisions, actions, owners and dates;
- distinguish discussion, proposal and confirmed human decision;
- flag ambiguity for confirmation;
- create draft minutes and records, never approved minutes.

TM-001 does not covertly record, infer participant sentiment or judge individual contribution.

### 5.4 After a meeting

- Present proposed decisions and actions for human confirmation.
- Record confirmed decisions/actions in DeliveryIQ.
- Prepare follow-up communication as an unsent draft.
- Schedule approved internal reminders.
- Update the work queue and trace every change to the meeting/source.
- Escalate missing owner/date or conflicting instruction.

### 5.5 Recurring updates and records

- Assemble an evidence-led recurring update or document draft.
- Summarise task, decision, record and measure changes selected by the profile.
- Reconcile approved sources and identify gaps or conflicts.
- Draft audience-appropriate commentary with confidence/limitations.
- Save a labelled versioned draft in the approved DeliveryIQ location.
- Prepare, but never send or publish, related communications.

### 5.6 Continuous administration

- Monitor configured due dates, ageing, stale updates and threshold rules.
- Propose reminders and escalations.
- Maintain approved DeliveryIQ administrative workflow states.
- Provide an inspectable record of work completed, blocked and awaiting approval.

## 6. Exact Capability Grant

TM-001A is authoritative. TM-001 v1.0 permits:

| Capability                   | Risk | Customer use                                                     |
| ---------------------------- | ---- | ---------------------------------------------------------------- |
| `context.read`               | R0   | Read allow-listed DeliveryIQ and connected context               |
| `intelligence.explain`       | R1   | Explain relevant intelligence and recommendations                |
| `evidence.summarise`         | R1   | Summarise authorised evidence with provenance                    |
| `guidance.provide`           | R1   | Provide administration guidance                                  |
| `artifact.draft`             | R1   | Draft agendas, reports, briefs and minutes                       |
| `scenario.compare`           | R1   | Compare administrative options/assumptions                       |
| `plan.propose`               | R1   | Propose actions, cadence, owners and sequence                    |
| `task.coordinate`            | R2   | Create/update authorised DeliveryIQ actions/work state           |
| `reminder.schedule`          | R2   | Schedule visible internal reminders                              |
| `decision.record`            | R2   | Record a human-confirmed decision                                |
| `signal.monitor`             | R0   | Monitor approved state on a visible schedule                     |
| `exception.detect`           | R1   | Identify stale, missing or threshold-breaching state             |
| `escalation.propose`         | R1   | Draft an escalation to an approved owner                         |
| `meeting.prepare`            | R1   | Prepare agenda, pre-read and decision material                   |
| `meeting.capture`            | R2   | Capture authorised notes and draft minutes/actions               |
| `communication.draft`        | R1   | Draft an email/message without inserting/sending                 |
| `communication.insert_draft` | R2   | Insert content into the user-present unsent Outlook compose item |
| `calendar.draft`             | R2   | Prepare/update user-present unsent appointment draft             |
| `artifact.save_draft`        | R2   | Save labelled draft in approved DeliveryIQ location              |
| `integration.read`           | R0   | Read exact allow-listed connector resources                      |
| `outcome.observe`            | R2   | Record an authorised outcome observation                         |
| `outcome.summarise`          | R1   | Summarise outcome observations without causation claim           |
| `feedback.record`            | R2   | Record explicit correction/usefulness feedback                   |

TM-001 v1.0 does not grant `integration.write` or `communication.send`.

## 7. Prohibited Work

TM-001 cannot:

- make, approve or represent an accountable, professional, financial, legal, clinical, employment or regulatory decision;
- accept liability/risk or close a material issue without accountable-owner confirmation;
- approve contracts, accounts, filings, reports, minutes, advice or formal records;
- change identity, access, tenant, security, retention, billing or product configuration;
- access a whole mailbox, whole document estate or unrelated workspace by default;
- send email, meeting invitations or Teams messages;
- commit calendar changes that notify attendees;
- mutate external task/document systems;
- allocate resources, funding, credit, treatment, legal position or business priority;
- monitor or score employee performance, sentiment or productivity;
- create hidden user profiles or retain unrestricted meeting/email content;
- activate another TeamMate or expand its own permissions.

## 8. System and Integration Boundaries

### 8.1 DeliveryIQ — authoritative home

TM-001 may interact with authorised:

- business records made available through the selected profile and resource grant;
- Delivery Intelligence, recommendations and outcomes where applicable;
- tasks, actions, owners, dates, decisions, meetings, measures and documents;
- profile-defined records where their schemas/classification rules are approved;
- TeamMate work queue, drafts, schedules, approvals, memory and activity history;
- workspace membership and permission decisions through platform services.

DeliveryIQ remains the source of TeamMate identity, capabilities, approvals, memory policy and audit.

### 8.2 Outlook Mail

Approved v1 pattern:

1. User opens the DeliveryIQ Outlook add-in on a selected message or compose item.
2. The add-in explains exactly what current-item content will be shared.
3. User explicitly invokes a task such as **Summarise for DeliveryIQ**, **Create action draft**, or **Insert follow-up draft**.
4. TM-001 receives only the selected/current item fields needed for the task.
5. Any inserted content remains an unsent, visible, reversible draft in the user-present compose surface.
6. TM-001 cannot press send or access unrelated messages.

No continuous whole-inbox read is approved. Protected/restricted items obey Microsoft/client policy and fail safely.

### 8.3 Outlook Calendar

Approved v1 access is delegated and scoped to selected calendars/resources:

- read relevant events and availability;
- identify selected profile-relevant meetings and preparation needs;
- use Outlook change notifications for allow-listed resources when approved;
- prepare an unsent appointment draft in the user-present compose surface;
- never invite attendees or commit meeting changes.

Calendar write/send is a future R3 extension requiring a locked type amendment.

### 8.4 Microsoft Teams

Approved premium extension:

- personal/app tab showing the DeliveryIQ TeamMate work queue;
- contextual conversation over authorised DeliveryIQ records;
- adaptive approval/information cards that link to DeliveryIQ;
- meeting preparation and follow-up drafts;
- no message posting, meeting recording or channel-wide reading in v1.

### 8.5 SharePoint and OneDrive

TM-001 may read only explicitly selected/allow-listed files or folders through delegated access. It may extract evidence and prepare a DeliveryIQ draft. Writing back, sharing, changing permissions or broad site crawling is not approved in v1.

### 8.6 Business tools

Jira, Asana, Planner, CRM, practice, property, field-service or other tool access is profile/connector configuration. v1 may read selected records only where separately approved; external mutation remains prohibited. DeliveryIQ internal administrative coordination is the initial authoritative workflow.

## 9. Microsoft Permission Strategy

Use least privilege and progressive consent.

| Level | Access                                               | Product behaviour                                           |
| ----- | ---------------------------------------------------- | ----------------------------------------------------------- |
| M0    | No Microsoft connection                              | DeliveryIQ-only TeamMate                                    |
| M1    | Outlook add-in current selected/read or compose item | User-invoked current-item summary/draft insertion           |
| M2    | Delegated selected-calendar read                     | Briefing, preparation and monitoring for approved calendars |
| M3    | Approved resource change notifications               | Event-driven refresh without broad polling                  |
| M4    | R3 send/external write                               | Not approved in TM-001 v1.0                                 |

Prefer delegated access on behalf of a signed-in user. Application permissions require a separately approved enterprise use case, tenant-admin consent, resource restriction and threat/privacy review. Permission consent does not equal a TeamMate capability grant or action approval.

Relevant Microsoft platform references:

- [Outlook add-ins overview](https://learn.microsoft.com/office/dev/add-ins/outlook/read-scenario)
- [Outlook add-in APIs and permission levels](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/apis)
- [Privacy and security for Office Add-ins](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/privacy-and-security)
- [Microsoft Graph delegated and application permissions](https://learn.microsoft.com/en-us/graph/permissions-overview)
- [Microsoft Graph permission best practices](https://learn.microsoft.com/en-us/graph/best-practices-graph-permission)
- [Outlook change notifications](https://learn.microsoft.com/en-us/graph/outlook-change-notifications-overview)

## 10. Where the Customer Finds It

### 10.1 Primary home: DeliveryIQ Workspace

Navigation: **Workspace → My TeamMates → Admin**.

Home contains:

- role, supported outcomes, scope and accountable owner;
- current state and connected systems;
- **Today** briefing;
- work queue: needs attention, drafts, awaiting approval, scheduled and completed;
- conversation with context selector;
- activity and outcome summary;
- memory, permissions, schedules and pause/revoke controls.

### 10.2 Persistent workspace panel

A right-side TeamMate panel is available from approved DeliveryIQ records, actions, meetings, documents, results and profile-defined objects. It receives only the current authorised object plus explicitly added context.

Primary actions:

- **Ask Admin**
- **Prepare meeting**
- **Draft update**
- **Coordinate follow-up**
- **Explain this**
- **Add to work queue**

### 10.3 Outlook extension

An Outlook ribbon command/task pane appears on supported message and appointment read/compose surfaces. It is an extension of the same instance—not a second TeamMate—and returns to DeliveryIQ for full context, memory, approvals and audit.

### 10.4 Teams extension

A personal app/tab and contextual cards expose briefing, drafts and approvals. Detailed evidence and configuration open in DeliveryIQ.

### 10.5 Notifications

Optional daily/weekly digest notifications summarise priority work and link to DeliveryIQ. Notifications contain minimum necessary information and are not the system of record.

## 11. How the Customer Engages

### 11.1 Activation journey

For a purchased offer, DIQ-401 must first provide an active entitlement and `ready_to_configure` allocation. This is a commercial hand-off only; the customer must still complete every activation step below.

1. Discover TM-001 from an accepted recommendation or approved catalogue.
2. Review role, promise, exclusions and premium entitlement.
3. Select organisation/workspace/function/process scope and approved profile.
4. Name accountable owner and participants.
5. Choose DeliveryIQ records and optional integrations.
6. Review every requested permission and resource scope.
7. Select capability grants up to the type maximum.
8. Configure profile workflows, cadence and standing R2 policies.
9. Review memory, retention, approval and escalation policy.
10. Consent and activate an immutable instance snapshot.

### 11.2 Engagement modes

| Mode       | Customer experience                                                         |
| ---------- | --------------------------------------------------------------------------- |
| Ask        | User asks a contextual question and receives grounded guidance              |
| Prepare    | TeamMate creates a labelled draft artifact for review                       |
| Coordinate | User commands or approves a reversible DeliveryIQ workflow update           |
| Monitor    | TeamMate performs visible scheduled reads and proposes exceptions/reminders |
| Review     | Customer inspects pending work, approvals, memory and history               |

### 11.3 Proactive behaviour

TM-001 may proactively create a work-queue item or notification only under a visible configured schedule/rule. It may not initiate an R2/R3 side effect beyond the approved standing R2 policy.

Examples:

- “Three actions need an owner update before Friday.”
- “Tomorrow’s meeting has two decisions without supporting information.”
- “The recurring update draft is ready; two source records are out of date.”
- “Record R-014 passed its configured follow-up threshold. Review the proposed escalation.”

## 12. Work Queue and Approval Centre

Every item shows:

- title, purpose and source context;
- originating user, schedule or approved rule;
- capability and risk level;
- proposed output/change and affected records;
- evidence/provenance and material limitations;
- owner, due/expiry time and status;
- required approval and exact next action;
- cancellation, correction and escalation controls.

Statuses: `proposed`, `draft_ready`, `awaiting_approval`, `approved`, `in_progress`, `completed`, `partially_failed`, `failed`, `cancelled`, `expired`, `superseded`.

Approval of one item cannot authorise a materially different item. R2 standing policies are separately visible and revocable.

## 13. Memory

TM-001 may remember only:

- approved organisation/workspace terminology and administrative cadence;
- named roles and authorised operational preferences;
- active DeliveryIQ work/draft/schedule state;
- explicit corrections and user feedback;
- approved outcome observations;
- audit references.

It does not remember unrestricted email bodies, meeting transcripts, credentials, private correspondence, hidden reasoning, employee profiles or data outside the instance scope. Selected email/meeting content is task context and is discarded after the task unless an authorised user explicitly saves a minimised DeliveryIQ record under retention policy.

The Memory Centre allows authorised users to inspect source, purpose, owner, retention and use; correct/supersede; export; and request deletion subject to lawful audit retention.

## 14. Workflow Catalogue

### W1 — Daily Admin Briefing

Reads profile-selected tasks, decisions, meetings, records, measures and schedules. Produces a concise prioritised administrative briefing with sources and limitations. No mutation.

### W2 — Meeting Preparation

Reads the selected meeting and approved profile context. Drafts agenda, preparation notes, decisions required, task status and questions. May insert into a user-present unsent appointment/email draft. Does not invite/send.

### W3 — Consented Meeting Follow-up

Consumes authorised notes/transcript. Produces draft minutes, decisions and actions. Human confirms each material record before DeliveryIQ write. Drafts follow-up communication but does not send.

### W4 — Action Follow-through

Monitors approved action state. Creates work-queue exceptions and, under explicit command/standing R2 policy, schedules internal reminders or updates authorised DeliveryIQ workflow state. Does not change owner/date/status beyond granted rules.

### W5 — Recurring Update Draft

Reconciles approved sources, identifies missing/stale/conflicting inputs, drafts the profile-defined update/document, and saves a labelled versioned DeliveryIQ draft. A human approves the final artifact outside TM-001.

### W6 — Record and Decision Exception Review

Applies profile-approved thresholds to authorised records, explains decisive facts and proposes follow-up/escalation. It cannot accept liability/risk, close material items or make decisions.

## 15. Explainability and Trust

Every briefing statement, exception, draft fact, proposed action and recorded change must provide:

- source record IDs and timestamps;
- capability/workflow and versions;
- reason code and plain-language rationale;
- material assumptions, missing data and conflicts;
- whether content is source fact, TeamMate inference, proposal, draft or human-confirmed record;
- approver/command and side-effect result when applicable;
- audit/correlation reference.

Customers can challenge a result, remove a source, correct memory and see what changes. The TeamMate never exposes hidden chain-of-thought; it provides concise evidence-based rationale.

## 16. Security and Privacy

- Tenant/workspace/instance/resource scope enforced at every read, cache, job, tool and event.
- Microsoft and other connectors use least-privilege delegated access and allow-listed resources.
- No broad mailbox/site access by default.
- Selected content is minimised and treated as untrusted data.
- Prompt injection cannot grant capability, broaden resource scope or approve action.
- Protected/sensitivity-labelled content follows source-system restrictions and DeliveryIQ classification policy.
- Secrets/tokens never enter prompts, memory, content logs or customer-visible errors.
- Meeting capture requires notice/consent and configured retention.
- Client roles cannot mutate TeamMate policy, audit or protected execution records.
- Pause/suspend/revoke blocks new work before side effect.

## 17. UX and Accessibility

- Use colleague-like clarity without implying human identity or accountability.
- Show the TeamMate name and digital nature consistently.
- Drafts, proposals and committed records have unmistakable status.
- Capability, context and approval explanations use plain language.
- Core journeys meet WCAG 2.2 AA at 320px+ and support keyboard, screen reader, focus, non-colour meaning and accessible status announcements.
- Approval views prioritise target, content, affected records, reversibility and risk—not technical details.
- Empty/proactive states explain how to get value rather than manufacturing activity.
- The customer can always access pause, work queue, permissions, memory and activity history.

## 18. Success Measures

### 18.1 Product and operational measures

| Measure                    | Definition                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| Preparation time supported | Customer-confirmed time category saved per approved workflow, never background employee monitoring |
| Draft adoption             | Percentage of drafts accepted with/without material edit                                           |
| Action completeness        | Approved actions with owner/date/source completeness                                               |
| Follow-through             | Due actions updated or explicitly escalated in the agreed cadence                                  |
| Information freshness      | Approved profile records/measures/updates within configured freshness policy                       |
| Decision readiness         | Meetings with required decision/evidence pack prepared by deadline                                 |
| Safe-action rate           | Actions completed without unauthorised side effect, tenant breach or duplicate                     |
| Customer trust             | Explicit usefulness/correction feedback and activation retention                                   |

Measures are tenant-level or workflow-level unless individual attribution is necessary for the action record. They must not become employee productivity scoring.

### 18.2 Premium service expectations

- High-quality repeatable templates and outputs.
- Reliable scheduled work and visible failure recovery.
- Enterprise-grade audit, retention and permission transparency.
- Configurable but bounded workflows.
- Clear evidence of supported administrative outcomes.
- Dedicated onboarding and integration validation for Enterprise.

## 19. Performance and Reliability

Inherit DIQ-400, plus:

| Operation                                      | Target                                      |
| ---------------------------------------------- | ------------------------------------------- |
| TeamMate home/work queue read                  | p95 ≤800 ms                                 |
| Daily briefing after sources available         | p95 ≤10 s                                   |
| Meeting/report draft up to 20 approved sources | p95 ≤15 s                                   |
| Outlook selected-item task pane ready          | p95 ≤3 s excluding Microsoft authentication |
| Insert into active compose draft               | p95 ≤2 s after generated draft approval     |
| Pause/revoke                                   | Blocks new work within 5 s                  |

Scheduled workflows are idempotent and visible. Duplicate source notifications do not duplicate work. Partial failure identifies successful/failed sources/items. No committed record or draft is silently lost.

## 20. Required Golden Coverage

TM-001B must cover:

- activation and progressive Microsoft consent;
- DeliveryIQ-only operation;
- selected Outlook item and calendar resource scope;
- active compose draft insertion with no send;
- consented and non-consented meeting capture;
- daily briefing, meeting preparation/follow-up, task, recurring-update and record-exception workflows;
- profile/industry overlay narrowing, compatibility and portability;
- missing/stale/conflicting evidence;
- R2 explicit command and standing-policy boundaries;
- all prohibited decisions and R3 attempts;
- prompt injection, cross-tenant/resource and sensitive-content denial;
- memory inspection/correction/deletion and no implicit retention;
- pause/revoke, idempotency, retry and partial failure;
- accessibility, customer copy and complete audit/provenance.

## 21. Release Gates

- [ ] DIQ-400/A/B and TM-001/A/B are version 1.0 **LOCKED** and consistent.
- [ ] DIQ-401/A/B are version 1.0 **LOCKED** before a paid e-commerce offer is made purchasable.
- [ ] At least one TM-001 profile package is version 1.0 **LOCKED** and cannot widen the Admin type.
- [ ] Taxonomy decision in Section 22 is approved through controlled change.
- [ ] All exact capabilities, workflows, sources, memory and approval rules are implemented without expansion.
- [ ] No whole-mailbox/site access, external send/write or platform-admin authority exists.
- [ ] Outlook/Teams client/platform support and graceful degradation are tested.
- [ ] Microsoft delegated permissions, resource scopes, consent, revocation and admin deployment controls pass.
- [ ] Golden fixtures, tenant isolation, injection, R4 refusal, R2 approval and audit tests pass.
- [ ] Accessibility, performance, resilience, privacy, security, migration and rollback gates pass.
- [ ] Premium onboarding, support, service monitoring and customer-success material are ready.
- [ ] Product Owner and Matt Prust accept the production release.

## 22. TeamMate Taxonomy Decision

TM-001 and its Delivery Operations profile overlap the existing `meeting`, `reporting` and `raid` Sprint 03 preview types. Product Owner recommendation:

1. Position **Admin TeamMate** as the first premium customer-facing TeamMate.
2. Keep the Admin core horizontal for SMEs and express delivery-specific language, RAID, governance/reporting and mappings only through the Delivery Operations profile.
3. Treat meeting preparation/follow-up, recurring updates and record coordination as reusable Admin workflow modules rather than hard-coded sector products.
4. Preserve existing locked preview IDs and mappings for history until a versioned amendment defines migration/alias behaviour.
5. Do not silently rename, delete or reclassify any locked DIQ-203 type.

Final approval of TM-001 requires a controlled Product Decision Record or versioned DIQ-203 amendment accepting this taxonomy and defining preview-to-product mapping.

## 23. Risks and Controls

| Risk                                          | Control                                                                                   |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| “Admin” implies system administrator          | Customer name **Admin** and explicit no-platform-admin boundary                           |
| Product becomes a generic assistant           | Named outcomes, exact workflows, type manifest and no self-expansion                      |
| Product is trapped in delivery/PMO            | Industry-neutral core, versioned work profiles and optional industry overlays             |
| Profile creates unsafe professional authority | Profile may only narrow; regulated overlays require specialist/legal/privacy approval     |
| Broad Microsoft consent undermines trust      | Progressive delegated access, selected resources/current item and no full mailbox default |
| Proactivity becomes intrusive                 | Visible schedules/rules, bounded notifications, quiet controls and pause                  |
| Drafts are mistaken for approved records      | Persistent draft/proposal labels and human confirmation                                   |
| Meeting capture creates privacy risk          | Explicit notice/consent, minimisation, retention and no sentiment scoring                 |
| Premium value is just chat                    | Persistent work queue, integrations, workflow, memory, audit and outcomes                 |
| Overlap with existing preview types           | Controlled taxonomy decision before activation                                            |
| Customer rubber-stamps output                 | Exact provenance, limitations, review UX and material change cues                         |

## 24. Change History and Approval

| Version | Date          | Change                                                                                                      | Product approval | Final approval                           |
| ------- | ------------- | ----------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------- |
| 1.0-RC1 | 2 August 2026 | Initial Delivery Admin reference product definition                                                         | Approved         | —                                        |
| 1.0-RC2 | 2 August 2026 | Refactored Admin into a horizontal cross-industry SME product with Delivery Operations as its first profile | Approved         | Pending Matt Prust and taxonomy decision |

## 25. Final Approval Request

**Recommendation:** approve the product direction and taxonomy in Section 22, then promote TM-001/A/B to version 1.0 and status **LOCKED** alongside DIQ-400/A/B.

**Consequence:** TM-001 becomes the reusable Admin type for cross-industry SME offers. Work profiles/industry overlays change its job vocabulary and workflows without forking the runtime or widening its power. Approval does not activate Microsoft permissions or a production instance.

---

**End of TM-001 v1.0-RC2 — Product Owner approved; final approval and taxonomy decision pending**
