import { describe, expect, it } from "vitest";

import { explainConclusion } from "@/lib/delivery-intelligence/explainability";
import type { TraceGraph, TraceNode } from "@/lib/delivery-intelligence/traceability";

const node = (id: string, nodeType: TraceNode["nodeType"], visible = false): TraceNode => ({
  id,
  tenantId: "t",
  workspaceId: "w",
  analysisRunId: "r",
  nodeType,
  domainId: id,
  domainVersion: "1",
  configurationSetId: "c",
  contentHash: "a".repeat(64),
  visible,
  payload: { answer: nodeType === "evidence" ? 4 : undefined },
});
const graph: TraceGraph = {
  nodes: [
    node("e", "evidence"),
    node("s", "capability_score"),
    node("p", "presentation_item", true),
  ],
  edges: [
    { source: "e", target: "s", type: "contributes_to" },
    { source: "s", target: "p", type: "renders_as" },
  ],
};

describe("S3-012 explainable intelligence", () => {
  it("redacts raw evidence for ordinary Workspace viewers", () => {
    const result = explainConclusion(graph, "p", { canAuditEvidence: false })!;
    expect(result.nodes.find((item) => item.type === "evidence")).toMatchObject({
      domainId: "restricted-evidence",
      payload: { state: "restricted" },
    });
    expect(JSON.stringify(result)).not.toContain('"answer":4');
  });

  it("reveals approved evidence detail only to audit permission", () => {
    const result = explainConclusion(graph, "p", { canAuditEvidence: true })!;
    expect(result.nodes.find((item) => item.type === "evidence")?.payload).toEqual({ answer: 4 });
  });

  it("does not expose internal or unknown conclusions", () => {
    expect(explainConclusion(graph, "s", { canAuditEvidence: true })).toBeNull();
    expect(explainConclusion(graph, "missing", { canAuditEvidence: true })).toBeNull();
  });
});
