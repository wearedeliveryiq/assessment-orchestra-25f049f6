import { cn } from "@/lib/utils";
import {
  REPORT_FORMAT_LABELS,
  REPORT_STATUS_LABELS,
  type ReportFormat,
  type ReportStatus,
} from "@/lib/reporting/types";

const STATUS_STYLES: Record<ReportStatus, string> = {
  queued: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
  generating: "border-primary/40 bg-primary/10 text-primary",
  completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  failed: "border-destructive/40 bg-destructive/10 text-destructive",
  archived: "border-muted-foreground/20 bg-muted/20 text-muted-foreground",
};

export function ReportStatusPill({ status, className }: { status: ReportStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        STATUS_STYLES[status],
        className,
      )}
    >
      {REPORT_STATUS_LABELS[status]}
    </span>
  );
}

export function ReportFormatPill({ format }: { format: ReportFormat }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-md border border-border bg-muted/30 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {REPORT_FORMAT_LABELS[format]}
    </span>
  );
}
