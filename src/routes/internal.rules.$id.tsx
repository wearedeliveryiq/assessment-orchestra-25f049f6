import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, Loader2, Play, Search } from "lucide-react";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { SeverityPill } from "@/components/deliveryiq/severity-pill";
import { ruleApi, ruleKeys } from "@/lib/rules/client";
import { SEVERITY_ORDER } from "@/lib/observations/types";
import type { RuleResult, RuleStatus } from "@/lib/rules/types";
import { useHydrated } from "@/hooks/use-hydrated";

export const Route = createFileRoute("/internal/rules/$id")({
  head: () => ({
    meta: [
      { title: "Rule Explorer — assessment — DeliveryIQ" },
      {
        name: "description",
        content:
          "Inspect, filter and trace every business rule evaluated for a DeliveryIQ assessment.",
      },
      { property: "og:title", content: "Rule Explorer — assessment — DeliveryIQ" },
      {
        property: "og:description",
        content:
          "Filter rules by status, category, severity and confidence, and replay their signal-level provenance.",
      },
    ],
  }),
  component: RuleExplorerDetail,
});

const CONFIDENCE_STEPS = [
  { label: "Any confidence", value: 0 },
  { label: "≥ 0.5", value: 0.5 },
  { label: "≥ 0.75", value: 0.75 },
  { label: "≥ 0.9", value: 0.9 },
];

const STATUSES: RuleStatus[] = ["passed", "failed", "warning", "not_evaluated"];

const STATUS_CLASS: Record<RuleStatus, string> = {
  passed: "bg-primary/15 text-primary border-primary/30",
  failed: "bg-muted text-muted-foreground border-border",
  warning: "bg-accent/15 text-accent border-accent/30",
  not_evaluated: "bg-surface text-muted-foreground border-border",
};

const selectClass =
  "h-9 rounded-md border border-border bg-surface px-2.5 text-sm text-foreground outline-none focus:border-primary/60";

function StatusBadge({ status }: { status: RuleStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${STATUS_CLASS[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function RuleExplorerDetail() {
  const { id } = Route.useParams();
  const hydrated = useHydrated();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");
  const [minConfidence, setMinConfidence] = useState(0);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, error, isLoading } = useQuery({
    queryKey: ruleKeys.forAssessment(id),
    queryFn: () => ruleApi.listForAssessment(id),
    enabled: hydrated,
  });

  const run = useMutation({
    mutationFn: () => ruleApi.run(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ruleKeys.forAssessment(id) }),
  });

  const rules = useMemo(() => data?.rules ?? [], [data]);
  const categories = useMemo(
    () => Array.from(new Set(rules.map((rule) => rule.category))).sort(),
    [rules],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rules.filter(
      (rule) =>
        (category === "all" || rule.category === category) &&
        (severity === "all" || rule.severity === severity) &&
        (status === "all" || rule.status === status) &&
        rule.confidence >= minConfidence &&
        (term === "" ||
          rule.name.toLowerCase().includes(term) ||
          rule.description.toLowerCase().includes(term) ||
          rule.evaluationReason.toLowerCase().includes(term) ||
          rule.ruleCode.toLowerCase().includes(term)),
    );
  }, [rules, category, severity, status, minConfidence, search]);

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
          Run rule engine
        </button>
      }
    >
      <Link
        to="/internal/rules"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All assessments
      </Link>

      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">Rule Explorer</h1>
      <p className="mt-2 font-mono text-[11px] text-muted-foreground">{id}</p>

      {error && <p className="mt-4 text-sm text-destructive">{(error as Error).message}</p>}
      {run.error && <p className="mt-4 text-sm text-destructive">{(run.error as Error).message}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search rules…"
            className="h-9 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-sm outline-none focus:border-primary/60"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className={selectClass}
        >
          <option value="all">All statuses</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value.replace("_", " ")}
            </option>
          ))}
        </select>
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
        {filtered.length} of {rules.length} rules
      </p>

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading rules…</p>}

      {!isLoading && rules.length === 0 && (
        <p className="mt-6 rounded-lg border border-border bg-surface px-4 py-6 text-sm text-muted-foreground">
          No rule results persisted yet. Run the engine to evaluate the knowledge pack rules against
          this assessment&apos;s signals.
        </p>
      )}

      <div className="mt-4 space-y-2.5">
        {filtered.map((rule) => (
          <RuleRow
            key={rule.id}
            rule={rule}
            expanded={expanded === rule.id}
            onToggle={() => setExpanded(expanded === rule.id ? null : rule.id)}
          />
        ))}
      </div>
    </AppShell>
  );
}

function RuleRow({
  rule,
  expanded,
  onToggle,
}: {
  rule: RuleResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const trace = useQuery({
    queryKey: ruleKeys.detail(rule.id),
    queryFn: () => ruleApi.get(rule.id),
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
            <span className="font-mono text-[11px] text-muted-foreground">{rule.ruleCode}</span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-accent">
              {rule.category}
            </span>
            <StatusBadge status={rule.status} />
            <SeverityPill severity={rule.severity} />
            <span className="text-[11px] text-muted-foreground">
              confidence {rule.confidence.toFixed(2)}
            </span>
          </div>
          <p className="mt-1.5 text-sm font-medium">{rule.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{rule.description}</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            <span className="text-foreground">Reason:</span> {rule.evaluationReason}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {rule.supportingSignalCodes.length} supporting signal
            {rule.supportingSignalCodes.length === 1 ? "" : "s"}
            {rule.supportingSignalCodes.length > 0
              ? ` · ${rule.supportingSignalCodes.join(", ")}`
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
                <TraceItem label="Knowledge pack rule">
                  <span className="font-mono text-[11px]">
                    {trace.data.knowledgePackRule.expression}
                  </span>
                  <span className="block font-mono text-[11px] text-muted-foreground">
                    {trace.data.knowledgePackRule.packId}@{trace.data.knowledgePackRule.packVersion}
                  </span>
                </TraceItem>
                <TraceItem label="Rationale">{trace.data.knowledgePackRule.rationale}</TraceItem>
                <TraceItem label="Evaluated">
                  {new Date(rule.executedAt).toLocaleString()}
                </TraceItem>
              </dl>

              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Supporting signals
                </p>
                {trace.data.supportingSignals.length === 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No qualifying signals — this rule reasons over their absence.
                  </p>
                )}
                <ul className="mt-2 space-y-2">
                  {trace.data.supportingSignals.map(({ signal, observations }) => (
                    <li
                      key={signal.id}
                      className="rounded-lg border border-border/70 bg-surface px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {signal.signalCode}
                        </span>
                        <SeverityPill severity={signal.severity} />
                        <span className="text-[11px] text-muted-foreground">
                          confidence {signal.confidence.toFixed(2)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm font-medium">{signal.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{signal.description}</p>

                      <ul className="mt-2 space-y-2 border-l border-border/70 pl-3">
                        {observations.map((observation) => (
                          <li key={observation.observationId}>
                            <p className="text-xs font-medium">{observation.title}</p>
                            <p className="text-xs text-muted-foreground">{observation.evidence}</p>
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
