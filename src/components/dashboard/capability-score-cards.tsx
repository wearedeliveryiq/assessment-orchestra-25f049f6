import { SeverityPill } from "@/components/deliveryiq/severity-pill";
import { useDashboard } from "@/lib/dashboard/dashboard-provider";
import { ConfidenceBar, Widget, WidgetEmpty } from "./widget";

/** Capability Score Cards — one card per Scoring Engine dimension. */
export function CapabilityScoreCards() {
  const { view, select, filtersActive } = useDashboard();
  const capabilities = view?.capabilities ?? [];

  return (
    <Widget
      title="Capability scores"
      subtitle={filtersActive ? "Filtered view" : "Lowest scoring dimensions first"}
    >
      {capabilities.length === 0 ? (
        <WidgetEmpty>No dimension scores match the current filters.</WidgetEmpty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {capabilities.map((card) => (
            <li key={card.scoreCode}>
              <button
                type="button"
                onClick={() =>
                  select({ kind: "capability", id: card.scoreCode, label: card.dimension })
                }
                className="ribbon-edge h-full w-full rounded-lg border border-border bg-surface/50 p-4 text-left transition-all duration-300 hover:border-primary/50 hover:bg-surface"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold">{card.dimension}</p>
                  <SeverityPill severity={card.severity} />
                </div>
                <p className="mt-3 font-display text-3xl font-bold tabular-nums">
                  {Math.round(card.percentage)}%
                </p>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {card.maturityLevel}
                </p>
                <div className="mt-3">
                  <ConfidenceBar value={card.confidence} />
                </div>
                {card.topPatternName ? (
                  <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                    Lead pattern: {card.topPatternName}
                  </p>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}
