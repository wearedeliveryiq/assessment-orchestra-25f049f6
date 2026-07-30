import { knowledgePackLoader } from "../../knowledge-packs/loader.server";
import { narrativeEngine as packNarrativeEngine } from "../../narrative/engine.server";
import { replaceNarrative } from "../../narrative/repository.server";
import type { NarrativeEvidence } from "../../narrative/types";
import { listPatterns } from "../../patterns/repository.server";
import { listRuleResults } from "../../rules/repository.server";
import { getSummary, listScores } from "../../scores/repository.server";
import { listSignals } from "../../signals/repository.server";
import { listObservations } from "../../observations/repository.server";
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

    // Pack-driven Narrative Engine: consumes persisted Scores and Patterns
    // only. Isolated from the legacy narrative below so a narrative model
    // change never destabilises the runtime pipeline.
    try {
      const pack = knowledgePackLoader.loadActive();
      const [packScores, summary, packPatterns, rules, signals, observations] = await Promise.all([
        listScores(context.session.id),
        getSummary(context.session.id),
        listPatterns(context.session.id),
        listRuleResults(context.session.id),
        listSignals(context.session.id),
        listObservations(context.session.id),
      ]);

      const weakest = [...packScores].sort((a, b) => a.percentage - b.percentage)[0] ?? null;
      const evidence: NarrativeEvidence = {
        organisationName: org,
        packId: pack.manifest.id,
        packName: pack.manifest.name,
        packVersion: pack.manifest.version,
        summary,
        scores: packScores,
        patterns: packPatterns,
        rules,
        signals,
        counts: {
          responses: context.responses.length,
          observations: observations.length,
          signals: signals.length,
          rules: rules.length,
          patterns: packPatterns.length,
        },
        recommendations: weakest
          ? [
              {
                code: "rec.weakest-dimension",
                title: `Establish named executive ownership for ${weakest.dimension}`,
                rationale: `${weakest.dimension} is the lowest scoring dimension in this assessment.`,
              },
            ]
          : [],
      };

      const { narrative, runSummary } = await packNarrativeEngine.run({
        session: context.session,
        pack,
        evidence,
      });
      await replaceNarrative(context.session.id, narrative);
      if (runSummary.fallbacks.length > 0) {
        console.warn("[narrative-stage] section fallbacks", runSummary.fallbacks);
      }
    } catch (error) {
      console.error("[narrative-stage] narrative engine failed", error);
    }

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
