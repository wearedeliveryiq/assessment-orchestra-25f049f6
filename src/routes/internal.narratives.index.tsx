import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ScrollText } from "lucide-react";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { StatusPill } from "@/components/deliveryiq/status-pill";
import { assessmentApi, assessmentKeys } from "@/lib/assessment/client";
import { useHydrated } from "@/hooks/use-hydrated";

export const Route = createFileRoute("/internal/narratives/")({
  head: () => ({
    meta: [
      { title: "Narrative Explorer — DeliveryIQ" },
      {
        name: "description",
        content:
          "Internal developer tool for inspecting the executive narratives produced by the DeliveryIQ Narrative Engine.",
      },
      { property: "og:title", content: "Narrative Explorer — DeliveryIQ" },
      {
        property: "og:description",
        content: "Inspect generated narrative sections, prompts and their evidence chain.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NarrativeExplorerIndex,
});

function NarrativeExplorerIndex() {
  const hydrated = useHydrated();
  const { data, isLoading } = useQuery({
    queryKey: assessmentKeys.list,
    queryFn: () => assessmentApi.list(),
    enabled: hydrated,
  });

  const sessions = data?.sessions ?? [];

  return (
    <AppShell>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
        <ScrollText className="h-3.5 w-3.5" />
        Internal tooling
      </div>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
        Narrative Explorer
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Select an assessment to inspect its generated executive narrative — section by section,
        with the generation mode, prompt guidance and the evidence behind every claim.
      </p>

      <div className="ribbon-panel mt-8 rounded-xl p-1">
        <div className="rounded-lg">
          {isLoading && <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && sessions.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No assessments in this workspace yet.
            </p>
          )}
          <ul className="divide-y divide-border/70">
            {sessions.map((session) => (
              <li key={session.id}>
                <Link
                  to="/internal/narratives/$id"
                  params={{ id: session.id }}
                  className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-surface-raised"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{session.organisationName}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {session.id}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusPill status={session.status} />
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
