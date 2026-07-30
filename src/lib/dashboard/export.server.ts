import { buildPptx, escapeXml, type PptxSlide } from "./pptx.server";
import type { DashboardPayload } from "./types";

/**
 * Backend-invoked export renderers.
 *
 * Every export is a projection of the consolidated dashboard payload — the
 * same numbers the UI shows, produced by the Intelligence Runtime.
 */

const pct = (value: number) => `${Math.round(value)}%`;
const conf = (value: number) => `${Math.round(value * 100)}% confidence`;

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "assessment"
  );
}

export function exportFilename(payload: DashboardPayload, extension: string): string {
  const date = payload.generatedAt.slice(0, 10);
  return `deliveryiq-${slugify(payload.assessment.organisationName)}-${date}.${extension}`;
}

/**
 * Print/PDF document. A standalone dark-themed HTML report with print CSS —
 * the browser turns it into a PDF, so no native renderer is needed in the
 * Worker runtime.
 */
export function renderReportHtml(payload: DashboardPayload, autoPrint: boolean): string {
  const { assessment, overall, narrative, capabilities, recommendations, patterns, health } =
    payload;

  const sections = (narrative?.sections ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(
      (section) => `<section class="block">
        <h2>${escapeXml(section.title)}</h2>
        ${section.body
          .split(/\n{2,}/)
          .map((para) => `<p>${escapeXml(para.trim())}</p>`)
          .join("")}
        ${
          section.evidence.length
            ? `<p class="cite">Evidence: ${section.evidence
                .map((ref) => escapeXml(`${ref.code} ${ref.label}`))
                .join(" · ")}</p>`
            : ""
        }
      </section>`,
    )
    .join("");

  const capabilityRows = capabilities
    .map(
      (card) => `<tr>
        <td>${escapeXml(card.dimension)}</td>
        <td>${escapeXml(card.maturityLevel)}</td>
        <td class="num">${pct(card.percentage)}</td>
        <td class="num">${Math.round(card.confidence * 100)}%</td>
        <td>${escapeXml(card.topPatternName ?? "—")}</td>
      </tr>`,
    )
    .join("");

  const recommendationRows = recommendations
    .map(
      (item) => `<tr>
        <td>${escapeXml(item.code)}</td>
        <td>${escapeXml(item.title)}</td>
        <td>${escapeXml(item.priority)}</td>
        <td>${escapeXml(item.horizon)}</td>
        <td>${escapeXml(item.effort)}</td>
        <td>${escapeXml(item.supportingPatternCodes.join(", "))}</td>
      </tr>`,
    )
    .join("");

  const patternRows = patterns
    .map(
      (pattern) => `<tr>
        <td>${escapeXml(pattern.patternCode)}</td>
        <td>${escapeXml(pattern.name)}</td>
        <td>${escapeXml(pattern.severity)}</td>
        <td class="num">${Math.round(pattern.confidence * 100)}%</td>
        <td>${escapeXml(pattern.supportingRuleCodes.join(", "))}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeXml(assessment.organisationName)} — DeliveryIQ executive report</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #070b14; color: #e2e8f0; font-family: ui-sans-serif, system-ui, Arial, sans-serif; font-size: 12pt; line-height: 1.55; }
  .page { max-width: 1000px; margin: 0 auto; padding: 48px 40px 64px; }
  .ribbon { height: 6px; background: linear-gradient(90deg, #38bdf8, #22c55e); border-radius: 999px; margin-bottom: 28px; }
  h1 { font-size: 26pt; margin: 0 0 6px; letter-spacing: -0.02em; }
  h2 { font-size: 15pt; margin: 28px 0 8px; color: #7dd3fc; }
  p { margin: 0 0 10px; }
  .meta { color: #94a3b8; font-size: 10pt; }
  .kpis { display: flex; flex-wrap: wrap; gap: 16px; margin: 24px 0; }
  .kpi { flex: 1 1 160px; border: 1px solid #1e293b; border-radius: 12px; padding: 14px 16px; background: #0b1220; }
  .kpi span { display: block; color: #94a3b8; font-size: 9pt; text-transform: uppercase; letter-spacing: .08em; }
  .kpi strong { font-size: 20pt; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0 18px; font-size: 10pt; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #1e293b; vertical-align: top; }
  th { color: #94a3b8; text-transform: uppercase; font-size: 8.5pt; letter-spacing: .07em; }
  td.num { text-align: right; }
  .cite { color: #64748b; font-size: 9pt; }
  .block { break-inside: avoid; }
  @page { size: A4; margin: 14mm; }
  @media print { body { background: #fff; color: #0f172a; } .kpi { background: #f8fafc; border-color: #cbd5e1; } h2 { color: #0369a1; } th, td { border-color: #cbd5e1; } .cite { color: #475569; } }
</style></head>
<body><div class="page">
  <div class="ribbon"></div>
  <h1>${escapeXml(assessment.organisationName)}</h1>
  <p class="meta">${escapeXml(payload.knowledgePack.name)} v${escapeXml(payload.knowledgePack.version)} · generated ${escapeXml(payload.generatedAt)} · status ${escapeXml(assessment.status)}</p>
  <div class="kpis">
    <div class="kpi"><span>Overall</span><strong>${overall ? pct(overall.percentage) : "—"}</strong></div>
    <div class="kpi"><span>Maturity</span><strong>${escapeXml(overall?.maturityLevel ?? "—")}</strong></div>
    <div class="kpi"><span>Confidence</span><strong>${Math.round(health.confidence * 100)}%</strong></div>
    <div class="kpi"><span>Patterns</span><strong>${health.patterns}</strong></div>
    <div class="kpi"><span>Actions</span><strong>${health.recommendations}</strong></div>
  </div>
  ${narrative ? `<section class="block"><h2>${escapeXml(narrative.headline)}</h2><p>${escapeXml(narrative.summary)}</p></section>` : ""}
  ${sections}
  <section class="block"><h2>Capability scores</h2>
    <table><thead><tr><th>Dimension</th><th>Maturity</th><th>Score</th><th>Confidence</th><th>Lead pattern</th></tr></thead>
    <tbody>${capabilityRows || '<tr><td colspan="5">No scores available.</td></tr>'}</tbody></table></section>
  <section class="block"><h2>Priority recommendations</h2>
    <table><thead><tr><th>Code</th><th>Action</th><th>Priority</th><th>Horizon</th><th>Effort</th><th>Evidence</th></tr></thead>
    <tbody>${recommendationRows || '<tr><td colspan="6">No recommendations triggered.</td></tr>'}</tbody></table></section>
  <section class="block"><h2>Detected patterns</h2>
    <table><thead><tr><th>Code</th><th>Pattern</th><th>Severity</th><th>Confidence</th><th>Supporting rules</th></tr></thead>
    <tbody>${patternRows || '<tr><td colspan="5">No patterns detected.</td></tr>'}</tbody></table></section>
  <p class="cite">Evidence base: ${health.responses} responses · ${health.observations} observations · ${health.signals} signals · ${health.rules} rules · ${health.patterns} patterns.</p>
</div>
${autoPrint ? "<script>window.addEventListener('load', () => window.print());</script>" : ""}
</body></html>`;
}

/** PowerPoint deck: one slide per executive talking point. */
export function renderDeck(payload: DashboardPayload): Uint8Array {
  const { assessment, overall, narrative, capabilities, recommendations, patterns, health } =
    payload;

  const slides: PptxSlide[] = [
    {
      title: `${assessment.organisationName} — Delivery maturity`,
      bullets: [
        `${payload.knowledgePack.name} v${payload.knowledgePack.version}`,
        `Generated ${payload.generatedAt.slice(0, 10)}`,
        overall
          ? `Overall ${pct(overall.percentage)} — ${overall.maturityLevel} (${conf(overall.confidence)})`
          : "Overall score not yet available",
      ],
    },
  ];

  if (narrative) {
    slides.push({
      title: narrative.headline,
      bullets: narrative.summary.split(/(?<=\.)\s+/).slice(0, 6),
    });
    for (const section of [...narrative.sections].sort((a, b) => a.order - b.order).slice(0, 6)) {
      slides.push({
        title: section.title,
        bullets: section.body
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 6),
      });
    }
  }

  slides.push({
    title: "Capability scores",
    bullets: capabilities.map(
      (card) =>
        `${card.dimension}: ${pct(card.percentage)} — ${card.maturityLevel} (${conf(card.confidence)})`,
    ),
  });

  slides.push({
    title: "Key organisational patterns",
    bullets: patterns
      .slice(0, 8)
      .map(
        (pattern) =>
          `${pattern.patternCode} ${pattern.name} — ${pattern.severity}, ${conf(pattern.confidence)}`,
      ),
  });

  slides.push({
    title: "Priority recommendations",
    bullets: recommendations
      .slice(0, 8)
      .map(
        (item) =>
          `[${item.priority}/${item.horizon}] ${item.title} — effort ${item.effort}, impact ${item.impact}`,
      ),
  });

  slides.push({
    title: "Assessment health",
    bullets: [
      `${health.responses} responses`,
      `${health.observations} observations`,
      `${health.signals} signals`,
      `${health.rules} rule results`,
      `${health.patterns} patterns`,
      `${health.dimensions} scored dimensions`,
      `Overall evidence confidence ${Math.round(health.confidence * 100)}%`,
    ],
  });

  return buildPptx(slides);
}
