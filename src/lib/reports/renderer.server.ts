import { buildPptx, type PptxSlide } from "../dashboard/pptx.server";
import { buildDocx } from "./docx.server";
import { buildPdf, measure, PdfPage, pdfText, wrapText, type PdfFont } from "./pdf.server";
import type { ReportBlock, ReportDocument, ReportFormat } from "./types";
import { REPORT_CONTENT_TYPES } from "./types";

/**
 * ReportRenderer — one document model in, one byte stream out per format.
 *
 * Renderers never reach for runtime data: they only lay out the document the
 * ReportAssembler produced, so every format shows identical figures.
 */

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM = 64;

interface Cursor {
  page: PdfPage;
  y: number;
  pages: PdfPage[];
  pageNumber: number;
}

function newPage(cursor: Cursor, document: ReportDocument): void {
  const { branding } = document;
  const page = new PdfPage();
  cursor.pages.push(page);
  cursor.page = page;
  cursor.pageNumber += 1;
  cursor.y = PAGE_HEIGHT - MARGIN;

  page.rect(0, PAGE_HEIGHT - 10, PAGE_WIDTH, 4, branding.primary);
  page.text(
    `${branding.logoText} — ${document.organisation}`,
    MARGIN,
    36,
    7.5,
    "regular",
    branding.muted,
  );
  const label = `Page ${cursor.pageNumber}`;
  page.text(label, PAGE_WIDTH - MARGIN - measure(label, 7.5, "regular"), 36, 7.5, "regular", branding.muted);
  page.line(MARGIN, 50, PAGE_WIDTH - MARGIN, 50, branding.surface, 0.7);
}

function ensure(cursor: Cursor, document: ReportDocument, needed: number): void {
  if (cursor.y - needed < BOTTOM) newPage(cursor, document);
}

function writeLines(
  cursor: Cursor,
  document: ReportDocument,
  text: string,
  size: number,
  font: PdfFont,
  colour: string,
  indent = 0,
  leading = 1.35,
): void {
  const lines = wrapText(text, size, font, CONTENT_WIDTH - indent);
  for (const line of lines) {
    ensure(cursor, document, size * leading);
    cursor.y -= size * leading;
    cursor.page.text(line, MARGIN + indent, cursor.y, size, font, colour);
  }
}

function drawTable(
  cursor: Cursor,
  document: ReportDocument,
  columns: string[],
  rows: string[][],
  widths: number[] | undefined,
): void {
  const { branding } = document;
  const count = columns.length || 1;
  const percents = widths?.length === count ? widths : Array(count).fill(100 / count);
  const columnWidths = percents.map((percent) => (CONTENT_WIDTH * percent) / 100);
  const size = 7.8;
  const padding = 4;

  const header = () => {
    ensure(cursor, document, 24);
    cursor.y -= 14;
    cursor.page.rect(MARGIN, cursor.y - 4, CONTENT_WIDTH, 16, branding.surface);
    let x = MARGIN + padding;
    columns.forEach((column, index) => {
      cursor.page.text(
        wrapText(column, size, "bold", columnWidths[index] - padding * 2)[0],
        x,
        cursor.y + 1,
        size,
        "bold",
        branding.muted,
      );
      x += columnWidths[index];
    });
    cursor.y -= 6;
  };

  header();

  const body = rows.length > 0 ? rows : [[...Array(count)].map((_, i) => (i === 0 ? "No data available." : ""))];

  for (const row of body) {
    const cellLines = columns.map((_, index) =>
      wrapText(row[index] ?? "", size, "regular", columnWidths[index] - padding * 2),
    );
    const height = Math.max(...cellLines.map((lines) => lines.length)) * (size * 1.3) + 6;

    if (cursor.y - height < BOTTOM) {
      newPage(cursor, document);
      header();
    }

    let x = MARGIN + padding;
    const top = cursor.y;
    cellLines.forEach((lines, index) => {
      let y = top;
      for (const line of lines) {
        y -= size * 1.3;
        cursor.page.text(line, x, y, size, "regular", branding.ink);
      }
      x += columnWidths[index];
    });
    cursor.y -= height;
    cursor.page.line(MARGIN, cursor.y + 2, PAGE_WIDTH - MARGIN, cursor.y + 2, branding.surface, 0.5);
  }

  cursor.y -= 8;
}

