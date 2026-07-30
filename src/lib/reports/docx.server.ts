import { escapeXml, zip, type ZipEntry } from "../dashboard/pptx.server";
import type { ReportBlock, ReportDocument } from "./types";

/**
 * Minimal, dependency-free OOXML Word writer. Direct run formatting only —
 * no styles part is required, which keeps the package small and valid.
 */

const encoder = new TextEncoder();
const TWIPS_CONTENT = 9360; // A4/Letter content width with 1" margins.

function runProps(options: { bold?: boolean; size: number; color: string; caps?: boolean }): string {
  return (
    `<w:rPr>${options.bold ? "<w:b/>" : ""}${options.caps ? '<w:caps/>' : ""}` +
    `<w:color w:val="${options.color}"/><w:sz w:val="${options.size * 2}"/>` +
    `<w:szCs w:val="${options.size * 2}"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>`
  );
}

function paragraph(
  text: string,
  options: {
    bold?: boolean;
    size?: number;
    color?: string;
    before?: number;
    after?: number;
    caps?: boolean;
    pageBreakBefore?: boolean;
    outline?: number;
  } = {},
): string {
  const size = options.size ?? 11;
  const color = options.color ?? "0F172A";
  const spacing = `<w:spacing w:before="${options.before ?? 60}" w:after="${options.after ?? 100}"/>`;
  const outline =
    options.outline !== undefined ? `<w:outlineLvl w:val="${options.outline}"/>` : "";
  const breakBefore = options.pageBreakBefore ? "<w:pageBreakBefore/>" : "";
  return (
    `<w:p><w:pPr>${breakBefore}${spacing}${outline}</w:pPr>` +
    `<w:r>${runProps({ bold: options.bold, size, color, caps: options.caps })}` +
    `<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`
  );
}

function bullet(text: string, color: string): string {
  return (
    `<w:p><w:pPr><w:ind w:left="480" w:hanging="240"/><w:spacing w:before="20" w:after="40"/></w:pPr>` +
    `<w:r>${runProps({ size: 11, color })}<w:t xml:space="preserve">• ${escapeXml(text)}</w:t></w:r></w:p>`
  );
}

function cell(text: string, width: number, header: boolean, colors: { ink: string; muted: string; surface: string }): string {
  return (
    `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>` +
    (header ? `<w:shd w:val="clear" w:color="auto" w:fill="${colors.surface}"/>` : "") +
    `<w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/>` +
    `<w:left w:w="90" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tcMar></w:tcPr>` +
    `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>` +
    `<w:r>${runProps({ bold: header, size: 9, color: header ? colors.muted : colors.ink })}` +
    `<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p></w:tc>`
  );
}

