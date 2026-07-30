import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { StatusPill } from "@/components/deliveryiq/status-pill";
import { assessmentApi, assessmentKeys } from "@/lib/assessment/client";
import { auditApi, auditKeys } from "@/lib/audit/client";
import { useHydrated } from "@/hooks/use-hydrated";
import { SeverityBadge, formatDuration, formatTimestamp } from "@/components/audit/audit-primitives";

export const Route = createFileRoute("/internal/audit/")({
  head: () => ({
    meta: [
      { title: "Audit Dashboard — DeliveryIQ" },
      {
        name: "description",
        content:
          "Administration view for the DeliveryIQ Audit & Explainability Service: execution history, engine health and retention policies.",
      },
      { property: "og:title", content: "Audit Dashboard — DeliveryIQ" },
      {
        property: "og:description",
        content: "Monitor engine executions, audit volume and retention across every assessment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditDashboardPage,
});

function AuditDashboardPage() {
  const hydrated = useHydrated();

  const dashboard = useQuery({
    queryKey: auditKeys.dashboard({}),
    queryFn: () => auditApi.dashboard(),
    enabled: hydrated,
  });

  const sessions = useQuery({
    queryKey: assessmentKeys.list,
    queryFn: () => assessmentApi.list(),
    enabled: hydrated,
  });

  const retention = useQuery({
    queryKey: auditKeys.retention,
    queryFn: () => auditApi.retentionPolicies(),
    enabled: hydrated,
  });

  const data = dashboard.data;

  return (
    <AppShell>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
        <ShieldCheck className="h-3.5 w-3.5" />
        Internal tooling
      </div>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">Audit Dashboard</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Every engine execution, validation outcome and access event captured by the Audit &amp;
        Explainability Service. Records are immutable — retention policies may archive or purge
        them, but never rewrite them.
      </p>

      {dashboard.isError && (
        <p className="mt-6 text-sm text-destructive">{(dashboard.error as Error).message}</p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Audit events" value={data?.totals.events ?? 0} />
        <Metric label="Assessments audited" value={data?.totals.assessments ?? 0} />
        <Metric label="Engine failures" value={data?.totals.engineFailures ?? 0} tone="warn" />
        <Metric
          label="Avg engine duration"
          value={formatDuration(data?.totals.averageDurationMs ?? 0)}
        />
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Engine activity">
          {(data?.byEngine ?? []).length === 0 ? (
            <Empty text="No engine executions recorded yet." />
          ) : (
            <ul className="divide-y divide-border/70">
              {data!.byEngine.map((row) => (
                <li key={row.engine} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-sm font-medium capitalize">{row.engine}</span>
                  <span className="flex items-center gap-4 font-mono text-[11px] text-muted-foreground">
                    <span>{row.count} events</span>
                    <span className={row.failures > 0 ? "text-destructive" : undefined}>
                      {row.failures} failed
                    </span>
                    <span>{formatDuration(row.averageDurationMs)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Severity distribution">
          {(data?.bySeverity ?? []).length === 0 ? (
            <Empty text="Nothing recorded yet." />
          ) : (
            <ul className="divide-y divide-border/70">
              {data!.bySeverity.map((row) => (
                <li
                  key={row.severity}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <SeverityBadge severity={row.severity} />
                  <span className="font-mono text-[11px] text-muted-foreground">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <section className="mt-8">
        <Panel title="Recent executions">
          {(data?.executions ?? []).length === 0 ? (
            <Empty text="No runtime executions captured yet." />
          ) : (
            <ul className="divide-y divide-border/70">
              {data!.executions.slice(0, 10).map((execution) => (
                <li key={execution.executionId} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="truncate font-mono text-[11px] text-muted-foreground">
                      {execution.executionId}
                    </span>
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
                        execution.failed ? "text-destructive" : "text-accent"
                      }`}
                    >
                      {execution.failed ? "Failed" : "Succeeded"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {execution.engines.length} engines · {formatDuration(execution.durationMs)} ·
                    started {formatTimestamp(execution.startedAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Recent events">
          {(data?.recentEvents ?? []).length === 0 ? (
            <Empty text="No events yet." />
          ) : (
            <ul className="divide-y divide-border/70">
              {data!.recentEvents.slice(0, 12).map((event) => (
                <li key={event.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium">{event.eventType}</span>
                    <SeverityBadge severity={event.severity} />
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {event.engine} · {formatTimestamp(event.timestamp)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Retention policies">
          {(retention.data?.policies ?? []).length === 0 ? (
            <Empty text="No retention policies configured — records are kept indefinitely." />
          ) : (
            <ul className="divide-y divide-border/70">
              {retention.data!.policies.map((policy) => (
                <li key={policy.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{policy.name}</span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      {policy.mode}
                      {policy.retainDays ? ` · ${policy.retainDays}d` : ""}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {policy.description || `Scope: ${policy.scope}`} · last applied{" "}
                    {formatTimestamp(policy.lastAppliedAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <section className="mt-8">
        <Panel title="Evidence explorers">
          {(sessions.data?.sessions ?? []).length === 0 ? (
            <Empty text="No assessments in this workspace yet." />
          ) : (
            <ul className="divide-y divide-border/70">
              {sessions.data!.sessions.map((session) => (
                <li key={session.id}>
                  <Link
                    to="/internal/audit/$id"
                    params={{ id: session.id }}
                    className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-surface-raised"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{session.organisationName}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {session.id}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <StatusPill status={session.status} />
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>
    </AppShell>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "warn";
}) {
  return (
    <div className="ribbon-panel rounded-xl px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-2 font-display text-2xl font-semibold ${
          tone === "warn" && Number(value) > 0 ? "text-destructive" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ribbon-panel rounded-xl">
      <h2 className="border-b border-border/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-4 py-6 text-sm text-muted-foreground">{text}</p>;
}
