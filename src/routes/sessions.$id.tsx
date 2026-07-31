import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { DueBadge, PriorityPill, SessionStatusPill } from "@/components/sessions/session-status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import * as sessions from "@/lib/sessions/client";
import type { ParticipantRole, SessionDetail } from "@/lib/sessions/types";
import * as tenancy from "@/lib/tenancy/client";

export const Route = createFileRoute("/sessions/$id")({
  head: () => ({
    meta: [
      { title: "Session detail — DeliveryIQ" },
      {
        name: "description",
        content:
          "Assessment session detail: assignment, collaborators, lifecycle controls, timeline and change history.",
      },
      { property: "og:title", content: "Session detail — DeliveryIQ" },
      {
        property: "og:description",
        content: "Manage assignment, collaborators and lifecycle for an assessment session.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SessionDetailPage,
});

const TABS = ["overview", "collaborators", "timeline", "history", "lineage"] as const;
type Tab = (typeof TABS)[number];

function SessionDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { organisation } = useWorkspaceContext();
  const [tab, setTab] = useState<Tab>("overview");

  const detail = useQuery({
    queryKey: ["sessions", "detail", id],
    queryFn: () => sessions.getSession(id),
  });

  const members = useQuery({
    queryKey: ["tenancy", "members", organisation?.id],
    queryFn: () => tenancy.listMembers(organisation!.id),
    enabled: Boolean(organisation?.id),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
  };

  const action = useMutation({
    mutationFn: async (run: () => Promise<unknown>) => run(),
    onSuccess: () => {
      refresh();
      toast.success("Session updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (detail.isLoading || !detail.data) {
    return (
      <AppShell>
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="mt-4 h-40 w-full" />
      </AppShell>
    );
  }

  const data: SessionDetail = detail.data;
  const session = data.session;
  const run = (fn: () => Promise<unknown>) => action.mutate(fn);

  return (
    <AppShell
      action={
        <Button asChild variant="outline" size="sm">
          <Link to="/sessions">All sessions</Link>
        </Button>
      }
    >
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <SessionStatusPill status={session.status} />
          <PriorityPill priority={session.priority} />
          <DueBadge dueDate={session.dueDate} overdue={session.isOverdue} />
        </div>
        <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight">{session.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {session.organisationName} · {session.workspaceName} · {session.knowledgePackId} v
          {session.knowledgePackVersion}
          {session.version > 1 ? ` · revision ${session.version}` : ""}
        </p>
      </header>

      {session.canEdit && (
        <div className="mb-6 flex flex-wrap gap-2">
          {session.status !== "in_progress" &&
            ["draft", "assigned", "paused"].includes(session.status) && (
              <Button
                size="sm"
                onClick={() =>
                  run(() =>
                    session.status === "paused"
                      ? sessions.resumeSession(session.id)
                      : sessions.startSession(session.id),
                  )
                }
              >
                {session.status === "paused" ? "Resume" : "Start"}
              </Button>
            )}
          {session.status === "in_progress" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => run(() => sessions.pauseSession(session.id, "Paused by user"))}
              >
                Pause
              </Button>
              <Button size="sm" onClick={() => run(() => sessions.submitForReview(session.id))}>
                Submit for review
              </Button>
            </>
          )}
          {session.status === "awaiting_review" && session.canManage && (
            <Button size="sm" onClick={() => run(() => sessions.completeSession(session.id))}>
              Mark complete
            </Button>
          )}
          {session.canManage && session.status === "completed" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => run(() => sessions.reassessSession(session.id))}
            >
              Start reassessment
            </Button>
          )}
          {session.canManage &&
            (session.archivedAt ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => run(() => sessions.restoreSession(session.id))}
              >
                Restore
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => run(() => sessions.archiveSession(session.id, "Archived by user"))}
              >
                Archive
              </Button>
            ))}
        </div>
      )}

      <nav className="mb-5 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
              tab === item
                ? "border-primary/50 bg-primary/12 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {item}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="ribbon-panel rounded-xl p-5">
            <h2 className="font-display text-sm font-semibold">Ownership</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Owner" value={session.owner?.displayName ?? "—"} />
              <Row label="Assignee" value={session.assignee?.displayName ?? "Unassigned"} />
              <Row label="Progress" value={`${session.progress}%`} />
              <Row
                label="Last activity"
                value={new Date(session.lastActivity).toLocaleString()}
              />
            </dl>
            {session.canManage && (
              <AssignPanel
                sessionId={session.id}
                members={(members.data ?? []).map((member) => ({
                  id: member.userId,
                  name: member.displayName,
                }))}
                currentAssignee={session.assignedTo}
                dueDate={session.dueDate}
                onDone={refresh}
              />
            )}
          </section>

          <section className="ribbon-panel rounded-xl p-5">
            <h2 className="font-display text-sm font-semibold">Details</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {session.description || "No description provided."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {session.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "collaborators" && (
        <CollaboratorsPanel
          sessionId={session.id}
          detail={data}
          canManage={session.canManage}
          members={(members.data ?? []).map((member) => ({
            id: member.userId,
            name: member.displayName,
          }))}
          onDone={refresh}
        />
      )}

      {tab === "timeline" && (
        <ul className="space-y-2">
          {data.timeline.map((event) => (
            <li key={event.id} className="ribbon-panel rounded-lg px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm">{event.summary}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(event.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                {event.eventType} · {event.actorEmail || "system"}
              </p>
            </li>
          ))}
          {data.timeline.length === 0 && (
            <p className="text-sm text-muted-foreground">No events recorded yet.</p>
          )}
        </ul>
      )}

      {tab === "history" && (
        <ul className="space-y-2">
          {data.history.map((entry) => (
            <li key={entry.id} className="ribbon-panel rounded-lg px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{entry.field}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  v{entry.version} · {new Date(entry.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatValue(entry.previousValue)} → {formatValue(entry.nextValue)}
              </p>
            </li>
          ))}
          {data.history.length === 0 && (
            <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
          )}
        </ul>
      )}

      {tab === "lineage" && (
        <ol className="space-y-2">
          {data.lineage.map((item) => (
            <li key={item.id} className="ribbon-panel rounded-lg px-4 py-3">
              <Link
                to="/sessions/$id"
                params={{ id: item.id }}
                className="flex items-center justify-between gap-3 text-sm hover:text-primary"
              >
                <span>
                  Revision {item.version} · {item.name}
                </span>
                <SessionStatusPill status={item.status} />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function AssignPanel({
  sessionId,
  members,
  currentAssignee,
  dueDate,
  onDone,
}: {
  sessionId: string;
  members: { id: string; name: string }[];
  currentAssignee: string | null;
  dueDate: string | null;
  onDone: () => void;
}) {
  const [assignee, setAssignee] = useState(currentAssignee ?? "");
  const [due, setDue] = useState(dueDate ? dueDate.slice(0, 10) : "");

  const assign = useMutation({
    mutationFn: () =>
      sessions.assignSession(sessionId, {
        assignedTo: assignee || null,
        dueDate: due || null,
      }),
    onSuccess: () => {
      onDone();
      toast.success("Assignment updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mt-5 space-y-3 border-t border-border/70 pt-4">
      <Select value={assignee} onValueChange={setAssignee}>
        <SelectTrigger>
          <SelectValue placeholder="Assign to…" />
        </SelectTrigger>
        <SelectContent>
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input type="date" value={due} onChange={(event) => setDue(event.target.value)} />
      <Button size="sm" className="w-full" disabled={assign.isPending} onClick={() => assign.mutate()}>
        Update assignment
      </Button>
    </div>
  );
}

function CollaboratorsPanel({
  sessionId,
  detail,
  canManage,
  members,
  onDone,
}: {
  sessionId: string;
  detail: SessionDetail;
  canManage: boolean;
  members: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<ParticipantRole>("contributor");

  const add = useMutation({
    mutationFn: () => sessions.addParticipant(sessionId, userId, role),
    onSuccess: () => {
      onDone();
      setUserId("");
      toast.success("Collaborator added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (participant: { userId: string; role: string }) =>
      sessions.removeParticipant(sessionId, participant.userId, participant.role),
    onSuccess: () => {
      onDone();
      toast.success("Collaborator removed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="ribbon-panel rounded-xl p-5">
        <h2 className="font-display text-sm font-semibold">Participants</h2>
        <ul className="mt-3 space-y-2">
          {detail.participants.map((participant) => (
            <li
              key={participant.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2 text-sm"
            >
              <span className="truncate">
                {participant.user?.displayName ?? participant.userId}
                <span className="ml-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {participant.role}
                </span>
              </span>
              {canManage && participant.role !== "owner" && (
                <button
                  type="button"
                  className="text-xs text-destructive hover:underline"
                  onClick={() =>
                    remove.mutate({ userId: participant.userId, role: participant.role })
                  }
                >
                  Remove
                </button>
              )}
            </li>
          ))}
          {detail.participants.length === 0 && (
            <p className="text-sm text-muted-foreground">No collaborators yet.</p>
          )}
        </ul>
      </section>

      {canManage && (
        <section className="ribbon-panel rounded-xl p-5">
          <h2 className="font-display text-sm font-semibold">Add collaborator</h2>
          <div className="mt-3 space-y-3">
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={role} onValueChange={(value) => setRole(value as ParticipantRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["reviewer", "contributor", "observer"] as ParticipantRole[]).map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="w-full"
              disabled={!userId || add.isPending}
              onClick={() => add.mutate()}
            >
              Add collaborator
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
