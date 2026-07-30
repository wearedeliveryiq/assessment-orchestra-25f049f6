import type { DashboardPayload } from "../dashboard/types";
import type { Recommendation } from "../recommendations/types";
import { resolveBranding } from "./branding";
import { getTemplate } from "./templates";
import type {
  ReportBlock,
  ReportBranding,
  ReportDocument,
  ReportDocumentSection,
  ReportFacts,
  ReportSectionId,
  ReportType,
} from "./types";

/**
 * ReportAssembler — turns the consolidated dashboard payload into the
 * format-neutral document model.
 *
 * Strictly a projection: every number, label and sentence below is copied
 * from the persisted output of the Intelligence Runtime. The assembler
 * chooses ordering and phrasing of *headings* only.
 */

const pct = (value: number) => `${Math.round(value)}%`;
const confidence = (value: number) => `${Math.round(value * 100)}%`;
const dash = (value: string | null | undefined) => (value && value.trim() ? value : "—");

const HORIZONS: { key: Recommendation["horizon"]; label: string; window: string }[] = [
  { key: "now", label: "Now", window: "0–90 days" },
  { key: "next", label: "Next", window: "3–9 months" },
  { key: "later", label: "Later", window: "9–18 months" },
];

const PRIORITY_ORDER: Record<Recommendation["priority"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function byPriority(a: Recommendation, b: Recommendation): number {
  const delta = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  return delta !== 0 ? delta : b.confidence - a.confidence;
}

function facts(payload: DashboardPayload): ReportFacts {
  return {
    capabilities: payload.capabilities.length,
    patterns: payload.patterns.length,
    recommendations: payload.recommendations.length,
    observations: payload.observations.length,
    signals: payload.signals.length,
    rules: payload.rules.length,
    responses: payload.responses.length,
    narrativeSections: payload.narrative?.sections.length ?? 0,
    overallPercentage: payload.overall ? Math.round(payload.overall.percentage) : null,
    maturityLevel: payload.overall?.maturityLevel ?? null,
    confidence: payload.health.confidence,
  };
}

/* ----------------------------- sections ----------------------------- */

function executiveSummary(payload: DashboardPayload): ReportBlock[] {
  const blocks: ReportBlock[] = [];
  const { narrative, overall, health } = payload;

  blocks.push({
    kind: "kpis",
    items: [
      { label: "Overall score", value: overall ? pct(overall.percentage) : "—" },
      { label: "Maturity", value: dash(overall?.maturityLevel) },
      { label: "Evidence confidence", value: confidence(health.confidence) },
      { label: "Patterns detected", value: String(health.patterns) },
      { label: "Priority actions", value: String(health.recommendations) },
    ],
  });

  if (!narrative) {
    blocks.push({
      kind: "note",
      text: "The Narrative Engine has not produced an executive narrative for this assessment yet.",
    });
    return blocks;
  }

  blocks.push({ kind: "heading", level: 2, text: narrative.headline });
  blocks.push({ kind: "paragraph", text: narrative.summary });

  for (const section of [...narrative.sections].sort((a, b) => a.order - b.order)) {
    blocks.push({ kind: "heading", level: 3, text: section.title });
    for (const paragraph of section.body.split(/\n{2,}/)) {
      const trimmed = paragraph.trim();
      if (trimmed) blocks.push({ kind: "paragraph", text: trimmed });
    }
    if (section.evidence.length > 0) {
      blocks.push({
        kind: "note",
        text: `Evidence: ${section.evidence.map((ref) => `${ref.code} ${ref.label}`).join(" · ")}`,
      });
    }
  }

  return blocks;
}

function assessmentOverview(payload: DashboardPayload): ReportBlock[] {
  const { assessment, knowledgePack, health, stages } = payload;

  return [
    {
      kind: "paragraph",
      text:
        `This report covers the ${assessment.assessmentType.replace(/-/g, " ")} assessment completed by ` +
        `${assessment.organisationName}. It was evaluated by the DeliveryIQ Intelligence Runtime against the ` +
        `${knowledgePack.name} Knowledge Pack (v${knowledgePack.version}). Every figure is derived from the ` +
        `${health.responses} recorded responses and remains traceable to the answer that produced it.`,
    },
    {
      kind: "table",
      columns: ["Attribute", "Value"],
      widths: [34, 66],
      rows: [
        ["Organisation", assessment.organisationName],
        ["Contact", dash(assessment.contactName)],
        ["Assessment type", assessment.assessmentType],
        ["Status", assessment.status],
        ["Completion", `${assessment.progress}%`],
        ["Submitted", dash(assessment.submittedAt)],
        ["Completed", dash(assessment.completedAt)],
        ["Knowledge Pack", `${knowledgePack.name} v${knowledgePack.version}`],
      ],
    },
    { kind: "heading", level: 3, text: "Runtime execution" },
    {
      kind: "table",
      columns: ["Stage", "Status", "Attempt", "Duration"],
      widths: [46, 20, 14, 20],
      rows: stages.map((stage) => [
        stage.stage,
        stage.status,
        String(stage.attempt),
        stage.durationMs ? `${stage.durationMs} ms` : "—",
      ]),
    },
  ];
}

function capabilitySummary(payload: DashboardPayload): ReportBlock[] {
  const blocks: ReportBlock[] = [];

  if (payload.overall) {
    blocks.push({
      kind: "paragraph",
      text:
        `The Scoring Engine placed the organisation at ${pct(payload.overall.percentage)} overall ` +
        `(${payload.overall.maturityLevel}) across ${payload.overall.dimensionCount} capability dimensions, ` +
        `with ${confidence(payload.overall.confidence)} evidence confidence.`,
    });
  }

  blocks.push({
    kind: "table",
    columns: ["Dimension", "Maturity", "Score", "Confidence", "Coverage", "Lead pattern"],
    widths: [24, 15, 10, 12, 11, 28],
    rows: payload.capabilities.map((card) => [
      card.dimension,
      card.maturityLevel,
      pct(card.percentage),
      confidence(card.confidence),
      confidence(card.evidenceCoverage),
      dash(card.topPatternName),
    ]),
  });

  return blocks;
}

function patterns(payload: DashboardPayload): ReportBlock[] {
  if (payload.patterns.length === 0) {
    return [{ kind: "note", text: "The Pattern Engine detected no patterns for this assessment." }];
  }

  const blocks: ReportBlock[] = [
    {
      kind: "table",
      columns: ["Code", "Pattern", "Category", "Severity", "Confidence"],
      widths: [12, 34, 20, 14, 20],
      rows: payload.patterns.map((pattern) => [
        pattern.patternCode,
        pattern.name,
        pattern.category,
        pattern.severity,
        confidence(pattern.confidence),
      ]),
    },
  ];

  for (const pattern of payload.patterns) {
    blocks.push({ kind: "heading", level: 3, text: `${pattern.patternCode} — ${pattern.name}` });
    blocks.push({ kind: "paragraph", text: pattern.description });
    blocks.push({ kind: "paragraph", text: `Business impact: ${pattern.businessImpact}` });
    blocks.push({
      kind: "note",
      text: `Supporting rules: ${pattern.supportingRuleCodes.join(", ") || "—"} · ${pattern.evaluationReason}`,
    });
  }

  return blocks;
}

function recommendations(payload: DashboardPayload): ReportBlock[] {
  if (payload.recommendations.length === 0) {
    return [
      {
        kind: "note",
        text: "No Knowledge Pack interventions were triggered by the detected patterns.",
      },
    ];
  }

  const ordered = [...payload.recommendations].sort(byPriority);

  const blocks: ReportBlock[] = [
    {
      kind: "table",
      columns: ["Code", "Recommendation", "Priority", "Horizon", "Impact", "Effort"],
      widths: [11, 39, 12, 12, 13, 13],
      rows: ordered.map((item) => [
        item.code,
        item.title,
        item.priority,
        item.horizon,
        item.impact,
        item.effort,
      ]),
    },
  ];

  for (const item of ordered) {
    blocks.push({ kind: "heading", level: 3, text: `${item.code} — ${item.title}` });
    blocks.push({ kind: "paragraph", text: item.rationale });
    blocks.push({ kind: "paragraph", text: `Expected benefit: ${item.expectedBenefit}` });
    blocks.push({
      kind: "note",
      text:
        `Capability: ${item.dimensionName} · priority ${item.priority} · ${item.horizon} horizon · ` +
        `evidence ${item.supportingPatternCodes.join(", ") || "—"} (${confidence(item.confidence)} confidence)`,
    });
  }

  return blocks;
}

function roadmap(payload: DashboardPayload): ReportBlock[] {
  const blocks: ReportBlock[] = [
    {
      kind: "paragraph",
      text:
        "Interventions are sequenced by the horizon declared in the Knowledge Pack, so the roadmap reflects " +
        "pack guidance rather than a judgement made at report time.",
    },
  ];

  for (const horizon of HORIZONS) {
    const items = payload.recommendations
      .filter((item) => item.horizon === horizon.key)
      .sort(byPriority);

    blocks.push({ kind: "heading", level: 3, text: `${horizon.label} (${horizon.window})` });
    if (items.length === 0) {
      blocks.push({ kind: "note", text: "No interventions in this horizon." });
      continue;
    }
    blocks.push({
      kind: "bullets",
      items: items.map(
        (item) =>
          `${item.code} — ${item.title} (${item.priority} priority, ${item.effort} effort, ${item.impact} impact)`,
      ),
    });
  }

  return blocks;
}

function evidenceAppendix(payload: DashboardPayload): ReportBlock[] {
  const blocks: ReportBlock[] = [
    {
      kind: "paragraph",
      text:
        "The chain below is the audit trail behind every figure in this report: responses produce " +
        "observations, observations corroborate signals, signals satisfy rules, rules compose patterns, " +
        "and patterns drive scores and recommendations.",
    },
    {
      kind: "kpis",
      items: [
        { label: "Responses", value: String(payload.health.responses) },
        { label: "Observations", value: String(payload.health.observations) },
        { label: "Signals", value: String(payload.health.signals) },
        { label: "Rules", value: String(payload.health.rules) },
        { label: "Patterns", value: String(payload.health.patterns) },
      ],
    },
    { kind: "heading", level: 3, text: "Rules evaluated" },
    {
      kind: "table",
      columns: ["Code", "Rule", "Status", "Confidence", "Supporting signals"],
      widths: [12, 32, 13, 13, 30],
      rows: payload.rules.map((rule) => [
        rule.ruleCode,
        rule.name,
        rule.status,
        confidence(rule.confidence),
        rule.supportingSignalCodes.join(", ") || "—",
      ]),
    },
    { kind: "heading", level: 3, text: "Signals inferred" },
    {
      kind: "table",
      columns: ["Code", "Signal", "Category", "Severity", "Confidence"],
      widths: [12, 34, 22, 14, 18],
      rows: payload.signals.map((signal) => [
        signal.signalCode,
        signal.name,
        signal.category,
        signal.severity,
        confidence(signal.confidence),
      ]),
    },
    { kind: "heading", level: 3, text: "Observations recorded" },
    {
      kind: "table",
      columns: ["Definition", "Observation", "Severity", "Evidence"],
      widths: [16, 30, 12, 42],
      rows: payload.observations.map((observation) => [
        observation.definitionId,
        observation.title,
        observation.severity,
        observation.evidence,
      ]),
    },
  ];

  return blocks;
}

function metadata(payload: DashboardPayload): ReportBlock[] {
  const blocks: ReportBlock[] = [
    {
      kind: "table",
      columns: ["Field", "Value"],
      widths: [34, 66],
      rows: [
        ["Assessment id", payload.assessment.id],
        ["Generated at", payload.generatedAt],
        ["Knowledge Pack", `${payload.knowledgePack.name} v${payload.knowledgePack.version}`],
        ["Narrative mode", payload.narrative?.mode ?? "—"],
        ["Narrative provider", payload.narrative?.provider ?? "—"],
        ["Narrative model", payload.narrative?.model || "—"],
        ["Evidence confidence", confidence(payload.health.confidence)],
        ["Dimensions scored", String(payload.health.dimensions)],
      ],
    },
  ];

  if (payload.warnings.length > 0) {
    blocks.push({ kind: "heading", level: 3, text: "Data warnings" });
    blocks.push({
      kind: "bullets",
      items: payload.warnings.map((warning) => `${warning.area}: ${warning.message}`),
    });
  }

  return blocks;
}

const BUILDERS: Record<
  ReportSectionId,
  { title: string; build: (payload: DashboardPayload) => ReportBlock[] }
> = {
  "executive-summary": { title: "Executive Summary", build: executiveSummary },
  "assessment-overview": { title: "Assessment Overview", build: assessmentOverview },
  "capability-summary": { title: "Capability Summary", build: capabilitySummary },
  patterns: { title: "Organisational Patterns", build: patterns },
  recommendations: { title: "Priority Recommendations", build: recommendations },
  roadmap: { title: "Improvement Roadmap", build: roadmap },
  "evidence-appendix": { title: "Supporting Evidence (Appendix)", build: evidenceAppendix },
  metadata: { title: "Assessment Metadata", build: metadata },
};

/** Assemble the document model for one report type. */
export function assembleReport(
  payload: DashboardPayload,
  reportType: ReportType,
  branding?: Partial<ReportBranding> | null,
  titleOverride?: string | null,
): ReportDocument {
  const template = getTemplate(reportType);
  const resolvedBranding = resolveBranding(branding);

  const sections: ReportDocumentSection[] = template.sections.map((id) => {
    const builder = BUILDERS[id];
    return { id, title: builder.title, listed: true, blocks: builder.build(payload) };
  });

  const title =
    titleOverride?.trim() ||
    `${payload.assessment.organisationName} — ${template.name}`;

  return {
    reportType,
    templateId: template.id,
    title,
    organisation: payload.assessment.organisationName,
    generatedAt: payload.generatedAt,
    branding: resolvedBranding,
    cover: {
      title: template.name,
      subtitle: payload.narrative?.headline ?? resolvedBranding.tagline,
      organisation: payload.assessment.organisationName,
      maturity: dash(payload.overall?.maturityLevel),
      overall: payload.overall ? pct(payload.overall.percentage) : "—",
      confidence: confidence(payload.health.confidence),
      generatedAt: payload.generatedAt,
      knowledgePack: `${payload.knowledgePack.name} v${payload.knowledgePack.version}`,
    },
    sections,
    data: payload,
    facts: facts(payload),
  };
}
