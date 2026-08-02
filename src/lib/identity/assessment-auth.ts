import { supabase } from "@/integrations/supabase/client";

/** Authentication headers for assessment and intelligence APIs. */
export async function assessmentAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { authorization: `Bearer ${token}` } : {};
}

/** Downloads a protected artefact without placing credentials in the URL. */
export async function openAuthenticatedDownload(path: string): Promise<void> {
  const response = await fetch(path, { headers: await assessmentAuthHeaders() });
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  const url = URL.createObjectURL(await response.blob());
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
