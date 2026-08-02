import type { AssessmentAnalysisRun } from "../analysis/types";
import type { CanonicalIntelligenceCore } from "./engine";
import { sprint03Configuration } from "./config";
import type { TraceEdge, TraceGraph, TraceNode, TraceNodeType } from "./traceability";

async function hash(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildCoreTrace(
  run: AssessmentAnalysisRun,
  result: CanonicalIntelligenceCore,
): Promise<TraceGraph> {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = new Map<string, string>();
  const add = async (
    key: string,
    nodeType: TraceNodeType,
    domainVersion: string,
    value: unknown,
    visible = false,
  ) => {
    const id = crypto.randomUUID();
    ids.set(key, id);
    nodes.push({
      id,
      tenantId: run.organisationId,
      workspaceId: run.workspaceId,
      analysisRunId: run.id,
      nodeType,
      domainId: key,
      domainVersion,
      configurationSetId: run.configurationSetId,
      contentHash: await hash(value),
      visible,
    });
  };

  for (const response of run.input.responses) {
    await add(`evidence:${response.answerId}`, "evidence", response.answerVersion, response);
  }
  for (const capability of result.capabilities) {
    await add(
      `capability:${capability.id}`,
      "capability_score",
      run.configurationVersion,
      capability,
      true,
    );
    for (const evidenceId of capability.evidenceIds) {
      edges.push({
        source: ids.get(`evidence:${evidenceId}`)!,
        target: ids.get(`capability:${capability.id}`)!,
        type: "contributes_to",
      });
    }
  }
  await add("overall", "overall_score", run.configurationVersion, result.overall, true);
  for (const capability of result.capabilities.filter((item) => item.score.available)) {
    edges.push({
      source: ids.get(`capability:${capability.id}`)!,
      target: ids.get("overall")!,
      type: "aggregates_into",
    });
  }
  for (const [factorId, value] of Object.entries(result.confidence.factors)) {
    await add(`confidence-factor:${factorId}`, "confidence_factor", run.configurationVersion, {
      factorId,
      value,
    });
    for (const response of run.input.responses) {
      edges.push({
        source: ids.get(`evidence:${response.answerId}`)!,
        target: ids.get(`confidence-factor:${factorId}`)!,
        type: factorId === "evidence_recency" ? "limits" : "supports",
      });
    }
  }
  await add(
    "confidence",
    "confidence_result",
    run.configurationVersion,
    result.confidence.result,
    true,
  );
  for (const factorId of Object.keys(result.confidence.factors)) {
    edges.push({
      source: ids.get(`confidence-factor:${factorId}`)!,
      target: ids.get("confidence")!,
      type: "aggregates_into",
    });
  }
  for (const findingId of [
    ...result.findings.strengths,
    ...result.findings.priorityOpportunities,
    ...result.findings.insufficientEvidence,
  ]) {
    await add(`finding:${findingId}`, "finding", run.configurationVersion, { findingId }, true);
    edges.push({
      source: ids.get(`capability:${findingId}`)!,
      target: ids.get(`finding:${findingId}`)!,
      type: "supports",
    });
  }
  for (const pattern of result.patterns.detected) {
    await add(`pattern:${pattern.id}`, "pattern", pattern.version, pattern, true);
    const definition = sprint03Configuration.patterns.find((item) => item.id === pattern.id)!;
    const capabilityIds = new Set<string>();
    for (const rawPredicate of definition.predicates) {
      const predicate = rawPredicate as {
        capability?: string;
        capabilities?: string[];
        difference?: { leftMean: string[]; rightMean: string[] };
      };
      if (typeof predicate.capability === "string") capabilityIds.add(predicate.capability);
      if (Array.isArray(predicate.capabilities))
        predicate.capabilities.forEach((id) => capabilityIds.add(id));
      if (predicate.difference) {
        predicate.difference.leftMean.forEach((id) => capabilityIds.add(id));
        predicate.difference.rightMean.forEach((id) => capabilityIds.add(id));
      }
    }
    for (const capabilityId of capabilityIds) {
      edges.push({
        source: ids.get(`capability:${capabilityId}`)!,
        target: ids.get(`pattern:${pattern.id}`)!,
        type: "triggers",
      });
    }
  }
  return { nodes, edges };
}
