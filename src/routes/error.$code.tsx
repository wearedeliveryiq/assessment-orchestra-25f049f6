import { createFileRoute, useParams } from "@tanstack/react-router";

import { ERROR_COPY, ErrorPage, type ErrorKind } from "@/components/shell/error-page";

/** Canonical error surfaces: /error/401, /403, /404, /500, /offline, /session-expired. */
export const Route = createFileRoute("/error/$code")({
  head: () => ({
    meta: [
      { title: "Something went wrong — DeliveryIQ" },
      { name: "description", content: "DeliveryIQ could not display this page." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Something went wrong — DeliveryIQ" },
      { property: "og:description", content: "DeliveryIQ could not display this page." },
    ],
  }),
  component: ErrorRoute,
});

function ErrorRoute() {
  const { code } = useParams({ from: "/error/$code" });
  const kind: ErrorKind = code in ERROR_COPY ? (code as ErrorKind) : "500";
  return <ErrorPage kind={kind} />;
}
