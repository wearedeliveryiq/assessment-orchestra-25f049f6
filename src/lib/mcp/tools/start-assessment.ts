import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

function generateOwnerKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export default defineTool({
  name: "start_assessment",
  title: "Start a new assessment",
  description:
    "Create a new assessment session for the signed-in user. The session starts as a draft and can be filled in through the DeliveryIQ app or future MCP tools.",
  inputSchema: {
    organisationName: z.string().min(1).max(200).describe("Name of the organisation being assessed."),
    contactName: z.string().max(200).optional().describe("Optional contact name for the assessment."),
    assessmentType: z.string().max(100).optional().describe("Optional assessment type (defaults to executive-sponsorship)."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ organisationName, contactName, assessmentType }, ctx) => {
    if (!ctx.isAuthenticated()) {
      throw new ToolError("You must be signed in to start an assessment.");
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    if (!userId) {
      throw new ToolError("Unable to determine the signed-in user.");
    }

    const { data, error } = await supabase
      .from("assessment_sessions")
      .insert({
        owner_key: generateOwnerKey(),
        organisation_name: organisationName.trim(),
        contact_name: contactName?.trim() ?? null,
        assessment_type: assessmentType?.trim() || "executive-sponsorship",
        status: "draft",
        progress: 0,
        created_by_user_id: userId,
      })
      .select("id,organisation_name,contact_name,assessment_type,status,progress,created_at,updated_at")
      .single();

    if (error || !data) {
      throw new ToolError(
        error ? `Failed to create assessment: ${error.message}` : "Assessment creation returned no data.",
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Created assessment ${data.id} for ${data.organisation_name}. Open it in the app to continue.`,
        },
      ],
      structuredContent: {
        id: data.id,
        organisationName: data.organisation_name,
        contactName: data.contact_name,
        assessmentType: data.assessment_type,
        status: data.status,
        progress: data.progress,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  },
});
