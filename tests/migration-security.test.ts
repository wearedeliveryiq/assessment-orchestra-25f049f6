import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/20260802020000_assessment_analysis_runs.sql", import.meta.url),
  "utf8",
);
const hardening = readFileSync(
  new URL("../supabase/migrations/20260802025000_harden_analysis_permissions.sql", import.meta.url),
  "utf8",
);
const triggerHardening = readFileSync(
  new URL(
    "../supabase/migrations/20260802025500_harden_analysis_trigger_helpers.sql",
    import.meta.url,
  ),
  "utf8",
);
const resultHardening = readFileSync(
  new URL(
    "../supabase/migrations/20260802035000_harden_intelligence_result_permissions.sql",
    import.meta.url,
  ),
  "utf8",
);
const finalHardening = readFileSync(
  new URL(
    "../supabase/migrations/20260802060000_harden_sprint03_cloud_permissions.sql",
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
});