function table(
  columns: string[],
  rows: string[][],
  widths: number[] | undefined,
  colors: { ink: string; muted: string; surface: string },
): string {
  const count = columns.length || 1;
  const resolved = (widths?.length === count ? widths : Array(count).fill(100 / count)).map(
    (percent) => Math.round((TWIPS_CONTENT * percent) / 100),
  );
  const border =
    '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="CBD5E1"/><w:bottom w:val="single" w:sz="4" w:color="CBD5E1"/>' +
    '<w:left w:val="none" w:sz="0" w:color="auto"/><w:right w:val="none" w:sz="0" w:color="auto"/>' +
    '<w:insideH w:val="single" w:sz="4" w:color="E2E8F0"/><w:insideV w:val="none" w:sz="0" w:color="auto"/></w:tblBorders>';

  const head = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${columns
    .map((column, index) => cell(column, resolved[index], true, colors))
    .join("")}</w:tr>`;

  const body =
    rows.length > 0
      ? rows
          .map(
            (row) =>
              `<w:tr>${columns
                .map((_, index) => cell(row[index] ?? "", resolved[index], false, colors))
                .join("")}</w:tr>`,
          )
          .join("")
      : `<w:tr>${columns
          .map((_, index) => cell(index === 0 ? "No data available." : "", resolved[index], false, colors))
          .join("")}</w:tr>`;

  return (
    `<w:tbl><w:tblPr><w:tblW w:w="${TWIPS_CONTENT}" w:type="dxa"/>${border}</w:tblPr>` +
    `<w:tblGrid>${resolved.map((width) => `<w:gridCol w:w="${width}"/>`).join("")}</w:tblGrid>` +
    `${head}${body}</w:tbl>` +
    paragraph("", { size: 4, before: 0, after: 60 })
  );
}

function renderBlock(block: ReportBlock, document: ReportDocument): string {
  const { branding } = document;
  const colors = { ink: branding.ink, muted: branding.muted, surface: branding.surface };

  switch (block.kind) {
    case "heading":
      return paragraph(block.text, {
        bold: true,
        size: block.level === 2 ? 14 : 12,
        color: block.level === 2 ? branding.primary : branding.ink,
        before: 200,
        after: 80,
        outline: block.level - 1,
      });
    case "paragraph":
      return paragraph(block.text, { color: branding.ink });
    case "bullets":
      return block.items.map((item) => bullet(item, branding.ink)).join("");
    case "kpis":
      return table(
        block.items.map((item) => item.label),
        [block.items.map((item) => item.value)],
        undefined,
        colors,
      );
    case "table":
      return table(block.columns, block.rows, block.widths, colors);
    case "note":
      return paragraph(block.text, { size: 9, color: branding.muted, before: 20, after: 120 });
    case "pagebreak":
      return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    default:
      return "";
  }
}

/** Render a report document as a .docx byte stream. */
export function buildDocx(document: ReportDocument, includeToc: boolean): Uint8Array {
  const { branding, cover } = document;

  const coverBlocks = [
    paragraph(branding.logoText, { bold: true, size: 12, color: branding.primary, before: 0, after: 40, caps: true }),
    paragraph(cover.title, { bold: true, size: 28, color: branding.ink, before: 240, after: 60 }),
    paragraph(cover.organisation, { bold: true, size: 16, color: branding.primary, before: 0, after: 120 }),
    paragraph(cover.subtitle, { size: 12, color: branding.muted, before: 0, after: 200 }),
    table(
      ["Overall score", "Maturity", "Evidence confidence"],
      [[cover.overall, cover.maturity, cover.confidence]],
      undefined,
      { ink: branding.ink, muted: branding.muted, surface: branding.surface },
    ),
    paragraph(`${cover.knowledgePack} · generated ${cover.generatedAt}`, {
      size: 9,
      color: branding.muted,
      before: 120,
      after: 0,
    }),
    '<w:p><w:r><w:br w:type="page"/></w:r></w:p>',
  ].join("");

  const toc = includeToc
    ? paragraph("Table of Contents", {
        bold: true,
        size: 16,
        color: branding.primary,
        before: 0,
        after: 120,
      }) +
      document.sections
        .filter((section) => section.listed)
        .map((section, index) =>
          paragraph(`${index + 1}.  ${section.title}`, {
            color: branding.ink,
            before: 0,
            after: 40,
          }),
        )
        .join("") +
      '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
    : "";

  const body = document.sections
    .map(
      (section, index) =>
        paragraph(section.title, {
          bold: true,
          size: 18,
          color: branding.primary,
          before: index === 0 ? 0 : 320,
          after: 120,
          outline: 0,
          pageBreakBefore: index > 0,
        }) + section.blocks.map((block) => renderBlock(block, document)).join(""),
    )
    .join("");

  const footer =
    `<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>` +
    `<w:r>${runProps({ size: 8, color: branding.muted })}` +
    `<w:t xml:space="preserve">${escapeXml(`${branding.productName} · ${document.organisation} · ${branding.footerNote}`)}</w:t>` +
    `</w:r></w:p></w:ftr>`;

  const documentXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<w:body>${coverBlocks}${toc}${body}` +
    `<w:sectPr><w:footerReference w:type="default" r:id="rId1"/>` +
    `<w:pgSz w:w="11906" w:h="16838"/>` +
    `<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>` +
    `</w:sectPr></w:body></w:document>`;

  const entries: ZipEntry[] = [
    {
      name: "[Content_Types].xml",
      data: encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
          `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
          `<Default Extension="xml" ContentType="application/xml"/>` +
          `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
          `<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>` +
          `</Types>`,
      ),
    },
    {
      name: "_rels/.rels",
      data: encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
      ),
    },
    {
      name: "word/_rels/document.xml.rels",
      data: encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`,
      ),
    },
    { name: "word/document.xml", data: encoder.encode(documentXml) },
    { name: "word/footer1.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${footer}`) },
  ];

  return zip(entries);
}
