import { Link } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import type { AssessmentSessionView } from "@/lib/sessions/types";

import { DueBadge, PriorityPill, SessionStatusPill } from "./session-status-pill";

export function SessionCard({ session }: { session: AssessmentSessionView }) {
  return (
    <Link
      to="/sessions/$id"
      params={{ id: session.id }}
      className="ribbon-panel block rounded-xl p-5 transition-colors hover:border-primary/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-semibold tracking-tight">
            {session.name}
          </h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {session.workspaceName} · {session.knowledgePackId}
            {session.version > 1 ? ` · v${session.version}` : ""}
          </p>
        </div>
        <SessionStatusPill status={session.status} />
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="ribbon-bar h-full rounded-full transition-all"
          style={{ width: `${Math.min(Math.max(session.progress, 0), 100)}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span className="truncate text-xs text-muted-foreground">
          {session.assignee ? `Assigned to ${session.assignee.displayName}` : "Unassigned"}
        </span>
        <div className="flex items-center gap-2">
          <PriorityPill priority={session.priority} />
          <DueBadge dueDate={session.dueDate} overdue={session.isOverdue} />
        </div>
      </div>
    </Link>
  );
}

export function SessionCardSkeleton() {
  return (
    <div className="ribbon-panel rounded-xl p-5">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="mt-2 h-3 w-1/2" />
      <Skeleton className="mt-4 h-1.5 w-full" />
      <Skeleton className="mt-4 h-3 w-1/3" />
    </div>
  );
}
