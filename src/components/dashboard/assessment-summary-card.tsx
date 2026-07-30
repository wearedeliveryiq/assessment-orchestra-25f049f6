import { CalendarClock, Building2, Layers } from "lucide-react";

import { StatusPill } from "@/components/deliveryiq/status-pill";
import { useDashboard } from "@/lib/dashboard/dashboard-provider";
import { Widget } from "./widget";

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

/** Assessment Summary Card — identity and lifecycle facts for the session. */
export function AssessmentSummaryCard() {
  const { data } = useDashboard();
  if (!data) return null;
  const { assessment, knowledgePack } = data;

  return (
    <Widget
      title="Assessment summary"
      action={<StatusPill status={assessment.status} />}
      className="ribbon-edge"
    >
      <div className="space-y-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-border bg-surface">
            <Building2 className="h-5 w-5 text-primary" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold">
              {assessment.organisationName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {assessment.contactName ?? "No named contact"} · {assessment.assessmentType}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-border/70 bg-surface/50 p-3">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Submitted
            </dt>
            <dd className="mt-1 font-medium">{formatDate(assessment.submittedAt)}</dd>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface/50 p-3">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Completed
            </dt>
            <dd className="mt-1 font-medium">{formatDate(assessment.completedAt)}</dd>
          </div>
          <div className="col-span-2 rounded-lg border border-border/70 bg-surface/50 p-3">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <Layers className="h-3.5 w-3.5" aria-hidden /> Knowledge pack
            </dt>
            <dd className="mt-1 font-medium">
              {knowledgePack.name} · v{knowledgePack.version}
            </dd>
          </div>
        </dl>
      </div>
    </Widget>
  );
}
