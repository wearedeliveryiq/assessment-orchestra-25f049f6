import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/20260802020000_assessment_analysis_runs.sql", import.meta.url),
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
});
