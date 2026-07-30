import { useDashboard } from "@/lib/dashboard/dashboard-provider";
import { ConfidenceBar, Widget, WidgetEmpty } from "./widget";

/** Overall Maturity Widget — the Scoring Engine's aggregate, rendered as a dial. */
export function MaturityWidget() {
  const { data, select } = useDashboard();
  const overall = data?.overall ?? null;

  if (!overall) {
    return (
      <Widget title="Overall maturity">
        <WidgetEmpty>No overall score has been calculated yet.</WidgetEmpty>
      </Widget>
    );
  }

  const percent = Math.max(0, Math.min(100, Math.round(overall.percentage)));
  const circumference = 2 * Math.PI * 52;

  return (
    <Widget
      title="Overall maturity"
      subtitle={`${overall.dimensionCount} dimensions · ${overall.patternCount} patterns`}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-40 w-40">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              strokeWidth="10"
              className="stroke-muted"
            />
            <defs>
              <linearGradient id="maturity-ribbon" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" />
                <stop offset="100%" stopColor="var(--color-accent)" />
              </linearGradient>
            </defs>
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              stroke="url(#maturity-ribbon)"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - percent / 100)}
              className="transition-[stroke-dashoffset] duration-1000 ease-out"
            />
          </svg>
          <div
            className="absolute inset-0 grid place-items-center text-center"
            role="img"
            aria-label={`Overall maturity ${percent} percent, ${overall.maturityLevel}`}
          >
            <div>
              <p className="font-display text-4xl font-bold tabular-nums">{percent}%</p>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {overall.maturityLevel}
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {overall.overallScore.toFixed(1)} of {overall.maximumScore} points
        </p>
        <div className="w-full">
          <ConfidenceBar value={overall.confidence} label="Evidence confidence" />
        </div>
        <button
          type="button"
          onClick={() =>
            select({ kind: "capability", id: data?.capabilities[0]?.scoreCode ?? "", label: "Weakest capability" })
          }
          disabled={!data?.capabilities.length}
          className="w-full rounded-lg border border-border bg-surface/60 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
        >
          Inspect weakest capability
        </button>
      </div>
    </Widget>
  );
}
