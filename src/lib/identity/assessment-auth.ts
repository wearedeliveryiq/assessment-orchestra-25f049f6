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
  // Reserve the tab while the click still has browser user activation. Opening
  // it after the authenticated fetch is complete is blocked by some browsers.
  const preview = window.open("about:blank", "_blank");
  if (preview) preview.opener = null;

  try {
    const response = await fetch(path, { headers: await assessmentAuthHeaders() });
    if (!response.ok) throw new Error(`Download failed (${response.status})`);

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const contentType = response.headers.get("content-type") ?? blob.type;

    if (contentType.includes("text/html") && preview) {
      preview.location.href = url;
    } else {
      preview?.close();
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadFilename(response.headers.get("content-disposition"), path, contentType);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    preview?.close();
    throw error;
  }
}

function downloadFilename(disposition: string | null, path: string, contentType: string): string {
  const utf8 = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = disposition?.match(/filename="?([^";]+)"?/i)?.[1];
  const supplied = utf8 ? decodeURIComponent(utf8) : plain;
  if (supplied) return supplied;

  const routeName = path.split("?")[0].split("/").filter(Boolean).at(-1) ?? "deliveryiq-export";
  const extension = contentType.includes("pdf")
    ? "pdf"
    : contentType.includes("presentation")
      ? "pptx"
      : contentType.includes("json")
        ? "json"
        : contentType.includes("html")
          ? "html"
          : "bin";
  return `${routeName}.${extension}`;
}
