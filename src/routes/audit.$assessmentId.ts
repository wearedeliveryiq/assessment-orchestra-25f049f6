import { createFileRoute } from "@tanstack/react-router";
import { handleAssessmentAudit } from "@/lib/audit/http.server";

/** GET /audit/{assessmentId} — every audit event for one assessment. */
export const Route = createFileRoute("/audit/$assessmentId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => handleAssessmentAudit(request, params.assessmentId),
    },
  },
});
