# S4-013 Recommendation Analytics Data Dictionary

## Status and scope

This dictionary governs the privacy-safe product-learning signals introduced by S4-013. The event schema is allow-listed, versioned as `deliveryiq.recommendation-analytics/1.0.0`, tenant-scoped and pseudonymous. It must never contain assessment answers, notes, evidence, free text, secrets, prompts or internal rule content.

## Consent record

`recommendation_analytics_consent_events` is an append-only record of an authenticated user's current choice for an organisation.

| Field                              | Meaning                                     | Privacy and validation                                             |
| ---------------------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| `id`                               | Immutable consent-event identifier          | UUID; generated server-side                                        |
| `organisation_id` / `workspace_id` | Tenant scope at the time of choice          | Active membership and workspace ownership checked server-side      |
| `user_id`                          | Identity making the choice                  | Restricted service-role record; never copied into analytics events |
| `status`                           | `granted` or `withdrawn`                    | Latest version controls collection immediately                     |
| `consent_version`                  | Monotonic version per organisation and user | Advisory lock prevents concurrent duplicates                       |
| `idempotency_key` / `request_hash` | Safe replay contract                        | Same key plus different request is rejected                        |
| `occurred_at`                      | Server receipt time                         | Immutable                                                          |

Consent history is a business/audit record and is not included in the purgeable analytics-event entity.

## Analytics event

`recommendation_analytics_events` contains only the following common fields.

| Field                                          | Meaning                                    | Privacy and validation                                          |
| ---------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------- |
| `event_id`                                     | Caller-generated idempotency identifier    | 8–160 approved token characters; exact replay deduplicates      |
| `organisation_id` / `workspace_id`             | Tenant scope                               | Verified against active membership and source object            |
| `actor_pseudonym`                              | Tenant-scoped actor pseudonym              | HMAC-SHA-256; no user ID in the stored event                    |
| `event_type`                                   | Approved categorical event                 | Database enum and application allow-list                        |
| `object_type` / `object_id` / `object_version` | Governed source and version                | Source must exist in the same tenant; bounded token values      |
| `mode`                                         | `workspace` or `executive_report`          | Approved categorical value                                      |
| `properties`                                   | Event-specific categorical values only     | Exact key/value allow-list below; unknown fields fail closed    |
| `consent_event_id`                             | Exact granting consent version             | Must still be the user's current granted choice at capture time |
| `schema_version`                               | Analytics contract version                 | Exact value `deliveryiq.recommendation-analytics/1.0.0`         |
| `request_hash`                                 | Semantic replay hash                       | Conflicting replay rejected                                     |
| `occurred_at` / `ingested_at`                  | Client occurrence and server receipt times | ISO timestamp required; immutable                               |
| `archived_at`                                  | Governed retention state                   | Only the retention routine may set it                           |

## Approved event contracts

| Event                    | Object           | Required categorical properties                                                 |
| ------------------------ | ---------------- | ------------------------------------------------------------------------------- |
| `portfolio_viewed`       | `portfolio`      | none                                                                            |
| `explanation_opened`     | `portfolio_item` | none                                                                            |
| `decision_recorded`      | `decision`       | `decision_state`: `undecided`, `accepted`, `deferred`, `rejected`, `superseded` |
| `action_started`         | `action`         | `action_state`: `in_progress`                                                   |
| `action_blocked`         | `action`         | `action_state`: `blocked`                                                       |
| `action_completed`       | `action`         | `action_state`: `completed`                                                     |
| `outcome_observed`       | `outcome`        | none                                                                            |
| `knowledge_pack_handoff` | `handoff`        | `handoff_state`: `consumed`                                                     |
| `teammate_handoff`       | `handoff`        | `handoff_state`: `consumed`                                                     |
| `usefulness_submitted`   | `portfolio_item` | `usefulness`: `helpful`, `not_helpful`                                          |

The `outcome_observed` contract is reserved and validated. Persistence remains fail-closed until S4-010 provides an approved immutable, tenant-owned outcome source. This prevents an unverified outcome identifier from crossing tenant boundaries.

## Aggregate projection

The governed product aggregate groups only by event type, mode and approved categorical properties. It returns `tenant_count` and `event_count` only when at least 10 distinct organisations contribute to that exact group. It does not return tenant, workspace, actor or object identifiers, and it cannot alter a recommendation rule or catalogue.

## Consent, retention and deletion

- Collection is off until explicit grant and stops immediately after withdrawal.
- Event retention uses the existing versioned `platform_retention_policies` entity `recommendation_analytics_events`; no retention horizon is hard-coded in application logic.
- Archive marks only `archived_at`; purge permanently removes only selected expired analytics events through the governed routine.
- Direct update/delete is rejected. Consent records remain immutable audit history.
- A tenant filter may be applied to retention. Cross-tenant retention requires the existing elevated retention runner.
