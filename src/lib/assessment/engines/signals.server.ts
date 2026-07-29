import { QUESTIONNAIRE } from "../questionnaire";
import type { KnowledgePack } from "./contract.server";
import type { ObservationItem, SignalItem } from "../types";
import { artifact, type EngineService } from "./contract.server";

export const signalsEngine: EngineService<SignalItem[]> = {
  id: "signals",
  async run(context) {
    const pack = artifact<KnowledgePack>(context, "knowledge_pack");
    const observations = artifact<ObservationItem[]>(context, "observations");

    return QUESTIONNAIRE.map<SignalItem>((section) => {
      const items = observations.filter((o) => o.sectionId === section.id);
      const average = items.length
        ? items.reduce((sum, o) => sum + o.value, 0) / items.length
        : 0;
      const benchmark = pack.benchmark[section.id] ?? 3;
      const delta = average - benchmark;
      const magnitude = Math.abs(delta);
      return {
        id: `signal.${section.id}`,
        sectionId: section.id,
        direction: delta >= 0 ? "positive" : "negative",
        strength: magnitude >= 1 ? "strong" : magnitude >= 0.4 ? "moderate" : "weak",
        statement:
          delta >= 0
            ? `${section.title} is running ${magnitude.toFixed(1)} points above the sector benchmark.`
            : `${section.title} trails the sector benchmark by ${magnitude.toFixed(1)} points.`,
      };
    });
  },
};
