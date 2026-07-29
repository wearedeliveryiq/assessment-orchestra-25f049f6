import { ALL_QUESTIONS, QUESTIONNAIRE } from "../questionnaire";
import type { ObservationItem } from "../types";
import type { EngineService } from "./contract.server";

export const observationsEngine: EngineService<ObservationItem[]> = {
  id: "observations",
  async run({ responses }) {
    return QUESTIONNAIRE.flatMap((section) =>
      section.questions.map<ObservationItem>((question) => {
        const response = responses.find((r) => r.questionId === question.id);
        const value = response?.score ?? 0;
        const option = question.options.find((o) => o.value === value);
        return {
          id: question.id,
          sectionId: section.id,
          label: question.prompt,
          value,
          commentary: option
            ? `Reported as "${option.label}"${response?.notes ? ` — ${response.notes}` : ""}`
            : "No response captured for this practice.",
        };
      }),
    ).filter((observation) => ALL_QUESTIONS.some((q) => q.id === observation.id));
  },
};
