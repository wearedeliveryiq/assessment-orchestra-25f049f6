import { PdfPage, buildPdf, measure, wrapText, type PdfFont } from "@/lib/reports/pdf.server";
import { tableOfContents } from "../document";
import type { ReportDocument, ReportRenderBlock, ReportDocumentSection } from "../types";

/**
 * PDF renderer for the platform reporting framework.
 *
 * Builds on the dependency-free PDF writer used elsewhere in the app and adds
 * a flowing layout engine: cover, contents, headings, paragraphs, bullets,
 * KPI strips, repeating table headers, bar charts, page furniture.
 */

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 48;
const FOOTER_SPACE = 46;

interface Layout {
  pages: PdfPage[];
  page: PdfPage;
  y: number;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
}

function createLayout(document: ReportDocument): Layout {
  const landscape = false;
  const pageWidth = landscape ? A4.height : A4.width;
  const pageHeight = landscape ? A4.width : A4.height;
  const page = new PdfPage();
  return {
    pages: [page],
    page,
    y: pageHeight - MARGIN,
    pageWidth,
    pageHeight,
    contentWidth: pageWidth - MARGIN * 2,
  };
}

function newPage(layout: Layout): void {
  const page = new PdfPage();
  layout.pages.push(page);
  layout.page = page;
  layout.y = layout.pageHeight - MARGIN;
}

function ensureSpace(layout: Layout, needed: number): void {
  if (layout.y - needed < MARGIN + FOOTER_SPACE) newPage(layout);
}

function writeLines(
  layout: Layout,
  lines: string[],
  size: number,
  font: PdfFont,
  colour: string,
  leading: number,
  indent = 0,
): void {
  for (const line of lines) {
    ensureSpace(layout, leading);
    layout.page.text(line, MARGIN + indent, layout.y - size, size, font, colour);
    layout.y -= leading;
  }
}

function heading(layout: Layout, text: string, document: ReportDocument, level: 2 | 3): void {
  const size = level === 2 ? 15 : 12;
  ensureSpace(layout, size + 26);
  layout.y -= level === 2 ? 14 : 10;
  const colour = level === 2 ? document.branding.inkColour : document.branding.secondaryColour;
  for (const line of wrapText(text, size, "bold", layout.contentWidth)) {
    ensureSpace(layout, size + 8);
    layout.page.text(line, MARGIN, layout.y - size, size, "bold", colour);
    layout.y -= size + 6;
  }
  if (level === 2) {
    layout.page.line(
      MARGIN,
      layout.y + 2,
      MARGIN + layout.contentWidth,
      layout.y + 2,
      document.branding.primaryColour,
      1.2,
    );
    layout.y -= 10;
  }
}

function drawTable(
  layout: Layout,
  block: Extract<ReportRenderBlock, { kind: "table" }>,
  document: ReportDocument,
): void {
  const totalWeight = (block.widths ?? block.columns.map(() => 1)).reduce((a, b) => a + b, 0) || 1;
  const widths = (block.widths ?? block.columns.map(() => 1)).map(
    (weight) => (weight / totalWeight) * layout.contentWidth,
  );
  const padding = 5;

  const drawHeader = () => {
    ensureSpace(layout, 24);
    layout.page.rect(MARGIN, layout.y - 18, layout.contentWidth, 18, document.branding.primaryColour);
    let x = MARGIN;
    block.columns.forEach((column, index) => {
      const [line] = wrapText(column, 8.5, "bold", widths[index] - padding * 2);
      layout.page.text(line, x + padding, layout.y - 13, 8.5, "bold", "FFFFFF");
      x += widths[index];
    });
    layout.y -= 18;
  };

  drawHeader();

  block.rows.forEach((row, rowIndex) => {
    const cells = row.map((cell, index) => wrapText(cell, 8.5, "regular", widths[index] - padding * 2));
    const rowHeight = Math.max(...cells.map((lines) => lines.length)) * 11 + 6;

    if (layout.y - rowHeight < MARGIN + FOOTER_SPACE) {
      newPage(layout);
      drawHeader();
    }
    if (rowIndex % 2 === 1) {
      layout.page.rect(MARGIN, layout.y - rowHeight, layout.contentWidth, rowHeight, document.branding.surfaceColour);
    }
    let x = MARGIN;
    cells.forEach((lines, index) => {
      lines.forEach((line, lineIndex) => {
        layout.page.text(line, x + padding, layout.y - 12 - lineIndex * 11, 8.5, "regular", document.branding.inkColour);
      });
      x += widths[index];
    });
    layout.page.line(MARGIN, layout.y - rowHeight, MARGIN + layout.contentWidth, layout.y - rowHeight, "E2E8F0", 0.5);
    layout.y -= rowHeight;
  });

  layout.y -= 10;
}

