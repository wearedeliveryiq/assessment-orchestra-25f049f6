import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { canAssignRole, permissionsFor, roleDefinition } from "@/lib/identity/rbac";
import { canViewRecommendationEvaluationAudit } from "@/lib/recommendation-evaluation/projection";
import { ORGANISATION_ROLES, WORKSPACE_ROLES } from "@/lib/tenancy/roles";

const enumMigration = readFileSync(
  new URL("../supabase/migrations/20260803022000_add_product_governance_role.sql", import.meta.url),
  "utf8",
);
const isolationMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260803023000_isolate_product_governance_role.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("PB-004 product-governance role isolation", () => {
  it("grants only catalogue governance and removes it from platform administration", () => {
    expect(roleDefinition("product_governance")).toMatchObject({
      scope: "platform",
      permissions: ["recommendation:govern"],
    });
    expect(permissionsFor(["product_governance"])).toEqual(["recommendation:govern"]);
    expect(permissionsFor(["platform_admin"])).not.toContain("recommendation:govern");
  });

  it("cannot be assigned through organisation or workspace membership flows", () => {
    expect(ORGANISATION_ROLES).not.toContain("product_governance");
    expect(WORKSPACE_ROLES).not.toContain("product_governance");
    expect(canAssignRole(["platform_admin"], "product_governance")).toBe(false);
    expect(canAssignRole(["product_governance"], "contributor")).toBe(false);
  });

  it("does not unlock tenant evaluation audit details", () => {
    expect(canViewRecommendationEvaluationAudit(["recommendation:govern"])).toBe(false);
    expect(canViewRecommendationEvaluationAudit(["audit:read"])).toBe(true);
  });

  it("ships the enum separately from fail-closed tenant-role constraints", () => {
    expect(enumMigration).toContain(
      "ALTER TYPE public.platform_role ADD VALUE IF NOT EXISTS 'product_governance'",
    );
    expect(enumMigration).not.toContain("organisation_memberships");
    for (const table of [
      "organisation_memberships",
      "organisation_invitations",
      "workspace_memberships",
    ]) {
      expect(isolationMigration).toContain(`ALTER TABLE public.${table}`);
    }
    expect(isolationMigration.match(/<> 'product_governance'/g)).toHaveLength(4);
  });
});
