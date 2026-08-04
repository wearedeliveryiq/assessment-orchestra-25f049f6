import { buildPdf, measure, PdfPage, wrapText } from "@/lib/reports/pdf.server";
import { getWorkspaceResult } from "@/lib/delivery-intelligence/result-http.server";
import type { projectDeliveryDnaOverviewResult } from "@/lib/delivery-intelligence/projection";

type Overview = ReturnType<typeof projectDeliveryDnaOverviewResult>;

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 48;
const COLOURS = {
  navy: "0B1220",
  blue: "2563EB",
  teal: "14B8A6",
  ink: "172033",
  muted: "58657A",
  surface: "EEF3F8",
  white: "FFFFFF",
  line: "D8E1EC",
};

function pageTitle(page: PdfPage, title: string, section: string) {
  page.text(section.toUpperCase(), MARGIN, 787, 8, "bold", COLOURS.teal);
  page.text(title, MARGIN, 752, 22, "bold", COLOURS.ink);
  page.line(MARGIN, 738, PAGE.width - MARGIN, 738, COLOURS.blue, 1.2);
}

function footer(page: PdfPage, pageNumber: number) {
  page.line(MARGIN, 40, PAGE.width - MARGIN, 40, COLOURS.line, 0.5);
  page.text("DeliveryIQ · Confidential", MARGIN, 24, 7.5, "regular", COLOURS.muted);
  page.text(String(pageNumber), PAGE.width - MARGIN - 8, 24, 7.5, "regular", COLOURS.muted);
}

function paragraph(page: PdfPage, value: string, y: number, width = PAGE.width - MARGIN * 2) {
  const lines = wrapText(value, 10, "regular", width);
  lines.forEach((line, index) =>
    page.text(line, MARGIN, y - index * 15, 10, "regular", COLOURS.ink),
  );
  return y - lines.length * 15;
}

function capabilityPage(overview: Overview): PdfPage {
  const page = new PdfPage();
  pageTitle(page, "Capability profile", "What we found");
  let y = 705;
  overview.capabilities.forEach((item, index) => {
    if (index % 2 === 0) page.rect(MARGIN, y - 30, PAGE.width - MARGIN * 2, 38, COLOURS.surface);
    page.text(`${index + 1}. ${item.label}`, MARGIN + 8, y - 8, 9, "bold", COLOURS.ink);
    const score = item.available ? `${item.displayScore} · ${item.band}` : "Unavailable";
    page.text(score, 355, y - 8, 9, "bold", item.available ? COLOURS.blue : COLOURS.muted);
    page.text(
      `${item.eligibleAnswerCount}/${item.totalQuestionCount} eligible responses`,
      445,
      y - 8,
      7.5,
      "regular",
      COLOURS.muted,
    );
    y -= 42;
  });
  footer(page, 2);
  return page;
}

function findingsPage(overview: Overview): PdfPage {
  const page = new PdfPage();
  pageTitle(page, "Strengths and priority opportunities", "Why it matters");
  const names = new Map(overview.capabilities.map((item) => [item.id, item.label]));
  let y = 700;
  page.text("Strengths", MARGIN, y, 14, "bold", COLOURS.teal);
  y -= 28;
  for (const id of overview.findings.strengths) {
    page.text("+", MARGIN, y, 10, "bold", COLOURS.teal);
    page.text(names.get(id) ?? id, MARGIN + 18, y, 10, "regular", COLOURS.ink);
    y -= 24;
  }
  y -= 18;
  page.text("Priority opportunities", MARGIN, y, 14, "bold", COLOURS.blue);
  y -= 28;
  for (const id of overview.findings.priorityOpportunities) {
    page.text("-", MARGIN, y, 10, "bold", COLOURS.blue);
    page.text(names.get(id) ?? id, MARGIN + 18, y, 10, "regular", COLOURS.ink);
    y -= 24;
  }
  y -= 15;
  page.rect(MARGIN, y - 82, PAGE.width - MARGIN * 2, 92, COLOURS.surface);
  page.text("Evidence confidence", MARGIN + 14, y - 10, 11, "bold", COLOURS.ink);
  page.text(
    `${overview.confidence.displayIndex} · ${overview.confidence.band}`,
    MARGIN + 14,
    y - 32,
    12,
    "bold",
    COLOURS.blue,
  );
  const limitation = overview.confidence.caveat ?? "No additional limitation is presented.";
  wrapText(limitation, 8.5, "regular", PAGE.width - MARGIN * 2 - 28)
    .slice(0, 3)
    .forEach((line, index) =>
      page.text(line, MARGIN + 14, y - 52 - index * 12, 8.5, "regular", COLOURS.muted),
    );
  footer(page, 3);
  return page;
}

function recommendationsPage(overview: Overview): PdfPage {
  const page = new PdfPage();
  pageTitle(page, "Priority recommendations", "What to do first");
  let y = 700;
  overview.recommendations.forEach((item, index) => {
    page.text(`${index + 1}`, MARGIN, y, 18, "bold", COLOURS.blue);
    page.text(item.title, MARGIN + 32, y, 12, "bold", COLOURS.ink);
    page.text(
      `${item.priorityLabel ?? "priority"} · ${item.impact} impact · ${item.effort} effort`,
      MARGIN + 32,
      y - 19,
      8,
      "bold",
      COLOURS.muted,
    );
    y = paragraph(page, item.safeReason ?? "", y - 42, PAGE.width - MARGIN * 2 - 32);
    y = paragraph(
      page,
      `Expected outcome: ${item.expectedOutcome ?? ""}`,
      y - 4,
      PAGE.width - MARGIN * 2 - 32,
    );
    y = paragraph(
      page,
      `Practical first step: ${item.practicalFirstStep ?? item.title}`,
      y - 4,
      PAGE.width - MARGIN * 2 - 32,
    );
    y -= 22;
    page.line(MARGIN + 32, y + 10, PAGE.width - MARGIN, y + 10, COLOURS.line, 0.5);
  });
  footer(page, 4);
  return page;
}

