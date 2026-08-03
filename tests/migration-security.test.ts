import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260802132259_6eb86fbf-5303-442c-bf8d-74f6499f2bde.sql",
    import.meta.url,
  ),
  "utf8",
);
const hardening = readFileSync(
  new URL(
    "../supabase/migrations/20260802133013_a2888f14-0304-445c-8440-63d3478e0c16.sql",
    import.meta.url,
  ),
  "utf8",
);
const triggerHardening = readFileSync(
  new URL(
    "../supabase/migrations/20260802133500_c80e2829-b89f-45f2-9f85-e9dace5f5cb1.sql",
    import.meta.url,
  ),
  "utf8",
);
const resultHardening = readFileSync(
  new URL(
    "../supabase/migrations/20260802134814_278ac71d-1e67-45e4-bfcb-3f06b8dfcbf7.sql",
    import.meta.url,
  ),
  "utf8",
);
const finalHardening = readFileSync(
  new URL(
    "../supabase/migrations/20260802140125_3877a0d0-dea6-4429-8eef-8c2e9af0bcea.sql",
    import.meta.url,
  ),
  "utf8",
);
const handoffMigration = readFileSync(
  new URL("../supabase/migrations/20260802150000_analysis_handoff_outbox.sql", import.meta.url),
  "utf8",
);
const handoffHardeningMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260802151000_harden_analysis_handoff_permissions.sql",
    import.meta.url,
  ),
  "utf8",
);
const eligibilityMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260802161000_analysis_eligibility_decisions.sql",
    import.meta.url,
  ),
  "utf8",
);
const eligibilityRemediation = readFileSync(
  new URL(
    "../supabase/migrations/20260802161500_remediate_locked_ineligible_analysis.sql",
    import.meta.url,
  ),
  "utf8",
);
const eligibilityHardening = readFileSync(
  new URL(
    "../supabase/migrations/20260802162000_harden_analysis_eligibility_permissions.sql",
    import.meta.url,
  ),
  "utf8",
);
const catalogueMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260803010000_recommendation_catalogue_governance.sql",
    import.meta.url,
  ),
  "utf8",
);
const catalogueHardening = readFileSync(
  new URL(
    "../supabase/migrations/20260803011000_harden_recommendation_catalogue_permissions.sql",
    import.meta.url,
  ),
  "utf8",
);
const recommendationEvaluationMigration = readFileSync(
  new URL("../supabase/migrations/20260803020000_recommendation_evaluations.sql", import.meta.url),
  "utf8",
);
const recommendationEvaluationHardening = readFileSync(
  new URL(
    "../supabase/migrations/20260803021000_harden_recommendation_evaluation_permissions.sql",
    import.meta.url,
  ),
  "utf8",
);
const productGovernanceRoleMigration = readFileSync(
  new URL("../supabase/migrations/20260803022000_add_product_governance_role.sql", import.meta.url),
  "utf8",
);
const productGovernanceIsolationMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260803023000_isolate_product_governance_role.sql",
    import.meta.url,
  ),
  "utf8",
);
const recommendationConfidenceGateMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260803030000_recommendation_confidence_gates.sql",
    import.meta.url,
  ),
  "utf8",
);
const recommendationConfidenceGateHardening = readFileSync(
  new URL(
    "../supabase/migrations/20260803031000_harden_recommendation_confidence_permissions.sql",
    import.meta.url,
  ),
  "utf8",
);
const recommendationResolutionMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260803040000_recommendation_conflict_resolutions.sql",
    import.meta.url,
  ),
  "utf8",
);
const recommendationResolutionHardening = readFileSync(
  new URL(
    "../supabase/migrations/20260803041000_harden_recommendation_resolution_permissions.sql",
    import.meta.url,
  ),
  "utf8",
);
const recommendationPriorityMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260803050000_recommendation_priority_models.sql",
    import.meta.url,
  ),
  "utf8",
);
const recommendationPriorityHardening = readFileSync(
  new URL(
    "../supabase/migrations/20260803051000_harden_recommendation_priority_permissions.sql",
    import.meta.url,
  ),
  "utf8",
);
const recommendationSequenceMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260803060000_recommendation_dependency_sequences.sql",
    import.meta.url,
  ),
  "utf8",
);
const recommendationSequenceHardening = readFileSync(
  new URL(
    "../supabase/migrations/20260803061000_harden_recommendation_sequence_permissions.sql",
    import.meta.url,
  ),
  "utf8",
);
const recommendationPortfolioMigration = readFileSync(
  new URL("../supabase/migrations/20260803070000_recommendation_portfolios.sql", import.meta.url),
  "utf8",
);
const recommendationPortfolioHardening = readFileSync(
  new URL(
    "../supabase/migrations/20260803071000_harden_recommendation_portfolio_permissions.sql",
    import.meta.url,
  ),
  "utf8",
);
const recommendationPortfolioRepair = readFileSync(
  new URL(
    "../supabase/migrations/20260803072000_repair_recommendation_portfolio_publisher.sql",
    import.meta.url,
  ),
  "utf8",
);
const recommendationDecisionMigration = readFileSync(
  new URL("../supabase/migrations/20260803080000_recommendation_decisions.sql", import.meta.url),
  "utf8",
);
const recommendationDecisionHardening = readFileSync(
  new URL(
    "../supabase/migrations/20260803081000_harden_recommendation_decision_permissions.sql",
    import.meta.url,
  ),
  "utf8",
);
const recommendationActionMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260803090000_recommendation_improvement_actions.sql",
    import.meta.url,
  ),
  "utf8",
);
const recommendationActionHardening = readFileSync(
  new URL(
    "../supabase/migrations/20260803091000_harden_recommendation_action_permissions.sql",
    import.meta.url,
  ),
  "utf8",
);
const recommendationProductHandoffMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260803110000_recommendation_product_handoffs.sql",
    import.meta.url,
  ),
  "utf8",
);
const recommendationProductHandoffHardening = readFileSync(
  new URL(
    "../supabase/migrations/20260803111000_harden_recommendation_product_handoff_permissions.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("Sprint 03 migration security", () => {
  it("binds event reads to active tenant membership and workspace scope", () => {
    const policy = migration.slice(
      migration.indexOf('CREATE POLICY "Members can read tenant analysis events"'),
      migration.indexOf("GRANT SELECT ON public.assessment_analysis_runs"),
    );
    expect(policy).toContain("membership.user_id = auth.uid()");
    expect(policy).toContain("membership.status = 'active'");
    expect(policy).toContain("membership.is_deleted = false");
    expect(policy).toContain("workspace.organisation_id = run.organisation_id");
    expect(policy).toContain("workspace.is_deleted = false");
  });

  it("removes Lovable default mutation and definer-function grants", () => {
    expect(hardening).toContain("FROM anon, authenticated");
    expect(hardening).toContain("REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER");
    for (const name of [
      "claim_assessment_analysis_run",
      "complete_assessment_analysis_run",
      "fail_assessment_analysis_run",
      "retry_assessment_analysis_run",
    ]) {
      expect(hardening).toContain(`REVOKE EXECUTE ON FUNCTION public.${name}`);
    }
    expect(hardening).toContain("GRANT SELECT ON TABLE public.assessment_analysis_runs");
  });

  it("removes PUBLIC execution from internal trigger helpers", () => {
    expect(triggerHardening).toContain(
      "REVOKE EXECUTE ON FUNCTION public.assign_analysis_event_sequence() FROM PUBLIC",
    );
    expect(triggerHardening).toContain(
      "REVOKE EXECUTE ON FUNCTION public.enforce_analysis_run_transition() FROM PUBLIC",
    );
  });

  it("restricts result publication while preserving the authenticated RLS helper", () => {
    expect(resultHardening).toContain(
      "REVOKE EXECUTE ON FUNCTION public.publish_delivery_intelligence_result",
    );
    expect(resultHardening).toContain("FROM anon, authenticated");
    expect(resultHardening).toContain(
      "REVOKE EXECUTE ON FUNCTION public.enforce_delivery_intelligence_edge_scope() FROM PUBLIC",
    );
    expect(resultHardening).toContain(
      "GRANT EXECUTE ON FUNCTION public.can_read_delivery_intelligence(uuid, uuid)",
    );
    expect(resultHardening).toContain("TO authenticated, service_role");
  });

  it("denies client access to operational product and public-projection storage", () => {
    expect(finalHardening).toContain(
      "public.analysis_recommendation_acceptances FROM anon, authenticated",
    );
    expect(finalHardening).toContain(
      "REVOKE EXECUTE ON FUNCTION public.resolve_delivery_dna_public_result(text, text)",
    );
    expect(finalHardening).toContain("FROM PUBLIC, anon, authenticated");
    expect(finalHardening).toContain("REVOKE MAINTAIN ON TABLE");
    expect(finalHardening).toContain("FROM authenticated");
  });

  it("keeps the durable analysis hand-off service-role-only and tenant-scoped", () => {
    expect(handoffMigration).toContain("AFTER INSERT OR UPDATE OF status, completed_at");
    expect(handoffMigration).toContain(
      "UNIQUE (assessment_session_id, assessment_revision, configuration_set_id, requested_mode)",
    );
    expect(handoffMigration).toContain("FOR UPDATE SKIP LOCKED");
    expect(handoffMigration).toContain("claimed_at <= now() - interval '2 minutes'");
    expect(handoffMigration).toContain(
      "ALTER TABLE public.assessment_analysis_handoffs ENABLE ROW LEVEL SECURITY",
    );
    expect(handoffMigration).toContain(
      "REVOKE ALL ON public.assessment_analysis_handoffs FROM PUBLIC, anon, authenticated",
    );
    expect(handoffMigration).toContain(
      "REVOKE EXECUTE ON FUNCTION public.claim_assessment_analysis_handoffs(integer) FROM PUBLIC, anon, authenticated",
    );
    expect(handoffMigration).toContain("s.organisation_id, s.workspace_id");
    expect(handoffMigration).toContain("AND s.organisation_id IS NOT NULL");
    expect(handoffMigration).toContain("AND s.workspace_id IS NOT NULL");
    expect(handoffMigration).toContain("AND s.created_by_user_id IS NOT NULL");
    expect(handoffMigration).toContain("OR NEW.organisation_id IS NULL");
    expect(handoffMigration).toContain("OR NEW.workspace_id IS NULL");
    expect(handoffMigration).toContain("OR NEW.created_by_user_id IS NULL");
    expect(handoffMigration).not.toContain("canonical_input");
    expect(handoffMigration).not.toContain("assessment_responses");
    expect(handoffHardeningMigration).toContain(
      "REVOKE ALL ON public.assessment_analysis_handoffs FROM PUBLIC, anon, authenticated",
    );
    expect(handoffHardeningMigration).toContain(
      "REVOKE EXECUTE ON FUNCTION public.reconcile_assessment_analysis_handoffs(integer)",
    );
    expect(handoffHardeningMigration).toContain(
      "REVOKE MAINTAIN ON public.assessment_analysis_handoffs FROM authenticated",
    );
    expect(handoffHardeningMigration).toContain(
      "GRANT EXECUTE ON FUNCTION public.claim_assessment_analysis_handoffs(integer) TO service_role",
    );
  });

  it("stores immutable tenant-scoped eligibility and terminal ineligible outcomes", () => {
    expect(eligibilityMigration).toContain("assessment_analysis_eligibility_immutable");
    expect(eligibilityMigration).toContain(
      "UNIQUE (organisation_id, workspace_id, assessment_session_id",
    );
    expect(eligibilityMigration).toContain("status = 'ineligible' AND analysis_run_id IS NULL");
    expect(eligibilityMigration).toMatch(
      /SET status = 'ineligible'[\s\S]*analysis_run_id = NULL[\s\S]*delivered_at = NULL/,
    );
    expect(eligibilityMigration).toContain(
      "ALTER TABLE public.assessment_analysis_eligibility_decisions ENABLE ROW LEVEL SECURITY",
    );
    expect(eligibilityMigration).not.toContain("CREATE POLICY");
    expect(eligibilityHardening).toContain("FROM PUBLIC, anon, authenticated");
    expect(eligibilityHardening).toContain("TO service_role");
  });

  it("guards the named remediation and never mutates immutable run history", () => {
    expect(eligibilityRemediation).toContain("b822ce85-f2bf-4cde-ba2f-b8abc31713cf");
    expect(eligibilityRemediation).toContain("r.organisation_id = s.organisation_id");
    expect(eligibilityRemediation).toContain("r.assessment_revision = s.assessment_revision");
    expect(eligibilityRemediation).toContain("PDR_003_002_REMEDIATION_SCOPE_VERIFICATION_FAILED");
    expect(eligibilityRemediation).toContain("INTO v_verified");
    expect(eligibilityRemediation).toContain("v_handoff := v_verified.handoff");
    expect(eligibilityRemediation).not.toContain("INTO v_handoff, v_manifest_digest");
    expect(eligibilityRemediation).not.toMatch(/UPDATE public\.assessment_analysis_runs/);
    expect(eligibilityRemediation).not.toMatch(/UPDATE public\.assessment_analysis_events/);
  });

  it("governs catalogue promotion with immutable history and least privilege", () => {
    expect(catalogueMigration).toContain("pg_advisory_xact_lock");
    expect(catalogueMigration).toContain("CATALOGUE_SELF_APPROVAL_DENIED");
    expect(catalogueMigration).toContain("recommendation_catalogue_version_immutable");
    expect(catalogueMigration).toContain("UNIQUE (catalogue_id, version)");
    expect(catalogueMigration).toContain("PRIMARY KEY (environment, recommendation_id)");
    expect(catalogueMigration).not.toContain("CREATE POLICY");
    expect(catalogueHardening).toContain("FROM PUBLIC, anon, authenticated");
    expect(catalogueHardening).toContain("REVOKE MAINTAIN");
    expect(catalogueHardening).toContain(
      "GRANT SELECT ON public.recommendation_catalogue_versions",
    );
    expect(catalogueHardening).not.toContain(
      "GRANT ALL ON public.recommendation_catalogue_versions",
    );
  });

  it("publishes immutable tenant/run-scoped recommendation evaluations with least privilege", () => {
    expect(recommendationEvaluationMigration).toContain("recommendation_evaluations_immutable");
    expect(recommendationEvaluationMigration).toContain(
      "recommendation_candidate_evaluations_immutable",
    );
    expect(recommendationEvaluationMigration).toContain(
      "recommendation_evaluation_trace_links_immutable",
    );
    expect(recommendationEvaluationMigration).toContain("v_result.analysis_run_id <> v_run.id");
    expect(recommendationEvaluationMigration).toContain("v_trace.analysis_run_id <> v_run.id");
    expect(recommendationEvaluationMigration).toContain(
      "jsonb_array_length(p_input -> 'candidates') <> v_expected_count",
    );
    expect(recommendationEvaluationMigration).toContain("pg_advisory_xact_lock");
    expect(recommendationEvaluationMigration).not.toContain("CREATE POLICY");
    expect(recommendationEvaluationHardening).toContain("FROM PUBLIC, anon, authenticated");
    expect(recommendationEvaluationHardening).toContain("REVOKE MAINTAIN");
    expect(recommendationEvaluationHardening).toContain(
      "GRANT EXECUTE ON FUNCTION public.publish_recommendation_evaluation(jsonb) TO service_role",
    );
  });

  it("keeps product governance outside every tenant role column", () => {
    expect(productGovernanceRoleMigration).toContain(
      "ALTER TYPE public.platform_role ADD VALUE IF NOT EXISTS 'product_governance'",
    );
    expect(productGovernanceRoleMigration).not.toContain("organisation_memberships");
    expect(productGovernanceIsolationMigration).toContain(
      "organisation_memberships_no_product_governance_role",
    );
    expect(productGovernanceIsolationMigration).toContain(
      "organisation_invitations_no_product_governance_role",
    );
    expect(productGovernanceIsolationMigration).toContain(
      "organisation_invitations_no_product_governance_workspace_role",
    );
    expect(productGovernanceIsolationMigration).toContain(
      "workspace_memberships_no_product_governance_role",
    );
  });

  it("publishes immutable tenant-scoped confidence gates with complete lineage", () => {
    expect(recommendationConfidenceGateMigration).toContain(
      "recommendation_confidence_gates_immutable",
    );
    expect(recommendationConfidenceGateMigration).toContain(
      "recommendation_candidate_confidence_gates_immutable",
    );
    expect(recommendationConfidenceGateMigration).toContain(
      "recommendation_confidence_gate_trace_links_immutable",
    );
    expect(recommendationConfidenceGateMigration).toContain(
      "v_evaluation.organisation_id <> v_run.organisation_id",
    );
    expect(recommendationConfidenceGateMigration).toContain(
      "v_confidence_trace.domain_id <> 'confidence'",
    );
    expect(recommendationConfidenceGateMigration).toContain(
      "jsonb_array_length(p_input -> 'candidates') <> v_expected_count",
    );
    expect(recommendationConfidenceGateMigration).toContain("pg_advisory_xact_lock");
    expect(recommendationConfidenceGateMigration).not.toContain("CREATE POLICY");
    expect(recommendationConfidenceGateHardening).toContain("FROM PUBLIC, anon, authenticated");
    expect(recommendationConfidenceGateHardening).toContain("REVOKE MAINTAIN");
    expect(recommendationConfidenceGateHardening).toContain(
      "GRANT EXECUTE ON FUNCTION public.publish_recommendation_confidence_gate(jsonb) TO service_role",
    );
  });

  it("publishes immutable tenant-scoped conflict resolutions without client access", () => {
    expect(recommendationResolutionMigration).toContain(
      "recommendation_conflict_resolutions_immutable",
    );
    expect(recommendationResolutionMigration).toContain(
      "recommendation_resolution_candidates_immutable",
    );
    expect(recommendationResolutionMigration).toContain(
      "recommendation_resolution_trace_links_immutable",
    );
    expect(recommendationResolutionMigration).toContain(
      "v_gate.organisation_id <> v_run.organisation_id",
    );
    expect(recommendationResolutionMigration).toContain(
      "dependency.dependency_id = v_gate_candidate.recommendation_id",
    );
    expect(recommendationResolutionMigration).toContain("deduplicated_evidence");
    expect(recommendationResolutionMigration).toContain("pg_advisory_xact_lock");
    expect(recommendationResolutionMigration).not.toContain("CREATE POLICY");
    expect(recommendationResolutionHardening).toContain("FROM PUBLIC, anon, authenticated");
    expect(recommendationResolutionHardening).toContain("REVOKE MAINTAIN");
    expect(recommendationResolutionHardening).toContain(
      "GRANT EXECUTE ON FUNCTION public.publish_recommendation_conflict_resolution(jsonb) TO service_role",
    );
  });

  it("publishes immutable priority baselines and append-only customer preferences", () => {
    expect(recommendationPriorityMigration).toContain("recommendation_priority_models_immutable");
    expect(recommendationPriorityMigration).toContain("recommendation_priority_items_immutable");
    expect(recommendationPriorityMigration).toContain(
      "recommendation_priority_preferences_immutable",
    );
    expect(recommendationPriorityMigration).toContain(
      "UNIQUE (conflict_resolution_id, policy_version)",
    );
    expect(recommendationPriorityMigration).toContain(
      "UNIQUE (organisation_id, workspace_id, idempotency_key)",
    );
    expect(recommendationPriorityMigration).toContain("v_result.analysis_run_id <> v_run.id");
    expect(recommendationPriorityMigration).toContain(
      "v_resolution.organisation_id <> v_run.organisation_id",
    );
    expect(recommendationPriorityMigration).toContain(
      "v_run.configuration_snapshot #> '{recommendationPolicy,rankFormula}'",
    );
    expect(recommendationPriorityMigration).toContain("RECOMMENDATION_PRIORITY_VERSION_CONFLICT");
    expect(recommendationPriorityMigration).toContain("pg_advisory_xact_lock");
    expect(recommendationPriorityMigration).not.toContain("CREATE POLICY");
    expect(recommendationPriorityHardening).toContain("FROM PUBLIC, anon, authenticated");
    expect(recommendationPriorityHardening).toContain("REVOKE MAINTAIN");
    expect(recommendationPriorityHardening).toContain(
      "GRANT EXECUTE ON FUNCTION public.publish_recommendation_priority_model(jsonb) TO service_role",
    );
    expect(recommendationPriorityHardening).toContain(
      "GRANT EXECUTE ON FUNCTION public.set_recommendation_priority_display_preference(jsonb) TO service_role",
    );
  });

  it("publishes immutable dependency sequences and append-only audited overrides", () => {
    expect(recommendationSequenceMigration).toContain("recommendation_sequence_models_immutable");
    expect(recommendationSequenceMigration).toContain("recommendation_sequence_items_immutable");
    expect(recommendationSequenceMigration).toContain(
      "recommendation_sequence_dependencies_immutable",
    );
    expect(recommendationSequenceMigration).toContain(
      "recommendation_sequence_overrides_immutable",
    );
    expect(recommendationSequenceMigration).toContain("UNIQUE (priority_model_id, policy_version)");
    expect(recommendationSequenceMigration).toContain(
      "UNIQUE (organisation_id, workspace_id, idempotency_key)",
    );
    expect(recommendationSequenceMigration).toContain(
      "v_priority.organisation_id <> v_run.organisation_id",
    );
    expect(recommendationSequenceMigration).toContain(
      "v_resolution.organisation_id <> v_run.organisation_id",
    );
    expect(recommendationSequenceMigration).toContain(
      "v_run.configuration_snapshot #> '{roadmap,capacity}'",
    );
    expect(recommendationSequenceMigration).toContain(
      "required_item.generated_sequence >= dependant.generated_sequence",
    );
    expect(recommendationSequenceMigration).toContain("dependency.dependency_type = 'required'");
    expect(recommendationSequenceMigration).toContain("RECOMMENDATION_SEQUENCE_VERSION_CONFLICT");
    expect(recommendationSequenceMigration).toContain("pg_advisory_xact_lock");
    expect(recommendationSequenceMigration).toContain("membership.user_id =");
    expect(recommendationSequenceMigration).toContain("acknowledged_risk");
    expect(recommendationSequenceMigration).not.toContain("CREATE POLICY");
    expect(recommendationSequenceHardening).toContain("FROM PUBLIC, anon, authenticated");
    expect(recommendationSequenceHardening).toContain("REVOKE MAINTAIN");
    expect(recommendationSequenceHardening).toContain(
      "GRANT EXECUTE ON FUNCTION public.publish_recommendation_sequence_model(jsonb) TO service_role",
    );
    expect(recommendationSequenceHardening).toContain(
      "GRANT EXECUTE ON FUNCTION public.set_recommendation_sequence_override(jsonb) TO service_role",
    );
  });

  it("publishes immutable tenant-scoped portfolios through a hardened governed routine", () => {
    expect(recommendationPortfolioMigration).toContain("recommendation_portfolios_immutable");
    expect(recommendationPortfolioMigration).toContain("recommendation_portfolio_items_immutable");
    expect(recommendationPortfolioMigration).toContain(
      "UNIQUE (sequence_model_id, policy_version)",
    );
    expect(recommendationPortfolioMigration).toContain(
      "v_sequence.priority_model_id <> v_priority.id",
    );
    expect(recommendationPortfolioMigration).toContain(
      "v_evaluation.organisation_id <> v_run.organisation_id",
    );
    expect(recommendationPortfolioMigration).toContain(
      "trace.organisation_id = v_run.organisation_id",
    );
    expect(recommendationPortfolioMigration).toContain("v_expected_class := CASE");
    expect(recommendationPortfolioMigration).toContain("pg_advisory_xact_lock");
    expect(recommendationPortfolioMigration).not.toContain("CREATE POLICY");
    expect(recommendationPortfolioHardening).toContain("FROM PUBLIC, anon, authenticated");
    expect(recommendationPortfolioHardening).toContain("REVOKE MAINTAIN");
    expect(recommendationPortfolioHardening).toContain(
      "GRANT EXECUTE ON FUNCTION public.publish_recommendation_portfolio(jsonb) TO service_role",
    );
    expect(recommendationPortfolioMigration).toContain("p_input ->> 'portfolio_state' <> (CASE");
    expect(recommendationPortfolioRepair).toContain(
      "a2f0a464281c3fe76110af94ac7ae573bb1be05ba5aa58f0205fe83e6a27988e",
    );
    expect(recommendationPortfolioRepair).toContain(
      "9739e3def0f39053bb058d718c993a1519290275da4ba93cf79d75743ceba043",
    );
    expect(recommendationPortfolioRepair).toContain("DROP TABLE public._s4_007_fn_parts");
  });

  it("records tenant-scoped decisions as an immutable audited overlay", () => {
    expect(recommendationDecisionMigration).toContain("recommendation_decision_events_immutable");
    expect(recommendationDecisionMigration).toContain("recommendation_decision_event_scope");
    expect(recommendationDecisionMigration).toContain(
      "v_portfolio.catalogue_digest <> NEW.catalogue_digest",
    );
    expect(recommendationDecisionMigration).toContain("recommendation_item_decisions_governed");
    expect(recommendationDecisionMigration).toContain(
      "UNIQUE (organisation_id, workspace_id, idempotency_key)",
    );
    expect(recommendationDecisionMigration).toContain(
      "coalesce(v_current.decision_version, 0) <> v_expected_version",
    );
    expect(recommendationDecisionMigration).toContain("RECOMMENDATION_DECISION_VERSION_CONFLICT");
    expect(recommendationDecisionMigration).toContain("pg_advisory_xact_lock");
    expect(recommendationDecisionMigration).toContain("membership.user_id = v_actor_user_id");
    expect(recommendationDecisionMigration).toContain("v_command = 'superseded'");
    expect(recommendationDecisionMigration).not.toContain("CREATE POLICY");
    expect(recommendationDecisionHardening).toContain("FROM PUBLIC, anon, authenticated");
    expect(recommendationDecisionHardening).toContain("REVOKE MAINTAIN");
    expect(recommendationDecisionHardening).toContain(
      "REVOKE EXECUTE ON FUNCTION public.enforce_recommendation_decision_event_scope()",
    );
    expect(recommendationDecisionHardening).toContain(
      "GRANT EXECUTE ON FUNCTION public.record_recommendation_item_decision(jsonb) TO service_role",
    );
  });

  it("governs focused recommendation actions with immutable history and dependency controls", () => {
    expect(recommendationActionMigration).toContain("recommendation_improvement_plans_immutable");
    expect(recommendationActionMigration).toContain(
      "recommendation_improvement_action_events_immutable",
    );
    expect(recommendationActionMigration).toContain(
      "recommendation_improvement_action_event_scope",
    );
    expect(recommendationActionMigration).toContain("recommendation_improvement_actions_governed");
    expect(recommendationActionMigration).toContain("UNIQUE (plan_id, portfolio_item_id)");
    expect(recommendationActionMigration).toContain("DEFERRABLE INITIALLY DEFERRED");
    expect(recommendationActionMigration).toContain("ACTION_DEPENDENCY_BLOCKED");
    expect(recommendationActionMigration).toContain("blocking_dependency_ids text[]");
    expect(recommendationActionMigration).toContain("required_action.status = 'completed'");
    expect(recommendationActionMigration).toContain("membership.user_id = assigned.user_id");
    expect(recommendationActionMigration).toContain("membership.user_id = NEW.actor_user_id");
    expect(recommendationActionMigration).toContain("v_decision.portfolio_item_id");
    expect(recommendationActionMigration).toContain("RECOMMENDATION_ACTION_VERSION_CONFLICT");
    expect(recommendationActionMigration).toContain("pg_advisory_xact_lock");
    expect(recommendationActionMigration).not.toContain("CREATE POLICY");
    expect(recommendationActionHardening).toContain("FROM PUBLIC, anon, authenticated");
    expect(recommendationActionHardening).toContain("REVOKE MAINTAIN");
    expect(recommendationActionHardening).toContain(
      "public.recommendation_improvement_action_events FROM service_role",
    );
    expect(recommendationActionHardening).toContain(
      "GRANT EXECUTE ON FUNCTION public.record_recommendation_improvement_action(jsonb) TO service_role",
    );
  });
});

