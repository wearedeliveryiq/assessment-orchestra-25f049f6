import { Download, FileJson, FileText, Presentation, Printer, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { dashboardApi } from "@/lib/dashboard/client";
import { useDashboard } from "@/lib/dashboard/dashboard-provider";
import type { DashboardExportFormat } from "@/lib/dashboard/types";

const ACTIONS: { format: DashboardExportFormat; label: string; icon: typeof FileText }[] = [
  { format: "pdf", label: "PDF report", icon: FileText },
  { format: "pptx", label: "PowerPoint", icon: Presentation },
  { format: "json", label: "JSON", icon: FileJson },
  { format: "print", label: "Print", icon: Printer },
];

/**
 * Export actions. Every artefact is rendered by the backend from the same
 * consolidated payload — the browser only opens the URL. Hrefs are resolved
 * after mount because the owner key lives in browser storage.
 */
export function DashboardActions() {
  const { assessmentId, refetch, isLoading } = useDashboard();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ACTIONS.map((action) => (
        <a
          key={action.format}
          href={mounted ? dashboardApi.exportUrl(assessmentId, action.format) : undefined}

          target={action.format === "json" ? undefined : "_blank"}
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <action.icon className="h-3.5 w-3.5" aria-hidden />
          {action.label}
          <Download className="h-3 w-3 opacity-50" aria-hidden />
        </a>
      ))}
      <button
        type="button"
        onClick={refetch}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/50 hover:text-foreground"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} aria-hidden />
        Refresh
      </button>
    </div>
  );
}
