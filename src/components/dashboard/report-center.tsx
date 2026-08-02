import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileJson,
  FileText,
  Loader2,
  Presentation,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import { useHydrated } from "@/hooks/use-hydrated";
import { useDashboard } from "@/lib/dashboard/dashboard-provider";
import { reportKeys, reportsApi } from "@/lib/reports/client";
import {
  REPORT_FORMAT_LABELS,
  type Report,
  type ReportFormat,
  type ReportType,
  type ReportValidationResult,
} from "@/lib/reports/types";
import { Widget, WidgetEmpty } from "./widget";

/**
 * Report Center — the dashboard surface of the Executive Report Generation
 * Engine. It requests reports, shows the generation lifecycle and links to the
 * immutable artefacts the backend stored. It never renders a document itself.
 */

const FORMAT_ICON: Record<ReportFormat, typeof FileText> = {
  pdf: FileText,
  docx: FileText,
  pptx: Presentation,
  json: FileJson,
};

const STATUS_TONE: Record<Report["status"], string> = {
  queued: "border-border bg-muted text-muted-foreground",
  generating: "border-primary/40 bg-primary/10 text-primary",
  completed: "border-accent/40 bg-accent/12 text-accent",
  failed: "border-destructive/40 bg-destructive/12 text-destructive",
};

function warningCount(validation: Report["validation"]): number {
  const result = validation as ReportValidationResult;
  return result?.issues?.filter((issue) => issue.severity === "warning").length ?? 0;
}

function bytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function ReportCenter() {
  const { assessmentId } = useDashboard();
  const hydrated = useHydrated();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ReportType>("full-assessment");
  const [formats, setFormats] = useState<ReportFormat[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: reportKeys.list(assessmentId),
    queryFn: () => reportsApi.list(assessmentId),
    enabled: hydrated,
    refetchInterval: (result) =>
      result.state.data?.reports.some(
        (report) => report.status === "queued" || report.status === "generating",
      )
        ? 1500
        : false,
  });

  const templates = query.data?.templates ?? [];
  const template = templates.find((item) => item.reportType === selected) ?? templates[0] ?? null;
  const chosenFormats = formats ?? template?.defaultFormats ?? [];

  const generate = useMutation({
    mutationFn: () =>
      reportsApi.create(assessmentId, {
        reportType: selected,
        formats: chosenFormats.length > 0 ? chosenFormats : undefined,
      }),
    onMutate: () => setError(null),
    onError: (mutationError: Error) => setError(mutationError.message),
    onSettled: () => queryClient.invalidateQueries({ queryKey: reportKeys.list(assessmentId) }),
  });

  const toggleFormat = (format: ReportFormat) => {
    const current = chosenFormats;
    const next = current.includes(format)
      ? current.filter((item) => item !== format)
      : [...current, format];
    setFormats(next);
  };

  const reports = query.data?.reports ?? [];
  const busy = generate.isPending || reports.some((report) => report.status !== "completed" && report.status !== "failed");

  return (
    <Widget
      title="Report centre"
      subtitle="Versioned, immutable executive documents rendered by the backend from this assessment's intelligence."
    >
      <div className="space-y-4">
        <div className="grid gap-3 rounded-lg border border-border bg-surface/50 p-4">
          <div className="flex flex-wrap gap-2">
            {templates.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelected(item.reportType);
                  setFormats(null);
                }}
                aria-pressed={item.reportType === selected}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  item.reportType === selected
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>

          {template ? (
            <p className="text-xs text-muted-foreground">{template.description}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {(template?.formats ?? []).map((format) => {
              const Icon = FORMAT_ICON[format];
              const active = chosenFormats.includes(format);
              return (
                <button
                  key={format}
                  type="button"
                  onClick={() => toggleFormat(format)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                    active
                      ? "border-accent/50 bg-accent/12 text-accent"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3 w-3" aria-hidden />
                  {REPORT_FORMAT_LABELS[format]}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => generate.mutate()}
              disabled={generate.isPending || chosenFormats.length === 0}
              className="ribbon-bar ml-auto inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
            >
              {generate.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <FileText className="h-3.5 w-3.5" aria-hidden />
              )}
              Generate report
            </button>
          </div>
        </div>

        {error ? (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}

        {busy ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Generation in progress — this list refreshes automatically.
          </p>
        ) : null}

        {reports.length === 0 ? (
          <WidgetEmpty>No reports generated yet for this assessment.</WidgetEmpty>
        ) : (
          <ul className="space-y-2">
            {reports.map((report) => {
              const Icon = FORMAT_ICON[report.format];
              const warnings = warningCount(report.validation);
              return (
                <li
                  key={report.id}
                  className="ribbon-edge rounded-lg border border-border bg-surface/50 p-3.5"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                        <span className="truncate">{report.filename}</span>
                      </p>
                      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span>v{report.version}</span>
                        <span>{REPORT_FORMAT_LABELS[report.format]}</span>
                        <span>{report.templateId}</span>
                        {report.status === "completed" ? <span>{bytes(report.fileSize)}</span> : null}
                        {report.durationMs ? <span>{report.durationMs} ms</span> : null}
                        {report.checksum ? (
                          <span className="inline-flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" aria-hidden />
                            {report.checksum.slice(0, 12)}
                          </span>
                        ) : null}
                      </p>
                      {report.error ? (
                        <p className="mt-1.5 text-[11px] text-destructive">{report.error}</p>
                      ) : null}
                      {warnings > 0 ? (
                        <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-warning">
                          <AlertTriangle className="h-3 w-3" aria-hidden />
                          {warnings} validation warning{warnings === 1 ? "" : "s"}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${STATUS_TONE[report.status]}`}
                      >
                        {report.status === "generating" || report.status === "queued" ? (
                          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                        ) : report.status === "completed" ? (
                          <CheckCircle2 className="h-3 w-3" aria-hidden />
                        ) : (
                          <AlertTriangle className="h-3 w-3" aria-hidden />
                        )}
                        {report.status}
                      </span>
                      {report.status === "completed" && hydrated ? (
                        <button
                          type="button"
                          onClick={() => void reportsApi.download(report.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/50 hover:text-foreground"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden />
                          Download
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Widget>
  );
}
