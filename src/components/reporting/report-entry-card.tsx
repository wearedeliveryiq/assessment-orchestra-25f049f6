import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { DownloadCentreEntry } from "@/lib/reporting/types";

import { ReportFormatPill, ReportStatusPill } from "./report-status-pill";

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export interface ReportEntryCardProps {
  entry: DownloadCentreEntry;
  busy?: boolean;
  onDownload: (entry: DownloadCentreEntry) => void;
  onRetry: (entry: DownloadCentreEntry) => void;
  onRegenerate: (entry: DownloadCentreEntry) => void;
  onArchive: (entry: DownloadCentreEntry) => void;
  onHistory: (entry: DownloadCentreEntry) => void;
}

export function ReportEntryCard({
  entry,
  busy = false,
  onDownload,
  onRetry,
  onRegenerate,
  onArchive,
  onHistory,
}: ReportEntryCardProps) {
  const { report } = entry;

  return (
    <article className="ribbon-panel rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-semibold tracking-tight">{report.title}</h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {report.templateId} · v{report.version}
            {report.description ? ` · ${report.description}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ReportFormatPill format={report.format} />
          <ReportStatusPill status={report.status} />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Generated</dt>
          <dd className="mt-0.5 truncate">{formatDate(report.generatedAt ?? report.queuedAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Size</dt>
          <dd className="mt-0.5">{formatBytes(report.fileSize)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Downloads</dt>
          <dd className="mt-0.5">{report.downloadCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">
            {entry.expired ? "Expired" : entry.expiresInHours !== null ? "Expires in" : "Retention"}
          </dt>
          <dd className="mt-0.5">
            {entry.expired
              ? formatDate(report.expiresAt)
              : entry.expiresInHours !== null
                ? `${entry.expiresInHours} h`
                : "No expiry"}
          </dd>
        </div>
      </dl>

      {report.status === "failed" && report.error ? (
        <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {report.error}
          {report.errorCode ? ` (${report.errorCode})` : ""} · attempt {report.attempts} of {report.maxAttempts}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {entry.available ? (
          <Button size="sm" disabled={busy} onClick={() => onDownload(entry)}>
            Download
          </Button>
        ) : null}
        {report.status === "failed" ? (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => onRetry(entry)}>
            Retry
          </Button>
        ) : null}
        {report.status !== "archived" ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onRegenerate(entry)}>
            Regenerate
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => onHistory(entry)}>
          History
        </Button>
        {report.status !== "archived" ? (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => onArchive(entry)}>
            Archive
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export function ReportEntrySkeleton() {
  return (
    <div className="ribbon-panel rounded-xl p-5">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="mt-2 h-3 w-1/3" />
      <Skeleton className="mt-5 h-12 w-full" />
    </div>
  );
}
