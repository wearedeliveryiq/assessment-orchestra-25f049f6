import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GitBranch, Loader2 } from "lucide-react";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { auditApi, auditKeys } from "@/lib/audit/client";
import { useHydrated } from "@/hooks/use-hydrated";
import { EVIDENCE_CHAIN, type EvidenceEntityType } from "@/lib/audit/types";
import {
  ConfidenceBar,
  SeverityBadge,
  entityLabel,
  formatTimestamp,
} from "@/components/audit/audit-primitives";
import {
  EvidenceExplorerPanel,
  type EvidenceSelection,
} from "@/components/audit/evidence-explorer-panel";

export const Route = createFileRoute("/internal/audit/$id")({
  head: () => ({
    meta: [
      { title: "Evidence Explorer — DeliveryIQ" },
      {
        name: "description",
        content:
          "Navigate the complete DeliveryIQ reasoning chain from assessment responses through to the executive narrative.",
      },
      { property: "og:title", content: "Evidence Explorer — DeliveryIQ" },
      {
        property: "og:description",
        content: "Traverse the evidence graph and audit trail for a single assessment execution.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EvidenceExplorerPage,
});

function EvidenceExplorerPage() {
  const { id } = Route.useParams();
  const hydrated = useHydrated();
  const [selection, setSelection] = useState<EvidenceSelection | null>(null);
  const [layer, setLayer] = useState<EvidenceEntityType>("pattern");

  const graph = useQuery({
    queryKey: auditKeys.graph(id),
    queryFn: () => auditApi.graph(id),
    enabled: hydrated,
  });

  const events = useQuery({
    queryKey: auditKeys.events({ assessmentId: id }),
    queryFn: () => auditApi.assessmentEvents(id, { limit: 25 }),
    enabled: hydrated,
  });

  const nodes = (graph.data?.nodes ?? []).filter((node) => node.type === layer);

  return (
    <AppShell>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
        <GitBranch className="h-3.5 w-3.5" />
        Internal tooling
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Evidence Explorer</h1>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">{id}</p>
        </div>
        <Link
          to="/internal/audit"
          className="text-xs font-medium uppercase tracking-[0.16em] text-accent hover:underline"
        >
          Audit dashboard
        </Link>
      </div>

      {graph.isError && (
        <p className="mt-6 text-sm text-destructive">{(graph.error as Error).message}</p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {EVIDENCE_CHAIN.map((type) => {
          const count = graph.data?.counts?.[type] ?? 0;
          const active = layer === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setLayer(type)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border/70 bg-surface-raised text-muted-foreground hover:border-accent/40"
              }`}
            >
              {entityLabel(type)}
              <span className="ml-2 font-mono text-[10px]">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="ribbon-panel rounded-xl">
          <h2 className="border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            {entityLabel(layer)} layer
          </h2>
          {graph.isLoading && (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Building evidence graph…
            </div>
          )}
          {!graph.isLoading && nodes.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No {entityLabel(layer).toLowerCase()} nodes in this assessment&apos;s graph.
            </p>
          )}
          <ul className="divide-y divide-border/70">
            {nodes.map((node) => {
              const active = selection?.id === node.id && selection.type === node.type;
              return (
                <li key={`${node.type}:${node.id}`}>
                  <button
                    type="button"
                    onClick={() => setSelection({ type: node.type, id: node.id })}
                    className={`w-full px-4 py-3.5 text-left transition-colors hover:bg-surface-raised ${
                      active ? "bg-surface-raised" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium">{node.label}</span>
                      {node.severity && <SeverityBadge severity={node.severity} />}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {node.detail}
                    </p>
                    <div className="mt-2">
                      <ConfidenceBar value={node.confidence} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-6">
          <EvidenceExplorerPanel
            assessmentId={id}
            selection={selection}
            onSelect={setSelection}
            onClose={() => setSelection(null)}
          />

          <div className="ribbon-panel rounded-xl">
            <h2 className="border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Audit trail
            </h2>
            {(events.data?.events ?? []).length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No audit events recorded for this assessment.
              </p>
            ) : (
              <ul className="divide-y divide-border/70">
                {events.data!.events.map((event) => (
                  <li key={event.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-xs font-medium">{event.eventType}</span>
                      <SeverityBadge severity={event.severity} />
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      {event.engine} · {formatTimestamp(event.timestamp)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
