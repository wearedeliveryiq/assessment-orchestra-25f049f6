import { Quote } from "lucide-react";

import { useDashboard } from "@/lib/dashboard/dashboard-provider";
import { Widget, WidgetEmpty } from "./widget";

/** Executive Summary — narrative text produced by the Narrative Engine. */
export function ExecutiveSummary() {
  const { data, select } = useDashboard();
  const narrative = data?.narrative ?? null;

  return (
    <Widget
      title="Executive summary"
      subtitle={
        narrative
          ? `${narrative.mode} generation · ${narrative.provider}${narrative.model ? ` · ${narrative.model}` : ""}`
          : undefined
      }
    >
      {!narrative ? (
        <WidgetEmpty>The narrative stage has not produced output for this assessment.</WidgetEmpty>
      ) : (
        <div className="space-y-4">
          <p className="font-display text-xl font-semibold leading-snug tracking-tight">
            {narrative.headline}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">{narrative.summary}</p>

          <div className="space-y-4 border-t border-border/70 pt-4">
            {[...narrative.sections]
              .sort((a, b) => a.order - b.order)
              .map((section) => (
                <article key={section.key} className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Quote className="h-3.5 w-3.5 text-primary" aria-hidden />
                    {section.title}
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {section.source}
                    </span>
                  </h3>
                  {section.body.split(/\n{2,}/).map((paragraph, index) => (
                    <p key={index} className="text-sm leading-relaxed text-muted-foreground">
                      {paragraph.trim()}
                    </p>
                  ))}
                  {section.evidence.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {section.evidence.map((ref) => (
                        <button
                          key={`${section.key}-${ref.kind}-${ref.code}`}
                          type="button"
                          onClick={() =>
                            select({
                              kind: ref.kind === "score" ? "capability" : "pattern",
                              id: ref.code,
                              label: ref.label,
                            })
                          }
                          disabled={ref.kind === "summary"}
                          className="rounded-full border border-border bg-surface/60 px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:cursor-default disabled:opacity-60"
                        >
                          {ref.code} · {ref.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
          </div>
        </div>
      )}
    </Widget>
  );
}
