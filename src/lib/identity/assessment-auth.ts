import { supabase } from "@/integrations/supabase/client";

type ActiveTenant = { organisationId: string; workspaceId: string } | null;

let tenantPromise: Promise<ActiveTenant> | null = null;

export function clearAssessmentTenantCache(): void {
  tenantPromise = null;
}

async function activeTenant(token: string): Promise<ActiveTenant> {
  tenantPromise ??= fetch("/api/workspace/switch", {
    headers: { authorization: `Bearer ${token}` },
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const payload = (await response.json()) as {
        success?: boolean;
        data?: { currentWorkspace?: { id: string; organisationId: string } | null };
      };
      const workspace = payload.data?.currentWorkspace;
      return workspace
        ? { organisationId: workspace.organisationId, workspaceId: workspace.id }
        : null;
    })
    .finally(() => window.setTimeout(() => (tenantPromise = null), 30_000));
  return tenantPromise;
}

/** Authentication headers for assessment and intelligence APIs. */
export async function assessmentAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return {};
  const tenant = await activeTenant(token);
  return {
    authorization: `Bearer ${token}`,
    ...(tenant
      ? {
          "x-organisation-id": tenant.organisationId,
          "x-workspace-id": tenant.workspaceId,
        }
      : {}),
  };
}

/** Downloads a protected artefact without placing credentials in the URL. */
export async function openAuthenticatedDownload(path: string): Promise<void> {
  const response = await fetch(path, { headers: await assessmentAuthHeaders() });
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  const url = URL.createObjectURL(await response.blob());
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