function drawKpis(
  cursor: Cursor,
  document: ReportDocument,
  items: { label: string; value: string }[],
): void {
  if (items.length === 0) return;
  const { branding } = document;
  const gap = 8;
  const width = (CONTENT_WIDTH - gap * (items.length - 1)) / items.length;
  const height = 44;

  ensure(cursor, document, height + 12);
  cursor.y -= height + 6;

  items.forEach((item, index) => {
    const x = MARGIN + index * (width + gap);
    cursor.page.rect(x, cursor.y, width, height, branding.surface);
    cursor.page.rect(x, cursor.y + height - 2.5, width, 2.5, branding.primary);
    cursor.page.text(
      wrapText(item.label.toUpperCase(), 6.5, "regular", width - 12)[0],
      x + 6,
      cursor.y + height - 15,
      6.5,
      "regular",
      branding.muted,
    );
    cursor.page.text(
      wrapText(item.value, 15, "bold", width - 12)[0],
      x + 6,
      cursor.y + 10,
      15,
      "bold",
      branding.ink,
    );
  });

  cursor.y -= 8;
}

function drawBlock(cursor: Cursor, document: ReportDocument, block: ReportBlock): void {
  const { branding } = document;

  switch (block.kind) {
    case "heading": {
      cursor.y -= block.level === 2 ? 10 : 6;
      writeLines(
        cursor,
        document,
        block.text,
        block.level === 2 ? 12.5 : 10.5,
        "bold",
        block.level === 2 ? branding.primary : branding.ink,
      );
      cursor.y -= 3;
      break;
    }
    case "paragraph":
      writeLines(cursor, document, block.text, 9.5, "regular", branding.ink);
      cursor.y -= 6;
      break;
    case "bullets":
      for (const item of block.items) {
        ensure(cursor, document, 14);
        const lines = wrapText(item, 9.5, "regular", CONTENT_WIDTH - 14);
        lines.forEach((line, index) => {
          ensure(cursor, document, 13);
          cursor.y -= 13;
          if (index === 0) cursor.page.text("-", MARGIN + 2, cursor.y, 9.5, "bold", branding.primary);
          cursor.page.text(line, MARGIN + 14, cursor.y, 9.5, "regular", branding.ink);
        });
        cursor.y -= 2;
      }
      cursor.y -= 4;
      break;
    case "kpis":
      drawKpis(cursor, document, block.items);
      break;
    case "table":
      drawTable(cursor, document, block.columns, block.rows, block.widths);
      break;
    case "note":
      writeLines(cursor, document, block.text, 8, "regular", branding.muted);
      cursor.y -= 6;
      break;
    case "pagebreak":
      newPage(cursor, document);
      break;
    default:
      break;
  }
}

function drawCover(cursor: Cursor, document: ReportDocument): void {
  const { branding, cover } = document;
  const page = cursor.page;

  page.rect(0, PAGE_HEIGHT - 210, PAGE_WIDTH, 210, branding.ink);
  page.rect(0, PAGE_HEIGHT - 216, PAGE_WIDTH, 6, branding.primary);
  page.rect(MARGIN, PAGE_HEIGHT - 232, 120, 4, branding.accent);

  page.text(branding.logoText.toUpperCase(), MARGIN, PAGE_HEIGHT - 70, 13, "bold", "FFFFFF");
  page.text(branding.tagline, MARGIN, PAGE_HEIGHT - 90, 8.5, "regular", "94A3B8");
  wrapText(cover.title, 26, "bold", CONTENT_WIDTH).forEach((line, index) => {
    page.text(line, MARGIN, PAGE_HEIGHT - 145 - index * 30, 26, "bold", "FFFFFF");
  });
  page.text(cover.organisation, MARGIN, PAGE_HEIGHT - 195, 14, "bold", branding.primary);

  cursor.y = PAGE_HEIGHT - 270;
  writeLines(cursor, document, cover.subtitle, 11, "regular", branding.ink);
  cursor.y -= 12;
  drawKpis(cursor, document, [
    { label: "Overall score", value: cover.overall },
    { label: "Maturity", value: cover.maturity },
    { label: "Evidence confidence", value: cover.confidence },
  ]);
  cursor.y -= 10;
  writeLines(
    cursor,
    document,
    `${cover.knowledgePack} · generated ${cover.generatedAt}`,
    8.5,
    "regular",
    branding.muted,
  );
  writeLines(cursor, document, branding.footerNote, 8.5, "regular", branding.muted);
}

