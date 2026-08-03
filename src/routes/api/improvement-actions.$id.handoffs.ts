import { createFileRoute } from "@tanstack/react-router";
import {
  getProductHandoffOpportunities,
  postProductHandoff,
} from "@/lib/recommendation-handoffs/http.server";

export const Route = createFileRoute("/api/improvement-actions/$id/handoffs")({
  server: {
    handlers: {
      GET: ({ request, params }) => getProductHandoffOpportunities(request, params.id),
      POST: ({ request, params }) => postProductHandoff(request, params.id),
    },
  },
});
