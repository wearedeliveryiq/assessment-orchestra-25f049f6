import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, Loader2, Play, Search } from "lucide-react";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { SeverityPill } from "@/components/deliveryiq/severity-pill";
import { patternApi, patternKeys } from "@/lib/patterns/client";
import { SEVERITY_ORDER } from "@/lib/observations/types";
import type { Pattern } from "@/lib/patterns/types";
import { useHydrated } from "@/hooks/use-hydrated";

export const Route = createFileRoute("/internal/patterns/$id")({
  head: () => ({
    meta: [
      { title: "Pattern Explorer — assessment — DeliveryIQ" },
      {
        name: "description",
        content:
          "Inspect, filter and trace every organisational pattern identified for a DeliveryIQ assessment.",
      },
      { property: "og:title", content: "Pattern Explorer — assessment — DeliveryIQ" },
      {
        property: "og:description",
        content:
          "Filter patterns by category, severity and confidence, and replay their rule-level provenance.",
      },
    ],
  }),
  component: PatternExplorerDetail,
});

const CONFIDENCE_STEPS = [
  { label: "Any confidence", value: 0 },
  { label: "≥ 0.5", value: 0.5 },
  { label: "≥ 0.75", value: 0.75 },
  { label: "≥ 0.9", value: 0.9 },
];

const selectClass =
  "h-9 rounded-md border border-border bg-surface px-2.5 text-sm text-foreground outline-none focus:border-primary/60";

function PatternExplorerDetail() {
  const { id } = Route.useParams();
  const hydrated = useHydrated();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [minConfidence, setMinConfidence] = useState(0);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, error, isLoading } = useQuery({
    queryKey: patternKeys.forAssessment(id),
    queryFn: () => patternApi.listForAssessment(id),
    enabled: hydrated,
  });

  const run = useMutation({
    mutationFn: () => patternApi.run(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: patternKeys.forAssessment(id) }),
  });

  const patterns = useMemo(() => data?.patterns ?? [], [data]);
  const categories = useMemo(
    () => Array.from(new Set(patterns.map((pattern) => pattern.category))).sort(),
    [patterns],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return patterns.filter(
      (pattern) =>
        (category === "all" || pattern.category === category) &&
        (severity === "all" || pattern.severity === severity) &&
        pattern.confidence >= minConfidence &&
        (term === "" ||
          pattern.name.toLowerCase().includes(term) ||
          pattern.description.toLowerCase().includes(term) ||
          pattern.businessImpact.toLowerCase().includes(term) ||
          pattern.patternCode.toLowerCase().includes(term)),
    );
  }, [patterns, category, severity, minConfidence, search]);

  return (
    <AppShell
      action={
        <button
          onClick={() => run.mutate()}
          disabled={run.isPending}
          className="ribbon-edge inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
        >
          {run.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          Run pattern engine
        </button>
      }
    >
      <Link
        to="/internal/patterns"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All assessments
      </Link>

      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">Pattern Explorer</h1>
      <p className="mt-2 font-mono text-[11px] text-muted-foreground">{id}</p>

      {error && <p className="mt-4 text-sm text-destructive">{(error as Error).message}</p>}
      {run.error && <p className="mt-4 text-sm text-destructive">{(run.error as Error).message}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search patterns…"
            className="h-9 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-sm outline-none focus:border-primary/60"
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
        {filtered.length} of {patterns.length} patterns
      </p>

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading patterns…</p>}

      {!isLoading && patterns.length === 0 && (
        <p className="mt-6 rounded-lg border border-border bg-surface px-4 py-6 text-sm text-muted-foreground">
          No patterns persisted yet. Run the engine to evaluate the knowledge pack patterns against
          this assessment&apos;s rule results.
        </p>
      )}

      <div className="mt-4 space-y-2.5">
        {filtered.map((pattern) => (
          <PatternRow
            key={pattern.id}
            pattern={pattern}
            expanded={expanded === pattern.id}
            onToggle={() => setExpanded(expanded === pattern.id ? null : pattern.id)}
          />
        ))}
      </div>
    </AppShell>
  );
}

