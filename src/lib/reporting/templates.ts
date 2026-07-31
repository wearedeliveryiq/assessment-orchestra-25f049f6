import type { ReportFormat, ReportTemplate, ReportTemplateCategory } from "./types";

/**
 * ReportTemplateService — a metadata-driven template registry.
 *
 * Templates are pure configuration: adding a new report type means adding a
 * template object (or registering one at runtime), never changing a renderer.
 * Resolved templates are cached because every export reads them.
 */

const ALL_FORMATS: ReportFormat[] = ["pdf", "docx", "xlsx", "html", "print"];
const TIMESTAMP = "2026-01-01T00:00:00.000Z";

function template(
  input: Omit<ReportTemplate, "createdAt" | "updatedAt" | "status" | "brandingProfile"> &
    Partial<Pick<ReportTemplate, "status" | "brandingProfile">>,
): ReportTemplate {
  return {
    status: "published",
    brandingProfile: "organisation",
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...input,
  };
}

/**
 * Built-in templates. Every block names a dataset key; the framework has no
 * opinion about how that data was produced.
 */
export const BUILT_IN_TEMPLATES: ReportTemplate[] = [
  template({
    id: "executive-summary-v1",
    name: "Executive Summary",
    description: "One-page board-ready summary: headline, key metrics and priorities.",
    category: "executive-summary",
    version: "1.2.0",
    formats: ALL_FORMATS,
    defaultFormat: "pdf",
    layout: {
      orientation: "portrait",
      includeCover: true,
      includeToc: false,
      pageNumbering: true,
      sections: [
        {
          id: "headline",
          title: "Executive summary",
          blocks: [
            { kind: "richtext", source: "summary", fallback: "No summary was supplied." },
            { kind: "kpis", source: "metrics" },
          ],
        },
        {
          id: "priorities",
          title: "Priorities",
          requires: "priorities",
          blocks: [{ kind: "bullets", source: "priorities", limit: 8 }],
        },
        {
          id: "trend",
          title: "Trend",
          requires: "trend",
          blocks: [{ kind: "chart", source: "trend", chartType: "bar", caption: "Trend" }],
        },
      ],
    },
  }),
  template({
    id: "assessment-summary-v1",
    name: "Assessment Summary",
    description: "Assessment overview with metrics, findings table and highlights.",
    category: "assessment-summary",
    version: "1.1.0",
    formats: ALL_FORMATS,
    defaultFormat: "pdf",
    layout: {
      orientation: "portrait",
      includeCover: true,
      includeToc: true,
      pageNumbering: true,
      sections: [
        {
          id: "overview",
          title: "Overview",
          blocks: [
            { kind: "paragraph", source: "summary", fallback: "No summary was supplied." },
            { kind: "kpis", source: "metrics" },
          ],
        },
        {
          id: "findings",
          title: "Findings",
          requires: "findings",
          blocks: [
            {
              kind: "table",
              source: "findings",
              columns: [
                { key: "title", label: "Finding", width: 46 },
                { key: "category", label: "Category", width: 22 },
                { key: "severity", label: "Severity", width: 16 },
                { key: "confidence", label: "Confidence", width: 16 },
              ],
              limit: 60,
            },
          ],
        },
        {
          id: "highlights",
          title: "Highlights",
          requires: "highlights",
          blocks: [{ kind: "bullets", source: "highlights", limit: 12 }],
        },
        {
          id: "appendix-evidence",
          title: "Appendix — evidence",
          appendix: true,
          requires: "evidence",
          blocks: [
            {
              kind: "table",
              source: "evidence",
              columns: [
                { key: "reference", label: "Reference", width: 24 },
                { key: "detail", label: "Detail", width: 76 },
              ],
              limit: 200,
            },
          ],
        },
      ],
    },
  }),
  template({
    id: "detailed-report-v1",
    name: "Detailed Report",
    description: "Full narrative document with every supplied section and appendices.",
    category: "detailed-report",
    version: "1.0.0",
    formats: ALL_FORMATS,
    defaultFormat: "pdf",
    layout: {
      orientation: "portrait",
      includeCover: true,
      includeToc: true,
      pageNumbering: true,
      sections: [
        {
          id: "introduction",
          title: "Introduction",
          blocks: [{ kind: "richtext", source: "summary", fallback: "No introduction supplied." }],
        },
        {
          id: "metrics",
          title: "Measures",
          requires: "metrics",
          blocks: [{ kind: "kpis", source: "metrics" }],
        },
        {
          id: "detail",
          title: "Detail",
          requires: "detail",
          blocks: [{ kind: "richtext", source: "detail" }],
        },
        {
          id: "records",
          title: "Records",
          requires: "records",
          blocks: [
            {
              kind: "table",
              source: "records",
              columns: [
                { key: "reference", label: "Reference", width: 20 },
                { key: "title", label: "Title", width: 40 },
                { key: "owner", label: "Owner", width: 20 },
                { key: "status", label: "Status", width: 20 },
              ],
              limit: 250,
            },
          ],
        },
        {
          id: "appendix-data",
          title: "Appendix — source data",
          appendix: true,
          requires: "appendix",
          blocks: [
            {
              kind: "table",
              source: "appendix",
              columns: [
                { key: "key", label: "Item", width: 34 },
                { key: "value", label: "Value", width: 66 },
              ],
              limit: 400,
            },
          ],
        },
      ],
    },
  }),
  template({
    id: "operational-report-v1",
    name: "Operational Report",
    description: "Landscape operational view built around record tables.",
    category: "operational-report",
    version: "1.0.0",
    formats: ALL_FORMATS,
    defaultFormat: "xlsx",
    layout: {
      orientation: "landscape",
      includeCover: false,
      includeToc: false,
      pageNumbering: true,
      sections: [
        {
          id: "records",
          title: "Operational records",
          blocks: [
            {
              kind: "table",
              source: "records",
              columns: [
                { key: "reference", label: "Reference", width: 16 },
                { key: "title", label: "Title", width: 30 },
                { key: "owner", label: "Owner", width: 18 },
                { key: "status", label: "Status", width: 14 },
                { key: "updatedAt", label: "Updated", width: 22 },
              ],
              limit: 1000,
            },
          ],
        },
        {
          id: "notes",
          title: "Notes",
          requires: "notes",
          blocks: [{ kind: "bullets", source: "notes", limit: 20 }],
        },
      ],
    },
  }),
  template({
    id: "management-report-v1",
    name: "Management Report",
    description: "Management pack: measures, progress commentary and actions.",
    category: "management-report",
    version: "1.0.0",
    formats: ALL_FORMATS,
    defaultFormat: "docx",
    layout: {
      orientation: "portrait",
      includeCover: true,
      includeToc: true,
      pageNumbering: true,
      sections: [
        {
          id: "position",
          title: "Current position",
          blocks: [
            { kind: "kpis", source: "metrics" },
            { kind: "paragraph", source: "summary", fallback: "No commentary supplied." },
          ],
        },
        {
          id: "actions",
          title: "Actions",
          requires: "actions",
          blocks: [
            {
              kind: "table",
              source: "actions",
              columns: [
                { key: "title", label: "Action", width: 44 },
                { key: "owner", label: "Owner", width: 20 },
                { key: "due", label: "Due", width: 18 },
                { key: "status", label: "Status", width: 18 },
              ],
              limit: 120,
            },
          ],
        },
        {
          id: "risks",
          title: "Risks",
          requires: "risks",
          blocks: [{ kind: "bullets", source: "risks", limit: 15 }],
        },
      ],
    },
  }),
  template({
    id: "custom-blank-v1",
    name: "Custom Report",
    description: "Free-form template: renders whatever sections the caller supplies.",
    category: "custom",
    version: "1.0.0",
    formats: ALL_FORMATS,
    defaultFormat: "pdf",
    layout: {
      orientation: "portrait",
      includeCover: true,
      includeToc: true,
      pageNumbering: true,
      sections: [
        {
          id: "content",
          title: "Content",
          blocks: [{ kind: "richtext", source: "summary", fallback: "No content supplied." }],
        },
      ],
    },
  }),
];

