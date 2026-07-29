import type { ObservationSeverity } from "@/lib/observations/types";

const TONE: Record<ObservationSeverity, string> = {
  critical: "border-destructive/40 bg-destructive/12 text-destructive",
  high: "border-warning/40 bg-warning/12 text-warning",
  medium: "border-accent/40 bg-accent/12 text-accent",
  low: "border-border bg-muted text-muted-foreground",
  info: "border-success/40 bg-success/12 text-success",
};

export function SeverityPill({ severity }: { severity: ObservationSeverity }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${TONE[severity]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {severity}
    </span>
  );
}
