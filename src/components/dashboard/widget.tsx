import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Widget shell. Every dashboard widget is self-contained: it receives its own
 * slice of runtime output, renders its own empty state and never reaches into
 * another widget.
 */
export function Widget({
  title,
  subtitle,
  action,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`ribbon-panel rounded-xl p-5 transition-shadow duration-300 hover:shadow-lg ${className}`}
    >
      <header className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function WidgetEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function WidgetSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="ribbon-panel space-y-3 rounded-xl p-5">
      <Skeleton className="h-4 w-32" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

/** Shared confidence bar — value is runtime output, never recalculated. */
export function ConfidenceBar({ value, label }: { value: number; label?: string }) {
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{label ?? "Confidence"}</span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Confidence"}
      >
        <div
          className="ribbon-bar h-full transition-[width] duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
