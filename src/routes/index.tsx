import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, ClipboardList, FileCheck2, Loader2, PlusCircle } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { StatusPill } from "@/components/deliveryiq/status-pill";
import { assessmentApi, assessmentKeys } from "@/lib/assessment/client";
import { useHydrated } from "@/hooks/use-hydrated";
import type { AssessmentSession } from "@/lib/assessment/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DeliveryIQ — Assessment Runtime" },
      {
        name: "description",
        content:
          "Start, resume and review delivery maturity assessments orchestrated by the DeliveryIQ engine pipeline.",
      },
      { property: "og:title", content: "DeliveryIQ — Assessment Runtime" },
      {
        property: "og:description",
        content:
          "Start, resume and review delivery maturity assessments orchestrated by the DeliveryIQ engine pipeline.",
      },
    ],
  }),
  component: LandingPage,
});

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function LandingPage() {
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [organisation, setOrganisation] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: assessmentKeys.list,
    queryFn: assessmentApi.list,
    enabled: hydrated,
  });

  const sessions = data?.sessions ?? [];
  const drafts = sessions.filter((s) => ["draft", "in_progress"].includes(s.status));
  const running = sessions.filter((s) => ["submitted", "processing"].includes(s.status));
  const completed = sessions.filter((s) => s.status === "completed");

  const create = useMutation({
    mutationFn: () => assessmentApi.create({ organisationName: organisation }),
    onSuccess: ({ session }) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.list });
      navigate({ to: "/assessment/$id", params: { id: session.id } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell>
      <section className="ribbon-panel rounded-xl px-6 py-10 sm:px-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Delivery maturity intelligence
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
          Run an assessment, watch the engines work,{" "}
          <span className="text-gradient-ribbon">act on the narrative.</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Every submission moves through eight independent engines — Knowledge Pack through
          Narrative — with responses and processing state persisted at each step.
        </p>
      </section>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {/* New assessment */}
        <article className="ribbon-edge flex flex-col rounded-xl border border-border/70 bg-card p-6 pl-7">
          <div className="flex items-center gap-2 text-primary">
            <PlusCircle className="h-4 w-4" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider">
              New assessment
            </h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a draft and start capturing responses immediately.
          </p>
          <form
            className="mt-5 flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!organisation.trim()) {
                toast.error("Enter an organisation name to continue");
                return;
              }
              create.mutate();
            }}
          >
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Organisation
              <input
                value={organisation}
                onChange={(event) => setOrganisation(event.target.value)}
                placeholder="e.g. Northwind Logistics"
                className="mt-1.5 w-full rounded-md border border-input bg-background/70 px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-ring"
              />
            </label>
            <button
              type="submit"
              disabled={create.isPending}
              className="ribbon-bar inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {create.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              Start assessment
            </button>
          </form>
        </article>

        {/* Continue draft */}
        <SessionCard
          title="Continue draft"
          icon={<ClipboardList className="h-4 w-4" />}
          description="Pick up an in-flight assessment where you left off."
          empty="No drafts in progress."
          loading={isLoading || !hydrated}
          sessions={[...drafts, ...running]}
          renderMeta={(session) => `${session.progress}% complete`}
          hrefFor={(session) =>
            ["submitted", "processing"].includes(session.status)
              ? { to: "/assessment/$id/processing" as const, params: { id: session.id } }
              : { to: "/assessment/$id" as const, params: { id: session.id } }
          }
        />

        {/* Completed */}
        <SessionCard
          title="Completed assessments"
          icon={<FileCheck2 className="h-4 w-4" />}
          description="Review scores, patterns and the generated narrative."
          empty="No completed assessments yet."
          loading={isLoading || !hydrated}
          sessions={completed}
          renderMeta={(session) =>
            session.completedAt ? `Completed ${formatDate(session.completedAt)}` : "Completed"
          }
          hrefFor={(session) => ({
            to: "/assessment/$id/results" as const,
            params: { id: session.id },
          })}
        />
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-surface px-4 py-3.5">
          <div>
            <p className="text-sm font-medium">Observation Explorer</p>
            <p className="text-xs text-muted-foreground">
              Internal tooling — inspect engine output and knowledge pack provenance.
            </p>
          </div>
          <Link
            to="/internal/observations"
            className="shrink-0 text-xs font-semibold text-primary transition-opacity hover:opacity-80"
          >
            Open →
          </Link>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-surface px-4 py-3.5">
          <div>
            <p className="text-sm font-medium">Signal Explorer</p>
            <p className="text-xs text-muted-foreground">
              Internal tooling — organisational signals inferred from observations.
            </p>
          </div>
          <Link
            to="/internal/signals"
            className="shrink-0 text-xs font-semibold text-primary transition-opacity hover:opacity-80"
          >
            Open →
          </Link>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-surface px-4 py-3.5">
          <div>
            <p className="text-sm font-medium">Rule Explorer</p>
            <p className="text-xs text-muted-foreground">
              Internal tooling — business rules evaluated against inferred signals.
            </p>
          </div>
          <Link
            to="/internal/rules"
            className="shrink-0 text-xs font-semibold text-primary transition-opacity hover:opacity-80"
          >
            Open →
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function SessionCard({
  title,
  icon,
  description,
  empty,
  loading,
  sessions,
  renderMeta,
  hrefFor,
}: {
  title: string;
  icon: React.ReactNode;
  description: string;
  empty: string;
  loading: boolean;
  sessions: AssessmentSession[];
  renderMeta: (session: AssessmentSession) => string;
  hrefFor: (session: AssessmentSession) => {
    to: "/assessment/$id" | "/assessment/$id/processing" | "/assessment/$id/results";
    params: { id: string };
  };
}) {
  return (
    <article className="ribbon-edge flex flex-col rounded-xl border border-border/70 bg-card p-6 pl-7">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider">{title}</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>

      <div className="mt-5 flex-1 space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : sessions.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
            {empty}
          </p>
        ) : (
          sessions.slice(0, 5).map((session) => {
            const href = hrefFor(session);
            return (
              <Link
                key={session.id}
                to={href.to}
                params={href.params}
                className="group block rounded-md border border-border/70 bg-surface/60 px-3 py-2.5 transition-colors hover:border-primary/50 hover:bg-surface-raised"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium">{session.organisationName}</p>
                  <StatusPill status={session.status} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{renderMeta(session)}</p>
              </Link>
            );
          })
        )}
      </div>
    </article>
  );
}
