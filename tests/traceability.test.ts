import { describe, expect, it } from "vitest";

import {
  validateTraceGraph,
  type TraceGraph,
  type TraceNode,
} from "@/lib/delivery-intelligence/traceability";

function node(id: string, type: TraceNode["nodeType"], visible = false): TraceNode {
  return {
    id,
    tenantId: "tenant-a",
    workspaceId: "workspace-a",
    analysisRunId: "run-a",
    nodeType: type,
    domainId: id,
    domainVersion: "1.0.0",
    configurationSetId: "sprint03-product-config-1.0.0",
    contentHash: "a".repeat(64),
    visible,
  };
}

describe("S3-013 trace integrity", () => {
  it("requires every visible conclusion to reach approved evidence", () => {
    const graph: TraceGraph = {
      nodes: [
        node("e1", "evidence"),
        node("s1", "capability_score"),
        node("p1", "presentation_item", true),
      ],
      edges: [
        { source: "e1", target: "s1", type: "contributes_to" },
        { source: "s1", target: "p1", type: "renders_as" },
      ],
    };
    expect(validateTraceGraph(graph)).toMatchObject({
      valid: true,
      evidencePaths: { p1: ["p1", "s1", "e1"] },
    });
  });

  it("fails publication for orphaned, untraced and cross-tenant output", () => {
    const evidence = node("e1", "evidence");
    const output = { ...node("p1", "presentation_item", true), tenantId: "tenant-b" };
    const result = validateTraceGraph({
      nodes: [evidence, output],
      edges: [
        { source: "e1", target: "p1", type: "renders_as" },
        { source: "missing", target: "p1", type: "supports" },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("cross_scope_edge:e1:p1");
    expect(result.errors).toContain("orphan:missing:p1");
  });
});