function drawKpis(
  layout: Layout,
  block: Extract<ReportRenderBlock, { kind: "kpis" }>,
  document: ReportDocument,
): void {
  const perRow = Math.min(4, Math.max(1, block.items.length));
  const gap = 10;
  const cardWidth = (layout.contentWidth - gap * (perRow - 1)) / perRow;

  for (let index = 0; index < block.items.length; index += perRow) {
    const row = block.items.slice(index, index + perRow);
    ensureSpace(layout, 54);
    row.forEach((item, column) => {
      const x = MARGIN + column * (cardWidth + gap);
      layout.page.rect(x, layout.y - 46, cardWidth, 46, document.branding.surfaceColour);
      layout.page.rect(x, layout.y - 46, 3, 46, document.branding.primaryColour);
      const [value] = wrapText(item.value || "-", 16, "bold", cardWidth - 16);
      layout.page.text(value, x + 10, layout.y - 24, 16, "bold", document.branding.inkColour);
      const [label] = wrapText(item.label, 7.5, "regular", cardWidth - 16);
      layout.page.text(label, x + 10, layout.y - 38, 7.5, "regular", document.branding.mutedColour);
    });
    layout.y -= 56;
  }
}

function drawChart(
  layout: Layout,
  block: Extract<ReportRenderBlock, { kind: "chart" }>,
  document: ReportDocument,
): void {
  const height = 130;
  ensureSpace(layout, height + 40);
  const baseline = layout.y - height;
  const max = Math.max(...block.series.map((point) => point.value), 1);
  const slot = layout.contentWidth / block.series.length;
  const barWidth = Math.min(46, slot * 0.55);

  block.series.forEach((point, index) => {
    const barHeight = Math.max(2, (Math.max(point.value, 0) / max) * (height - 18));
    const x = MARGIN + index * slot + (slot - barWidth) / 2;
    layout.page.rect(x, baseline, barWidth, barHeight, document.branding.primaryColour);
    const valueText = String(point.value);
    layout.page.text(
      valueText,
      x + (barWidth - measure(valueText, 7.5, "bold")) / 2,
      baseline + barHeight + 4,
      7.5,
      "bold",
      document.branding.inkColour,
    );
    const [label] = wrapText(point.label, 7, "regular", slot - 4);
    layout.page.text(
      label,
      x + barWidth / 2 - measure(label, 7, "regular") / 2,
      baseline - 10,
      7,
      "regular",
      document.branding.mutedColour,
    );
  });

  layout.page.line(MARGIN, baseline, MARGIN + layout.contentWidth, baseline, document.branding.mutedColour, 0.6);
  layout.y = baseline - 22;
  if (block.caption) {
    writeLines(
      layout,
      wrapText(block.caption, 8, "regular", layout.contentWidth),
      8,
      "regular",
      document.branding.mutedColour,
      12,
    );
  }
  layout.y -= 6;
}

function drawBlock(layout: Layout, block: ReportRenderBlock, document: ReportDocument): void {
  switch (block.kind) {
    case "heading":
      heading(layout, block.text, document, block.level);
      break;
    case "paragraph":
      writeLines(
        layout,
        wrapText(block.text, 10, "regular", layout.contentWidth),
        10,
        "regular",
        document.branding.inkColour,
        14,
      );
      layout.y -= 6;
      break;
    case "bullets":
      for (const item of block.items) {
        const lines = wrapText(item, 10, "regular", layout.contentWidth - 16);
        ensureSpace(layout, 14);
        layout.page.text("-", MARGIN, layout.y - 10, 10, "bold", document.branding.primaryColour);
        writeLines(layout, lines, 10, "regular", document.branding.inkColour, 14, 14);
      }
      layout.y -= 6;
      break;
    case "kpis":
      drawKpis(layout, block, document);
      break;
    case "table":
      drawTable(layout, block, document);
      break;
    case "chart":
      drawChart(layout, block, document);
      break;
    case "image":
      // Remote binary images cannot be embedded in the Worker renderer; the
      // caption and source are preserved so the artefact stays traceable.
      writeLines(
        layout,
        wrapText(`[Image] ${block.caption || block.alt} — ${block.url}`, 8.5, "regular", layout.contentWidth),
        8.5,
        "regular",
        document.branding.mutedColour,
        12,
      );
      layout.y -= 6;
      break;
    case "note": {
      const lines = wrapText(block.text, 9, "regular", layout.contentWidth - 20);
      const height = lines.length * 12 + 12;
      ensureSpace(layout, height + 6);
      layout.page.rect(MARGIN, layout.y - height, layout.contentWidth, height, document.branding.surfaceColour);
      layout.page.rect(MARGIN, layout.y - height, 3, height, document.branding.secondaryColour);
      lines.forEach((line, index) => {
        layout.page.text(line, MARGIN + 12, layout.y - 16 - index * 12, 9, "regular", document.branding.inkColour);
      });
      layout.y -= height + 10;
      break;
    }
    case "pagebreak":
      newPage(layout);
      break;
  }
}

