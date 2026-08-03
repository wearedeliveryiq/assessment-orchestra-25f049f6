import { createFileRoute } from "@tanstack/react-router";
import { postConsumeProductHandoff } from "@/lib/recommendation-handoffs/http.server";

export const Route = createFileRoute("/api/product-handoffs/consume")({
  server: { handlers: { POST: ({ request }) => postConsumeProductHandoff(request) } },
});
