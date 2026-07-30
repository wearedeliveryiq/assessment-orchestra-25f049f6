import { Activity, CheckCircle2, CircleDashed, XCircle } from "lucide-react";

import { useDashboard } from "@/lib/dashboard/dashboard-provider";
import { ConfidenceBar, Widget } from "./widget";

const STAGE_ICON = {
  completed: CheckCircle2,
  failed: XCircle,
  running: Activity,
  pending: CircleDashed,
  skipped: CircleDashed,
} as const;

const STAGE_TONE = {
  completed: "text-success",
  failed: "text-destructive",
  running: "text-primary",
  pending: "text-muted-foreground",
  skipped: "text-muted-foreground",
} as const;

/** Assessment Health + Confidence Indicators — pipeline coverage at a glance. */
export function AssessmentHealthWidget() {
  const { data } = useDashboard();
  if (!data) return null;
  const { health, stages, warnings } = data;

  const counters: { label: string; value: number }[] = [
    { label: "Responses", value: health.responses },
    { label: "Observations", value: health.observations },
    { label: "Signals", value: health.signals },
    { label: "Rules", value: health.rules },
    { label: "Patterns", value: health.patterns },
    { label: "Actions", value: health.recommendations },
  ];

  return (
    <Widget title="Assessment health" subtitle="Evidence produced by each runtime stage">
      <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {counters.map((counter) => (
            <div
              key={counter.label}
              className="rounded-lg border border-border/70 bg-surface/50 p-3"
            >
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {counter.label}
              </dt>
              <dd className="font-display text-xl font-semibold tabular-nums">{counter.value}</dd>
            </div>
          ))}
        </dl>

        <ConfidenceBar value={health.confidence} label="Overall evidence confidence" />

        <ul className="space-y-1.5 border-t border-border/70 pt-3">
          {stages.map((stage) => {
            const Icon = STAGE_ICON[stage.status] ?? CircleDashed;
            return (
              <li key={stage.stage} className="flex items-center gap-2 text-xs">
                <Icon
                  className={`h-3.5 w-3.5 shrink-0 ${STAGE_TONE[stage.status] ?? "text-muted-foreground"}`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate capitalize">
                  {stage.stage.replace(/[-_]/g, " ")}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {stage.durationMs != null ? `${stage.durationMs} ms` : stage.status}
                </span>
              </li>
            );
          })}
        </ul>

        {warnings.length > 0 ? (
          <ul className="space-y-1 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
            {warnings.map((warning) => (
              <li key={warning.area}>
                {warning.area}: {warning.message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Widget>
  );
}
