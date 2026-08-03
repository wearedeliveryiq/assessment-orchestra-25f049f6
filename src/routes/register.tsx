import { createFileRoute, redirect } from "@tanstack/react-router";

const PUBLIC_RESULT_ID = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;

/** Keeps the locked first-party public-result destination stable. */
export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>) => ({
    source: search.source === "delivery-dna" ? ("delivery-dna" as const) : undefined,
    result:
      typeof search.result === "string" && PUBLIC_RESULT_ID.test(search.result)
        ? search.result
        : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/auth/register",
      search: {
        snapshot: undefined,
        source: search.source,
        result: search.result,
      },
    });
  },
  component: () => null,
});
