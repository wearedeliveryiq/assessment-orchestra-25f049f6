import { buildPdf, PdfPage, wrapText } from "@/lib/reports/pdf.server";

import { getSnapshot } from "./snapshot.server";
import { deliveryDnaSnapshotV2Configuration } from "./snapshot-v2";

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

type SnapshotProjection = NonNullable<Awaited<ReturnType<typeof getSnapshot>>["snapshot"]>;

function paragraph(page: PdfPage, value: string, y: number, width = PAGE.width - MARGIN * 2) {
  const lines = wrapText(value, 10, "regular", width);
  lines.forEach((line, index) =>
    page.text(line, MARGIN, y - index * 15, 10, "regular", COLOURS.ink),
  );
  return y - lines.length * 15;
}

function title(page: PdfPage, section: string, heading: string) {
  page.text(section.toUpperCase(), MARGIN, 785, 8, "bold", COLOURS.teal);
  page.text(heading, MARGIN, 750, 22, "bold", COLOURS.ink);
  page.line(MARGIN, 735, PAGE.width - MARGIN, 735, COLOURS.blue, 1.2);
}

function footer(page: PdfPage, pageNumber: number) {
  page.line(MARGIN, 40, PAGE.width - MARGIN, 40, COLOURS.line, 0.5);
  page.text("DeliveryIQ · Private Saved Snapshot", MARGIN, 24, 7.5, "regular", COLOURS.muted);
  page.text(String(pageNumber), PAGE.width - MARGIN - 8, 24, 7.5, "regular", COLOURS.muted);
}

export function renderDeliveryDnaSnapshotPdf(snapshot: SnapshotProjection): Uint8Array {
  const result = snapshot.result;
  if (!result?.available || !result.indicativeMaturityLevel) {
    throw new Error("SNAPSHOT_RESULT_UNAVAILABLE");
  }
  const level =
    result.indicativeMaturityLevel[0].toUpperCase() + result.indicativeMaturityLevel.slice(1);

  const cover = new PdfPage();
  cover.rect(0, 0, PAGE.width, PAGE.height, COLOURS.navy);
  cover.rect(0, PAGE.height - 10, PAGE.width, 10, COLOURS.teal);
  cover.text("DELIVERYIQ", MARGIN, 720, 11, "bold", COLOURS.teal);
  cover.text("Delivery DNA Snapshot", MARGIN, 650, 30, "bold", COLOURS.white);
  cover.text(snapshot.scopeDisplayName, MARGIN, 616, 14, "regular", "C7D2E1");
  cover.text("Your indicative delivery maturity", MARGIN, 505, 12, "regular", "C7D2E1");
  cover.text(level, MARGIN, 448, 42, "bold", COLOURS.white);
  cover.text("Private · Indicative result", MARGIN, 64, 8, "regular", "A7B5C8");

  const profile = new PdfPage();
  title(profile, "Your Snapshot", "Your indicative Delivery DNA profile");
  let y = paragraph(profile, deliveryDnaSnapshotV2Configuration.copy.caveat, 700);
  y -= 20;
  for (const [index, domain] of result.profile.entries()) {
    if (index % 2 === 0) profile.rect(MARGIN, y - 28, PAGE.width - MARGIN * 2, 38, COLOURS.surface);
    profile.text(domain.domainLabel, MARGIN + 10, y - 7, 10, "bold", COLOURS.ink);
    profile.text(
      domain.level ? domain.level[0].toUpperCase() + domain.level.slice(1) : "Unavailable",
      410,
      y - 7,
      10,
      "bold",
      domain.level ? COLOURS.blue : COLOURS.muted,
    );
    y -= 44;
  }
  footer(profile, 1);

  const signals = new PdfPage();
  title(signals, "What this suggests", "Signals to carry forward");
  y = 700;
  if (result.positiveSignals.length) {
    signals.text("Positive signals", MARGIN, y, 14, "bold", COLOURS.teal);
    y -= 30;
    for (const item of result.positiveSignals) y = paragraph(signals, `• ${item.text}`, y) - 8;
    y -= 14;
  }
  if (result.areasToExplore.length) {
    signals.text("Areas to explore", MARGIN, y, 14, "bold", COLOURS.blue);
    y -= 30;
    for (const item of result.areasToExplore) y = paragraph(signals, `• ${item.text}`, y) - 8;
  }
  if (result.industryContext?.[0]) {
    const item = result.industryContext[0];
    y -= 14;
    signals.text("Industry context", MARGIN, y, 13, "bold", COLOURS.ink);
    y = paragraph(signals, item.approvedCustomerWording, y - 26);
    y = paragraph(
      signals,
      `Source: ${item.sourcePublisher}, ${item.sourceTitle}, ${item.evidenceYear}. ${item.scopeCaveat} ${item.mandatoryDisclosure}`,
      y - 8,
    );
  }
  footer(signals, 2);

  return buildPdf([cover, profile, signals], {
    width: PAGE.width,
    height: PAGE.height,
    title: "Delivery DNA Snapshot",
    author: "DeliveryIQ",
    subject: "Private indicative Delivery DNA Snapshot",
  });
}

export async function getDeliveryDnaSnapshotReport(request: Request): Promise<Response> {
  const { snapshot } = await getSnapshot(request);
  if (!snapshot || snapshot.status !== "linked") {
    return Response.json({ error: "Saved Snapshot not found." }, { status: 404 });
  }
  try {
    const bytes = renderDeliveryDnaSnapshotPdf(snapshot);
    const body = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="delivery-dna-snapshot.pdf"',
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return Response.json({ error: "Saved Snapshot result is unavailable." }, { status: 409 });
  }
}
