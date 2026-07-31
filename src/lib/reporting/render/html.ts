import { tableOfContents } from "../document";
import type { ReportDocument, ReportRenderBlock } from "../types";

/**
 * HTML + print renderer (pure — safe to import from the browser preview).
 *
 * The same markup serves the on-screen preview and the print layout; the
 * print variant adds page-break rules so a browser "Print to PDF" matches
 * the generated PDF closely.
 */

/** Local escaper: this module must stay free of server-only imports. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function colour(hex: string): string {
  return `#${hex}`;
}

function block(item: ReportRenderBlock): string {
  switch (item.kind) {
    case "heading":
      return `<h${item.level}>${escapeXml(item.text)}</h${item.level}>`;
    case "paragraph":
      return `<p>${escapeXml(item.text)}</p>`;
    case "bullets":
      return `<ul>${item.items.map((entry) => `<li>${escapeXml(entry)}</li>`).join("")}</ul>`;
    case "kpis":
      return `<div class="kpis">${item.items
        .map(
          (kpi) =>
            `<div class="kpi"><span class="kpi-value">${escapeXml(kpi.value)}</span><span class="kpi-label">${escapeXml(kpi.label)}</span></div>`,
        )
        .join("")}</div>`;
    case "table":
      return `<table><thead><tr>${item.columns
        .map((column, index) => `<th style="width:${item.widths?.[index] ?? ""}%">${escapeXml(column)}</th>`)
        .join("")}</tr></thead><tbody>${item.rows
        .map((row) => `<tr>${row.map((cell) => `<td>${escapeXml(cell)}</td>`).join("")}</tr>`)
        .join("")}</tbody></table>`;
    case "chart": {
      const max = Math.max(...item.series.map((point) => point.value), 1);
      return `<figure class="chart"><div class="bars">${item.series
        .map(
          (point) =>
            `<div class="bar"><div class="bar-fill" style="height:${Math.round((point.value / max) * 100)}%"></div><span>${escapeXml(point.label)}</span><b>${escapeXml(String(point.value))}</b></div>`,
        )
        .join("")}</div>${item.caption ? `<figcaption>${escapeXml(item.caption)}</figcaption>` : ""}</figure>`;
    }
    case "image":
      return `<figure class="image"><img src="${escapeXml(item.url)}" alt="${escapeXml(item.alt)}" loading="lazy" />${
        item.caption ? `<figcaption>${escapeXml(item.caption)}</figcaption>` : ""
      }</figure>`;
    case "note":
      return `<aside class="note">${escapeXml(item.text)}</aside>`;
    case "pagebreak":
      return `<div class="pagebreak"></div>`;
    default:
      return "";
  }
}

function styles(document: ReportDocument, print: boolean): string {
  const brand = document.branding;
  return `:root{--primary:${colour(brand.primaryColour)};--secondary:${colour(brand.secondaryColour)};--ink:${colour(brand.inkColour)};--muted:${colour(brand.mutedColour)};--surface:${colour(brand.surfaceColour)};}
*{box-sizing:border-box}
body{margin:0;background:#fff;color:var(--ink);font-family:${brand.bodyFont},system-ui,sans-serif;font-size:12pt;line-height:1.55}
.page{max-width:820px;margin:0 auto;padding:32px}
h1,h2,h3{font-family:${brand.headingFont},system-ui,sans-serif;color:var(--ink);line-height:1.25}
h1{font-size:26pt;margin:0 0 8px}
h2{font-size:16pt;margin:28px 0 10px;padding-bottom:6px;border-bottom:2px solid var(--primary)}
h3{font-size:13pt;margin:18px 0 6px;color:var(--secondary)}
p{margin:0 0 10px}
ul{margin:0 0 12px 18px;padding:0}
li{margin:0 0 4px}
table{width:100%;border-collapse:collapse;margin:0 0 14px;font-size:10pt}
th{background:var(--primary);color:#fff;text-align:left;padding:7px 9px;font-weight:600}
td{border-bottom:1px solid #e2e8f0;padding:6px 9px;vertical-align:top}
tr:nth-child(even) td{background:var(--surface)}
.kpis{display:flex;flex-wrap:wrap;gap:12px;margin:0 0 16px}
.kpi{flex:1 1 140px;background:var(--surface);border-left:4px solid var(--primary);padding:10px 12px}
.kpi-value{display:block;font-size:18pt;font-weight:700}
.kpi-label{display:block;font-size:9pt;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.chart .bars{display:flex;align-items:flex-end;gap:10px;height:170px;border-bottom:1px solid #cbd5e1;padding-bottom:4px}
.bar{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;font-size:8pt;color:var(--muted)}
.bar-fill{width:100%;background:linear-gradient(180deg,var(--secondary),var(--primary));border-radius:3px 3px 0 0}
figcaption{font-size:9pt;color:var(--muted);margin-top:6px}
.image img{max-width:100%}
.note{background:var(--surface);border-left:4px solid var(--secondary);padding:10px 12px;font-size:10pt;margin:0 0 12px}
.cover{border-top:8px solid var(--primary);padding:48px 0 32px;margin-bottom:24px}
.cover .logo{display:inline-block;background:var(--primary);color:#fff;font-weight:700;padding:6px 10px;border-radius:6px;letter-spacing:.08em}
.cover dl{display:grid;grid-template-columns:auto 1fr;gap:4px 16px;font-size:10pt;margin-top:24px}
.cover dt{color:var(--muted)}
.toc ol{margin:0;padding-left:20px}
.doc-footer{margin-top:32px;border-top:1px solid #e2e8f0;padding-top:10px;font-size:8.5pt;color:var(--muted)}
.pagebreak{break-after:page}
${
  print
    ? `@page{size:A4;margin:18mm 15mm}
@media print{.page{max-width:none;padding:0}h2{break-after:avoid}table,figure,.kpi{break-inside:avoid}.cover{break-after:page}.toc{break-after:page}}`
    : ""
}`;
}

export function renderHtmlDocument(document: ReportDocument, options: { print?: boolean } = {}): string {
  const print = options.print === true;
  const brand = document.branding;
  const toc = tableOfContents(document);

  const cover = document.includeCover
    ? `<header class="cover"><span class="logo">${escapeXml(brand.logoText)}</span>
<h1>${escapeXml(document.cover.title)}</h1>
<p>${escapeXml(document.cover.subtitle)}</p>
<dl>
<dt>Organisation</dt><dd>${escapeXml(document.cover.organisation)}</dd>
${document.cover.workspace ? `<dt>Workspace</dt><dd>${escapeXml(document.cover.workspace)}</dd>` : ""}
<dt>Generated</dt><dd>${escapeXml(new Date(document.cover.generatedAt).toUTCString())}</dd>
<dt>Generated by</dt><dd>${escapeXml(document.cover.generatedBy)}</dd>
<dt>Version</dt><dd>v${document.cover.version}</dd>
<dt>Template</dt><dd>${escapeXml(document.cover.templateName)}</dd>
</dl></header>`
    : "";

  const contents =
    document.includeToc && toc.length > 1
      ? `<nav class="toc"><h2>Contents</h2><ol>${toc
          .map((entry) => `<li>${escapeXml(entry.title)}</li>`)
          .join("")}</ol></nav>`
      : "";

  const body = document.sections
    .map(
      (section) =>
        `<section id="${escapeXml(section.id)}"><h2>${escapeXml(section.title)}</h2>${section.blocks
          .map(block)
          .join("")}</section>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeXml(document.title)}</title>
<meta name="description" content="${escapeXml(document.cover.subtitle).slice(0, 155)}" />
<meta name="generator" content="${escapeXml(brand.productName)} Reporting" />
<style>${styles(document, print)}</style></head>
<body><div class="page">${cover}${contents}${body}
<footer class="doc-footer">${escapeXml(document.footerText)}</footer>
</div>${print ? "<script>window.addEventListener('load',()=>window.print());</script>" : ""}</body></html>`;
}
