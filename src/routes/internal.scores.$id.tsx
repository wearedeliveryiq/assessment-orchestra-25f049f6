import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, Loader2, Play } from "lucide-react";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { SeverityPill } from "@/components/deliveryiq/severity-pill";
import { scoreApi, scoreKeys } from "@/lib/scores/client";
import type { Score, ScoreTrace } from "@/lib/scores/types";
import { useHydrated } from "@/hooks/use-hydrated";

export const Route = createFileRoute("/internal/scores/$id")({
  head: () => ({
    meta: [
      { title: "Score Explorer — assessment — DeliveryIQ" },
      {
        name: "description",
        content:
          "Inspect every weighted dimension score for a DeliveryIQ assessment, with maturity, confidence and full pattern-level provenance.",
      },
      { property: "og:title", content: "Score Explorer — assessment — DeliveryIQ" },
      {
        property: "og:description",
        content:
          "Replay the Scoring Engine: dimensions, weights, maturity bands and the evidence chain behind each score.",
      },
    ],
  }),
  component: ScoreExplorerDetail,
});

const selectClass =
  "h-9 rounded-md border border-border bg-surface px-2.5 text-sm text-foreground outline-none focus:border-primary/60";

const pct = (value: number) => `${value.toFixed(1)}%`;

function Meter({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function ScoreExplorerDetail() {
  const { id } = Route.useParams();
  const hydrated = useHydrated();
  const queryClient = useQueryClient();

  const [maturity, setMaturity] = useState("all");
  const [minConfidence, setMinConfidence] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, error, isLoading } = useQuery({
    queryKey: scoreKeys.summary(id),
    queryFn: () => scoreApi.summary(id),
    enabled: hydrated,
  });

  const run = useMutation({
    mutationFn: () => scoreApi.run(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scoreKeys.summary(id) }),
  });

  const scores = useMemo(() => data?.scores ?? [], [data]);
  const maturities = useMemo(
    () => Array.from(new Set(scores.map((score) => score.maturityLevel))).sort(),
    [scores],
  );

  const filtered = useMemo(
    () =>
      scores.filter(
        (score) =>
          (maturity === "all" || score.maturityLevel === maturity) &&
          score.confidence >= minConfidence,
      ),
    [scores, maturity, minConfidence],
  );

  const overall = data?.overall ?? null;

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
          Re-run scoring
        </button>
      }
    >
      <Link
        to="/internal/scores"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All assessments
      </Link>

      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
        {data?.assessment.organisationName ?? "Score Explorer"}
      </h1>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{id}</p>

      {error && (
        <p className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {(error as Error).message}
        </p>
      )}

      {overall && (
        <section className="ribbon-panel mt-8 rounded-xl p-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-accent">
                Overall assessment score
              </p>
              <p className="mt-2 font-display text-5xl font-semibold tabular-nums">
                {overall.overallScore.toFixed(1)}
                <span className="ml-1 text-lg text-muted-foreground">
                  / {overall.maximumScore}
                </span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {overall.maturityLevel} · {pct(overall.percentage)} · confidence{" "}
                {overall.confidence.toFixed(2)}
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-6 text-sm">
              <div>
                <dt className="text-muted-foreground">Dimensions</dt>
                <dd className="tabular-nums">{overall.dimensionCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Patterns</dt>
                <dd className="tabular-nums">{overall.patternCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Weighting</dt>
                <dd>{overall.breakdown.weightingModel}</dd>
              </div>
            </dl>
          </div>
          <div className="mt-5">
            <Meter value={overall.percentage} />
          </div>
        </section>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <select
          className={selectClass}
          value={maturity}
          onChange={(event) => setMaturity(event.target.value)}
          aria-label="Filter by maturity level"
        >
          <option value="all">All maturity levels</option>
          {maturities.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={minConfidence}
          onChange={(event) => setMinConfidence(Number(event.target.value))}
          aria-label="Filter by minimum confidence"
        >
          {[0, 0.5, 0.75, 0.9].map((value) => (
            <option key={value} value={value}>
              {value === 0 ? "Any confidence" : `≥ ${value}`}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          {filtered.length} of {scores.length} dimensions
        </span>
      </div>

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading scores…</p>}
      {!isLoading && scores.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          No scores yet — run the Scoring Engine to calculate them.
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {filtered.map((score) => (
          <ScoreCard
            key={score.id}
            score={score}
            expanded={expanded === score.id}
            onToggle={() => setExpanded(expanded === score.id ? null : score.id)}
          />
        ))}
      </ul>
    </AppShell>
  );
}

function ScoreCard({
  score,
  expanded,
  onToggle,
}: {
  score: Score;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { data: trace } = useQuery({
    queryKey: scoreKeys.detail(score.id),
    queryFn: () => scoreApi.get(score.id),
    enabled: expanded,
  });

  return (
    <li className="ribbon-panel rounded-xl">
      <button
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-muted-foreground">{score.scoreCode}</span>
            <SeverityPill severity={score.severity} />
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              {score.maturityLevel}
            </span>
          </div>
          <p className="mt-1.5 text-sm font-medium">{score.dimension}</p>
          <p className="mt-1 text-xs text-muted-foreground">{score.calculationReason}</p>
          <div className="mt-3">
            <Meter value={score.percentage} />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-2xl font-semibold tabular-nums">
            {score.overallScore.toFixed(1)}
          </p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {pct(score.percentage)} · w {score.weight}
          </p>
          <ChevronDown
            className={`ml-auto mt-2 h-4 w-4 text-muted-foreground transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/70 px-5 py-4">
          {!trace && <p className="text-sm text-muted-foreground">Loading provenance…</p>}
          {trace && <ScoreTracePanel trace={trace} />}
        </div>
      )}
    </li>
  );
}

function ScoreTracePanel({ trace }: { trace: ScoreTrace }) {
  const { score } = trace;
  return (
    <div className="space-y-5 text-sm">
      <section>
        <h3 className="text-xs uppercase tracking-[0.18em] text-accent">Calculation</h3>
        <p className="mt-2 rounded-md bg-surface-raised px-3 py-2 font-mono text-[11px] text-muted-foreground">
          {score.scoreExpression}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Base</dt>
            <dd className="tabular-nums">{score.breakdown.baseScore}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Direction</dt>
            <dd>{score.breakdown.direction}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total impact</dt>
            <dd className="tabular-nums">{score.breakdown.totalImpact}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Confidence</dt>
            <dd className="tabular-nums">{score.confidence.toFixed(2)}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-[0.18em] text-accent">
          Supporting patterns ({trace.supportingPatterns.length})
        </h3>
        {trace.supportingPatterns.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            No patterns matched — the score reflects the absence of risk signals.
          </p>
        )}
        <ul className="mt-2 space-y-3">
          {trace.supportingPatterns.map(({ pattern, contribution, rules }) => (
            <li key={pattern.id} className="rounded-lg border border-border/70 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {pattern.patternCode}
                </span>
                <SeverityPill severity={pattern.severity} />
                <span className="text-sm font-medium">{pattern.name}</span>
                {contribution && (
                  <span className="ml-auto font-mono text-[11px] text-muted-foreground tabular-nums">
                    {contribution.appliedImpact > 0 ? "+" : ""}
                    {contribution.appliedImpact} pts
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{pattern.businessImpact}</p>

              <ul className="mt-2 space-y-2 border-l border-border/70 pl-3">
                {rules.map(({ rule, signals }) => (
                  <li key={rule.id}>
                    <p className="text-xs">
                      <span className="font-mono text-muted-foreground">{rule.ruleCode}</span>{" "}
                      {rule.name}
                    </p>
                    <ul className="mt-1 space-y-1.5 border-l border-border/70 pl-3">
                      {signals.map(({ signal, observations }) => (
                        <li key={signal.id}>
                          <p className="text-xs">
                            <span className="font-mono text-muted-foreground">
                              {signal.signalCode}
                            </span>{" "}
                            {signal.name}
                          </p>
                          <ul className="mt-1 space-y-1 border-l border-border/70 pl-3">
                            {observations.map((observation) => (
                              <li key={observation.observationId} className="text-xs">
                                <p>{observation.title}</p>
                                {observation.question && (
                                  <p className="text-muted-foreground">
                                    Q: {observation.question.prompt}
                                  </p>
                                )}
                                <p className="text-muted-foreground">
                                  A: {observation.answer.label ?? String(observation.answer.value)}
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
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-[0.18em] text-accent">Knowledge pack</h3>
        <p className="mt-2 text-xs text-muted-foreground">
          {trace.knowledgePackScore.packId} v{trace.knowledgePackScore.packVersion} · weight{" "}
          {trace.knowledgePackScore.weight} · max {trace.knowledgePackScore.maximumScore} ·
          declared patterns: {trace.knowledgePackScore.declaredPatterns.join(", ") || "none"}
        </p>
      </section>
    </div>
  );
}
