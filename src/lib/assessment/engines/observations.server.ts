import { QUESTIONNAIRE } from "../questionnaire";
import type { ObservationItem } from "../types";
import type { EngineService } from "./contract.server";
import { knowledgePackLoader } from "@/lib/knowledge-packs/loader.server";
import { observationEngine } from "@/lib/observations/engine.server";
import { persistObservations } from "@/lib/observations/repository.server";

/**
 * Observation stage of the reasoning pipeline.
 *
 * All business logic comes from the active Knowledge Pack: the engine
 * generates and persists structured, fully traceable observations. The
 * flattened per-question view returned here is what downstream stages
 * (signals, rules, scores) consume.
 */
export const observationsEngine: EngineService<ObservationItem[]> = {
  id: "observations",
  async run({ session, responses }) {
    const pack = knowledgePackLoader.loadActive();
    const { observations, summary } = await observationEngine.run({ session, responses, pack });
    await persistObservations(session.id, observations);

    if (summary.failed.length > 0) {
      console.error("[observations-stage] definitions failed", summary.failed);
    }

    return QUESTIONNAIRE.flatMap((section) =>
      section.questions.map<ObservationItem>((question) => {
        const response = responses.find((r) => r.questionId === question.id);
        const value = response?.score ?? 0;
        const option = question.options.find((o) => o.value === value);
        const generated = observations.filter((o) => o.questionId === question.id);
        return {
          id: question.id,
          sectionId: section.id,
          label: question.prompt,
          value,
          commentary: generated.length
            ? generated.map((o) => o.title).join(" · ")
            : option
              ? `Reported as "${option.label}"`
              : "No response captured for this practice.",
        };
      }),
    );
  },
};
