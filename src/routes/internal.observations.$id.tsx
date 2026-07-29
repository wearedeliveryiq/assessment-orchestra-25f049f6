import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, Loader2, Play, Search } from "lucide-react";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { SeverityPill } from "@/components/deliveryiq/severity-pill";
import { observationApi, observationKeys } from "@/lib/observations/client";
import { SEVERITY_ORDER, type Observation } from "@/lib/observations/types";
import { useHydrated } from "@/hooks/use-hydrated";

export const Route = createFileRoute("/internal/observations/$id")({
  head: () => ({
    meta: [
      { title: "Observation Explorer — assessment — DeliveryIQ" },
      {
        name: "description",
        content:
          "Inspect, filter and trace every observation generated for a DeliveryIQ assessment.",
      },
      { property: "og:title", content: "Observation Explorer — assessment — DeliveryIQ" },
      {
        property: "og:description",
        content: "Filter observations by category, severity and confidence, and replay provenance.",
      },
    ],
  }),
  component: ExplorerDetail,
});

const CONFIDENCE_STEPS = [
  { label: "Any confidence", value: 0 },
  { label: "≥ 0.5", value: 0.5 },
  { label: "≥ 0.75", value: 0.75 },
  { label: "≥ 0.9", value: 0.9 },
];

const selectClass =
  "h-9 rounded-md border border-border bg-surface px-2.5 text-sm text-foreground outline-none focus:border-primary/60";

function ExplorerDetail() {
  const { id } = Route.useParams();
  const hydrated = useHydrated();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [minConfidence, setMinConfidence] = useState(0);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, error, isLoading } = useQuery({
    queryKey: observationKeys.forAssessment(id),
    queryFn: () => observationApi.listForAssessment(id),
    enabled: hydrated,
  });

  const run = useMutation({
    mutationFn: () => observationApi.run(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: observationKeys.forAssessment(id) }),
  });

  const observations = useMemo(() => data?.observations ?? [], [data]);

  const categories = useMemo(
    () => Array.from(new Set(observations.map((o) => o.category))).sort(),
    [observations],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return observations.filter(
      (o) =>
        (category === "all" || o.category === category) &&
        (severity === "all" || o.severity === severity) &&
        o.confidence >= minConfidence &&
        (term === "" ||
          o.evidence.toLowerCase().includes(term) ||
          o.title.toLowerCase().includes(term)),
    );
  }, [observations, category, severity, minConfidence, search]);

  return (
    <AppShell
      action={
        <button
          onClick={() => run.mutate()}
          disabled={run.isPending}
          className="ribbon-edge inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {run.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          Run engine
        </button>
      }
    >
      <Link
        to="/internal/observations"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All assessments
      </Link>

      <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
        Observation Explorer
      </h1>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{id}</p>

      {run.error && (
        <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {(run.error as Error).message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {(error as Error).message}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search evidence…"
            className="h-9 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60"
          />
        </div>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className={selectClass}
        >
          <option value="all">All categories</option>
          {categories.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          value={severity}
          onChange={(event) => setSeverity(event.target.value)}
          className={selectClass}
        >
          <option value="all">All severities</option>
          {SEVERITY_ORDER.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          value={minConfidence}
          onChange={(event) => setMinConfidence(Number(event.target.value))}
          className={selectClass}
        >
          {CONFIDENCE_STEPS.map((step) => (
            <option key={step.value} value={step.value}>
              {step.label}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {filtered.length} of {observations.length} observations
      </p>

      {isLoading && (
        <p className="mt-6 text-sm text-muted-foreground">Loading observations…</p>
      )}

      {!isLoading && observations.length === 0 && (
        <p className="mt-6 rounded-lg border border-border bg-surface px-4 py-6 text-sm text-muted-foreground">
          No observations persisted yet. Run the engine to generate them from the active knowledge
          pack.
        </p>
      )}

      <div className="mt-4 space-y-2.5">
        {filtered.map((observation) => (
          <ObservationRow
            key={observation.id}
            observation={observation}
            expanded={expanded === observation.id}
            onToggle={() => setExpanded(expanded === observation.id ? null : observation.id)}
          />
        ))}
      </div>
    </AppShell>
  );
}

function ObservationRow({
  observation,
  expanded,
  onToggle,
}: {
  observation: Observation;
  expanded: boolean;
  onToggle: () => void;
}) {
  const trace = useQuery({
    queryKey: observationKeys.detail(observation.id),
    queryFn: () => observationApi.get(observation.id),
    enabled: expanded,
  });

  return (
    <div className="ribbon-panel rounded-xl">
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 rounded-xl px-4 py-3.5 text-left transition-colors hover:bg-surface-raised"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-accent">
              {observation.category}
            </span>
            <SeverityPill severity={observation.severity} />
            <span className="text-[11px] text-muted-foreground">
              confidence {observation.confidence.toFixed(2)} · weight {observation.weight.toFixed(2)}
            </span>
          </div>
          <p className="mt-1.5 text-sm font-medium">{observation.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{observation.evidence}</p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {observation.questionId} · {observation.definitionId}
          </p>
        </div>
        <ChevronDown
          className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-border/70 px-4 py-4 text-sm">
          {trace.isLoading && <p className="text-muted-foreground">Loading traceability chain…</p>}
          {trace.error && (
            <p className="text-destructive">{(trace.error as Error).message}</p>
          )}
          {trace.data && (
            <dl className="grid gap-3 sm:grid-cols-2">
              <TraceItem label="Assessment">
                {trace.data.assessment.organisationName}
                <span className="block font-mono text-[11px] text-muted-foreground">
                  {trace.data.assessment.id}
                </span>
              </TraceItem>
              <TraceItem label="Question">
                {trace.data.question?.prompt ?? observation.questionId}
                <span className="block font-mono text-[11px] text-muted-foreground">
                  {observation.questionId}
                </span>
              </TraceItem>
              <TraceItem label="Answer">
                {trace.data.answer.label ?? "No answer captured"}
                <span className="block font-mono text-[11px] text-muted-foreground">
                  value {String(trace.data.answer.value ?? "–")}
                </span>
              </TraceItem>
              <TraceItem label="Observation">
                {observation.description}
              </TraceItem>
              <TraceItem label="Knowledge pack rule">
                <span className="font-mono text-[11px]">
                  {trace.data.knowledgePackRule.expression}
                </span>
                <span className="block font-mono text-[11px] text-muted-foreground">
                  {trace.data.knowledgePackRule.packId}@{trace.data.knowledgePackRule.packVersion}
                </span>
              </TraceItem>
              <TraceItem label="Generated">
                {new Date(observation.createdAt).toLocaleString()}
              </TraceItem>
            </dl>
          )}
        </div>
      )}
    </div>
  );
}

function TraceItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/70 bg-surface px-3 py-2.5">
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}
