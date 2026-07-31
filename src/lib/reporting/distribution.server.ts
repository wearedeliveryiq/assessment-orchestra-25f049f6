import type { Report, ReportDistributionChannel, ReportDistributionTarget } from "./types";
import { recordEvent } from "./repository.server";

/**
 * Distribution extension point.
 *
 * Download is the only channel wired today. Email, Teams, Slack, SharePoint
 * and object storage are registered as handlers so a future story implements a
 * channel by registering a function here — no change to the report service.
 */

export interface DistributionContext {
  report: Report;
  target: ReportDistributionTarget;
}

export type DistributionHandler = (context: DistributionContext) => Promise<void>;

const handlers = new Map<ReportDistributionChannel, DistributionHandler>();

export function registerDistributionHandler(
  channel: ReportDistributionChannel,
  handler: DistributionHandler,
): void {
  handlers.set(channel, handler);
}

// Download needs no delivery: the artefact is already in the Download Centre.
registerDistributionHandler("download", async () => {});

/** Best-effort delivery: a channel failure never fails an already-built report. */
export async function dispatchDistribution(report: Report): Promise<void> {
  for (const target of report.distribution) {
    const handler = handlers.get(target.channel);
    if (!handler) {
      await recordEvent({
        reportId: report.id,
        lineageId: report.lineageId,
        organisationId: report.organisationId,
        workspaceId: report.workspaceId,
        eventType: "report.generated",
        actorId: report.generatedBy,
        actorEmail: report.generatedByEmail,
        severity: "warning",
        summary: `Delivery channel "${target.channel}" is not available yet; the report is in the Download Centre.`,
        metadata: { channel: target.channel, address: target.address },
      });
      continue;
    }
    try {
      await handler({ report, target });
    } catch (error) {
      console.error("[reporting] distribution failed", target.channel, error);
    }
  }
}
