import { sprint03Configuration } from "./config";

export function renderLowConfidenceNarrative(confidenceLimitationSummary: string) {
  return {
    confidenceSection: sprint03Configuration.narrative.templates.confidence
      .replace("{confidenceBand}", "low")
      .replace("{confidenceLimitationSummary}", confidenceLimitationSummary),
    caveat: sprint03Configuration.narrative.templates.lowConfidenceCaveat,
  };
}

const LIMITATION_TEXT: Record<string, string> = {
  incomplete_required_evidence:
    sprint03Configuration.confidence.limitations.required_completion.text,
  limited_capability_coverage:
    sprint03Configuration.confidence.limitations.capability_coverage.text,
  inconsistent_responses: sprint03Configuration.confidence.limitations.response_consistency.text,
  stale_evidence: sprint03Configuration.confidence.limitations.evidence_recency.text,
  limited_respondent_breadth: sprint03Configuration.confidence.limitations.respondent_breadth.text,
};

const LIMITATION_PROMPT: Record<string, string> = {
  incomplete_required_evidence:
    sprint03Configuration.confidence.limitations.required_completion.prompt,
  limited_capability_coverage:
    sprint03Configuration.confidence.limitations.capability_coverage.prompt,
  inconsistent_responses: sprint03Configuration.confidence.limitations.response_consistency.prompt,
  stale_evidence: sprint03Configuration.confidence.limitations.evidence_recency.prompt,
  limited_respondent_breadth:
    sprint03Configuration.confidence.limitations.respondent_breadth.prompt,
};

export function customerSafeConfidenceGuidance(codes: string[]) {
  return {
    limitations: codes.map((code) => LIMITATION_TEXT[code] ?? code),
    improvementPrompts: codes.map((code) => LIMITATION_PROMPT[code] ?? code),
  };
}

function words(value: string, maximum: number): string {
  const tokens = value.trim().split(/\s+/);
  return tokens.length <= maximum ? value.trim() : `${tokens.slice(0, maximum - 1).join(" ")}…`;
}

export function renderExecutiveNarrative(input: {
  overall: { available: boolean; displayScore: number | null; band: string | null };
  confidence: { band: string; limitations: string[] };
  capabilities: Array<{
    id: string;
    label: string;
    displayScore: number | null;
    confidence: number;
  }>;
  strengths: string[];
  opportunities: string[];
  recommendations: Array<{ title: string; outcome: string }>;
}) {
  const capability = (id: string) => input.capabilities.find((item) => item.id === id)!;
  const leadingFact = input.strengths[0]
    ? `${capability(input.strengths[0]).label} is a leading strength.`
    : "No leading strength is asserted from the available evidence.";
  const priorityFact = input.opportunities[0]
    ? `${capability(input.opportunities[0]).label} is the first priority opportunity.`
    : "No priority opportunity meets the approved threshold.";
  const overallPosition = input.overall.available
    ? sprint03Configuration.narrative.templates.overall_position
        .replace("{overallBand}", input.overall.band ?? "unavailable")
        .replace("{overallDisplayScore}", String(input.overall.displayScore))
        .replace("{leadingFact}", leadingFact)
        .replace("{priorityFact}", priorityFact)
    : sprint03Configuration.narrative.templates.overallUnavailableCaveat;
  const limitationSummary = input.confidence.limitations.length
    ? customerSafeConfidenceGuidance(input.confidence.limitations).limitations.join(" ")
    : "The approved evidence-quality checks identify no material limitation.";
  const confidence = sprint03Configuration.narrative.templates.confidence
    .replace("{confidenceBand}", input.confidence.band)
    .replace("{confidenceLimitationSummary}", limitationSummary);
  const strengths = input.strengths.map((id) => {
    const item = capability(id);
    return sprint03Configuration.narrative.templates.strength
      .replace("{capabilityLabel}", item.label)
      .replace("{displayScore}", String(item.displayScore))
      .replace("{confidenceBand}", item.confidence >= 75 ? "high" : "moderate");
  });
  const opportunities = input.opportunities.map((id) => {
    const item = capability(id);
    return sprint03Configuration.narrative.templates.opportunity
      .replace("{capabilityLabel}", item.label)
      .replace("{displayScore}", String(item.displayScore))
      .replace(
        "{opportunityReason}",
        "The approved score and evidence threshold classify this capability for attention.",
      );
  });
  const recommendations = input.recommendations.map((item) =>
    sprint03Configuration.narrative.templates.recommendation
      .replace("{recommendationTitle}", item.title)
      .replace("{reasonText}", "it addresses an approved priority opportunity or detected pattern.")
      .replace("{expectedOutcome}", item.outcome),
  );
  return {
    overallPosition: words(
      overallPosition,
      sprint03Configuration.narrative.sectionLimits.overall_position,
    ),
    confidence: words(confidence, sprint03Configuration.narrative.sectionLimits.confidence),
    strengths: strengths.map((item) =>
      words(item, sprint03Configuration.narrative.sectionLimits.strength_item),
    ),
    opportunities: opportunities.map((item) =>
      words(item, sprint03Configuration.narrative.sectionLimits.opportunity_item),
    ),
    recommendations: recommendations.map((item) =>
      words(item, sprint03Configuration.narrative.sectionLimits.recommendation_item),
    ),
    caveat:
      input.confidence.band === "low"
        ? sprint03Configuration.narrative.templates.lowConfidenceCaveat
        : null,
  };
}
