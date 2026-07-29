import { QUESTIONNAIRE } from "../questionnaire";
import type { EngineService, KnowledgePack } from "./contract.server";

export const knowledgePackEngine: EngineService<KnowledgePack> = {
  id: "knowledge_pack",
  async run() {
    const weights = Object.fromEntries(QUESTIONNAIRE.map((s) => [s.id, s.weight]));
    return {
      version: "diq-knowledge-pack/1.0.0",
      bands: [
        { min: 4.3, band: "leading" },
        { min: 3.4, band: "performing" },
        { min: 2.4, band: "developing" },
        { min: 0, band: "at-risk" },
      ],
      weights,
      benchmark: {
        flow: 3.1,
        engineering: 3.4,
        governance: 2.9,
        value: 2.8,
      },
    } satisfies KnowledgePack;
  },
};
