import {
  DELIVERY_DNA_ASSESSMENT_TYPE,
  DELIVERY_DNA_VERSION,
  deliveryDnaCatalogue,
} from "../delivery-dna/catalogue";
import { knowledgePackLoader } from "../knowledge-packs/loader.server";
import type { AnalysisQuestionSet } from "./normalizer";
import { assertDeliveryDnaCatalogueContract } from "../delivery-dna/catalogue-contract.server";

const deliveryDnaQuestionSet: AnalysisQuestionSet = {
  manifest: {
    id: deliveryDnaCatalogue.identity.knowledgePackId,
    version: deliveryDnaCatalogue.identity.knowledgePackVersion,
    questionSetVersion: deliveryDnaCatalogue.identity.questionSetVersion,
  },
  questions: {
    questions: deliveryDnaCatalogue.capabilities.flatMap((capability) =>
      capability.questions.map((question) => ({
        id: question.id,
        sectionId: capability.id,
      })),
    ),
  },
};

/** Resolve only the immutable question contract needed by analysis normalisation. */
export function loadAnalysisQuestionSet(id: string, version: string): AnalysisQuestionSet {
  if (id === DELIVERY_DNA_ASSESSMENT_TYPE && version === DELIVERY_DNA_VERSION) {
    assertDeliveryDnaCatalogueContract();
    return deliveryDnaQuestionSet;
  }
  const pack = knowledgePackLoader.load(id, version);
  return {
    manifest: { id: pack.manifest.id, version: pack.manifest.version },
    questions: {
      questions: pack.questions.questions.map(({ id: questionId, sectionId }) => ({
        id: questionId,
        sectionId,
      })),
    },
  };
}
