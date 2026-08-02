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
});