function drawCover(layout: Layout, document: ReportDocument): void {
  const brand = document.branding;
  layout.page.rect(0, layout.pageHeight - 10, layout.pageWidth, 10, brand.primaryColour);
  layout.y = layout.pageHeight - 140;

  layout.page.rect(MARGIN, layout.y + 40, 54, 26, brand.primaryColour);
  layout.page.text(brand.logoText, MARGIN + 10, layout.y + 48, 13, "bold", "FFFFFF");

  for (const line of wrapText(document.cover.title, 26, "bold", layout.contentWidth)) {
    layout.page.text(line, MARGIN, layout.y, 26, "bold", brand.inkColour);
    layout.y -= 32;
  }
  for (const line of wrapText(document.cover.subtitle, 11, "regular", layout.contentWidth)) {
    layout.page.text(line, MARGIN, layout.y, 11, "regular", brand.mutedColour);
    layout.y -= 16;
  }

  layout.y -= 24;
  const facts: [string, string][] = [
    ["Organisation", document.cover.organisation],
    ...(document.cover.workspace ? ([["Workspace", document.cover.workspace]] as [string, string][]) : []),
    ["Generated", new Date(document.cover.generatedAt).toUTCString()],
    ["Generated by", document.cover.generatedBy],
    ["Version", `v${document.cover.version}`],
    ["Template", document.cover.templateName],
  ];
  for (const [label, value] of facts) {
    layout.page.text(label, MARGIN, layout.y, 9, "bold", brand.mutedColour);
    layout.page.text(value, MARGIN + 110, layout.y, 9, "regular", brand.inkColour);
    layout.y -= 16;
  }

  layout.page.text(brand.confidentialityStatement, MARGIN, MARGIN + 20, 8, "regular", brand.mutedColour);
  newPage(layout);
}

function drawContents(layout: Layout, document: ReportDocument): void {
  const entries = tableOfContents(document);
  if (!document.includeToc || entries.length < 2) return;
  heading(layout, "Contents", document, 2);
  for (const entry of entries) {
    ensureSpace(layout, 16);
    layout.page.text(entry.label, MARGIN, layout.y - 10, 10, "bold", document.branding.primaryColour);
    layout.page.text(entry.title, MARGIN + 70, layout.y - 10, 10, "regular", document.branding.inkColour);
    layout.y -= 16;
  }
  newPage(layout);
}

function drawSection(layout: Layout, section: ReportDocumentSection, document: ReportDocument): void {
  heading(layout, section.title, document, 2);
  for (const block of section.blocks) drawBlock(layout, block, document);
}

function decoratePages(layout: Layout, document: ReportDocument): void {
  const total = layout.pages.length;
  layout.pages.forEach((page, index) => {
    const isCover = document.includeCover && index === 0;
    if (!isCover) {
      page.text(document.headerText, MARGIN, layout.pageHeight - MARGIN + 14, 8, "regular", document.branding.mutedColour);
      page.line(
        MARGIN,
        layout.pageHeight - MARGIN + 8,
        layout.pageWidth - MARGIN,
        layout.pageHeight - MARGIN + 8,
        "E2E8F0",
        0.5,
      );
    }
    page.line(MARGIN, MARGIN - 4, layout.pageWidth - MARGIN, MARGIN - 4, "E2E8F0", 0.5);
    page.text(document.footerText, MARGIN, MARGIN - 16, 7.5, "regular", document.branding.mutedColour);
    if (document.pageNumbering) {
      const label = `${index + 1} / ${total}`;
      page.text(
        label,
        layout.pageWidth - MARGIN - measure(label, 7.5, "regular"),
        MARGIN - 16,
        7.5,
        "regular",
        document.branding.mutedColour,
      );
    }
  });
}

/** Render a composed document into PDF bytes. */
export function renderPdfDocument(document: ReportDocument): Uint8Array {
  const layout = createLayout(document);

  if (document.includeCover) drawCover(layout, document);
  drawContents(layout, document);

  document.sections.forEach((section, index) => {
    if (index > 0 && section.appendix && !document.sections[index - 1].appendix) newPage(layout);
    drawSection(layout, section, document);
  });

  decoratePages(layout, document);

  return buildPdf(layout.pages, {
    width: layout.pageWidth,
    height: layout.pageHeight,
    title: document.title,
    author: document.branding.productName,
    subject: document.cover.subtitle,
  });
}
