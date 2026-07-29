import { knowledgePackLoader } from "../../knowledge-packs/loader.server";
import { listPatterns } from "../../patterns/repository.server";
import { scoringEngine } from "../../scores/engine.server";
import { replaceScores, replaceSummary } from "../../scores/repository.server";
import { QUESTIONNAIRE } from "../questionnaire";
import type { ObservationItem, RuleHit, ScoreSummary, SectionScore } from "../types";
import { artifact, type EngineService, type KnowledgePack } from "./contract.server";

function bandFor(pack: KnowledgePack, score: number): SectionScore["band"] {
  return pack.bands.find((b) => score >= b.min)?.band ?? "at-risk";
}

const PENALTY: Record<RuleHit["severity"], number> = {
  critical: 0.35,
  high: 0.2,
  medium: 0.1,
  low: 0.05,
};

export const scoresEngine: EngineService<ScoreSummary> = {
  id: "scores",
  async run(context) {
    const pack = artifact<KnowledgePack>(context, "knowledge_pack");
    const observations = artifact<ObservationItem[]>(context, "observations");
    const rules = artifact<RuleHit[]>(context, "rules");

    const sections = QUESTIONNAIRE.map<SectionScore>((section) => {
      const items = observations.filter((o) => o.sectionId === section.id);
      const raw = items.length ? items.reduce((sum, o) => sum + o.value, 0) / items.length : 0;
      const score = Number(raw.toFixed(2));
      return {
        sectionId: section.id,
        title: section.title,
        score,
        band: bandFor(pack, score),
      };
    });

    const totalWeight = QUESTIONNAIRE.reduce((sum, s) => sum + (pack.weights[s.id] ?? 1), 0);
    const weighted =
      sections.reduce((sum, s) => sum + s.score * (pack.weights[s.sectionId] ?? 1), 0) /
      (totalWeight || 1);
    const penalty = rules.reduce((sum, rule) => sum + PENALTY[rule.severity], 0);
    const overall = Number(Math.max(0, Math.min(5, weighted - penalty)).toFixed(2));

    return { overall, band: bandFor(pack, overall), sections };
  },
};
