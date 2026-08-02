import { sprint03Configuration } from "./config";

type RecordValue = Record<string, unknown>;

function object(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RecordValue) : {};
}

function pick(value: unknown, fields: string[]): RecordValue {
  const source = object(value);
  return Object.fromEntries(
    fields.filter((field) => field in source).map((field) => [field, source[field]]),
  );
}

function projectItems(value: unknown, fields: string[], limit: number): RecordValue[] {
  return Array.isArray(value) ? value.slice(0, limit).map((item) => pick(item, fields)) : [];
}

/** Exact, deny-by-default DIQ-203A public projection. */
export function projectPublicResult(workspaceValue: unknown): RecordValue {
  const workspace = object(workspaceValue);
  const limits = sprint03Configuration.publicDisclosure.limits;
  const publicResult: RecordValue = {
    schemaVersion: workspace.schemaVersion,
    resultId: workspace.publicResultId,
    generatedAt: workspace.generatedAt,
    overall: pick(workspace.overall, ["displayScore", "band"]),
    confidence: pick(workspace.confidence, ["band", "caveat"]),
    summary: workspace.summary,
    strengths: projectItems(workspace.strengths, ["title", "summary"], limits.strengths),
    opportunities: projectItems(
      workspace.opportunities,
      ["title", "summary"],
      limits.opportunities,
    ),
    recommendationPreviews: projectItems(
      workspace.recommendationPreviews,
      ["title", "impact", "summary"],
      limits.recommendationPreviews,
    ),
    registrationPrompt: pick(workspace.registrationPrompt, ["label", "destination"]),
  };
  return publicResult;
}
