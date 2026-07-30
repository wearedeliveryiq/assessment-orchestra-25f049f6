/**
 * Minimal, dependency-free PDF writer.
 *
 * Runs inside the Worker runtime: pure JavaScript, no native renderer, no
 * headless browser and no filesystem. It emits a PDF 1.4 file with the base
 * Helvetica fonts, so the artefact is a real `.pdf` a user can archive rather
 * than a printable HTML page.
 */

const encoder = new TextEncoder();

/* Advance widths (per 1000 units) for the base-14 Helvetica faces. */
const REGULAR_WIDTHS =
  "278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584"
    .split(",")
    .map(Number);

const BOLD_WIDTHS =
  "278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584"
    .split(",")
    .map(Number);

export type PdfFont = "regular" | "bold";

function charWidth(code: number, font: PdfFont): number {
  const table = font === "bold" ? BOLD_WIDTHS : REGULAR_WIDTHS;
  if (code >= 32 && code <= 126) return table[code - 32];
  if (code >= 160 && code <= 255) return font === "bold" ? 556 : 500;
  return table[0];
}

const UNICODE_MAP: [RegExp, string][] = [
  [/[\u2018\u2019\u201a\u2032]/g, "'"],
  [/[\u201c\u201d\u201e\u2033]/g, '"'],
  [/[\u2013\u2014\u2212]/g, "-"],
  [/[\u2022\u00b7]/g, "-"],
  [/\u2026/g, "..."],
  [/\u00a0/g, " "],
  [/[\u2192\u21d2]/g, "->"],
];

/** Normalise to a byte range the base fonts can render (WinAnsi-ish). */
export function pdfText(value: string): string {
  let out = value;
  for (const [pattern, replacement] of UNICODE_MAP) out = out.replace(pattern, replacement);
  return out.replace(/[^\u0020-\u007e\u00a0-\u00ff\n]/g, "?");
}

export function measure(text: string, size: number, font: PdfFont): number {
  let total = 0;
  for (let i = 0; i < text.length; i += 1) total += charWidth(text.charCodeAt(i), font);
  return (total * size) / 1000;
}

/** Greedy word wrap against real glyph widths. */
export function wrapText(text: string, size: number, font: PdfFont, maxWidth: number): string[] {
  const clean = pdfText(text).replace(/\s+/g, " ").trim();
  if (!clean) return [""];

  const lines: string[] = [];
  let current = "";

  for (const word of clean.split(" ")) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate, size, font) <= maxWidth || !current) {
      current = candidate;
      // A single word longer than the line still needs breaking.
      while (measure(current, size, font) > maxWidth && current.length > 1) {
        let cut = current.length - 1;
        while (cut > 1 && measure(current.slice(0, cut), size, font) > maxWidth) cut -= 1;
        lines.push(current.slice(0, cut));
        current = current.slice(cut);
      }
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function escapeString(value: string): string {
  let out = "";
  for (const char of pdfText(value)) {
    const code = char.charCodeAt(0);
    if (char === "(" || char === ")" || char === "\\") out += `\\${char}`;
    else if (code > 126) out += `\\${code.toString(8).padStart(3, "0")}`;
    else out += char;
  }
  return out;
}

function rgb(hex: string): string {
  const value = hex.replace(/^#/, "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

/** A single page's content stream, built with drawing primitives. */
export class PdfPage {
  private readonly ops: string[] = [];

  text(value: string, x: number, y: number, size: number, font: PdfFont, colour: string): void {
    this.ops.push(
      `BT /${font === "bold" ? "F2" : "F1"} ${size} Tf ${rgb(colour)} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapeString(value)}) Tj ET`,
    );
  }

  rect(x: number, y: number, width: number, height: number, colour: string): void {
    this.ops.push(
      `${rgb(colour)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`,
    );
  }

  line(x1: number, y1: number, x2: number, y2: number, colour: string, width = 0.5): void {
    this.ops.push(
      `${rgb(colour)} RG ${width} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`,
    );
  }

  content(): string {
    return this.ops.join("\n");
  }
}

export interface PdfOptions {
  width: number;
  height: number;
  title: string;
  author: string;
  subject: string;
}

/** Serialise pages into a PDF byte stream. */
export function buildPdf(pages: PdfPage[], options: PdfOptions): Uint8Array {
  const objects: string[] = [];
  const pageCount = Math.max(pages.length, 1);
  const fontIds = [3 + pageCount * 2, 4 + pageCount * 2];
  const infoId = 5 + pageCount * 2;

  // 1: catalog, 2: pages, 3..: page + content pairs.
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  const kids = Array.from({ length: pageCount }, (_, index) => `${3 + index * 2} 0 R`).join(" ");
  objects.push(`<< /Type /Pages /Count ${pageCount} /Kids [${kids}] >>`);

  for (let index = 0; index < pageCount; index += 1) {
    const contentId = 4 + index * 2;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${options.width} ${options.height}] ` +
        `/Resources << /Font << /F1 ${fontIds[0]} 0 R /F2 ${fontIds[1]} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    const stream = pages[index]?.content() ?? "";
    objects.push(`<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`);
  }

  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objects.push(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  );
  objects.push(
    `<< /Title (${escapeString(options.title)}) /Author (${escapeString(options.author)}) ` +
      `/Subject (${escapeString(options.subject)}) /Producer (DeliveryIQ Report Engine) >>`,
  );

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(encoder.encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  pdf +=
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${infoId} 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`;

  return encoder.encode(pdf);
}
