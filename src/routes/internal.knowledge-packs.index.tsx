import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Boxes, CheckCircle2, RefreshCw, TriangleAlert } from "lucide-react";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { knowledgePackApi, knowledgePackKeys } from "@/lib/knowledge-packs/client";

export const Route = createFileRoute("/internal/knowledge-packs/")({
  head: () => ({
    meta: [
      { title: "Knowledge Pack Explorer — DeliveryIQ" },
      {
        name: "description",
        content:
          "Internal runtime tooling for discovering, validating, versioning and activating DeliveryIQ Knowledge Packs.",
      },
      { property: "og:title", content: "Knowledge Pack Explorer — DeliveryIQ" },
      {
        property: "og:description",
        content: "Inspect installed Knowledge Packs, validation reports, versions and runtime cache state.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KnowledgePackExplorer,
});

function KnowledgePackExplorer() {
  const hydrated = useHydrated();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: knowledgePackKeys.list,
    queryFn: () => knowledgePackApi.list(),
    enabled: hydrated,
  });

  const reload = useMutation({
    mutationFn: () => knowledgePackApi.reload(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: knowledgePackKeys.list }),
  });

  const revalidate = useMutation({
    mutationFn: () => knowledgePackApi.validate(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: knowledgePackKeys.list }),
  });

  const packs = data?.packs ?? [];

  return (
    <AppShell>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
        <Boxes className="h-3.5 w-3.5" />
        Internal tooling
      </div>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">Knowledge Pack Explorer</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Every assessment framework the runtime can reason with. Packs are discovered from disk,
        validated against the runtime schema and cross-checked end to end before they can be
        activated.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => reload.mutate()}
          disabled={reload.isPending}
        >
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${reload.isPending ? "animate-spin" : ""}`} />
          Reload registry
        </Button>
        <Button variant="outline" size="sm" onClick={() => revalidate.mutate()} disabled={revalidate.isPending}>
          Revalidate all
        </Button>
        {data && (
          <span className="text-xs text-muted-foreground">
            Runtime schema v{data.runtime.schemaVersion} · active pack{" "}
            <span className="text-foreground">{data.runtime.activePackId}</span> · cache{" "}
            {data.cache.size} entr{data.cache.size === 1 ? "y" : "ies"} ({data.cache.hits} hits /{" "}
            {data.cache.misses} misses)
          </span>
        )}
      </div>

      {reload.isError && (
        <p className="mt-3 text-sm text-destructive">{(reload.error as Error).message}</p>
      )}
      {error && <p className="mt-3 text-sm text-destructive">{(error as Error).message}</p>}

      <div className="ribbon-panel mt-8 rounded-xl p-1">
        <div className="rounded-lg">
          {isLoading && <p className="px-4 py-6 text-sm text-muted-foreground">Loading registry…</p>}
          {!isLoading && packs.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground">No knowledge packs installed.</p>
          )}
          <ul className="divide-y divide-border/70">
            {packs.map((pack) => (
              <li key={pack.packId}>
                <Link
                  to="/internal/knowledge-packs/$id"
                  params={{ id: pack.packId }}
                  className="flex items-center justify-between gap-4 px-4 py-4 transition hover:bg-secondary/40"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{pack.name}</span>
                      <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {pack.packId}
                      </span>
                      {pack.activeVersion && (
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">
                          active v{pack.activeVersion}
                        </span>
                      )}
                      {pack.valid ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                      ) : (
                        <TriangleAlert className="h-3.5 w-3.5 text-destructive" />
                      )}
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{pack.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pack.versions.length} version{pack.versions.length === 1 ? "" : "s"} · latest v
                      {pack.latestVersion ?? "—"}
                      {pack.assessmentType ? ` · ${pack.assessmentType}` : ""}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {data && data.audit.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold">Runtime activity</h2>
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {data.audit.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="flex flex-wrap gap-2">
                <span className="text-foreground/70">{entry.at.replace("T", " ").slice(0, 19)}</span>
                <span className="uppercase tracking-wide">{entry.action}</span>
                <span>{entry.packId}{entry.version ? `@${entry.version}` : ""}</span>
                <span className={entry.outcome === "failure" ? "text-destructive" : ""}>{entry.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