describe("S4-011 product hand-off migration security", () => {
  it("stores immutable consent and consumption audit without an activation side effect", () => {
    expect(recommendationProductHandoffMigration).toContain(
      "consent_basis text NOT NULL CHECK (consent_basis = 'explicit_handoff_request')",
    );
    expect(recommendationProductHandoffMigration).toContain(
      "CREATE TRIGGER recommendation_product_handoffs_immutable",
    );
    expect(recommendationProductHandoffMigration).toContain(
      "CREATE TRIGGER recommendation_product_handoff_events_immutable",
    );
    expect(recommendationProductHandoffMigration).not.toContain(
      "INSERT INTO public.organisation_product_activations",
    );
  });

  it("rechecks tenant membership, current availability, entitlement and exact version", () => {
    expect(recommendationProductHandoffMigration).toContain(
      "v_availability.product_version IS DISTINCT FROM v_target_version",
    );
    expect(recommendationProductHandoffMigration).toContain(
      "v_availability.product_version IS DISTINCT FROM v_handoff.target_version",
    );
    expect(recommendationProductHandoffMigration).toContain(
      "workspace.organisation_id = membership.organisation_id",
    );
    expect(recommendationProductHandoffMigration).toContain(
      "workspace_membership.is_deleted = false",
    );
    expect(recommendationProductHandoffMigration).toContain(
      "v_handoff.cta IN ('view_pack', 'view_teammate') AND v_entitled",
    );
  });

  it("uses short-lived hashed tokens and exact idempotent consumption", () => {
    expect(recommendationProductHandoffMigration).toContain(
      "token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$')",
    );
    expect(recommendationProductHandoffMigration).toContain(
      "expires_at <= created_at + interval '15 minutes'",
    );
    expect(recommendationProductHandoffMigration).toContain(
      "UNIQUE (organisation_id, workspace_id, idempotency_key)",
    );
    expect(recommendationProductHandoffMigration).toContain("UNIQUE (handoff_id, event_type)");
  });

  it("keeps storage and definer functions deny-by-default for clients", () => {
    for (const source of [
      recommendationProductHandoffMigration,
      recommendationProductHandoffHardening,
    ]) {
      expect(source).toContain("FROM PUBLIC, anon, authenticated");
      expect(source).not.toContain("CREATE POLICY");
    }
    expect(recommendationProductHandoffHardening).toContain(
      "REVOKE MAINTAIN ON public.recommendation_product_handoffs",
    );
    expect(recommendationProductHandoffHardening).toContain(
      "REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON",
    );
    expect(recommendationProductHandoffHardening).toContain(
      "GRANT EXECUTE ON FUNCTION public.create_recommendation_product_handoff(jsonb)",
    );
  });
});
