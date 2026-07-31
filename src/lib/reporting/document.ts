import { footerLine, resolveBranding } from "./branding";
import { ReportingError } from "./errors";
import type {
  ReportBlockSpec,
  ReportBranding,
  ReportDataset,
  ReportDocument,
  ReportDocumentSection,
  ReportRenderBlock,
  ReportTemplate,
} from "./types";

/**
 * Document composition: template metadata + dataset -> a renderer-agnostic
 * document. Every export format renders this same structure, which is why
 * PDF, Word, Excel, HTML and print stay consistent.
 */

/* ------------------------------------------------------------------ *
 * Dataset access
 * ------------------------------------------------------------------ */

/** Resolve `a.b.0.c` against the dataset. Returns undefined when absent. */
export function resolvePath(dataset: unknown, path: string): unknown {
  if (!path) return undefined;
  let cursor: unknown = dataset;
  for (const segment of path.split(".")) {
    if (cursor == null) return undefined;
    if (Array.isArray(cursor)) {
      const index = Number(segment);
      cursor = Number.isInteger(index) ? cursor[index] : undefined;
      continue;
    }
    if (typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
}

export function stringify(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(stringify).filter(Boolean).join(", ");
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["label", "title", "name", "text", "value"]) {
      if (typeof record[key] === "string") return record[key] as string;
    }
    return JSON.stringify(value);
  }
  return String(value);
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(([key, entry]) => ({
      key,
      label: key,
      value: entry,
    }));
  }
  return [value];
}

/** Split rich text into paragraphs and bullet runs. */
function splitRichText(text: string): ReportRenderBlock[] {
  const blocks: ReportRenderBlock[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      blocks.push({ kind: "bullets", items: bullets });
      bullets = [];
    }
  };
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }
    const bullet = line.match(/^([-*•]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      bullets.push(bullet[2].trim());
      continue;
    }
    flush();
    const heading = line.match(/^#{2,3}\s+(.*)$/);
    if (heading) {
      blocks.push({ kind: "heading", text: heading[1].trim(), level: 3 });
      continue;
    }
    blocks.push({ kind: "paragraph", text: line });
  }
  flush();
  return blocks;
}

/* ------------------------------------------------------------------ *
 * Block composition
 * ------------------------------------------------------------------ */

function composeBlock(spec: ReportBlockSpec, dataset: ReportDataset): ReportRenderBlock[] {
  switch (spec.kind) {
    case "note":
      return [{ kind: "note", text: spec.text }];
    case "pagebreak":
      return [{ kind: "pagebreak" }];
    case "paragraph": {
      const value = resolvePath(dataset, spec.source);
      const text = isEmpty(value) ? (spec.fallback ?? "") : stringify(value);
      return text ? [{ kind: "paragraph", text }] : [];
    }
    case "richtext": {
      const value = resolvePath(dataset, spec.source);
      if (isEmpty(value)) {
        return spec.fallback ? [{ kind: "paragraph", text: spec.fallback }] : [];
      }
      if (Array.isArray(value)) {
        return value.flatMap((entry) => {
          if (entry && typeof entry === "object") {
            const record = entry as Record<string, unknown>;
            const heading = stringify(record.title ?? record.heading ?? record.label);
            const body = stringify(record.body ?? record.text ?? record.content ?? record.value);
            return [
              ...(heading ? ([{ kind: "heading", text: heading, level: 3 }] as ReportRenderBlock[]) : []),
              ...splitRichText(body),
            ];
          }
          return splitRichText(stringify(entry));
        });
      }
      return splitRichText(stringify(value));
    }
    case "bullets": {
      const items = asArray(resolvePath(dataset, spec.source))
        .map(stringify)
        .filter(Boolean)
        .slice(0, spec.limit ?? 50);
      return items.length ? [{ kind: "bullets", items }] : [];
    }
    case "kpis": {
      const labelKey = spec.labelKey ?? "label";
      const valueKey = spec.valueKey ?? "value";
      const items = asArray(resolvePath(dataset, spec.source))
        .map((entry) => {
          const record = (entry ?? {}) as Record<string, unknown>;
          return {
            label: stringify(record[labelKey] ?? record.name ?? record.key),
            value: stringify(record[valueKey] ?? record.amount ?? record.score),
          };
        })
        .filter((item) => item.label || item.value);
      return items.length ? [{ kind: "kpis", items }] : [];
    }
    case "table": {
      const rows = asArray(resolvePath(dataset, spec.source)).slice(0, spec.limit ?? 500);
      if (!rows.length) return [];
      return [
        {
          kind: "table",
          columns: spec.columns.map((column) => column.label),
          widths: spec.columns.map((column) => column.width ?? Math.floor(100 / spec.columns.length)),
          rows: rows.map((row) =>
            spec.columns.map((column) => stringify(resolvePath(row, column.key))),
          ),
        },
      ];
    }
    case "chart": {
      const series = asArray(resolvePath(dataset, spec.source))
        .map((entry) => {
          const record = (entry ?? {}) as Record<string, unknown>;
          const value = Number(record.value ?? record.score ?? record.count ?? 0);
          return {
            label: stringify(record.label ?? record.name ?? record.key),
            value: Number.isFinite(value) ? value : 0,
          };
        })
        .filter((point) => point.label);
      return series.length
        ? [{ kind: "chart", chartType: spec.chartType, caption: spec.caption ?? "", series }]
        : [];
    }
    case "image": {
      const value = resolvePath(dataset, spec.source);
      if (isEmpty(value)) return [];
      const record = typeof value === "object" ? (value as Record<string, unknown>) : { url: value };
      const url = stringify(record.url ?? record.src ?? value);
      if (!url) return [];
      return [
        {
          kind: "image",
          url,
          caption: spec.caption ?? stringify(record.caption),
          alt: stringify(record.alt ?? record.caption ?? spec.caption ?? "Report image"),
        },
      ];
    }
    default:
      return [];
  }
}

