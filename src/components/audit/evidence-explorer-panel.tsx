import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Loader2, X } from "lucide-react";

import { auditApi, auditKeys } from "@/lib/audit/client";
import type { EvidenceEntityType, EvidenceNode } from "@/lib/audit/types";
import { ConfidenceBar, EntityBadge, entityLabel, formatTimestamp } from "./audit-primitives";

export interface EvidenceSelection {
  type: EvidenceEntityType;
  id: string;
}

/**
 * Evidence Explorer — a side panel for navigating the reasoning chain in both
 * directions. It renders only what the Audit service returns; no derivation
 * or scoring happens in the browser.
 */
export function EvidenceExplorerPanel({
  assessmentId,
  selection,
  onSelect,
  onClose,
}: {
  assessmentId: string;
  selection: EvidenceSelection | null;
  onSelect: (selection: EvidenceSelection) => void;
  onClose: () => void;
}) {
  const enabled = Boolean(selection);

  const evidence = useQuery({
    queryKey: ["audit", "evidence", assessmentId, selection?.type, selection?.id],
    queryFn: () => auditApi.evidence(selection!.type, selection!.id, assessmentId),
    enabled,
  });

  const explanation = useQuery({
    queryKey: auditKeys.explain(selection?.type ?? "", selection?.id ?? ""),
    queryFn: () => auditApi.explain(selection!.type, selection!.id, { assessmentId }),
    enabled,
  });

  if (!selection) {
    return (
      <aside className="ribbon-panel rounded-xl p-6 text-sm text-muted-foreground">
        Select any node in the evidence graph to open its provenance chain.
      </aside>
    );
  }

  const data = evidence.data;
  const loading = evidence.isLoading || explanation.isLoading;

  return (
    <aside className="ribbon-panel rounded-xl">
      <header className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <EntityBadge type={selection.type} />
            <span className="text-xs uppercase tracking-[0.18em] text-accent">
              Evidence Explorer
            </span>
          </div>
          <p className="mt-2 truncate text-sm font-medium">
            {data?.entity.label ?? entityLabel(selection.type)}
          </p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">{selection.id}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close evidence explorer"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {loading && (
        <div className="flex items-center gap-2 px-5 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Resolving provenance…
        </div>
      )}

      {evidence.isError && (
        <p className="px-5 py-6 text-sm text-destructive">
          {(evidence.error as Error).message}
        </p>
      )}

      {data && !loading && (
        <div className="space-y-6 px-5 py-5">
          <section>
            <p className="text-sm text-muted-foreground">{data.entity.detail}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <ConfidenceBar value={data.entity.confidence} />
              <span className="font-mono text-[11px] text-muted-foreground">
                {formatTimestamp(data.entity.timestamp)}
              </span>
            </div>
          </section>

          <NodeList
            title="Because of (upstream evidence)"
            icon={<ArrowUpRight className="h-3.5 w-3.5" />}
            items={data.upstream.map((item) => ({
              node: item.node,
              relationship: item.edge.relationshipType,
            }))}
            onSelect={onSelect}
            emptyText="This is an originating node — nothing sits upstream of it."
          />

          <NodeList
            title="Influences (downstream conclusions)"
            icon={<ArrowDownRight className="h-3.5 w-3.5" />}
            items={data.downstream.map((item) => ({
              node: item.node,
              relationship: item.edge.relationshipType,
            }))}
            onSelect={onSelect}
            emptyText="Nothing downstream consumes this node yet."
          />

          {explanation.data && explanation.data.originatingResponses.length > 0 && (
            <NodeList
              title="Originating assessment responses"
              icon={<ArrowUpRight className="h-3.5 w-3.5" />}
              items={explanation.data.originatingResponses.map((node) => ({
                node,
                relationship: "answered",
              }))}
              onSelect={onSelect}
              emptyText=""
            />
          )}

          {explanation.data && explanation.data.executionEvents.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Execution events
              </h3>
              <ul className="mt-3 space-y-2">
                {explanation.data.executionEvents.slice(0, 6).map((event) => (
                  <li
                    key={event.id}
                    className="rounded-lg border border-border/70 bg-surface-raised px-3 py-2"
                  >
                    <p className="text-xs font-medium">{event.eventType}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {event.engine} · {formatTimestamp(event.timestamp)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </aside>
  );
}

function NodeList({
  title,
  icon,
  items,
  onSelect,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  items: { node: EvidenceNode; relationship: string }[];
  onSelect: (selection: EvidenceSelection) => void;
  emptyText: string;
}) {
  return (
    <section>
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {icon}
        {title}
      </h3>
      {items.length === 0 ? (
        emptyText ? <p className="mt-2 text-xs text-muted-foreground">{emptyText}</p> : null
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={`${item.node.type}:${item.node.id}`}>
              <button
                type="button"
                onClick={() => onSelect({ type: item.node.type, id: item.node.id })}
                className="w-full rounded-lg border border-border/70 bg-surface-raised px-3 py-2.5 text-left transition-colors hover:border-accent/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <EntityBadge type={item.node.type} />
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    {item.relationship}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-medium">{item.node.label}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {item.node.detail}
                </p>
                <div className="mt-2">
                  <ConfidenceBar value={item.node.confidence} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
