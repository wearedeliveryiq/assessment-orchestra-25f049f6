import { useDashboard } from "@/lib/dashboard/dashboard-provider";
import type { Recommendation } from "@/lib/recommendations/types";
import { Widget, WidgetEmpty } from "./widget";

const PRIORITY_TONE: Record<Recommendation["priority"], string> = {
  critical: "border-destructive/40 bg-destructive/12 text-destructive",
  high: "border-warning/40 bg-warning/12 text-warning",
  medium: "border-accent/40 bg-accent/12 text-accent",
  low: "border-border bg-muted text-muted-foreground",
};

const HORIZON_LABEL: Record<Recommendation["horizon"], string> = {
  now: "Now",
  next: "Next",
  later: "Later",
};

/** Priority Recommendations — pack interventions selected by detected patterns. */
export function RecommendationsWidget() {
  const { view, select } = useDashboard();
  const recommendations = view?.recommendations ?? [];

  return (
    <Widget
      title="Priority recommendations"
      subtitle={`${recommendations.length} action${recommendations.length === 1 ? "" : "s"} triggered by evidence`}
    >
      {recommendations.length === 0 ? (
        <WidgetEmpty>No recommendations match the current filters.</WidgetEmpty>
      ) : (
        <ol className="space-y-2">
          {recommendations.map((item) => (
            <li key={item.code}>
              <button
                type="button"
                onClick={() => select({ kind: "recommendation", id: item.code, label: item.title })}
                className="ribbon-edge w-full rounded-lg border border-border bg-surface/50 p-4 text-left transition-all duration-300 hover:border-primary/50 hover:bg-surface"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <p className="min-w-0 text-sm font-semibold">{item.title}</p>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${PRIORITY_TONE[item.priority]}`}
                  >
                    {item.priority}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                  {item.rationale}
                </p>
                <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <div className="flex gap-1">
                    <dt>Horizon</dt>
                    <dd className="font-medium text-foreground">{HORIZON_LABEL[item.horizon]}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>Impact</dt>
                    <dd className="font-medium text-foreground">{item.impact}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>Effort</dt>
                    <dd className="font-medium text-foreground">{item.effort}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>Capability</dt>
                    <dd className="font-medium text-foreground">{item.dimensionName}</dd>
                  </div>
                </dl>
                <p className="mt-2 text-[11px] text-muted-foreground/80">
                  Expected benefit: {item.expectedBenefit}
                </p>
              </button>
            </li>
          ))}
        </ol>
      )}
    </Widget>
  );
}