/* ------------------------------------------------------------------ *
 * Document composition
 * ------------------------------------------------------------------ */

export interface ComposeContext {
  title?: string;
  subtitle?: string;
  organisation: string;
  workspace?: string;
  generatedAt?: string;
  generatedBy?: string;
  version?: number;
  branding?: Partial<ReportBranding> | null;
}

export function composeDocument(
  templateDefinition: ReportTemplate,
  dataset: ReportDataset,
  context: ComposeContext,
): ReportDocument {
  if (!templateDefinition.layout.sections.length) {
    throw new ReportingError("template_invalid", "Template has no sections to render.");
  }

  const branding = resolveBranding(context.branding);
  const sections: ReportDocumentSection[] = [];

  for (const section of templateDefinition.layout.sections) {
    if (section.requires && isEmpty(resolvePath(dataset, section.requires))) continue;
    const blocks = section.blocks.flatMap((spec) => composeBlock(spec, dataset));
    if (!blocks.length) continue;
    sections.push({
      id: section.id,
      title: section.title,
      listed: section.listed !== false,
      appendix: section.appendix === true,
      blocks,
    });
  }

  if (!sections.length) {
    throw new ReportingError(
      "dataset_missing",
      "No report content could be produced from the supplied data.",
    );
  }

  // Appendices always follow the body, preserving relative order.
  sections.sort((a, b) => Number(a.appendix) - Number(b.appendix));

  const title = context.title?.trim() || templateDefinition.name;
  const generatedAt = context.generatedAt ?? new Date().toISOString();

  return {
    reportType: templateDefinition.category,
    templateId: templateDefinition.id,
    templateVersion: templateDefinition.version,
    title,
    branding,
    includeCover: templateDefinition.layout.includeCover,
    includeToc: templateDefinition.layout.includeToc,
    pageNumbering: templateDefinition.layout.pageNumbering,
    headerText: templateDefinition.layout.headerText ?? branding.headerText,
    footerText: templateDefinition.layout.footerText ?? footerLine(branding),
    cover: {
      title,
      subtitle: context.subtitle ?? templateDefinition.description,
      organisation: context.organisation,
      workspace: context.workspace ?? "",
      generatedAt,
      generatedBy: context.generatedBy ?? "DeliveryIQ",
      version: context.version ?? 1,
      templateName: `${templateDefinition.name} v${templateDefinition.version}`,
    },
    sections,
  };
}

/** Table-of-contents entries, appendices numbered separately. */
export function tableOfContents(document: ReportDocument): { label: string; title: string }[] {
  let body = 0;
  let appendix = 0;
  return document.sections
    .filter((section) => section.listed)
    .map((section) => {
      if (section.appendix) {
        appendix += 1;
        return { label: `Appendix ${String.fromCharCode(64 + appendix)}`, title: section.title };
      }
      body += 1;
      return { label: String(body), title: section.title };
    });
}
