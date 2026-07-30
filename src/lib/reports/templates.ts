import type { ReportFormat, ReportTemplate, ReportType } from "./types";

/**
 * ReportTemplateEngine — the declarative catalogue of report templates.
 *
 * A template names the ordered sections a document contains and the formats
 * it can be rendered to. Adding a report variant is a data change here; the
 * assembler and renderers stay untouched.
 */
export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: "executive-summary-v1",
    reportType: "executive-summary",
    name: "Executive Summary",
    description:
      "Two-to-four page briefing: headline narrative, maturity, capability scores and the priority actions.",
    formats: ["pdf", "docx", "json"],
    defaultFormats: ["pdf"],
    includeToc: false,
    sections: ["executive-summary", "capability-summary", "recommendations", "metadata"],
  },
  {
    id: "full-assessment-v1",
    reportType: "full-assessment",
    name: "Full Assessment Report",
    description:
      "Complete report: cover, contents, narrative, capabilities, patterns, recommendations, roadmap and the supporting-evidence appendix.",
    formats: ["pdf", "docx", "json"],
    defaultFormats: ["pdf"],
    includeToc: true,
    sections: [
      "executive-summary",
      "assessment-overview",
      "capability-summary",
      "patterns",
      "recommendations",
      "roadmap",
      "evidence-appendix",
      "metadata",
    ],
  },
  {
    id: "board-presentation-v1",
    reportType: "board-presentation",
    name: "Board Presentation",
    description:
      "Slide deck for the leadership readout: maturity, capability scores, patterns and the now/next/later roadmap.",
    formats: ["pptx", "pdf", "json"],
    defaultFormats: ["pptx"],
    includeToc: false,
    sections: [
      "executive-summary",
      "capability-summary",
      "patterns",
      "recommendations",
      "roadmap",
    ],
  },
];

export function getTemplate(reportType: ReportType): ReportTemplate {
  const template = REPORT_TEMPLATES.find((item) => item.reportType === reportType);
  if (!template) throw new Error(`Unknown report type "${reportType}"`);
  return template;
}

export function isReportType(value: unknown): value is ReportType {
  return REPORT_TEMPLATES.some((template) => template.reportType === value);
}

export function supportsFormat(reportType: ReportType, format: ReportFormat): boolean {
  return getTemplate(reportType).formats.includes(format);
}
