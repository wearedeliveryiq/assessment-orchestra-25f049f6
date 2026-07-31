import { createFileRoute } from "@tanstack/react-router";

import { ok, readJson } from "@/lib/identity/http.server";
import { handleReportingRoute, organisationIdFrom, optionalString } from "@/lib/reporting/http.server";
import { createReport, listOrganisationReports } from "@/lib/reporting/service.server";
import type {
  ReportDataset,
  ReportDistributionTarget,
  ReportFormat,
  ReportSchedule,
  ReportStatus,
  ReportType,
} from "@/lib/reporting/types";

export const Route = createFileRoute("/api/reporting/reports")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleReportingRoute(request, async ({ identity }) => {
          const search = new URL(request.url).searchParams;
          return ok(
            await listOrganisationReports(identity, {
              organisationId: organisationIdFrom(request),
              workspaceId: search.get("workspaceId") ?? undefined,
              status: (search.get("status") as ReportStatus | null) ?? undefined,
              reportType: (search.get("reportType") as ReportType | null) ?? undefined,
              format: (search.get("format") as ReportFormat | null) ?? undefined,
              query: search.get("query") ?? undefined,
              includeArchived: search.get("includeArchived") === "true",
              limit: Number(search.get("limit") ?? 100),
            }),
          );
        }),

      POST: async ({ request }) =>
        handleReportingRoute(request, async ({ identity }) => {
          const body = await readJson(request);
          const report = await createReport(identity, {
            organisationId: organisationIdFrom(request, body),
            workspaceId: optionalString(body.workspaceId) ?? null,
            templateId: String(body.templateId ?? ""),
            format: (body.format as ReportFormat | undefined) ?? undefined,
            title: optionalString(body.title),
            description: optionalString(body.description),
            assessmentSessionId: optionalString(body.assessmentSessionId) ?? null,
            sourceModule: optionalString(body.sourceModule),
            sourceId: optionalString(body.sourceId) ?? null,
            parameters: (body.parameters as Record<string, unknown>) ?? {},
            dataset: (body.dataset as ReportDataset) ?? {},
            schedule: (body.schedule as ReportSchedule | undefined) ?? null,
            distribution: (body.distribution as ReportDistributionTarget[] | undefined) ?? [],
            async: body.async === true,
            expiresInDays: typeof body.expiresInDays === "number" ? body.expiresInDays : undefined,
          });
          return ok(report, 201);
        }),
    },
  },
});