function PatternRow({
  pattern,
  expanded,
  onToggle,
}: {
  pattern: Pattern;
  expanded: boolean;
  onToggle: () => void;
}) {
  const trace = useQuery({
    queryKey: patternKeys.detail(pattern.id),
    queryFn: () => patternApi.get(pattern.id),
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
            <span className="font-mono text-[11px] text-muted-foreground">
              {pattern.patternCode}
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-accent">
              {pattern.category}
            </span>
            <SeverityPill severity={pattern.severity} />
            <span className="text-[11px] text-muted-foreground">
              confidence {pattern.confidence.toFixed(2)}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {pattern.knowledgePack}@{pattern.knowledgePackVersion}
            </span>
          </div>
          <p className="mt-1.5 text-sm font-medium">{pattern.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{pattern.description}</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            <span className="text-foreground">Business impact:</span> {pattern.businessImpact}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {pattern.supportingRuleCodes.length} supporting rule
            {pattern.supportingRuleCodes.length === 1 ? "" : "s"}
            {pattern.supportingRuleCodes.length > 0
              ? ` · ${pattern.supportingRuleCodes.join(", ")}`
              : ""}
          </p>
        </div>
        <ChevronDown
          className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-border/70 px-4 py-4 text-sm">
          {trace.isLoading && <p className="text-muted-foreground">Loading traceability chain…</p>}
          {trace.error && <p className="text-destructive">{(trace.error as Error).message}</p>}
          {trace.data && (
            <div className="space-y-4">
              <dl className="grid gap-3 sm:grid-cols-2">
                <TraceItem label="Assessment">
                  {trace.data.assessment.organisationName}
                  <span className="block font-mono text-[11px] text-muted-foreground">
                    {trace.data.assessment.id}
                  </span>
                </TraceItem>
                <TraceItem label="Knowledge pack pattern">
                  <span className="font-mono text-[11px]">
                    {trace.data.knowledgePackPattern.expression}
                  </span>
                  <span className="block font-mono text-[11px] text-muted-foreground">
                    {trace.data.knowledgePackPattern.packId}@
                    {trace.data.knowledgePackPattern.packVersion}
                  </span>
                </TraceItem>
                <TraceItem label="Business impact">
                  {trace.data.knowledgePackPattern.businessImpact}
                </TraceItem>
                <TraceItem label="Identified">
                  {new Date(pattern.createdAt).toLocaleString()}
                  <span className="block text-[11px] text-muted-foreground">
                    {pattern.evaluationReason}
                  </span>
                </TraceItem>
              </dl>

              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Supporting rules
                </p>
                {trace.data.supportingRules.length === 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No qualifying rules — this pattern reasons over their absence.
                  </p>
                )}
                <ul className="mt-2 space-y-2">
                  {trace.data.supportingRules.map(({ rule, signals }) => (
                    <li
                      key={rule.id}
                      className="rounded-lg border border-border/70 bg-surface px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {rule.ruleCode}
                        </span>
                        <SeverityPill severity={rule.severity} />
                        <span className="text-[11px] text-muted-foreground">
                          confidence {rule.confidence.toFixed(2)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm font-medium">{rule.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{rule.evaluationReason}</p>

                      <ul className="mt-2 space-y-2 border-l border-border/70 pl-3">
                        {signals.map(({ signal, observations }) => (
                          <li key={signal.id}>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {signal.signalCode}
                              </span>
                              <span className="text-xs font-medium">{signal.name}</span>
                              <span className="text-[11px] text-muted-foreground">
                                confidence {signal.confidence.toFixed(2)}
                              </span>
                            </div>
                            <ul className="mt-1.5 space-y-1.5 border-l border-border/70 pl-3">
                              {observations.map((observation) => (
                                <li key={observation.observationId}>
                                  <p className="text-xs font-medium">{observation.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {observation.evidence}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    <span className="text-foreground">Question:</span>{" "}
                                    {observation.question?.prompt ?? observation.definitionId}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    <span className="text-foreground">Response:</span>{" "}
                                    {observation.answer.label ?? "No answer captured"} (value{" "}
                                    {String(observation.answer.value ?? "–")})
                                  </p>
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
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