/** Render the document as a real PDF file. */
export function renderPdf(document: ReportDocument, includeToc: boolean): Uint8Array {
  const cursor: Cursor = { page: new PdfPage(), y: 0, pages: [], pageNumber: 0 };
  newPage(cursor, document);
  drawCover(cursor, document);

  if (includeToc) {
    newPage(cursor, document);
    cursor.y -= 6;
    writeLines(cursor, document, "Table of Contents", 16, "bold", document.branding.primary);
    cursor.y -= 10;
    document.sections
      .filter((section) => section.listed)
      .forEach((section, index) => {
        ensure(cursor, document, 18);
        cursor.y -= 18;
        cursor.page.text(
          `${index + 1}.  ${pdfText(section.title)}`,
          MARGIN,
          cursor.y,
          10.5,
          "regular",
          document.branding.ink,
        );
      });
  }

  for (const section of document.sections) {
    newPage(cursor, document);
    cursor.y -= 8;
    writeLines(cursor, document, section.title, 17, "bold", document.branding.primary);
    cursor.page.rect(MARGIN, cursor.y - 8, 70, 3, document.branding.accent);
    cursor.y -= 18;
    for (const block of section.blocks) drawBlock(cursor, document, block);
  }

  return buildPdf(cursor.pages, {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    title: document.title,
    author: document.branding.productName,
    subject: `${document.organisation} delivery maturity assessment`,
  });
}

/** Render the document as a slide deck. */
export function renderPptx(document: ReportDocument): Uint8Array {
  const { cover } = document;
  const slides: PptxSlide[] = [
    {
      title: `${cover.organisation} — ${cover.title}`,
      bullets: [
        cover.subtitle,
        `Overall score: ${cover.overall}   ·   Maturity: ${cover.maturity}`,
        `Evidence confidence: ${cover.confidence}`,
        `${cover.knowledgePack} · generated ${cover.generatedAt}`,
      ],
    },
  ];

  for (const section of document.sections) {
    const bullets: string[] = [];
    for (const block of section.blocks) {
      if (block.kind === "paragraph" || block.kind === "note") bullets.push(block.text);
      else if (block.kind === "heading") bullets.push(block.text);
      else if (block.kind === "bullets") bullets.push(...block.items);
      else if (block.kind === "kpis")
        bullets.push(block.items.map((item) => `${item.label}: ${item.value}`).join("   ·   "));
      else if (block.kind === "table")
        bullets.push(
          ...block.rows.slice(0, 8).map((row) => row.filter(Boolean).slice(0, 4).join(" · ")),
        );
    }

    // Chunk long sections so no slide overflows.
    const chunkSize = 7;
    const trimmed = bullets.filter(Boolean).map((line) => (line.length > 150 ? `${line.slice(0, 147)}...` : line));
    if (trimmed.length === 0) {
      slides.push({ title: section.title, bullets: ["No content for this section."] });
      continue;
    }
    for (let index = 0; index < trimmed.length; index += chunkSize) {
      const part = trimmed.slice(index, index + chunkSize);
      const suffix = index === 0 ? "" : ` (cont. ${Math.floor(index / chunkSize) + 1})`;
      slides.push({ title: `${section.title}${suffix}`, bullets: part });
    }
  }

  return buildPptx(slides);
}

const encoder = new TextEncoder();

/** Render the document as JSON: the verbatim runtime payload plus provenance. */
export function renderJson(document: ReportDocument): Uint8Array {
  return encoder.encode(
    JSON.stringify(
      {
        report: {
          type: document.reportType,
          templateId: document.templateId,
          title: document.title,
          organisation: document.organisation,
          generatedAt: document.generatedAt,
          branding: document.branding,
          facts: document.facts,
          sections: document.sections,
        },
        source: document.data,
      },
      null,
      2,
    ),
  );
}

/** ReportExporter — dispatch to the renderer for a format. */
export function renderReport(
  document: ReportDocument,
  format: ReportFormat,
  includeToc: boolean,
): { bytes: Uint8Array; contentType: string } {
  switch (format) {
    case "pdf":
      return { bytes: renderPdf(document, includeToc), contentType: REPORT_CONTENT_TYPES.pdf };
    case "docx":
      return { bytes: buildDocx(document, includeToc), contentType: REPORT_CONTENT_TYPES.docx };
    case "pptx":
      return { bytes: renderPptx(document), contentType: REPORT_CONTENT_TYPES.pptx };
    case "json":
      return { bytes: renderJson(document), contentType: REPORT_CONTENT_TYPES.json };
    default:
      throw new Error(`Unsupported report format "${format}"`);
  }
}
