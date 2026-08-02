import { assessmentAuthHeaders } from "../identity/assessment-auth";
import type { projectWorkspaceResult } from "./projection";

export type WorkspaceIntelligenceResult = ReturnType<typeof projectWorkspaceResult> & {
  productRecommendations: {
    knowledgePacks: Array<{ id: string; rank: number; cta: string; copy: string }>;
    teamMates: Array<{ id: string; cta: string; copy: string }>;
  };
};

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

export async function acceptIntelligenceRecommendation(runId: string, recommendationId: string) {
  const response = await fetch(
    `/api/analysis-runs/${runId}/recommendations/${recommendationId}/accept`,
    { method: "POST", headers: await assessmentAuthHeaders() },
  );
  if (!response.ok) throw new Error("The recommendation could not be accepted.");
}
