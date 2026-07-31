import { ReportingError } from "../errors";
import {
  FUTURE_REPORT_FORMATS,
  REPORT_CONTENT_TYPES,
  REPORT_FILE_EXTENSIONS,
  REPORT_FORMATS,
  type AnyReportFormat,
  type RenderedArtefact,
  type ReportDocument,
  type ReportFormat,
} from "../types";
import { renderDocxDocument } from "./docx.server";
import { renderHtmlDocument } from "./html";
import { renderPdfDocument } from "./pdf.server";
import { renderXlsxDocument } from "./xlsx.server";

/**
 * ReportRenderingService — the single dispatch point from a composed document
 * to bytes. Adding a format means adding a renderer here; nothing else in the
 * framework changes.
 */

const encoder = new TextEncoder();

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "report"
  );
}

export function buildFilename(title: string, format: ReportFormat, version: number, when = new Date()): string {
  const stamp = when.toISOString().slice(0, 10);
  return `${slugify(title)}-v${version}-${stamp}.${REPORT_FILE_EXTENSIONS[format]}`;
}

async function checksum(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const digest = await subtle.digest("SHA-256", buffer);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  // FNV-1a fallback keeps rendering deterministic where WebCrypto is absent.
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function isRenderableFormat(format: AnyReportFormat): format is ReportFormat {
  return (REPORT_FORMATS as AnyReportFormat[]).includes(format);
}

export function renderBytes(document: ReportDocument, format: ReportFormat): Uint8Array {
  switch (format) {
    case "pdf":
      return renderPdfDocument(document);
    case "docx":
      return renderDocxDocument(document);
    case "xlsx":
      return renderXlsxDocument(document);
    case "html":
      return encoder.encode(renderHtmlDocument(document));
    case "print":
      return encoder.encode(renderHtmlDocument(document, { print: true }));
    default:
      throw new ReportingError("format_unsupported", `Unsupported export format: ${format}`);
  }
}

/** Render a composed document into a checksummed, named artefact. */
export async function renderDocument(
  document: ReportDocument,
  format: AnyReportFormat,
  options: { version?: number; filename?: string } = {},
): Promise<RenderedArtefact> {
  if (FUTURE_REPORT_FORMATS.includes(format as never)) {
    throw new ReportingError(
      "format_not_implemented",
      `The ${format.toUpperCase()} export is planned but not yet available.`,
      422,
    );
  }
  if (!isRenderableFormat(format)) {
    throw new ReportingError("format_unsupported", `Unsupported export format: ${format}`);
  }

  const bytes = renderBytes(document, format);
  return {
    format,
    bytes,
    contentType: REPORT_CONTENT_TYPES[format],
    filename: options.filename ?? buildFilename(document.title, format, options.version ?? 1),
    checksum: await checksum(bytes),
    byteLength: bytes.byteLength,
  };
}

export { renderHtmlDocument, renderPdfDocument, renderDocxDocument, renderXlsxDocument };