function directionPage(overview: Overview): PdfPage {
  const page = new PdfPage();
  pageTitle(page, "30/60/90-day direction", "Focus");
  let x = MARGIN;
  const width = (PAGE.width - MARGIN * 2 - 24) / 3;
  (["day30", "day60", "day90"] as const).forEach((key, index) => {
    const item = overview.roadmapPreview[key][0];
    page.rect(x, 545, width, 150, index === 0 ? "E8F4F4" : COLOURS.surface);
    page.text(
      index === 0 ? "30 DAYS" : index === 1 ? "60 DAYS" : "90 DAYS",
      x + 14,
      666,
      8,
      "bold",
      COLOURS.teal,
    );
    if (item) {
      wrapText(item.title, 10, "bold", width - 28)
        .slice(0, 5)
        .forEach((line, lineIndex) =>
          page.text(line, x + 14, 638 - lineIndex * 15, 10, "bold", COLOURS.ink),
        );
      page.text(`${item.priorityLabel} priority`, x + 14, 565, 8, "regular", COLOURS.muted);
    } else {
      page.text("No item scheduled", x + 14, 625, 9, "regular", COLOURS.muted);
    }
    x += width + 12;
  });
  page.text("Overview now. Action later.", MARGIN, 482, 14, "bold", COLOURS.ink);
  paragraph(page, overview.action.message, 455);
  footer(page, 5);
  return page;
}

function contextPage(overview: Overview): PdfPage {
  const page = new PdfPage();
  pageTitle(page, "Why this matters now", "Industry context");
  let y = 700;
  for (const item of overview.industryContext) {
    y = paragraph(page, item.approvedCustomerSafeWording, y);
    page.text(`${item.publisher} · ${item.evidenceYear}`, MARGIN, y - 4, 8, "bold", COLOURS.blue);
    y -= 24;
    y = paragraph(page, `Source: ${item.originalSourceReference}`, y, PAGE.width - MARGIN * 2);
    y = paragraph(page, item.scopeOrMethodCaveat, y, PAGE.width - MARGIN * 2);
    y = paragraph(page, item.notCustomerPredictionCaveat, y - 4, PAGE.width - MARGIN * 2);
    y -= 20;
  }
  footer(page, 6);
  return page;
}

export function renderDeliveryDnaOverviewPdf(overview: Overview): Uint8Array {
  const cover = new PdfPage();
  cover.rect(0, 0, PAGE.width, PAGE.height, COLOURS.navy);
  cover.rect(0, PAGE.height - 10, PAGE.width, 10, COLOURS.teal);
  cover.text("DELIVERYIQ", MARGIN, 720, 11, "bold", COLOURS.teal);
  cover.text("Delivery DNA Overview", MARGIN, 650, 30, "bold", COLOURS.white);
  cover.text("Decision-quality delivery diagnosis", MARGIN, 618, 14, "regular", "C7D2E1");
  cover.text(String(overview.overall.displayScore ?? "-"), MARGIN, 485, 64, "bold", COLOURS.white);
  cover.text(
    String(overview.overall.band ?? "Insufficient evidence"),
    MARGIN,
    450,
    13,
    "bold",
    COLOURS.teal,
  );
  cover.text(
    `${overview.confidence.displayIndex} · ${overview.confidence.band} confidence`,
    MARGIN,
    408,
    11,
    "regular",
    "C7D2E1",
  );
  cover.text(
    `Generated ${new Date(overview.generatedAt).toISOString().slice(0, 10)}`,
    MARGIN,
    380,
    9,
    "regular",
    "A7B5C8",
  );
  cover.text("Confidential · Board-ready executive overview", MARGIN, 64, 8, "regular", "A7B5C8");

  const summary = new PdfPage();
  pageTitle(summary, "Executive summary", "Delivery DNA Overview");
  let y = paragraph(summary, overview.executiveSummary.overallPosition, 700);
  y = paragraph(summary, overview.executiveSummary.confidence, y - 16);
  if (overview.executiveSummary.caveat)
    paragraph(summary, overview.executiveSummary.caveat, y - 16);
  footer(summary, 1);

  const pages = [
    cover,
    summary,
    capabilityPage(overview),
    findingsPage(overview),
    recommendationsPage(overview),
    directionPage(overview),
    contextPage(overview),
  ];
  return buildPdf(pages, {
    width: PAGE.width,
    height: PAGE.height,
    title: "Delivery DNA Overview",
    author: "DeliveryIQ",
    subject: "Confidential Delivery DNA executive overview",
  });
}

export async function getDeliveryDnaOverviewReport(
  request: Request,
  runId: string,
): Promise<Response> {
  const projected = await getWorkspaceResult(request, runId);
  if (projected.status !== 200) return projected;
  const overview = (await projected.json()) as Overview;
  const bytes = renderDeliveryDnaOverviewPdf(overview);
  const body = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'attachment; filename="delivery-dna-overview.pdf"',
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
