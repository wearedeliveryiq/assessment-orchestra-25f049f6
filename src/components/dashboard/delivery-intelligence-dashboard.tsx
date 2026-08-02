import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  fetchLatestIntelligence,
  acceptIntelligenceRecommendation,
  type WorkspaceIntelligenceResult,
} from "@/lib/delivery-intelligence/client";
import { useHydrated } from "@/hooks/use-hydrated";

export function DeliveryIntelligenceDashboard({ assessmentId }: { assessmentId: string }) {
  const hydrated = useHydrated();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["delivery-intelligence", assessmentId],
    queryFn: () => fetchLatestIntelligence(assessmentId),
    enabled: hydrated,
    staleTime: 60_000,
  });
  const acceptance = useMutation({
    mutationFn: (recommendationId: string) =>
      acceptIntelligenceRecommendation(query.data!.analysisRunId, recommendationId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["delivery-intelligence", assessmentId] }),
  });
  if (!hydrated || query.isPending)
    return (
      <div
        className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"
        aria-live="polite"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading delivery intelligence…
      </div>
    );
  if (query.error || !query.data)
    return (
      <section
        role="alert"
        className="rounded-xl border border-destructive/40 bg-destructive/10 p-5"
      >
        <h2 className="font-semibold">Intelligence is not available</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {query.error?.message ?? "No completed result was found."}
        </p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mt-4 min-h-11 rounded-lg border border-border px-4 text-sm font-medium"
        >
          Try again
        </button>
      </section>
    );
  const result = query.data;
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="grid gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              DeliveryIQ intelligence
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              {result.executiveSummary.overallPosition}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {result.executiveSummary.confidence}
            </p>
            {result.executiveSummary.caveat && (
              <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
                {result.executiveSummary.caveat}
              </p>
            )}
          </div>
          <div className="min-w-36 rounded-xl border border-border bg-background/60 p-5 text-center">
            <span className="block text-4xl font-semibold text-primary">
              {result.overall.displayScore ?? "—"}
            </span>
            <span className="mt-1 block text-xs capitalize text-muted-foreground">
              {result.overall.band ?? "Insufficient evidence"}
            </span>
            <span className="mt-4 block text-lg font-semibold">
              {result.confidence.displayIndex}
            </span>
            <span className="text-xs capitalize text-muted-foreground">
              {result.confidence.band} confidence
            </span>
          </div>
        </div>
      </section>
      <section
        aria-labelledby="capabilities-title"
        className="rounded-2xl border border-border bg-card p-6"
      >
        <h2 id="capabilities-title" className="text-xl font-semibold">
          Delivery capabilities
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {result.capabilities.map((capability) => (
            <article key={capability.id} className="rounded-xl border border-border/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium">{capability.label}</h3>
                <span className="text-lg font-semibold text-primary">
                  {capability.displayScore ?? "—"}
                </span>
              </div>
              <p className="mt-2 text-xs capitalize text-muted-foreground">
                {capability.state === "available" ? capability.band : "Insufficient evidence"} ·{" "}
                {capability.eligibleAnswerCount}/{capability.totalQuestionCount} eligible answers
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div
                  className="h-full bg-primary"
                  style={{ width: `${capability.displayScore ?? 0}%` }}
                />
              </div>
            </article>
          ))}
        </div>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <ListPanel
          title="Strengths"
          ids={result.findings.strengths}
          labels={result.capabilities}
          empty="No capability meets the approved strength threshold."
        />
        <ListPanel
          title="Priority opportunities"
          ids={result.findings.priorityOpportunities}
          labels={result.capabilities}
          empty="No capability meets the approved priority threshold."
        />
      </div>
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">Detected patterns</h2>
        {result.patterns.length ? (
          <ul className="mt-4 space-y-3">
            {result.patterns.map((pattern) => (
              <li key={pattern.id} className="rounded-xl border border-border/70 p-4">
                <h3 className="font-medium">{pattern.id.replaceAll("_", " ")}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {pattern.explanation}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No approved pattern matched the available evidence.
          </p>
        )}
      </section>
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">Prioritised recommendations</h2>
        {result.recommendations.length ? (
          <ol className="mt-4 space-y-3">
            {result.recommendations.map((item, index) => (
              <li key={item.id} className="rounded-xl border border-border/70 p-4">
                <div className="flex gap-3">
                  <span className="font-semibold text-primary">{index + 1}</span>
                  <div>
                    <h3 className="font-medium">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{item.outcome}</p>
                    <p className="mt-2 text-xs capitalize text-muted-foreground">
                      {item.impact} impact · {item.effort} effort
                    </p>
                    <button
                      type="button"
                      className="mt-3 min-h-11 rounded-lg border border-border px-3 text-sm font-medium"
                      disabled={acceptance.isPending}
                      onClick={() => acceptance.mutate(item.id)}
                    >
                      Accept recommendation
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No action meets the approved recommendation rules.
          </p>
        )}
      </section>
      <ProductPanel
        title="Recommended Knowledge Packs"
        items={result.productRecommendations.knowledgePacks}
        empty="No currently available Knowledge Pack matches these priorities."
      />
      <ProductPanel
        title="Recommended Team Mates"
        items={result.productRecommendations.teamMates}
        empty="Accept a recommendation to review an available Team Mate."
      />
      <Roadmap result={result.roadmap} />
    </div>
  );
}

function ProductPanel({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<{ id: string; cta: string; copy: string }>;
  empty: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {items.length ? (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-border/70 p-4">
              <h3 className="font-medium">{item.id.replaceAll("_", " ")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.copy}</p>
              <span className="mt-3 inline-block text-sm font-medium text-primary">
                {item.cta.replaceAll("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

function ListPanel({
  title,
  ids,
  labels,
  empty,
}: {
  title: string;
  ids: string[];
  labels: Array<{ id: string; label: string }>;
  empty: string;
}) {
  const names = new Map(labels.map((item) => [item.id, item.label]));
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {ids.length ? (
        <ul className="mt-4 space-y-2">
          {ids.map((id) => (
            <li key={id} className="rounded-lg border border-border/70 px-4 py-3 text-sm">
              {names.get(id) ?? id}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}
function Roadmap({ result }: { result: WorkspaceIntelligenceResult["roadmap"] }) {
  if (!("day30" in result))
    return (
      <section role="alert" className="rounded-2xl border border-warning/40 bg-warning/10 p-6">
        <h2 className="text-xl font-semibold">Improvement roadmap unavailable</h2>
        <p className="mt-2 text-sm">
          The approved recommendation dependencies could not be scheduled safely.
        </p>
      </section>
    );
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">30/60/90-day roadmap</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {(
          [
            ["30 days", result.day30],
            ["60 days", result.day60],
            ["90 days", result.day90],
          ] as const
        ).map(([label, items = []]) => (
          <div key={label}>
            <h3 className="font-medium">{label}</h3>
            {items.length ? (
              <ol className="mt-3 space-y-2">
                {items.map((item) => (
                  <li key={item.id} className="rounded-lg border border-border/70 p-3 text-sm">
                    {item.id.replaceAll("_", " ")}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No item scheduled.</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
