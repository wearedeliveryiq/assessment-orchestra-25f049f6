import { escapeXml, zip, type ZipEntry } from "@/lib/dashboard/pptx.server";
import { tableOfContents } from "../document";
import type { ReportDocument, ReportRenderBlock } from "../types";

/**
 * Microsoft Word (.docx) renderer — dependency-free OOXML, Worker safe.
 * Uses the shared store-only ZIP writer.
 */

const encoder = new TextEncoder();

function run(text: string, options: { bold?: boolean; size?: number; colour?: string } = {}): string {
  const half = Math.round((options.size ?? 11) * 2);
  return (
    `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>` +
    `${options.bold ? "<w:b/>" : ""}<w:sz w:val="${half}"/>` +
    `${options.colour ? `<w:color w:val="${options.colour}"/>` : ""}</w:rPr>` +
    `<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`
  );
}

function paragraph(
  text: string,
  options: { bold?: boolean; size?: number; colour?: string; style?: string; spacing?: number; bullet?: boolean } = {},
): string {
  const properties =
    `<w:pPr>${options.style ? `<w:pStyle w:val="${options.style}"/>` : ""}` +
    `${options.bullet ? `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>` : ""}` +
    `<w:spacing w:after="${options.spacing ?? 120}"/></w:pPr>`;
  return `<w:p>${properties}${text ? run(text, options) : ""}</w:p>`;
}

function pageBreak(): string {
  return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
}

function table(block: Extract<ReportRenderBlock, { kind: "table" }>, accent: string): string {
  const total = 9360;
  const weights = block.widths ?? block.columns.map(() => 1);
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const widths = weights.map((weight) => Math.round((weight / sum) * total));

  const cell = (text: string, index: number, header: boolean) =>
    `<w:tc><w:tcPr><w:tcW w:w="${widths[index]}" w:type="dxa"/>` +
    `${header ? `<w:shd w:val="clear" w:color="auto" w:fill="${accent}"/>` : ""}` +
    `<w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar></w:tcPr>` +
    `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr>${run(text, {
      bold: header,
      size: 9,
      colour: header ? "FFFFFF" : undefined,
    })}</w:p></w:tc>`;

  const border = `<w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"]
    .map((side) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="D9E2EC"/>`)
    .join("")}</w:tblBorders>`;

  const headerRow = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${block.columns
    .map((column, index) => cell(column, index, true))
    .join("")}</w:tr>`;

  const rows = block.rows
    .map((row) => `<w:tr>${row.map((value, index) => cell(value, index, false)).join("")}</w:tr>`)
    .join("");

  return (
    `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/>${border}</w:tblPr>` +
    `<w:tblGrid>${widths.map((width) => `<w:gridCol w:w="${width}"/>`).join("")}</w:tblGrid>` +
    `${headerRow}${rows}</w:tbl>${paragraph("", { spacing: 120 })}`
  );
}

function blockXml(block: ReportRenderBlock, document: ReportDocument): string {
  const brand = document.branding;
  switch (block.kind) {
    case "heading":
      return paragraph(block.text, {
        bold: true,
        size: block.level === 2 ? 14 : 12,
        colour: block.level === 2 ? brand.inkColour : brand.secondaryColour,
        style: `Heading${block.level}`,
      });
    case "paragraph":
      return paragraph(block.text, { size: 11 });
    case "bullets":
      return block.items.map((item) => paragraph(item, { size: 11, bullet: true, spacing: 60 })).join("");
    case "kpis":
      return table(
        {
          kind: "table",
          columns: ["Measure", "Value"],
          widths: [60, 40],
          rows: block.items.map((item) => [item.label, item.value]),
        },
        brand.primaryColour,
      );
    case "table":
      return table(block, brand.primaryColour);
    case "chart": {
      const max = Math.max(...block.series.map((point) => point.value), 1);
      return (
        (block.caption ? paragraph(block.caption, { bold: true, size: 10 }) : "") +
        table(
          {
            kind: "table",
            columns: ["Item", "Value", ""],
            widths: [40, 15, 45],
            rows: block.series.map((point) => [
              point.label,
              String(point.value),
              "█".repeat(Math.max(1, Math.round((point.value / max) * 20))),
            ]),
          },
          brand.primaryColour,
        )
      );
    }
    case "image":
      return paragraph(`[Image] ${block.caption || block.alt} — ${block.url}`, {
        size: 9,
        colour: brand.mutedColour,
      });
    case "note":
      return paragraph(block.text, { size: 10, colour: brand.mutedColour });
    case "pagebreak":
      return pageBreak();
    default:
      return "";
  }
}

