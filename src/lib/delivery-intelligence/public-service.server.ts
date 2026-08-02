import { assessmentAnalysisService, type AnalysisTenantContext } from "../analysis/service.server";
import { sprint03Configuration } from "./config";
import { projectPublicResult, publicSourceFromWorkspace } from "./disclosure";
import { projectWorkspaceResult } from "./projection";
import { issuePublicResult, resolvePublicResult } from "./public-repository.server";
import { getResult, sha256 } from "./result-repository.server";

function token(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export async function createPublicResult(
  runId: string,
  context: AnalysisTenantContext,
  consent: boolean,
) {
  if (!consent)
    throw new Error("ANALYSIS_INPUT_INVALID: explicit public disclosure consent is required");
  const run = await assessmentAnalysisService.get(runId, context);
  if (run.status !== "completed") throw new Error("PUBLIC_RESULT_UNAVAILABLE");
  const stored = await getResult(run.id, {
    organisationId: context.organisationId,
    workspaceId: context.workspaceId,
  });
  if (!stored) throw new Error("PUBLIC_RESULT_UNAVAILABLE");
  const plainToken = token();
  const publicResultId = crypto.randomUUID();
  const workspace = projectWorkspaceResult(stored);
  const publicProjection = projectPublicResult(
    publicSourceFromWorkspace(workspace, publicResultId),
  );
  const expiresAt = new Date(
    Date.now() + sprint03Configuration.publicDisclosure.token.lifetimeSeconds * 1000,
  ).toISOString();
  await issuePublicResult({
    id: publicResultId,
    analysisRunId: run.id,
    organisationId: run.organisationId,
    workspaceId: run.workspaceId,
    userId: context.userId,
    tokenHash: await sha256(plainToken),
    publicProjection,
    expiresAt,
  });
  return { id: publicResultId, token: plainToken, expiresAt };
}

export async function readPublicResult(plainToken: string, clientAddress: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(plainToken)) return null;
  return resolvePublicResult(
    await sha256(plainToken),
    await sha256(`deliveryiq-public-ip\n${clientAddress}`),
  );
}
