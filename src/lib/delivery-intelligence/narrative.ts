import { sprint03Configuration } from "./config";

export function renderLowConfidenceNarrative(confidenceLimitationSummary: string) {
  return {
    confidenceSection: sprint03Configuration.narrative.templates.confidence
      .replace("{confidenceBand}", "low")
      .replace("{confidenceLimitationSummary}", confidenceLimitationSummary),
    caveat: sprint03Configuration.narrative.templates.lowConfidenceCaveat,
  };
}
