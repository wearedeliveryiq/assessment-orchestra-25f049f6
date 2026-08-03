import { assessmentAuthHeaders } from "../identity/assessment-auth";
import type { projectWorkspaceResult } from "./projection";
import type { AnalysisHandoffView } from "../analysis/handoff-types";

export type WorkspaceIntelligenceResult = ReturnType<typeof projectWorkspaceResult> & {
  productRecommendations: {
    knowledgePacks: Array<{ id: string; rank: number; cta: string; copy: string }>;
    teamMates: Array<{ id: string; cta: string; copy: string }>;
  };
  explanations: Array<{ id: string; type: string; domainId: string }>;
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

export async function fetchAnalysisStatus(assessmentId: string): Promise<AnalysisHandoffView> {
  const response = await fetch(`/api/assessments/${assessmentId}/analysis-status`, {
    headers: await assessmentAuthHeaders(),
  });
  const body = (await response.json().catch(() => null)) as
    (AnalysisHandoffView & { error?: string }) | null;
  if (!response.ok) throw new Error(body?.error ?? "Delivery Intelligence status is unavailable.");
  return body as AnalysisHandoffView;
}

export async function retryAnalysis(assessmentId: string) {
  const response = await fetch(`/api/assessments/${assessmentId}/analysis-retry`, {
    method: "POST",
    headers: await assessmentAuthHeaders(),
  });
  const body = (await response.json().catch(() => null)) as {
    id?: string;
    status?: string;
    error?: string;
  } | null;
  if (!response.ok) {
    throw new Error(
      body?.error ?? "We couldn't restart your Delivery Intelligence. Your assessment is safe.",
    );
  }
  return body;
}

export async function fetchIntelligenceExplanation(runId: string, conclusionId: string) {
  const response = await fetch(
    `/api/analysis-runs/${runId}/explanations?conclusionId=${encodeURIComponent(conclusionId)}`,
    { headers: await assessmentAuthHeaders() },
  );
  if (!response.ok) throw new Error("The explanation could not be loaded.");
  return response.json() as Promise<{
    conclusion: { domainId: string; domainVersion: string };
    nodes: Array<{ id: string; type: string; domainId: string; domainVersion: string }>;
    evidenceRestricted: boolean;
  }>;
}