/* ------------------------------------------------------------------ *
 * Registry + cache
 * ------------------------------------------------------------------ */

const registry = new Map<string, ReportTemplate>();
let cacheReady = false;

function ensureCache(): Map<string, ReportTemplate> {
  if (!cacheReady) {
    for (const item of BUILT_IN_TEMPLATES) registry.set(item.id, item);
    cacheReady = true;
  }
  return registry;
}

/** Register (or replace) a template at runtime — used by future modules. */
export function registerTemplate(item: ReportTemplate): void {
  ensureCache().set(item.id, item);
}

export function clearTemplateCache(): void {
  registry.clear();
  cacheReady = false;
}

export function listTemplates(options: { includeUnpublished?: boolean } = {}): ReportTemplate[] {
  return [...ensureCache().values()]
    .filter((item) => options.includeUnpublished || item.status === "published")
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getTemplate(id: string): ReportTemplate | null {
  return ensureCache().get(id) ?? null;
}

export function templatesByCategory(category: ReportTemplateCategory): ReportTemplate[] {
  return listTemplates().filter((item) => item.category === category);
}

export function supportsFormat(item: ReportTemplate, format: ReportFormat): boolean {
  return item.formats.includes(format);
}

/** Structural validation used by tests and by any future template authoring UI. */
export function validateTemplate(item: ReportTemplate): string[] {
  const issues: string[] = [];
  if (!item.id.trim()) issues.push("Template id is required.");
  if (!item.name.trim()) issues.push("Template name is required.");
  if (!/^\d+\.\d+\.\d+$/.test(item.version)) issues.push("Template version must be semver.");
  if (item.formats.length === 0) issues.push("Template must support at least one format.");
  if (!item.formats.includes(item.defaultFormat)) {
    issues.push("Default format must be one of the supported formats.");
  }
  if (item.layout.sections.length === 0) issues.push("Template layout needs at least one section.");
  const ids = new Set<string>();
  for (const section of item.layout.sections) {
    if (ids.has(section.id)) issues.push(`Duplicate section id: ${section.id}`);
    ids.add(section.id);
    if (section.blocks.length === 0) issues.push(`Section ${section.id} has no blocks.`);
  }
  return issues;
}
