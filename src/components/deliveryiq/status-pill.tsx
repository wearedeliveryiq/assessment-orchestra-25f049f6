import type { AssessmentStatus } from "@/lib/assessment/types";

const LABEL: Record<AssessmentStatus, string> = {
  draft: "Draft",
  in_progress: "In progress",
  submitted: "Submitted",
  processing: "Processing",
  completed: "Completed",
  archived: "Archived",
};

const TONE: Record<AssessmentStatus, string> = {
  draft: "border-border bg-muted text-muted-foreground",
  in_progress: "border-primary/40 bg-primary/12 text-primary",
  submitted: "border-accent/40 bg-accent/15 text-accent",
  processing: "border-warning/40 bg-warning/12 text-warning",
  completed: "border-success/40 bg-success/12 text-success",
  archived: "border-border bg-surface-raised text-muted-foreground",
};

export function StatusPill({ status }: { status: AssessmentStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${TONE[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {LABEL[status]}
    </span>
  );
}