/** Render a composed document into .docx bytes. */
export function renderDocxDocument(document: ReportDocument): Uint8Array {
  const brand = document.branding;
  const parts: string[] = [];

  if (document.includeCover) {
    parts.push(paragraph(brand.logoText, { bold: true, size: 12, colour: brand.primaryColour }));
    parts.push(paragraph(document.cover.title, { bold: true, size: 26, colour: brand.inkColour }));
    parts.push(paragraph(document.cover.subtitle, { size: 12, colour: brand.mutedColour }));
    parts.push(
      table(
        {
          kind: "table",
          columns: ["Detail", "Value"],
          widths: [30, 70],
          rows: [
            ["Organisation", document.cover.organisation],
            ...(document.cover.workspace ? [["Workspace", document.cover.workspace]] : []),
            ["Generated", new Date(document.cover.generatedAt).toUTCString()],
            ["Generated by", document.cover.generatedBy],
            ["Version", `v${document.cover.version}`],
            ["Template", document.cover.templateName],
          ],
        },
        brand.primaryColour,
      ),
    );
    parts.push(paragraph(brand.confidentialityStatement, { size: 8, colour: brand.mutedColour }));
    parts.push(pageBreak());
  }

  const contents = tableOfContents(document);
  if (document.includeToc && contents.length > 1) {
    parts.push(paragraph("Contents", { bold: true, size: 16, colour: brand.inkColour, style: "Heading1" }));
    for (const entry of contents) {
      parts.push(paragraph(`${entry.label}.  ${entry.title}`, { size: 11, spacing: 60 }));
    }
    parts.push(pageBreak());
  }

  document.sections.forEach((section, index) => {
    if (index > 0 && section.appendix && !document.sections[index - 1].appendix) parts.push(pageBreak());
    parts.push(
      paragraph(section.title, { bold: true, size: 16, colour: brand.inkColour, style: "Heading1" }),
    );
    for (const block of section.blocks) parts.push(blockXml(block, document));
  });

  const sectionProperties =
    `<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader"/>` +
    `<w:footerReference w:type="default" r:id="rIdFooter"/>` +
    `<w:pgSz w:w="11906" w:h="16838"/>` +
    `<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${parts.join("")}${sectionProperties}</w:body></w:document>`;

  const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${paragraph(document.headerText, { size: 8, colour: brand.mutedColour, spacing: 0 })}</w:hdr>`;

  const footerContent = document.pageNumbering
    ? `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr>${run(`${document.footerText}  •  Page `, { size: 8, colour: brand.mutedColour })}<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>`
    : paragraph(document.footerText, { size: 8, colour: brand.mutedColour, spacing: 0 });

  const footerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${footerContent}</w:ftr>`;

  const numberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:qFormat/><w:pPr><w:outlineLvl w:val="0"/><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:qFormat/><w:pPr><w:outlineLvl w:val="1"/><w:spacing w:before="200" w:after="100"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:qFormat/><w:pPr><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style></w:styles>`;

  const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/><Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

  const entries: ZipEntry[] = [
    { name: "[Content_Types].xml", data: encoder.encode(contentTypes) },
    { name: "_rels/.rels", data: encoder.encode(rootRels) },
    { name: "word/document.xml", data: encoder.encode(documentXml) },
    { name: "word/_rels/document.xml.rels", data: encoder.encode(documentRels) },
    { name: "word/styles.xml", data: encoder.encode(stylesXml) },
    { name: "word/numbering.xml", data: encoder.encode(numberingXml) },
    { name: "word/header1.xml", data: encoder.encode(headerXml) },
    { name: "word/footer1.xml", data: encoder.encode(footerXml) },
  ];

  return zip(entries);
}
