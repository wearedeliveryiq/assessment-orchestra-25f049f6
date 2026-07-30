import type { DashboardPayload } from "../dashboard/types";
import type { ReportDocument, ReportValidationIssue, ReportValidationResult } from "./types";

/**
 * ReportValidator — proves a rendered document matches the intelligence it
 * claims to represent. It re-counts the source payload and compares against
 * the facts recorded on the assembled document, so a drifted or truncated
 * render is rejected rather than published.
 */
export function validateReport(
  document: ReportDocument,
  payload: DashboardPayload,
  byteLength: number,
): ReportValidationResult {
  const issues: ReportValidationIssue[] = [];

  const expect = (code: string, actual: number, expected: number, label: string) => {
    if (actual !== expected) {
      issues.push({
        severity: "error",
        code,
        message: `${label} mismatch: document reports ${actual}, runtime published ${expected}.`,
      });
    }
  };

  expect("capabilities", document.facts.capabilities, payload.capabilities.length, "Capability count");
  expect("patterns", document.facts.patterns, payload.patterns.length, "Pattern count");
  expect(
    "recommendations",
    document.facts.recommendations,
    payload.recommendations.length,
    "Recommendation count",
  );
  expect("observations", document.facts.observations, payload.observations.length, "Observation count");
  expect("signals", document.facts.signals, payload.signals.length, "Signal count");
  expect("rules", document.facts.rules, payload.rules.length, "Rule count");

  const expectedOverall = payload.overall ? Math.round(payload.overall.percentage) : null;
  if (document.facts.overallPercentage !== expectedOverall) {
    issues.push({
      severity: "error",
      code: "overall-score",
      message: `Overall score mismatch: document ${document.facts.overallPercentage ?? "—"}, runtime ${expectedOverall ?? "—"}.`,
    });
  }

  if (document.sections.length === 0) {
    issues.push({ severity: "error", code: "empty-document", message: "The document has no sections." });
  }

  for (const section of document.sections) {
    if (section.blocks.length === 0) {
      issues.push({
        severity: "warning",
        code: "empty-section",
        message: `Section "${section.title}" rendered with no content.`,
      });
    }
  }

  if (!payload.narrative) {
    issues.push({
      severity: "warning",
      code: "missing-narrative",
      message: "No executive narrative was available; narrative sections were omitted.",
    });
  }

  if (payload.assessment.status !== "completed") {
    issues.push({
      severity: "warning",
      code: "assessment-incomplete",
      message: `The assessment status is "${payload.assessment.status}"; figures may change once processing completes.`,
    });
  }

  for (const warning of payload.warnings) {
    issues.push({
      severity: "warning",
      code: `source-${warning.area}`,
      message: warning.message,
    });
  }

  if (byteLength < 512) {
    issues.push({
      severity: "error",
      code: "empty-artefact",
      message: `Rendered artefact is only ${byteLength} bytes.`,
    });
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    checkedAt: new Date().toISOString(),
    issues,
  };
}

/** SHA-256 content checksum — the immutability proof for a stored artefact. */
export async function checksum(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
