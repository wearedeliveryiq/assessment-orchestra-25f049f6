import { ChevronRight, X } from "lucide-react";
import type { ReactNode } from "react";

import { SeverityPill } from "@/components/deliveryiq/severity-pill";
import { useDashboard } from "@/lib/dashboard/dashboard-provider";

/**
 * Evidence Explorer — a side panel that walks the provenance chain recorded by
 * the Intelligence Runtime:
 * Recommendation → Capability → Pattern → Rule → Signal → Observation → Response.
 */

function Layer({
  step,
  title,
  count,
  children,
}: {
  step: string;
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <header className="flex items-center gap-2">
        <span className="rounded-md bg-primary/12 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
          {step}
        </span>
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </h3>
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{count}</span>
      </header>
      {count === 0 ? (
        <p className="rounded-lg border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
          No linked evidence at this layer.
        </p>
      ) : (
        <ul className="space-y-1.5">{children}</ul>
      )}
    </section>
  );
}

function Row({
  code,
  title,
  detail,
  meta,
  onClick,
}: {
  code: string;
  title: string;
  detail?: string;
  meta?: ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <p className="min-w-0 truncate text-xs font-medium">
          <span className="text-muted-foreground">{code}</span> {title}
        </p>
        {meta ? <div className="shrink-0">{meta}</div> : null}
      </div>
      {detail ? (
        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{detail}</p>
      ) : null}
    </>
  );

  return (
    <li>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="w-full rounded-lg border border-border bg-surface/50 p-2.5 text-left transition-colors hover:border-primary/50 hover:bg-surface"
        >
          {content}
        </button>
      ) : (
        <div className="rounded-lg border border-border bg-surface/50 p-2.5">{content}</div>
      )}
    </li>
  );
}

export function EvidenceExplorer() {
  const { evidence, clearSelection, select } = useDashboard();

  if (!evidence) {
    return (
      <aside className="ribbon-panel hidden rounded-xl p-5 xl:block">
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Evidence explorer
        </h2>
        <p className="mt-3 text-xs text-muted-foreground">
          Select any score, pattern or recommendation to trace it back through rules, signals,
          observations and the original answers.
        </p>
      </aside>
    );
  }

  const panel = (
    <div className="flex h-full flex-col">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border/70 p-5">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-primary">
            {evidence.selection.kind}
          </p>
          <h2 className="mt-1 font-display text-base font-semibold leading-snug">
            {evidence.headline}
          </h2>
          {evidence.subtitle ? (
            <p className="mt-1 text-xs text-muted-foreground">{evidence.subtitle}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={clearSelection}
          aria-label="Close evidence explorer"
          className="shrink-0 rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <Layer step="1" title="Recommendations" count={evidence.recommendations.length}>
          {evidence.recommendations.map((item) => (
            <Row
              key={item.code}
              code={item.code}
              title={item.title}
              detail={item.expectedBenefit}
              meta={
                <span className="text-[11px] uppercase text-muted-foreground">{item.priority}</span>
              }
              onClick={() => select({ kind: "recommendation", id: item.code, label: item.title })}
            />
          ))}
        </Layer>

        <Layer step="2" title="Capabilities" count={evidence.capabilities.length}>
          {evidence.capabilities.map((card) => (
            <Row
              key={card.scoreCode}
              code={card.scoreCode}
              title={card.dimension}
              detail={`${Math.round(card.percentage)}% · ${card.maturityLevel}`}
              meta={<SeverityPill severity={card.severity} />}
              onClick={() =>
                select({ kind: "capability", id: card.scoreCode, label: card.dimension })
              }
            />
          ))}
        </Layer>

        <Layer step="3" title="Patterns" count={evidence.patterns.length}>
          {evidence.patterns.map((pattern) => (
            <Row
              key={pattern.id}
              code={pattern.patternCode}
              title={pattern.name}
              detail={pattern.evaluationReason}
              meta={<SeverityPill severity={pattern.severity} />}
              onClick={() => select({ kind: "pattern", id: pattern.id, label: pattern.name })}
            />
          ))}
        </Layer>

        <Layer step="4" title="Rules" count={evidence.rules.length}>
          {evidence.rules.map((rule) => (
            <Row
              key={rule.id}
              code={rule.ruleCode}
              title={rule.name}
              detail={rule.evaluationReason}
              meta={
                <span className="text-[11px] uppercase text-muted-foreground">{rule.status}</span>
              }
              onClick={() => select({ kind: "rule", id: rule.id, label: rule.name })}
            />
          ))}
        </Layer>

        <Layer step="5" title="Signals" count={evidence.signals.length}>
          {evidence.signals.map((signal) => (
            <Row
              key={signal.id}
              code={signal.signalCode}
              title={signal.name}
              detail={signal.description}
              onClick={() => select({ kind: "signal", id: signal.id, label: signal.name })}
            />
          ))}
        </Layer>

        <Layer step="6" title="Observations" count={evidence.observations.length}>
          {evidence.observations.map((observation) => (
            <Row
              key={observation.id}
              code={observation.definitionId}
              title={observation.title}
              detail={observation.evidence}
              onClick={() =>
                select({ kind: "observation", id: observation.id, label: observation.title })
              }
            />
          ))}
        </Layer>

        <Layer step="7" title="Questions and answers" count={evidence.questions.length}>
          {evidence.questions.map((entry) => (
            <Row
              key={entry.questionId}
              code={entry.questionId}
              title={
                entry.response
                  ? String(entry.response.value ?? "No answer recorded")
                  : "No answer recorded"
              }
              detail={entry.response?.notes ?? undefined}
            />
          ))}
        </Layer>
      </div>
    </div>
  );

  return (
    <>
      <aside className="ribbon-panel sticky top-6 hidden max-h-[calc(100vh-3rem)] overflow-hidden rounded-xl xl:block">
        {panel}
      </aside>
      <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm xl:hidden">
        <button
          type="button"
          aria-label="Dismiss evidence explorer"
          className="flex-1"
          onClick={clearSelection}
        />
        <div className="ribbon-panel h-full w-full max-w-md overflow-hidden">{panel}</div>
      </div>
      <span className="sr-only">
        <ChevronRight aria-hidden /> Evidence chain open
      </span>
    </>
  );
}
