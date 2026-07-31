import type { ReportEvent } from "@/lib/reporting/types";

const SEVERITY_DOT: Record<ReportEvent["severity"], string> = {
  info: "bg-primary",
  warning: "bg-amber-400",
  error: "bg-destructive",
};

export function ReportHistoryTimeline({ events }: { events: ReportEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>;
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span
            className={`absolute -left-[1.4rem] top-1.5 h-2 w-2 rounded-full ${SEVERITY_DOT[event.severity]}`}
            aria-hidden
          />
          <p className="text-sm">{event.summary}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {event.eventType} · {event.actorEmail || "system"} ·{" "}
            {new Date(event.createdAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </li>
      ))}
    </ol>
  );
}
