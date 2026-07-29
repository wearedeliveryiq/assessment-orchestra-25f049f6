import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { ENGINE_STAGES } from "@/lib/assessment/stages";
import type { StageRun } from "@/lib/assessment/types";

export function StageTimeline({ stages }: { stages: StageRun[] }) {
  return (
    <ol className="relative space-y-2">
      {ENGINE_STAGES.map((descriptor, index) => {
        const run = stages.find((s) => s.stage === descriptor.id);
        const status = run?.status ?? "pending";
        const isLast = index === ENGINE_STAGES.length - 1;

        return (
          <li key={descriptor.id} className="relative flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className={[
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors",
                  status === "completed"
                    ? "border-success/50 bg-success/15 text-success"
                    : status === "running"
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : status === "failed"
                        ? "border-destructive/50 bg-destructive/15 text-destructive"
                        : "border-border bg-surface text-muted-foreground",
                ].join(" ")}
              >
                {status === "completed" ? (
                  <Check className="h-4 w-4" />
                ) : status === "running" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : status === "failed" ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-semibold">{descriptor.sequence}</span>
                )}
              </span>
              {!isLast && (
                <span
                  className={`mt-1 w-px flex-1 ${
                    status === "completed" ? "bg-success/40" : "bg-border"
                  }`}
                />
              )}
            </div>

            <div
              className={`mb-2 flex-1 rounded-lg border px-4 py-3 transition-colors ${
                status === "running"
                  ? "border-primary/40 bg-primary/[0.06]"
                  : status === "failed"
                    ? "border-destructive/40 bg-destructive/[0.06]"
                    : "border-border/70 bg-surface/50"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-sm font-semibold">{descriptor.label}</p>
                {run?.durationMs != null && status === "completed" && (
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {run.durationMs} ms
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {status === "failed" && run?.error ? run.error : descriptor.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
