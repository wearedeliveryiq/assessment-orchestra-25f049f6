import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { ReportEntryCard, ReportEntrySkeleton } from "@/components/reporting/report-entry-card";
import { ReportHistoryTimeline } from "@/components/reporting/report-history-timeline";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import * as reporting from "@/lib/reporting/client";
import type { DownloadCentreEntry, ReportFormat } from "@/lib/reporting/types";

export const Route = createFileRoute("/reports/")({
  head: () => ({
    meta: [
      { title: "Download Centre — DeliveryIQ Reporting" },
      {
        name: "description",
        content:
          "Generate, track and download DeliveryIQ executive reports in PDF, Word and Excel from a single download centre.",
      },
      { property: "og:title", content: "Download Centre — DeliveryIQ Reporting" },
      {
        property: "og:description",
        content: "Generate, track and download DeliveryIQ executive reports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DownloadCentrePage,
});

const TABS = [
  { id: "available", label: "Available" },
  { id: "queue", label: "Queue" },
  { id: "expired", label: "Expired" },
] as const;

function DownloadCentrePage() {
  const { organisation, currentWorkspace } = useWorkspaceContext();
  const organisationId = organisation?.id ?? "";
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("available");
  const [historyFor, setHistoryFor] = useState<DownloadCentreEntry | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);

  const centre = useQuery({
    queryKey: ["reporting", "download-centre", organisationId],
    queryFn: () => reporting.downloadCentre(organisationId),
    enabled: Boolean(organisationId),
    refetchInterval: 15_000,
  });

  const templates = useQuery({
    queryKey: ["reporting", "templates"],
    queryFn: reporting.listTemplates,
  });

  const history = useQuery({
    queryKey: ["reporting", "history", historyFor?.report.lineageId ?? null],
    queryFn: () => reporting.reportHistory(organisationId, { lineageId: historyFor!.report.lineageId }),
    enabled: Boolean(historyFor && organisationId),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["reporting", "download-centre", organisationId] });

  const action = useMutation({
    mutationFn: async (input: { kind: "retry" | "regenerate" | "archive"; id: string }) => {
      if (input.kind === "retry") return reporting.retryReport(input.id, organisationId);
      if (input.kind === "regenerate") return reporting.regenerateReport(input.id, organisationId);
      return reporting.archiveReport(input.id, organisationId);
    },
    onSuccess: (_data, input) => {
      toast.success(`Report ${input.kind === "archive" ? "archived" : `${input.kind} started`}.`);
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const generate = useMutation({
    mutationFn: (input: { templateId: string; format: ReportFormat }) =>
      reporting.createReport({
        organisationId,
        workspaceId: currentWorkspace?.id ?? null,
        templateId: input.templateId,
        format: input.format,
      }),
    onSuccess: () => {
      toast.success("Report generation started.");
      setGenerateOpen(false);
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const entries = centre.data?.[tab] ?? [];
  const counts = {
    available: centre.data?.available.length ?? 0,
    queue: centre.data?.queue.length ?? 0,
    expired: centre.data?.expired.length ?? 0,
  };

  return (
    <AppShell
      action={
        <Button size="sm" onClick={() => setGenerateOpen(true)} disabled={!organisationId}>
          Generate report
        </Button>
      }
    >
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Download Centre</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every generated artefact across this organisation — with versions, retries and full history.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              tab === item.id
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label} ({counts[item.id]})
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {centre.isLoading ? (
          <>
            <ReportEntrySkeleton />
            <ReportEntrySkeleton />
          </>
        ) : entries.length === 0 ? (
          <p className="ribbon-panel rounded-xl p-8 text-center text-sm text-muted-foreground">
            Nothing here yet. Generate a report to get started.
          </p>
        ) : (
          entries.map((entry) => (
            <ReportEntryCard
              key={entry.report.id}
              entry={entry}
              busy={action.isPending}
              onDownload={async (item) => {
                try {
                  await reporting.downloadArtefact(item.report);
                  void refresh();
                } catch (error) {
                  toast.error((error as Error).message);
                }
              }}
              onRetry={(item) => action.mutate({ kind: "retry", id: item.report.id })}
              onRegenerate={(item) => action.mutate({ kind: "regenerate", id: item.report.id })}
              onArchive={(item) => action.mutate({ kind: "archive", id: item.report.id })}
              onHistory={(item) => setHistoryFor(item)}
            />
          ))
        )}
      </div>

      <Dialog open={Boolean(historyFor)} onOpenChange={(open) => !open && setHistoryFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Report history</DialogTitle>
            <DialogDescription>{historyFor?.report.title}</DialogDescription>
          </DialogHeader>
          {history.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading history…</p>
          ) : (
            <ReportHistoryTimeline events={history.data ?? []} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate a report</DialogTitle>
            <DialogDescription>
              Pick a template. Branding and layout come from the organisation profile.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {(templates.data?.templates ?? []).map((template) => (
              <div key={template.id} className="ribbon-panel rounded-lg p-4">
                <p className="font-display text-sm font-semibold">{template.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{template.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {template.formats.map((format) => (
                    <Button
                      key={format}
                      size="sm"
                      variant={format === template.defaultFormat ? "default" : "outline"}
                      disabled={generate.isPending}
                      onClick={() => generate.mutate({ templateId: template.id, format })}
                    >
                      {format.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
