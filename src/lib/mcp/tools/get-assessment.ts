import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_assessment",
  title: "Get assessment details",
  description:
    "Return the full details of a single assessment session, including its responses and stage run status.",
  inputSchema: {
    id: z.string().uuid().describe("The assessment session ID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      throw new ToolError("You must be signed in to view an assessment.");
    }
    const supabase = supabaseForUser(ctx);

    const { data: session, error: sessionError } = await supabase
      .from("assessment_sessions")
      .select("*")
      .eq("id", id)
      .single();
    if (sessionError || !session) {
      throw new ToolError(
        sessionError ? `Database error: ${sessionError.message}` : "Assessment not found.",
      );
    }

    const { data: responses, error: responsesError } = await supabase
      .from("assessment_responses")
      .select("question_id,section_id,value,notes,created_at,updated_at")
      .eq("session_id", id)
      .order("created_at", { ascending: true });
    if (responsesError) {
      throw new ToolError(`Failed to load responses: ${responsesError.message}`);
    }

    const { data: stageRuns, error: stagesError } = await supabase
      .from("assessment_stage_runs")
      .select("stage,sequence,status,attempt,error,started_at,completed_at,duration_ms")
      .eq("session_id", id)
      .order("sequence", { ascending: true });
    if (stagesError) {
      throw new ToolError(`Failed to load stage runs: ${stagesError.message}`);
    }

    return {
      content: [
        {
          type: "text",
          text: `Assessment ${session.organisation_name} is ${session.status} (${session.progress}% complete).`,
        },
      ],
      structuredContent: {
        session: {
          id: session.id,
          organisationName: session.organisation_name,
          contactName: session.contact_name,
          assessmentType: session.assessment_type,
          status: session.status,
          progress: session.progress,
          currentSection: session.current_section,
          submittedAt: session.submitted_at,
          completedAt: session.completed_at,
          createdAt: session.created_at,
          updatedAt: session.updated_at,
        },
        responses: responses ?? [],
        stageRuns: stageRuns ?? [],
      },
    };
  },
});
