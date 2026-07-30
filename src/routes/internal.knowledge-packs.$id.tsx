import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, TriangleAlert } from "lucide-react";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { knowledgePackApi, knowledgePackKeys } from "@/lib/knowledge-packs/client";

export const Route = createFileRoute("/internal/knowledge-packs/$id")({
  head: () => ({
    meta: [
      { title: "Knowledge Pack Detail — DeliveryIQ" },
      {
        name: "description",
        content:
          "Inspect a DeliveryIQ Knowledge Pack: manifest, versions, definition counts and its full validation report.",
      },
      { property: "og:title", content: "Knowledge Pack Detail — DeliveryIQ" },
      {
        property: "og:description",
        content: "Manifest, versions, definition counts and validation issues for a Knowledge Pack.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KnowledgePackDetail,
});

const COUNT_LABELS: Record<string, string> = {
  sections: "Sections",
  questions: "Questions",
  observations: "Observations",
  signals: "Signals",
  rules: "Rules",
  patterns: "Patterns",
  scores: "Score dimensions",
  recommendations: "Recommendations",
  narrativeSections: "Narrative sections",
};

function KnowledgePackDetail() {
  const { id } = Route.useParams();
  const hydrated = useHydrated();
  const queryClient = useQueryClient();
  const [version, setVersion] = useState<string | undefined>(undefined);

  const { data, isLoading, error } = useQuery({
    queryKey: knowledgePackKeys.detail(id, version),
    queryFn: () => knowledgePackApi.get(id, version),
    enabled: hydrated,
  });

  const activate = useMutation({
    mutationFn: (target: string) => knowledgePackApi.activate(id, target),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgePackKeys.list });
      queryClient.invalidateQueries({ queryKey: ["knowledge-pack", id] });
    },
  });

  const selected = data?.selected;
  const validation = data?.validation;

  return (
    <AppShell>
      <Link
        to="/internal/knowledge-packs"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Knowledge Pack Explorer
      </Link>

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading pack…</p>}
      {error && <p className="mt-6 text-sm text-destructive">{(error as Error).message}</p>}

      {data && selected && (
        <>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">{selected.name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{selected.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-border/70 px-2 py-0.5 text-muted-foreground">
              {selected.packId}
            </span>
            <span className="rounded-full border border-border/70 px-2 py-0.5 text-muted-foreground">
              v{selected.version}
            </span>
            <span className="rounded-full border border-border/70 px-2 py-0.5 uppercase tracking-wide text-muted-foreground">
              {selected.status}
            </span>
            {selected.active && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 font-medium text-accent">Active</span>
            )}
            {selected.valid ? (
              <span className="inline-flex items-center gap-1 text-accent">
                <CheckCircle2 className="h-3.5 w-3.5" /> Valid
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-destructive">
                <TriangleAlert className="h-3.5 w-3.5" /> {selected.errorCount} error(s)
              </span>
            )}
          </div>

          <section className="ribbon-panel mt-8 rounded-xl p-1">
            <div className="rounded-lg p-4">
              <h2 className="font-display text-lg font-semibold">Versions</h2>
              <ul className="mt-3 divide-y divide-border/70">
                {data.pack.versions.map((entry) => (
                  <li key={entry.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="text-sm">
                      <button
                        type="button"
                        className={`font-medium underline-offset-4 hover:underline ${
                          entry.version === selected.version ? "text-accent" : ""
                        }`}
                        onClick={() => setVersion(entry.version)}
                      >
                        v{entry.version}
                      </button>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {entry.status}
                        {entry.latest ? " · latest" : ""}
                        {entry.active ? " · active" : ""} · {entry.path}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant={entry.active ? "secondary" : "outline"}
                      disabled={entry.active || !entry.valid || activate.isPending}
                      onClick={() => activate.mutate(entry.version)}
                    >
                      {entry.active ? "Active" : "Activate"}
                    </Button>
                  </li>
                ))}
              </ul>
              {activate.isError && (
                <p className="mt-2 text-sm text-destructive">{(activate.error as Error).message}</p>
              )}
            </div>
          </section>

          {selected.counts && (
            <section className="mt-8">
              <h2 className="font-display text-lg font-semibold">Definitions</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {Object.entries(selected.counts).map(([key, value]) => (
                  <div key={key} className="ribbon-panel rounded-xl p-1">
                    <div className="rounded-lg px-3 py-3">
                      <p className="text-2xl font-semibold">{value}</p>
                      <p className="text-xs text-muted-foreground">{COUNT_LABELS[key] ?? key}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-8">
            <h2 className="font-display text-lg font-semibold">Validation report</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {validation?.errorCount ?? 0} error(s), {validation?.warningCount ?? 0} warning(s) ·
              validated in {validation?.durationMs ?? 0}ms
            </p>
            {validation && validation.issues.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                No issues — every reference in this pack resolves.
              </p>
            )}
            <ul className="mt-3 space-y-2">
              {validation?.issues.map((issue, index) => (
                <li
                  key={`${issue.code}-${index}`}
                  className="ribbon-panel rounded-xl p-1"
                >
                  <div className="rounded-lg px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={
                          issue.severity === "error"
                            ? "rounded-full bg-destructive/15 px-2 py-0.5 font-medium text-destructive"
                            : "rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground"
                        }
                      >
                        {issue.severity}
                      </span>
                      <span className="text-muted-foreground">{issue.code}</span>
                      {issue.file && <span className="text-muted-foreground">{issue.file}</span>}
                      {issue.path && <span className="text-muted-foreground">{issue.path}</span>}
                    </div>
                    <p className="mt-1">{issue.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {data.manifest && (
            <section className="mt-8">
              <h2 className="font-display text-lg font-semibold">Manifest</h2>
              <pre className="ribbon-panel mt-3 overflow-x-auto rounded-xl p-4 text-xs text-muted-foreground">
                {JSON.stringify(data.manifest, null, 2)}
              </pre>
            </section>
          )}
        </>
      )}
    </AppShell>
  );
}
