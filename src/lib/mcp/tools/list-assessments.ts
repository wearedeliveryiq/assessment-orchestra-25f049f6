import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const assessmentRowSchema = z.object({
  id: z.string().uuid(),
  organisation_name: z.string(),
  contact_name: z.string().nullable(),
  assessment_type: z.string(),
  status: z.string(),
  progress: z.number(),
  current_section: z.string().nullable(),
  submitted_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export default defineTool({
  name: "list_assessments",
  title: "List assessments",
  description:
    "List the signed-in user's assessment sessions, most recently updated first. Returns id, organisation name, status and progress.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Maximum number of sessions to return (1-100)."),
    status: z.enum(["draft", "in_progress", "submitted", "processing", "completed", "archived"]).optional().describe("Filter by assessment status."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      throw new ToolError({ message: "You must be signed in to list assessments.", code: "unauthenticated" });
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("assessment_sessions")
      .select("id,organisation_name,contact_name,assessment_type,status,progress,current_section,submitted_at,completed_at,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 50);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) {
      throw new ToolError({ message: `Failed to list assessments: ${error.message}`, code: "database_error" });
    }

    const rows = (data ?? []).map((row) => assessmentRowSchema.parse(row));
    return {
      content: [
        {
          type: "text",
          text: `Found ${rows.length} assessment(s).`,
        },
      ],
      structuredContent: { assessments: rows },
    };
  },
});
