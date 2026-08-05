import type { AssessmentAnalysisRun } from "../analysis/types";
import type { CanonicalIntelligenceCore } from "./engine";
import { sprint03Configuration } from "./config";
import { analyseCanonicalInputV2 } from "../delivery-dna/analysis-v2";
import {
  deliveryDnaV2Catalogue,
  deliveryDnaV2Capabilities,
  deliveryDnaV2Domains,
} from "../delivery-dna/catalogue-v2";
import type { TraceEdge, TraceGraph, TraceNode, TraceNodeType } from "./traceability";

async function hash(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildCoreTrace(
  run: AssessmentAnalysisRun,
  result: CanonicalIntelligenceCore | ReturnType<typeof analyseCanonicalInputV2>,
): Promise<TraceGraph> {
  const isV2 = result.schemaVersion === "deliveryiq.intelligence-result/2.0.0";
  const configuration = isV2 ? deliveryDnaV2Catalogue : sprint03Configuration;
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
      payload: value,
    });
  };

  for (const response of run.input.responses) {
    if (isV2) {
      const question = deliveryDnaV2Capabilities
        .flatMap((capability) => capability.questions)
        .find((item) => item.id === response.questionId)!;
      await add(`response:${response.answerId}`, "response", response.answerVersion, {
        ...response,
        evidenceId: response.answerId,
        evidenceVersion: response.answerVersion,
        questionSetVersion: run.questionSetVersion,
      });
      await add(`question:${response.questionId}`, "question", run.questionSetVersion, {
        id: question.id,
        dimension: question.dimension,
        weight: question.weight,
        questionSetVersion: run.questionSetVersion,
      });
      await add(
        `contribution:${response.answerId}`,
        "capability_contribution",
        run.configurationVersion,
        {
          questionId: response.questionId,
          value: response.value,
          status: response.status,
          ruleId: "ddna2.capability_weighted_contribution",
          ruleVersion: run.configurationVersion,
        },
      );
      edges.push({
        source: ids.get(`response:${response.answerId}`)!,
        target: ids.get(`question:${response.questionId}`)!,
        type: "answers",
      });
      edges.push({
        source: ids.get(`question:${response.questionId}`)!,
        target: ids.get(`contribution:${response.answerId}`)!,
        type: "maps_to",
      });
      edges.push({
        source: ids.get(`response:${response.answerId}`)!,
        target: ids.get(`contribution:${response.answerId}`)!,
        type: "contributes_to",
      });
    } else {
      await add(`evidence:${response.answerId}`, "evidence", response.answerVersion, response);
    }
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
        source: ids.get(`${isV2 ? "contribution" : "evidence"}:${evidenceId}`)!,
        target: ids.get(`capability:${capability.id}`)!,
        type: "contributes_to",
      });
    }
  }
  if (isV2 && "domains" in result) {
    for (const domain of result.domains) {
      await add(
        `domain:${domain.domainId}`,
        "domain_score",
        run.configurationVersion,
        {
          ...domain,
          ruleId: "ddna2.domain_equal_weight_mean",
          ruleVersion: run.configurationVersion,
        },
        true,
      );
      const definition = deliveryDnaV2Domains.find((item) => item.id === domain.domainId)!;
      for (const capability of definition.capabilities) {
        edges.push({
          source: ids.get(`capability:${capability.id}`)!,
          target: ids.get(`domain:${domain.domainId}`)!,
          type: "aggregates_into",
        });
      }
    }
  }
  await add("overall", "overall_score", run.configurationVersion, result.overall, true);
  if (isV2 && "domains" in result) {
    for (const domain of result.domains.filter((item) => item.available)) {
      edges.push({
        source: ids.get(`domain:${domain.domainId}`)!,
        target: ids.get("overall")!,
        type: "aggregates_into",
      });
    }
  } else {
    for (const capability of result.capabilities.filter((item) => item.score.available)) {
      edges.push({
        source: ids.get(`capability:${capability.id}`)!,
        target: ids.get("overall")!,
        type: "aggregates_into",
      });
    }
  }
  for (const [factorId, value] of Object.entries(result.confidence.factors)) {
    await add(`confidence-factor:${factorId}`, "confidence_factor", run.configurationVersion, {
      factorId,
      value,
    });
    for (const response of run.input.responses) {
      edges.push({
        source: ids.get(`${isV2 ? "response" : "evidence"}:${response.answerId}`)!,
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
    const definition = configuration.patterns.find((item) => item.id === pattern.id)!;
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
  for (const recommendation of result.recommendations.ranked) {
    await add(
      `recommendation:${recommendation.id}`,
      "recommendation",
      run.configurationVersion,
      recommendation,
      true,
    );
    const definition = configuration.recommendations.find((item) => item.id === recommendation.id)!;
    for (const trigger of definition.triggers.any) {
      if ("opportunity" in trigger && ids.has(`finding:${trigger.opportunity}`)) {
        edges.push({
          source: ids.get(`finding:${trigger.opportunity}`)!,
          target: ids.get(`recommendation:${recommendation.id}`)!,
          type: "triggers",
        });
      }
      if ("pattern" in trigger && ids.has(`pattern:${trigger.pattern}`)) {
        edges.push({
          source: ids.get(`pattern:${trigger.pattern}`)!,
          target: ids.get(`recommendation:${recommendation.id}`)!,
          type: "triggers",
        });
      }
      if ("analysisConfidence" in trigger) {
        edges.push({
          source: ids.get("confidence")!,
          target: ids.get(`recommendation:${recommendation.id}`)!,
          type: "triggers",
        });
      }
    }
  }
  const roadmap = result.roadmap;
  if (!("error" in roadmap)) {
    const horizons: Array<["day30" | "day60" | "day90", Array<{ id: string; reason: string }>]> = [
      ["day30", roadmap.day30],
      ["day60", roadmap.day60],
      ["day90", roadmap.day90],
    ];
    for (const [horizon, items] of horizons) {
      for (const item of items) {
        await add(
          `roadmap:${horizon}:${item.id}`,
          "roadmap_item",
          run.configurationVersion,
          { ...item, horizon },
          true,
        );
        edges.push({
          source: ids.get(`recommendation:${item.id}`)!,
          target: ids.get(`roadmap:${horizon}:${item.id}`)!,
          type: "scheduled_as",
        });
      }
    }
  }
  if (isV2 && "industryContext" in result) {
    for (const item of result.industryContext) {
      await add(`context-source:${item.evidenceId}`, "response", item.evidenceVersion, {
        evidenceId: item.evidenceId,
        evidenceVersion: item.evidenceVersion,
        sourcePublisher: item.sourcePublisher,
        sourceTitle: item.sourceTitle,
      });
      await add(
        `industry-context:${item.evidenceId}`,
        "industry_context_item",
        item.evidenceVersion,
        item,
        true,
      );
      edges.push({
        source: ids.get(`context-source:${item.evidenceId}`)!,
        target: ids.get(`industry-context:${item.evidenceId}`)!,
        type: "supports",
      });
    }
  }
  const narrativeItems: Array<{ key: string; value: string; source: string }> = [
    { key: "overall", value: result.narrative.overallPosition, source: "overall" },
    { key: "confidence", value: result.narrative.confidence, source: "confidence" },
    ...result.narrative.strengths.map((value, index) => ({
      key: `strength:${index}`,
      value,
      source: `finding:${result.findings.strengths[index]}`,
    })),
    ...result.narrative.opportunities.map((value, index) => ({
      key: `opportunity:${index}`,
      value,
      source: `finding:${result.findings.priorityOpportunities[index]}`,
    })),
    ...result.narrative.recommendations.map((value, index) => ({
      key: `recommendation:${index}`,
      value,
      source: `recommendation:${result.recommendations.ranked[index].id}`,
    })),
    ...(result.narrative.caveat
      ? [{ key: "caveat", value: result.narrative.caveat, source: "confidence" }]
      : []),
  ];
  for (const item of narrativeItems) {
    await add(`narrative:${item.key}`, "narrative_fact", run.configurationVersion, {
      text: item.value,
    });
    await add(
      `presentation:${item.key}`,
      "presentation_item",
      run.configurationVersion,
      {
        text: item.value,
      },
      true,
    );
    edges.push({
      source: ids.get(item.source)!,
      target: ids.get(`narrative:${item.key}`)!,
      type: "supports",
    });
    edges.push({
      source: ids.get(`narrative:${item.key}`)!,
      target: ids.get(`presentation:${item.key}`)!,
      type: "renders_as",
    });
  }
  return { nodes, edges };
}
