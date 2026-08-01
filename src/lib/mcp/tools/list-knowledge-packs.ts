import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { knowledgePackRegistry } from "@/lib/knowledge-packs/registry.server";

export default defineTool({
  name: "list_knowledge_packs",
  title: "List knowledge packs",
  description:
    "List every knowledge pack available to the DeliveryIQ runtime, including the latest version, active version and validity status.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    try {
      const packs = knowledgePackRegistry.list();
      return {
        content: [
          {
            type: "text",
            text: `Found ${packs.length} knowledge pack(s).`,
          },
        ],
        structuredContent: { packs },
      };
    } catch (error) {
      throw new ToolError({
        message: error instanceof Error ? error.message : "Failed to list knowledge packs.",
        code: "registry_error",
      });
    }
  },
});
