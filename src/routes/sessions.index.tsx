import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { SessionCard, SessionCardSkeleton } from "@/components/sessions/session-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import * as sessions from "@/lib/sessions/client";

export const Route = createFileRoute("/sessions/")({
  head: () => ({
    meta: [
      { title: "Assessment Sessions — DeliveryIQ" },
      {
        name: "description",
        content:
          "Track, assign and manage the full lifecycle of DeliveryIQ assessment sessions across your workspaces.",
      },
      { property: "og:title", content: "Assessment Sessions — DeliveryIQ" },
      {
        property: "og:description",
        content: "Track, assign and manage DeliveryIQ assessment sessions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SessionDashboardPage,
});

const TABS = [
  { id: "assignedToMe", label: "Assigned to me" },
  { id: "inProgress", label: "In progress" },
  { id: "drafts", label: "Drafts" },
  { id: "awaitingReview", label: "Awaiting review" },
  { id: "completed", label: "Completed" },
  { id: "overdue", label: "Overdue" },
] as const;

function SessionDashboardPage() {
  const { currentWorkspace } = useWorkspaceContext();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("assignedToMe");
  const [query, setQuery] = useState("");

  const dashboard = useQuery({
    queryKey: ["sessions", "dashboard", currentWorkspace?.id ?? null],
    queryFn: () => sessions.getDashboard({ workspaceId: currentWorkspace?.id }),
  });

  const search = useQuery({
    queryKey: ["sessions", "search", query, currentWorkspace?.id ?? null],
    queryFn: () => sessions.listSessions({ query, workspaceId: currentWorkspace?.id }),
    enabled: query.trim().length > 1,
  });

  const counts = dashboard.data?.counts;
  const list = query.trim().length > 1 ? (search.data ?? []) : (dashboard.data?.[tab] ?? []);
  const isLoading = query.trim().length > 1 ? search.isLoading : dashboard.isLoading;

  return (
    <AppShell
      action={
        <Button asChild size="sm">
          <Link to="/sessions/new">New session</Link>
        </Button>
      }
    >
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Session Management
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Assessment sessions
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Own, assign, pause and review every assessment engagement running in your organisation.
        </p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: counts?.total },
          { label: "In progress", value: counts?.in_progress },
          { label: "Awaiting review", value: counts?.awaiting_review },
          { label: "Overdue", value: counts?.overdue },
        ].map((stat) => (
          <div key={stat.label} className="ribbon-panel rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1 font-display text-2xl font-semibold">{stat.value ?? "—"}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                tab === item.id
                  ? "border-primary/50 bg-primary/12 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search sessions…"
          className="sm:w-64"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((key) => (
            <SessionCardSkeleton key={key} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="ribbon-panel rounded-xl p-10 text-center">
          <p className="text-sm text-muted-foreground">No sessions here yet.</p>
          <Button asChild size="sm" className="mt-4">
            <Link to="/sessions/new">Create a session</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}

      {dashboard.data && dashboard.data.recentActivity.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold tracking-tight">Recent activity</h2>
          <ul className="mt-4 space-y-2">
            {dashboard.data.recentActivity.slice(0, 12).map((event) => (
              <li
                key={event.id}
                className="ribbon-panel flex items-center justify-between gap-4 rounded-lg px-4 py-2.5"
              >
                <span className="truncate text-sm">{event.summary}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(event.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
