import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Loader2,
  Play,
  Sparkles,
  FileText,
} from "lucide-react";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { narrativeApi, narrativeKeys } from "@/lib/narrative/client";
import type { NarrativeSection, NarrativeTrace } from "@/lib/narrative/types";
import { useHydrated } from "@/hooks/use-hydrated";

export const Route = createFileRoute("/internal/narratives/$id")({
  head: () => ({
    meta: [
      { title: "Narrative Explorer — assessment — DeliveryIQ" },
      {
        name: "description",
        content:
          "Inspect every generated narrative section for a DeliveryIQ assessment, with generation mode, validation results and full evidence provenance.",
      },
      { property: "og:title", content: "Narrative Explorer — assessment — DeliveryIQ" },
      {
        property: "og:description",
        content:
          "Replay the Narrative Engine: sections, prompts, template fallbacks and the evidence chain behind every sentence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NarrativeExplorerDetail,
});

const selectClass =
  "h-9 rounded-md border border-border bg-surface px-2.5 text-sm text-foreground outline-none focus:border-primary/60";

function SourceBadge({ section }: { section: NarrativeSection }) {
  const ai = section.source === "ai";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        ai
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-border bg-surface-raised text-muted-foreground"
      }`}
    >
      {ai ? <Sparkles className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
      {ai ? "AI generated" : "Template"}
    </span>
  );
}

function NarrativeExplorerDetail() {
  const { id } = Route.useParams();
  const hydrated = useHydrated();
  const queryClient = useQueryClient();

  const [source, setSource] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, error, isLoading } = useQuery({
    queryKey: narrativeKeys.forAssessment(id),
    queryFn: () => narrativeApi.forAssessment(id),
    enabled: hydrated,
  });

  const narrative = data?.narrative ?? null;

  const trace = useQuery({
    queryKey: narrativeKeys.detail(narrative?.id ?? "none"),
    queryFn: () => narrativeApi.get(narrative!.id),
    enabled: hydrated && Boolean(narrative),
  });

  const run = useMutation({
    mutationFn: () => narrativeApi.run(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: narrativeKeys.forAssessment(id) }),
  });

  const sections = useMemo(
    () =>
      (narrative?.sections ?? []).filter(
        (section) => source === "all" || section.source === source,
      ),
    [narrative, source],
  );

  const chains = useMemo(() => {
    const map = new Map<string, NarrativeTrace["sections"][number]>();
    for (const entry of trace.data?.sections ?? []) map.set(entry.section.key, entry);
    return map;
  }, [trace.data]);

  return (
    <AppShell
      action={
        <button
          onClick={() => run.mutate()}
          disabled={run.isPending}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {run.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Re-generate narrative
        </button>
      }
    >
      <Link
        to="/internal/narratives"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All assessments
      </Link>

      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
        {narrative?.headline ?? "Narrative Explorer"}
      </h1>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{id}</p>

      {(error || run.error) && (
        <p className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {((error ?? run.error) as Error).message}
        </p>
      )}

      {isLoading && <p className="mt-8 text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && !narrative && (
        <div className="ribbon-panel mt-8 rounded-xl p-6">
          <p className="text-sm text-muted-foreground">
            No narrative has been generated for this assessment yet. Run the Narrative Engine to
            produce one from the persisted scores and patterns.
          </p>
        </div>
      )}

      {narrative && (
        <>
          <section className="ribbon-panel mt-8 rounded-xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.2em] text-accent">
                  Generation metadata
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {narrative.summary}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Mode</dt>
                  <dd className="font-medium capitalize">{narrative.mode}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Provider</dt>
                  <dd className="font-medium">{narrative.provider}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Model</dt>
                  <dd className="truncate font-mono text-xs">{narrative.model || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Confidence</dt>
                  <dd className="font-medium tabular-nums">{narrative.confidence.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Audience</dt>
                  <dd className="font-medium">{narrative.audience}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Generated in</dt>
                  <dd className="font-medium tabular-nums">{narrative.generationMs} ms</dd>
                </div>
              </dl>
            </div>

            {!narrative.validation.valid && (
              <div className="mt-5 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Validation failed
                </p>
                <ul className="mt-2 space-y-1 text-xs text-destructive">
                  {narrative.validation.issues.map((issue, index) => (
                    <li key={index}>
                      {issue.sectionKey ? `${issue.sectionKey}: ` : ""}
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {narrative.validation.warnings.length > 0 && (
              <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
                {narrative.validation.warnings.map((warning, index) => (
                  <li key={index}>
                    ⚠ {warning.sectionKey ? `${warning.sectionKey}: ` : ""}
                    {warning.message}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Source
            </label>
            <select
              className={selectClass}
              value={source}
              onChange={(event) => setSource(event.target.value)}
            >
              <option value="all">All sections</option>
              <option value="ai">AI generated</option>
              <option value="template">Template</option>
            </select>
            <span className="text-xs text-muted-foreground">
              {sections.length} of {narrative.sections.length} sections
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {sections.map((section) => {
              const open = expanded === section.key;
              const chain = chains.get(section.key);
              return (
                <article key={section.key} className="ribbon-panel rounded-xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-lg font-semibold tracking-tight">
                      {section.title}
                    </h2>
                    <div className="flex items-center gap-2">
                      <SourceBadge section={section} />
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {section.wordCount} words
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-foreground/90">{section.body}</p>

                  {section.fallbackReason && (
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      Fell back to template: {section.fallbackReason}
                    </p>
                  )}

                  <button
                    onClick={() => setExpanded(open ? null : section.key)}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                    {open ? "Hide evidence" : `Evidence (${section.evidence.length})`}
                  </button>

                  {open && (
                    <div className="mt-4 space-y-4 border-t border-border/70 pt-4">
                      {section.guidance && (
                        <p className="text-xs text-muted-foreground">
                          <span className="uppercase tracking-[0.16em]">Guidance</span> ·{" "}
                          {section.guidance}
                        </p>
                      )}

                      <ul className="space-y-2">
                        {section.evidence.map((ref) => (
                          <li
                            key={`${ref.kind}-${ref.code}`}
                            className="rounded-md border border-border/70 bg-surface-raised px-3 py-2 text-xs"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium">{ref.label}</span>
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {ref.code} · {ref.kind}
                              </span>
                            </div>
                            <p className="mt-1 text-muted-foreground">{ref.detail}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              confidence {ref.confidence.toFixed(2)}
                            </p>
                          </li>
                        ))}
                      </ul>

                      {chain && chain.scores.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-accent">
                            Provenance chain
                          </p>
                          {chain.scores.map((scoreChain) => (
                            <div
                              key={scoreChain.score.id}
                              className="rounded-md border border-border/70 p-3 text-xs"
                            >
                              <p className="font-medium">
                                {scoreChain.score.dimension} ·{" "}
                                {scoreChain.score.percentage.toFixed(1)}%
                              </p>
                              {scoreChain.patterns.map((patternChain) => (
                                <div
                                  key={patternChain.pattern.id}
                                  className="mt-2 border-l border-border/70 pl-3"
                                >
                                  <p className="text-muted-foreground">
                                    Pattern · {patternChain.pattern.name}
                                  </p>
                                  {patternChain.rules.map((ruleChain) => (
                                    <div
                                      key={ruleChain.rule.id}
                                      className="mt-1 border-l border-border/70 pl-3"
                                    >
                                      <p className="text-muted-foreground">
                                        Rule · {ruleChain.rule.name}
                                      </p>
                                      {ruleChain.signals.map((signalChain) => (
                                        <div
                                          key={signalChain.signal.id}
                                          className="mt-1 border-l border-border/70 pl-3"
                                        >
                                          <p className="text-muted-foreground">
                                            Signal · {signalChain.signal.name}
                                          </p>
                                          <ul className="mt-1 space-y-1">
                                            {signalChain.observations.map((observation) => (
                                              <li
                                                key={observation.observationId}
                                                className="border-l border-border/70 pl-3 text-muted-foreground"
                                              >
                                                <span className="text-foreground">
                                                  {observation.title}
                                                </span>{" "}
                                                — {observation.evidence}
                                                {observation.question && (
                                                  <span className="block text-[10px]">
                                                    Q: {observation.question.prompt} · A:{" "}
                                                    {observation.answer.label ??
                                                      String(observation.answer.value ?? "—")}
                                                  </span>
                                                )}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </AppShell>
  );
}
