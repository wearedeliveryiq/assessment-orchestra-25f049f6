import { assessmentAuthHeaders } from "../identity/assessment-auth";
import type { projectWorkspaceResult } from "./projection";

export type WorkspaceIntelligenceResult = ReturnType<typeof projectWorkspaceResult>;

export async function fetchLatestIntelligence(
  assessmentId: string,
): Promise<WorkspaceIntelligenceResult> {
  const response = await fetch(`/api/assessments/${assessmentId}/intelligence-result`, {
    headers: await assessmentAuthHeaders(),
  });
  const body = (await response.json().catch(() => null)) as
    (WorkspaceIntelligenceResult & { error?: string; status?: string }) | null;
  if (!response.ok)
    throw new Error(
      body?.error ??
        (body?.status === "empty"
          ? "No analysis result is available yet."
          : `Request failed (${response.status})`),
    );
  return body as WorkspaceIntelligenceResult;
}
