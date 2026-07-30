import { SeverityPill } from "@/components/deliveryiq/severity-pill";
import { useDashboard } from "@/lib/dashboard/dashboard-provider";
import { Widget, WidgetEmpty } from "./widget";

/** Key Organisational Patterns — Pattern Engine output, highest confidence first. */
export function PatternsWidget() {
  const { view, select } = useDashboard();
  const patterns = view?.patterns ?? [];

  return (
    <Widget title="Key organisational patterns" subtitle={`${patterns.length} shown`}>
      {patterns.length === 0 ? (
        <WidgetEmpty>No patterns match the current filters.</WidgetEmpty>
      ) : (
        <ul className="space-y-2">
          {patterns.map((pattern) => (
            <li key={pattern.id}>
              <button
                type="button"
                onClick={() => select({ kind: "pattern", id: pattern.id, label: pattern.name })}
                className="w-full rounded-lg border border-border bg-surface/50 p-4 text-left transition-all duration-300 hover:border-primary/50 hover:bg-surface"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      <span className="text-muted-foreground">{pattern.patternCode}</span>{" "}
                      {pattern.name}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {pattern.businessImpact}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <SeverityPill severity={pattern.severity} />
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {Math.round(pattern.confidence * 100)}% confidence
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground/80">
                  Supported by {pattern.supportingRuleCodes.length} rule
                  {pattern.supportingRuleCodes.length === 1 ? "" : "s"}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}
