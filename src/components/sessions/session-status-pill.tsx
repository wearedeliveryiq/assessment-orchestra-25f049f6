import { LABELS } from "@/lib/sessions/status";
import type { SessionPriority, SessionStatus } from "@/lib/sessions/types";

const TONE: Record<SessionStatus, string> = {
  draft: "border-border bg-muted text-muted-foreground",
  assigned: "border-accent/40 bg-accent/15 text-accent",
  in_progress: "border-primary/40 bg-primary/12 text-primary",
  paused: "border-warning/40 bg-warning/12 text-warning",
  awaiting_review: "border-accent/40 bg-accent/12 text-accent",
  completed: "border-success/40 bg-success/12 text-success",
  archived: "border-border bg-surface-raised text-muted-foreground",
};

export function SessionStatusPill({ status }: { status: SessionStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${TONE[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {LABELS[status]}
    </span>
  );
}

const PRIORITY_TONE: Record<SessionPriority, string> = {
  low: "border-border text-muted-foreground",
  medium: "border-border text-foreground",
  high: "border-warning/40 text-warning",
  critical: "border-destructive/50 text-destructive",
};

export function PriorityPill({ priority }: { priority: SessionPriority }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${PRIORITY_TONE[priority]}`}
    >
      {priority}
    </span>
  );
}

export function DueBadge({ dueDate, overdue }: { dueDate: string | null; overdue: boolean }) {
  if (!dueDate) return <span className="text-xs text-muted-foreground">No due date</span>;
  return (
    <span className={`text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
      {overdue ? "Overdue · " : "Due "}
      {new Date(dueDate).toLocaleDateString()}
    </span>
  );
}
