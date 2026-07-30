import { cn } from "@/lib/utils";
import type { AuditSeverity, EvidenceEntityType } from "@/lib/audit/types";

const SEVERITY_STYLES: Record<AuditSeverity, string> = {
  debug: "border-border/70 bg-surface-raised text-muted-foreground",
  info: "border-accent/30 bg-accent/10 text-accent",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  error: "border-destructive/40 bg-destructive/10 text-destructive",
  critical: "border-destructive bg-destructive/20 text-destructive",
};

export function SeverityBadge({ severity }: { severity: AuditSeverity | string }) {
  const style = SEVERITY_STYLES[severity as AuditSeverity] ?? SEVERITY_STYLES.debug;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
        style,
      )}
    >
      {severity}
    </span>
  );
}

const ENTITY_LABELS: Record<EvidenceEntityType, string> = {
  response: "Response",
  observation: "Observation",
  signal: "Signal",
  rule: "Rule",
  pattern: "Pattern",
  score: "Score",
  recommendation: "Recommendation",
  narrative: "Narrative",
};

export function EntityBadge({ type }: { type: EvidenceEntityType | string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border/70 bg-surface-raised px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {ENTITY_LABELS[type as EvidenceEntityType] ?? type}
    </span>
  );
}

export function entityLabel(type: EvidenceEntityType | string): string {
  return ENTITY_LABELS[type as EvidenceEntityType] ?? type;
}

export function ConfidenceBar({ value }: { value: number | null }) {
  if (value === null || Number.isNaN(value)) return null;
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-raised">
        <span className="block h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </span>
      <span className="font-mono text-[11px] text-muted-foreground">{percent}%</span>
    </span>
  );
}

export function formatTimestamp(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}
