import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { knowledgePackRegistry } from "@/lib/knowledge-packs/registry.server";

export default defineTool({
  name: "get_knowledge_pack",
  title: "Get knowledge pack details",
  description:
    "Return the manifest, validation status and high-level contents of a knowledge pack by its ID.",
  inputSchema: {
    id: z.string().min(1).describe("The knowledge pack ID (e.g. executive-sponsorship)."),
    version: z.string().optional().describe("Optional specific version to load. Defaults to the active version."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, version }) => {
    try {
      const loaded = knowledgePackRegistry.load(id, version);
      const summary = knowledgePackRegistry.summary(id);
      const document = loaded.document;
      return {
        content: [
          {
            type: "text",
            text: `Loaded ${summary.name} v${loaded.version}.`,
          },
        ],
        structuredContent: {
          id: summary.packId,
          name: summary.name,
          version: loaded.version,
          description: summary.description,
          assessmentType: summary.assessmentType,
          valid: summary.valid,
          manifest: loaded.manifest,
          counts: summary.versions.find((v) => v.version === loaded.version)?.counts ?? null,
          questions: document.questions?.questions?.map((q) => ({ id: q.id, prompt: q.prompt })) ?? [],
          dimensions: document.scoring?.dimensions?.map((d) => d.dimension) ?? [],
          patterns: document.patterns?.definitions?.map((p) => ({ code: p.patternCode, name: p.name, category: p.category })) ?? [],
        },
      };
    } catch (error) {
      throw new ToolError(
        error instanceof Error ? error.message : `Failed to load knowledge pack "${id}".`,
      );
    }
  },
});
