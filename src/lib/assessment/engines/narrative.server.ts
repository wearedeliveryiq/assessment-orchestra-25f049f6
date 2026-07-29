import type { NarrativeOutput, PatternItem, RecommendationItem, ScoreSummary } from "../types";
import { artifact, type EngineService } from "./contract.server";

const BAND_COPY: Record<ScoreSummary["band"], string> = {
  leading: "operating at a leading level of delivery maturity",
  performing: "performing consistently with targeted room to improve",
  developing: "developing, with foundations in place but uneven application",
  "at-risk": "at risk, with core delivery foundations not yet dependable",
};

export const narrativeEngine: EngineService<NarrativeOutput> = {
  id: "narrative",
  async run(context) {
    const scores = artifact<ScoreSummary>(context, "scores");
    const patterns = artifact<PatternItem[]>(context, "patterns");
    const recommendations = artifact<RecommendationItem[]>(context, "recommendations");
    const org = context.session.organisationName;

    const strongest = [...scores.sections].sort((a, b) => b.score - a.score)[0];
    const weakest = [...scores.sections].sort((a, b) => a.score - b.score)[0];
    const now = recommendations.filter((r) => r.horizon === "now");

    return {
      headline: `${org} is ${BAND_COPY[scores.band]}.`,
      summary: `An overall maturity score of ${scores.overall.toFixed(1)} out of 5 places ${org} in the ${scores.band} band across four capability areas.`,
      paragraphs: [
        `The assessment scored ${scores.sections.length} capability areas. ${strongest.title} is the strongest at ${strongest.score.toFixed(1)}/5, while ${weakest.title} is the primary constraint at ${weakest.score.toFixed(1)}/5.`,
        patterns.length
          ? `The dominant delivery pattern detected is ${patterns[0].name} (${Math.round(patterns[0].confidence * 100)}% confidence). ${patterns[0].description}`
          : "No dominant delivery anti-pattern was detected in this assessment.",
        now.length
          ? `${now.length} intervention${now.length === 1 ? "" : "s"} ${now.length === 1 ? "is" : "are"} recommended for immediate action, led by: ${now[0].title}`
          : "No immediate interventions are required; focus on sustaining current practice and re-baselining in 90 days.",
      ],
    };
  },
};
